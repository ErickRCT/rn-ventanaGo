import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Chip, Divider, Switch, Text } from "react-native-paper";
import { abrirCorreoRespuesta } from "@/api/correo";
import { mensajeDeError } from "@/api/http";
import { responderSolicitud } from "@/api/solicitudes";
import { aNumero, formatoFechaHora, formatoPesos } from "@/lib/formato";
import { etiquetaServicio, LIMITES, type ItemVentana, type Solicitud } from "@/lib/tipos";
import { Campo, NUMERICO } from "@/ui/Campo";
import { Aviso } from "@/ui/Estados";
import { HojaFormulario } from "@/ui/HojaFormulario";
import { useMensaje } from "@/ui/Mensajes";
import { ChipEstado, ListaItems } from "@/ui/Solicitudes";
import { COLORES } from "@/ui/tema";

type Accion = "ACEPTADA" | "MODIFICADA" | "RECHAZADA";

/** Ventana en edición: los números se guardan como texto para poder borrar y reescribir el campo. */
interface Borrador {
    id: string;
    anchoMm: string;
    altoMm: string;
    cantidad: string;
    precio: string;
}

const TITULO_ACCION: Record<Accion, string> = {
    ACEPTADA: "Aceptar solicitud",
    MODIFICADA: "Modificar solicitud",
    RECHAZADA: "Rechazar solicitud",
};

const enteroEnRango = (texto: string, minimo: number, maximo: number) => {
    const valor = aNumero(texto);
    return Number.isInteger(valor) && valor >= minimo && valor <= maximo ? valor : null;
};

interface DetalleSolicitudProps {
    solicitud: Solicitud;
    onCerrar: () => void;
}

export const DetalleSolicitud = ({ solicitud, onCerrar }: DetalleSolicitudProps) => {
    const mensajeApp = useMensaje();
    const [accion, setAccion] = useState<Accion | null>(null);
    const [borrador, setBorrador] = useState<Borrador[]>([]);
    const [mensaje, setMensaje] = useState("");
    const [notificarEnApp, setNotificarEnApp] = useState(true);
    const [notificarPorCorreo, setNotificarPorCorreo] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);

    const pendiente = solicitud.estado === "PENDIENTE";
    const editaMedidas = accion === "MODIFICADA";

    const elegirAccion = (nueva: Accion) => {
        setAccion(nueva);
        setError(null);
        setBorrador(solicitud.items.map((item) => ({
            id: item.id,
            anchoMm: String(item.anchoMm),
            altoMm: String(item.altoMm),
            cantidad: String(item.cantidad),
            precio: item.precioUnitario === null ? "" : String(item.precioUnitario),
        })));
    };

    const cambiar = (id: string, campo: keyof Omit<Borrador, "id">, valor: string) => {
        setError(null);
        setBorrador((previo) => previo.map((fila) => (fila.id === id ? { ...fila, [campo]: valor } : fila)));
    };

    /** Ventanas con lo que se escribió, o el texto del primer problema. */
    const construirItems = (): ItemVentana[] | string => {
        const resultado: ItemVentana[] = [];
        for (const original of solicitud.items) {
            const fila = borrador.find((b) => b.id === original.id);
            if (!fila) return "Falta una ventana en el borrador.";
            const anchoMm = enteroEnRango(fila.anchoMm, LIMITES.minMm, LIMITES.maxAnchoMm);
            const altoMm = enteroEnRango(fila.altoMm, LIMITES.minMm, LIMITES.maxAltoMm);
            const cantidad = enteroEnRango(fila.cantidad, 1, LIMITES.maxCantidad);
            const precioUnitario = enteroEnRango(fila.precio, 1, 100_000_000);
            if (anchoMm === null) return `El ancho debe estar entre ${LIMITES.minMm} y ${LIMITES.maxAnchoMm} mm.`;
            if (altoMm === null) return `El alto debe estar entre ${LIMITES.minMm} y ${LIMITES.maxAltoMm} mm.`;
            if (cantidad === null) return `La cantidad debe estar entre 1 y ${LIMITES.maxCantidad}.`;
            if (precioUnitario === null) return "Ingresa el precio unitario de todas las ventanas.";
            resultado.push({ ...original, anchoMm, altoMm, cantidad, precioUnitario });
        }
        return resultado;
    };

    const enviar = async () => {
        if (!accion) return;
        let items = solicitud.items;
        if (accion !== "RECHAZADA") {
            const construidos = construirItems();
            if (typeof construidos === "string") return setError(construidos);
            items = construidos;
            const cambioMedidas = items.some((item, i) => {
                const original = solicitud.items[i];
                return item.anchoMm !== original.anchoMm || item.altoMm !== original.altoMm || item.cantidad !== original.cantidad;
            });
            if (accion === "MODIFICADA" && !cambioMedidas) return setError("No cambiaste medidas ni cantidades. Si estás de acuerdo con lo pedido, usa Aceptar.");
            if (accion === "ACEPTADA" && cambioMedidas) return setError("Cambiaste medidas o cantidades: usa Modificar para informarlo al cliente.");
        }
        if (accion !== "ACEPTADA" && !mensaje.trim()) {
            return setError(accion === "RECHAZADA" ? "Indica el motivo del rechazo." : "Explica al cliente qué modificaste.");
        }

        setEnviando(true);
        try {
            const actualizada = await responderSolicitud(solicitud.numero, { estado: accion, mensaje: mensaje.trim(), items, notificarEnApp, notificarPorCorreo });
            mensajeApp("Respuesta registrada.");
            if (notificarPorCorreo) await abrirCorreoRespuesta(actualizada).catch(() => mensajeApp("No se encontró una app de correo en el teléfono."));
            onCerrar();
        } catch (e) {
            setError(mensajeDeError(e, "No se pudo registrar la respuesta. Inténtalo nuevamente."));
        } finally {
            setEnviando(false);
        }
    };

    const total = solicitud.respuesta?.total ?? null;

    return (
        <HojaFormulario visible titulo={`Solicitud N°${solicitud.numero}`} onCerrar={onCerrar}>
            <View style={estilos.fila}>
                <ChipEstado estado={solicitud.estado} />
                <Text variant="bodySmall" style={estilos.secundario}>Recibida el {formatoFechaHora(solicitud.fecha)}</Text>
            </View>

            <Card mode="outlined" style={estilos.tarjeta}>
                <Card.Content style={{ gap: 2 }}>
                    <Text variant="titleMedium">{solicitud.contacto.nombre}</Text>
                    <Text variant="bodyMedium" style={estilos.secundario}>
                        {solicitud.contacto.email}{solicitud.contacto.telefono ? ` · ${solicitud.contacto.telefono}` : ""}
                    </Text>
                    {solicitud.contacto.direccion ? <Text variant="bodyMedium" style={estilos.secundario}>{solicitud.contacto.direccion}</Text> : null}
                    <View style={[estilos.fila, { marginTop: 6 }]}>
                        {solicitud.servicios.map((s) => <Chip key={s} compact mode="outlined">{etiquetaServicio(s)}</Chip>)}
                    </View>
                </Card.Content>
            </Card>

            {solicitud.observaciones ? <Aviso texto={`Comentarios del cliente: ${solicitud.observaciones}`} /> : null}

            {(!accion || accion === "RECHAZADA") && (
                <Card mode="outlined" style={estilos.tarjeta}>
                    <Card.Content style={{ gap: 8 }}>
                        {solicitud.itemsOriginales && (
                            <>
                                <Text variant="titleSmall">Solicitado por el cliente</Text>
                                <ListaItems items={solicitud.itemsOriginales} />
                                <Divider />
                                <Text variant="titleSmall">Propuesta enviada</Text>
                            </>
                        )}
                        <ListaItems items={solicitud.items} />
                    </Card.Content>
                </Card>
            )}

            {accion && accion !== "RECHAZADA" && (
                <>
                    <Text variant="titleSmall">
                        {editaMedidas ? "Ajusta medidas, cantidades y precios" : "Define el precio unitario de cada ventana"}
                    </Text>
                    {solicitud.items.map((item) => {
                        const fila = borrador.find((b) => b.id === item.id);
                        if (!fila) return null;
                        return (
                            <Card key={item.id} mode="outlined" style={estilos.tarjeta}>
                                <Card.Content style={{ gap: 8 }}>
                                    <Text variant="titleSmall">{item.descripcion}</Text>
                                    <Text variant="bodySmall" style={estilos.secundario}>{item.colorNombre} / {item.vidrioNombre}</Text>
                                    <View style={estilos.fila}>
                                        <Campo style={{ flex: 1 }} label="Ancho (mm)" value={fila.anchoMm} disabled={!editaMedidas} onChangeText={(t) => cambiar(item.id, "anchoMm", t)} {...NUMERICO} />
                                        <Campo style={{ flex: 1 }} label="Alto (mm)" value={fila.altoMm} disabled={!editaMedidas} onChangeText={(t) => cambiar(item.id, "altoMm", t)} {...NUMERICO} />
                                    </View>
                                    <View style={estilos.fila}>
                                        <Campo style={{ flex: 1 }} label="Cantidad" value={fila.cantidad} disabled={!editaMedidas} onChangeText={(t) => cambiar(item.id, "cantidad", t)} {...NUMERICO} />
                                        <Campo style={{ flex: 1.4 }} label="Precio unitario" unidad="$" value={fila.precio} onChangeText={(t) => cambiar(item.id, "precio", t)} {...NUMERICO} />
                                    </View>
                                </Card.Content>
                            </Card>
                        );
                    })}
                </>
            )}

            {accion && (
                <>
                    <Campo
                        label={accion === "RECHAZADA" ? "Motivo del rechazo" : accion === "MODIFICADA" ? "Qué modificaste" : "Mensaje al cliente (opcional)"}
                        value={mensaje}
                        onChangeText={(t) => {
                            setError(null);
                            setMensaje(t);
                        }}
                        multiline
                        numberOfLines={3}
                    />
                    <View style={estilos.interruptor}>
                        <Text style={{ flex: 1 }}>Avisar en la app</Text>
                        <Switch value={notificarEnApp} onValueChange={setNotificarEnApp} />
                    </View>
                    <View style={estilos.interruptor}>
                        <Text style={{ flex: 1 }}>Avisar por correo a {solicitud.contacto.email}</Text>
                        <Switch value={notificarPorCorreo} onValueChange={setNotificarPorCorreo} />
                    </View>
                    {notificarPorCorreo && (
                        <Text variant="bodySmall" style={estilos.secundario}>Se abrirá tu app de correo con el mensaje listo para enviar.</Text>
                    )}
                </>
            )}

            {!pendiente && solicitud.respuesta && (
                <Aviso
                    titulo={`Respondida el ${formatoFechaHora(solicitud.respuesta.fecha)}${total !== null ? ` · Total ${formatoPesos(total)}` : ""}`}
                    texto={solicitud.respuesta.mensaje || undefined}
                >
                    <Text variant="bodySmall">
                        Aviso en la app: {solicitud.respuesta.notificadoEnApp ? "sí" : "no"} · Correo: {solicitud.respuesta.notificadoPorCorreo ? "sí" : "no"}
                    </Text>
                </Aviso>
            )}

            {accion && error && <Aviso tipo="error" texto={error} />}

            <View style={estilos.botones}>
                {!accion && pendiente && (
                    <>
                        <Button mode="contained" icon="check" onPress={() => elegirAccion("ACEPTADA")}>Aceptar</Button>
                        <Button mode="outlined" icon="pencil" onPress={() => elegirAccion("MODIFICADA")}>Modificar</Button>
                        <Button mode="outlined" icon="close" textColor={COLORES.error} onPress={() => elegirAccion("RECHAZADA")}>Rechazar</Button>
                    </>
                )}
                {!accion && !pendiente && (
                    <Button mode="outlined" icon="email-outline" onPress={() => abrirCorreoRespuesta(solicitud).catch(() => mensajeApp("No se encontró una app de correo en el teléfono."))}>
                        Preparar correo
                    </Button>
                )}
                {accion && (
                    <>
                        <Button
                            mode="contained"
                            buttonColor={accion === "RECHAZADA" ? COLORES.error : undefined}
                            onPress={enviar}
                            loading={enviando}
                            disabled={enviando}
                        >
                            {TITULO_ACCION[accion]} y responder
                        </Button>
                        <Button onPress={() => setAccion(null)}>Volver</Button>
                    </>
                )}
            </View>
        </HojaFormulario>
    );
};

const estilos = StyleSheet.create({
    fila: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
    tarjeta: { backgroundColor: "#fff" },
    secundario: { color: COLORES.textoSecundario },
    interruptor: { flexDirection: "row", alignItems: "center", gap: 12 },
    botones: { gap: 8, marginTop: 4 },
});
