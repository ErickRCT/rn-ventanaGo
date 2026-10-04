import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Checkbox, HelperText, IconButton, Text } from "react-native-paper";
import { mensajeDeError } from "@/api/http";
import { cambiarCantidad, enviarSolicitud, quitarDelCarrito, useCarrito, useSolicitudes } from "@/api/solicitudes";
import { useAuth } from "@/context/AuthContext";
import { cantidadVentanas, LIMITES, SERVICIOS, type DatosContacto, type ItemVentana, type Servicio } from "@/lib/tipos";
import { validarEmail, validarTelefono } from "@/lib/validacion";
import { Campo } from "@/ui/Campo";
import { Aviso, Vacio } from "@/ui/Estados";
import { HojaFormulario } from "@/ui/HojaFormulario";
import { useMensaje } from "@/ui/Mensajes";
import { Pantalla } from "@/ui/Pantalla";
import { COLORES } from "@/ui/tema";
import { colorMarcoHex, colorVidrioHex } from "@/ventana/catalogo";
import { DibujoVentana } from "@/ventana/DibujoVentana";

const CONTACTO_VACIO: DatosContacto = { nombre: "", email: "", telefono: "", direccion: "" };

type ErroresSolicitud = Partial<Record<keyof DatosContacto | "servicios", string>>;

const validar = (contacto: DatosContacto, servicios: Servicio[]): ErroresSolicitud => {
    const errores: ErroresSolicitud = {};
    if (!contacto.nombre.trim()) errores.nombre = "Ingresa tu nombre.";
    if (!validarEmail(contacto.email.trim())) errores.email = "Ingresa un correo válido.";
    if (contacto.telefono.trim() && !validarTelefono(contacto.telefono.trim())) errores.telefono = "Ingresa un teléfono chileno válido.";
    if (servicios.length === 0) errores.servicios = "Elige al menos un servicio.";
    if (servicios.some((s) => s !== "FABRICACION") && !contacto.direccion.trim()) {
        errores.direccion = "Indica la dirección para la instalación o el flete.";
    }
    return errores;
};

const FilaCarrito = ({ item, onError }: { item: ItemVentana; onError: (e: unknown) => void }) => (
    <Card mode="outlined" style={estilos.tarjeta}>
        <Card.Content style={estilos.filaItem}>
            <DibujoVentana
                tamano={72}
                config={{
                    anchoMm: item.anchoMm, altoMm: item.altoMm, hojas: item.hojas, modelo: "corredera",
                    colorMarco: colorMarcoHex(item.colorNombre), colorVidrio: colorVidrioHex(item.vidrioNombre),
                }}
            />
            <View style={{ flex: 1, gap: 2 }}>
                <Text variant="titleSmall">{item.descripcion}</Text>
                <Text variant="bodySmall" style={estilos.secundario}>
                    {item.serieNombre ? `${item.serieNombre} · ` : ""}{item.anchoMm} × {item.altoMm} mm · {item.colorNombre} · Vidrio {item.vidrioNombre}
                </Text>
                {item.observaciones ? <Text variant="bodySmall" style={estilos.secundario}>Obs.: {item.observaciones}</Text> : null}
            </View>
        </Card.Content>
        <Card.Actions>
            <IconButton icon="minus" mode="outlined" size={18} disabled={item.cantidad <= 1}
                onPress={() => cambiarCantidad(item.id, item.cantidad - 1).catch(onError)} accessibilityLabel="Disminuir cantidad" />
            <Text variant="titleMedium" style={{ minWidth: 28, textAlign: "center" }} accessibilityLabel={`Cantidad ${item.cantidad}`}>{item.cantidad}</Text>
            <IconButton icon="plus" mode="outlined" size={18} disabled={item.cantidad >= LIMITES.maxCantidad}
                onPress={() => cambiarCantidad(item.id, item.cantidad + 1).catch(onError)} accessibilityLabel="Aumentar cantidad" />
            <IconButton icon="delete-outline" iconColor={COLORES.error} onPress={() => quitarDelCarrito(item.id).catch(onError)} accessibilityLabel="Quitar del carrito" />
        </Card.Actions>
    </Card>
);

export default function Carrito() {
    const { usuario } = useAuth();
    const mensaje = useMensaje();
    const items = useCarrito();
    const solicitudes = useSolicitudes();
    const [abierto, setAbierto] = useState(false);
    const [contacto, setContacto] = useState<DatosContacto>(CONTACTO_VACIO);
    const [servicios, setServicios] = useState<Servicio[]>(["FABRICACION"]);
    const [observaciones, setObservaciones] = useState("");
    const [errores, setErrores] = useState<ErroresSolicitud>({});
    const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
    const [errorCarrito, setErrorCarrito] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);

    const abrirSolicitud = () => {
        // Los datos de contacto se recuerdan de la última solicitud; si no hay, se usa el correo de la cuenta.
        const ultima = [...solicitudes].reverse().find((s) => s.usuario === usuario);
        setContacto(ultima?.contacto ?? { ...CONTACTO_VACIO, email: usuario });
        setErrores({});
        setErrorEnvio(null);
        setAbierto(true);
    };

    const alternarServicio = (servicio: Servicio) =>
        setServicios((previos) => (previos.includes(servicio) ? previos.filter((s) => s !== servicio) : [...previos, servicio]));

    const enviar = async () => {
        const encontrados = validar(contacto, servicios);
        setErrores(encontrados);
        if (Object.keys(encontrados).length > 0) return;
        setEnviando(true);
        setErrorEnvio(null);
        try {
            await enviarSolicitud({
                contacto: {
                    nombre: contacto.nombre.trim(),
                    email: contacto.email.trim(),
                    telefono: contacto.telefono.trim(),
                    direccion: contacto.direccion.trim(),
                },
                servicios,
                observaciones: observaciones.trim(),
            });
            setAbierto(false);
            setObservaciones("");
            mensaje("Solicitud enviada. Te avisaremos cuando la empresa responda.");
            router.navigate("/mis-cotizaciones");
        } catch (error) {
            setErrorEnvio(mensajeDeError(error, "No se pudo enviar la solicitud. Inténtalo nuevamente."));
        } finally {
            setEnviando(false);
        }
    };

    const campo = (nombre: keyof DatosContacto) => ({
        value: contacto[nombre],
        onChangeText: (texto: string) => setContacto((previo) => ({ ...previo, [nombre]: texto })),
        error: errores[nombre],
    });

    if (items.length === 0) {
        return (
            <Pantalla>
                <Vacio
                    icono="cart-outline"
                    titulo="Tu carrito está vacío"
                    texto="Diseña una ventana, mírala en tu pared con realidad aumentada y agrégala aquí para cotizarla."
                    accion={{ etiqueta: "Diseñar una ventana", onPress: () => router.navigate("/disenar") }}
                />
            </Pantalla>
        );
    }

    return (
        <Pantalla>
            {errorCarrito && <Aviso tipo="error" texto={errorCarrito} />}
            {items.map((item) => (
                <FilaCarrito key={item.id} item={item} onError={(e) => setErrorCarrito(mensajeDeError(e, "No se pudo actualizar el carrito."))} />
            ))}

            <Card style={estilos.tarjeta}>
                <Card.Content style={{ gap: 6 }}>
                    <Text variant="titleMedium">Resumen</Text>
                    <Text variant="bodyMedium">{cantidadVentanas(items)} ventana(s) en {items.length} tipo(s) distinto(s).</Text>
                    <Text variant="bodySmall" style={estilos.secundario}>Los valores los define la empresa al responder tu solicitud.</Text>
                </Card.Content>
                <Card.Actions style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                    <Button mode="contained" icon="file-send-outline" onPress={abrirSolicitud}>Solicitar cotización</Button>
                    <Button onPress={() => router.navigate("/disenar")}>Agregar otra ventana</Button>
                </Card.Actions>
            </Card>

            <HojaFormulario
                visible={abierto}
                titulo="Solicitar cotización"
                onCerrar={() => setAbierto(false)}
                onGuardar={enviar}
                guardando={enviando}
                etiquetaGuardar="Enviar solicitud"
            >
                <Text variant="bodyMedium" style={estilos.secundario}>
                    La empresa recibirá tu solicitud y te responderá en la app; también puede avisarte por correo.
                </Text>
                <Campo label="Nombre" {...campo("nombre")} autoComplete="name" />
                <Campo label="Correo" {...campo("email")} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
                <Campo label="Teléfono (opcional)" {...campo("telefono")} keyboardType="phone-pad" autoComplete="tel" />
                <Campo label="Dirección de la obra" {...campo("direccion")} autoComplete="street-address" />

                <Text variant="titleSmall">Servicios que necesitas</Text>
                {SERVICIOS.map(({ valor, etiqueta }) => (
                    <Checkbox.Item
                        key={valor}
                        label={etiqueta}
                        status={servicios.includes(valor) ? "checked" : "unchecked"}
                        onPress={() => alternarServicio(valor)}
                        position="leading"
                        labelStyle={{ textAlign: "left" }}
                    />
                ))}
                {errores.servicios && <HelperText type="error">{errores.servicios}</HelperText>}

                <Campo label="Comentarios (opcional)" value={observaciones} onChangeText={setObservaciones} multiline numberOfLines={3} />
                {errorEnvio && <Aviso tipo="error" texto={errorEnvio} />}
                <Button mode="contained" onPress={enviar} loading={enviando} disabled={enviando}>Enviar solicitud</Button>
            </HojaFormulario>
        </Pantalla>
    );
}

const estilos = StyleSheet.create({
    tarjeta: { backgroundColor: "#fff" },
    filaItem: { flexDirection: "row", gap: 12, alignItems: "center" },
    secundario: { color: COLORES.textoSecundario },
});
