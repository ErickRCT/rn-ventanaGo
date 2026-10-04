import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Chip, Text } from "react-native-paper";
import { cotizarVentana } from "@/api/cotizaciones";
import { mensajeDeError } from "@/api/http";
import { agregarAlCarrito } from "@/api/solicitudes";
import { BotonRealidadAumentada } from "@/ar/BotonRealidadAumentada";
import { aNumero, formatoPesos } from "@/lib/formato";
import { LIMITES } from "@/lib/tipos";
import { Campo, NUMERICO } from "@/ui/Campo";
import { Aviso, Cargando, ErrorCarga } from "@/ui/Estados";
import { ImagenCatalogo, PuntoColor } from "@/ui/Imagen";
import { useMensaje } from "@/ui/Mensajes";
import { Pantalla } from "@/ui/Pantalla";
import { Selector } from "@/ui/Selector";
import { COLORES } from "@/ui/tema";
import {
    cargarCatalogo, cargarPautas, colorMarcoHex, colorVidrioHex, limitesDeModelo, problemasDePrecio,
    type Catalogo, type OpcionCatalogo, type PautaCatalogo,
} from "@/ventana/catalogo";
import { DibujoVentana } from "@/ventana/DibujoVentana";
import { hexACss, type ConfigVentana } from "@/ventana/geometria";

const { minMm: MIN_MM, maxCantidad: MAX_CANTIDAD } = LIMITES;
// Mismo IVA que aplica Crear Cotización sobre el neto.
const IVA = 0.19;

const limitar = (valor: number, minimo: number, maximo: number) => Math.min(maximo, Math.max(minimo, valor));

const errorMedida = (texto: string, maximo: number) => {
    const valor = aNumero(texto);
    if (!Number.isFinite(valor)) return "Ingresa una medida.";
    if (valor < MIN_MM || valor > maximo) return `Entre ${MIN_MM} y ${maximo} mm.`;
    return null;
};

const errorCantidad = (texto: string) => {
    const valor = aNumero(texto);
    return Number.isInteger(valor) && valor >= 1 && valor <= MAX_CANTIDAD ? null : `Entre 1 y ${MAX_CANTIDAD}.`;
};

// ---------- Elegir pauta ----------

const TODAS = "Todas";

interface SelectorPautaProps {
    pautas: PautaCatalogo[] | null;
    error: string | null;
    onReintentar: () => void;
    onElegir: (pauta: PautaCatalogo) => void;
}

const SelectorPauta = ({ pautas, error, onReintentar, onElegir }: SelectorPautaProps) => {
    const [serie, setSerie] = useState(TODAS);

    if (error) return <ErrorCarga mensaje={error} onReintentar={onReintentar} />;
    if (pautas === null) return <Cargando texto="Cargando modelos de ventana…" />;
    if (pautas.length === 0) return <Aviso texto="Aún no hay pautas disponibles para cotizar." />;

    const series = [...new Set(pautas.map((p) => p.serieNombre))];
    const visibles = pautas.filter((p) => serie === TODAS || p.serieNombre === serie);

    return (
        <View style={{ gap: 12 }}>
            <Text variant="titleMedium">Elige el modelo de tu ventana</Text>
            {series.length > 1 && (
                <View style={estilos.chips}>
                    {[TODAS, ...series].map((nombre) => (
                        <Chip key={nombre} selected={nombre === serie} showSelectedOverlay onPress={() => setSerie(nombre)}>{nombre}</Chip>
                    ))}
                </View>
            )}
            <View style={estilos.grilla}>
                {visibles.map((item) => (
                    <Pressable
                        key={item.pauta.pautaId}
                        onPress={() => onElegir(item)}
                        style={({ pressed }) => [estilos.celda, pressed && { opacity: 0.7 }]}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.pauta.nombre.trim()}, serie ${item.serieNombre}`}
                    >
                        <Card mode="outlined" style={estilos.tarjetaPauta}>
                            <View style={estilos.imagenPauta}>
                                <ImagenCatalogo ruta={item.pauta.tipoPauta?.rutaImagen} tamano={120} />
                            </View>
                            <Card.Content style={{ gap: 2 }}>
                                <Text variant="bodyMedium" style={{ fontWeight: "600", textAlign: "center" }} numberOfLines={3}>
                                    {item.pauta.nombre.trim()}
                                </Text>
                                <Text variant="bodySmall" style={{ color: COLORES.textoSecundario, textAlign: "center" }}>{item.serieNombre}</Text>
                            </Card.Content>
                        </Card>
                    </Pressable>
                ))}
            </View>
        </View>
    );
};

// ---------- Diseñar ----------

export default function DisenarVentana() {
    const mensaje = useMensaje();
    const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
    const [pautas, setPautas] = useState<PautaCatalogo[] | null>(null);
    const [errorPautas, setErrorPautas] = useState<string | null>(null);
    const [elegida, setElegida] = useState<PautaCatalogo | null>(null);
    const [ancho, setAncho] = useState("1200");
    const [alto, setAlto] = useState("1000");
    const [cantidad, setCantidad] = useState("1");
    const [color, setColor] = useState<OpcionCatalogo | null>(null);
    const [vidrio, setVidrio] = useState<OpcionCatalogo | null>(null);
    const [observaciones, setObservaciones] = useState("");
    const [intentoAgregar, setIntentoAgregar] = useState(false);
    // Último precio calculado, con la combinación de datos a la que corresponde.
    const [precio, setPrecio] = useState<{ clave: string; neto: number } | null>(null);
    const [agregando, setAgregando] = useState(false);
    const [errorAgregar, setErrorAgregar] = useState<string | null>(null);
    const [refrescando, setRefrescando] = useState(false);

    const obtenerPautas = () =>
        cargarPautas().then(
            (lista) => {
                setPautas(lista);
                setErrorPautas(null);
            },
            (error) => setErrorPautas(mensajeDeError(error, "No se pudieron cargar los modelos. Revisa tu conexión e inténtalo nuevamente.")),
        );

    useEffect(() => {
        void obtenerPautas();
        void cargarCatalogo().then((cargado) => {
            setCatalogo(cargado);
            setColor(cargado.colores[0] ?? null);
            setVidrio(cargado.vidrios[0] ?? null);
        });
    }, []);

    const hojas = elegida?.hojas ?? 2;
    const modelo = elegida?.modelo ?? "corredera";
    // Los máximos dependen de la forma: una corredera de 6 hojas admite mucho más ancho que una puerta.
    const { maxAnchoMm, maxAltoMm } = limitesDeModelo(modelo, hojas);
    const errores = { ancho: errorMedida(ancho, maxAnchoMm), alto: errorMedida(alto, maxAltoMm), cantidad: errorCantidad(cantidad) };
    const hayErrores = Object.values(errores).some(Boolean);
    const medidasValidas = !errores.ancho && !errores.alto;
    const pauta = elegida?.pauta;
    const conRefuerzo = Boolean(pauta?.isReforzada)
        && (aNumero(ancho) >= (pauta?.horizontalReforzada ?? 0) || aNumero(alto) >= (pauta?.verticalReforzada ?? 0));
    const mostrar = (error: string | null) => (intentoAgregar ? error : error && error !== "Ingresa una medida." ? error : null);

    // Mientras se escribe, el dibujo usa la medida válida más cercana.
    const config: ConfigVentana = {
        anchoMm: limitar(aNumero(ancho) || MIN_MM, MIN_MM, maxAnchoMm),
        altoMm: limitar(aNumero(alto) || MIN_MM, MIN_MM, maxAltoMm),
        hojas,
        modelo,
        colorMarco: colorMarcoHex(color?.nombre ?? ""),
        colorVidrio: colorVidrioHex(vidrio?.nombre ?? ""),
    };

    // Con una pauta mal cargada el backend daría un precio irreal: en ese caso se muestra "a confirmar".
    const precioConfiable = elegida ? problemasDePrecio(elegida.pauta).length === 0 : true;

    // El precio lo calcula el backend con el mismo cálculo de Crear Cotización, sin guardar la ventana.
    const clavePrecio = `${elegida?.pauta.pautaId}|${ancho}|${alto}|${color?.id}|${vidrio?.id}`;
    // Si cambió algún dato, el precio anterior ya no vale y se muestra "Calculando…".
    const precioNeto = precio?.clave === clavePrecio ? precio.neto : null;
    useEffect(() => {
        if (!elegida || !precioConfiable || !medidasValidas || color?.id == null || vidrio?.id == null) return;
        let cancelado = false;
        const temporizador = setTimeout(async () => {
            try {
                const ventana = await cotizarVentana({
                    ventanaId: null,
                    descripcion: elegida.pauta.nombre.trim(),
                    cantidad: 1,
                    ancho: aNumero(ancho),
                    alto: aNumero(alto),
                    observaciones: "",
                    precioNeto: 0,
                    cotizacionId: null,
                    color: { colorId: color.id, nombre: color.nombre, valor: color.valor ?? 0 },
                    vidrio: { vidrioId: vidrio.id, nombre: vidrio.nombre, valor: vidrio.valor ?? 0 },
                    pauta: elegida.pauta,
                });
                if (!cancelado) setPrecio({ clave: clavePrecio, neto: ventana.precioNeto ?? 0 });
            } catch (error) {
                console.warn("Error al calcular el precio de la ventana:", error);
            }
        }, 500);
        return () => {
            cancelado = true;
            clearTimeout(temporizador);
        };
    }, [elegida, precioConfiable, ancho, alto, medidasValidas, color, vidrio, clavePrecio]);

    const agregar = async () => {
        setIntentoAgregar(true);
        setErrorAgregar(null);
        if (!elegida || hayErrores || !color || !vidrio) return;
        setAgregando(true);
        try {
            await agregarAlCarrito({
                descripcion: elegida.pauta.nombre.trim(),
                pautaId: elegida.pauta.pautaId ?? undefined,
                serieNombre: elegida.serieNombre,
                imagenPauta: elegida.pauta.tipoPauta?.rutaImagen || undefined,
                hojas,
                anchoMm: aNumero(ancho),
                altoMm: aNumero(alto),
                cantidad: aNumero(cantidad),
                colorId: color.id,
                colorNombre: color.nombre,
                vidrioId: vidrio.id,
                vidrioNombre: vidrio.nombre,
                observaciones: observaciones.trim(),
            });
            setIntentoAgregar(false);
            mensaje({ texto: "Ventana agregada al carrito.", accion: { etiqueta: "Ver carrito", onPress: () => router.navigate("/carrito") } });
        } catch (error) {
            setErrorAgregar(mensajeDeError(error, "No se pudo agregar la ventana al carrito. Inténtalo nuevamente."));
        } finally {
            setAgregando(false);
        }
    };

    if (!elegida) {
        return (
            <Pantalla
                refrescando={refrescando}
                onRefrescar={async () => {
                    setRefrescando(true);
                    await obtenerPautas();
                    setRefrescando(false);
                }}
            >
                <SelectorPauta pautas={pautas} error={errorPautas} onReintentar={obtenerPautas} onElegir={(p) => {
                    setElegida(p);
                    setIntentoAgregar(false);
                }} />
            </Pantalla>
        );
    }

    return (
        <Pantalla>
            {catalogo?.basico && <Aviso texto="No se pudo cargar el catálogo de colores y vidrios; se muestran opciones básicas." />}

            <Card mode="outlined" style={estilos.blanco}>
                <Card.Content style={estilos.filaPauta}>
                    <ImagenCatalogo ruta={elegida.pauta.tipoPauta?.rutaImagen} tamano={64} />
                    <View style={{ flex: 1 }}>
                        <Text variant="titleMedium">{elegida.pauta.nombre.trim()}</Text>
                        <Text variant="bodySmall" style={{ color: COLORES.textoSecundario }}>Serie {elegida.serieNombre}</Text>
                    </View>
                </Card.Content>
                <Card.Actions>
                    <Button icon="swap-horizontal" onPress={() => setElegida(null)}>Cambiar modelo</Button>
                </Card.Actions>
            </Card>

            <Card mode="outlined" style={estilos.blanco}>
                <Card.Content style={{ alignItems: "center", gap: 8 }}>
                    <DibujoVentana config={config} tamano={240} />
                    <Text variant="bodySmall" style={{ color: COLORES.textoSecundario }}>
                        Vista de frente · {config.anchoMm} × {config.altoMm} mm
                    </Text>
                </Card.Content>
            </Card>

            <BotonRealidadAumentada config={config} nombre={elegida.pauta.nombre.trim()} deshabilitado={!medidasValidas} />

            {pauta?.isReforzada && (
                <Aviso
                    tipo={conRefuerzo ? "aviso" : "info"}
                    texto={`${conRefuerzo ? "Con estas medidas la ventana lleva refuerzo. " : ""}Reforzado desde ${pauta.horizontalReforzada} mm de ancho o ${pauta.verticalReforzada} mm de alto.`}
                />
            )}

            <View style={estilos.fila}>
                <Campo style={{ flex: 1 }} label="Ancho (mm)" value={ancho} onChangeText={setAncho} {...NUMERICO} error={mostrar(errores.ancho)} />
                <Campo style={{ flex: 1 }} label="Alto (mm)" value={alto} onChangeText={setAlto} {...NUMERICO} error={mostrar(errores.alto)} />
            </View>

            <Selector
                etiqueta="Color del marco"
                opciones={catalogo?.colores ?? []}
                valor={color}
                onCambiar={setColor}
                textoDe={(c) => c.nombre}
                claveDe={(c) => c.nombre}
                izquierdaDe={(c) => <PuntoColor color={hexACss(colorMarcoHex(c.nombre))} />}
                deshabilitado={!catalogo}
            />
            <Selector
                etiqueta="Vidrio"
                opciones={catalogo?.vidrios ?? []}
                valor={vidrio}
                onCambiar={setVidrio}
                textoDe={(v) => v.nombre}
                claveDe={(v) => v.nombre}
                deshabilitado={!catalogo}
            />
            <Campo label="Cantidad" value={cantidad} onChangeText={setCantidad} {...NUMERICO} error={mostrar(errores.cantidad)} style={{ maxWidth: 160 }} />
            <Campo label="Observaciones (opcional)" value={observaciones} onChangeText={setObservaciones} multiline numberOfLines={3} />

            <Card mode="outlined" style={estilos.blanco}>
                <Card.Content style={{ gap: 2 }}>
                    <Text variant="titleSmall">Precio estimado</Text>
                    {!precioConfiable ? (
                        <Text variant="bodyMedium" style={{ color: COLORES.textoSecundario }}>A confirmar por la empresa.</Text>
                    ) : precioNeto === null ? (
                        <Text variant="bodyMedium" style={{ color: COLORES.textoSecundario }}>
                            {medidasValidas ? "Calculando…" : "Ingresa medidas válidas para ver el precio."}
                        </Text>
                    ) : (
                        <>
                            <Text variant="bodyMedium">Neto: {formatoPesos(precioNeto)}</Text>
                            <Text variant="bodyMedium">IVA 19%: {formatoPesos(precioNeto * IVA)}</Text>
                            <Text variant="titleMedium">Total con IVA: {formatoPesos(precioNeto * (1 + IVA))}</Text>
                            <Text variant="bodySmall" style={{ color: COLORES.textoSecundario }}>Precio por unidad.</Text>
                        </>
                    )}
                </Card.Content>
            </Card>

            <Button mode="contained" icon="cart-plus" onPress={agregar} loading={agregando} disabled={!catalogo || agregando} contentStyle={{ paddingVertical: 6 }}>
                {agregando ? "Agregando…" : "Agregar al carrito"}
            </Button>
            {errorAgregar && <Aviso tipo="error" texto={errorAgregar} />}
            <Text variant="bodySmall" style={{ color: COLORES.textoSecundario }}>
                Las medidas son referenciales: la empresa las confirma en terreno antes de fabricar.
            </Text>
        </Pantalla>
    );
}

const estilos = StyleSheet.create({
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    grilla: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
    celda: { width: "50%", padding: 6 },
    tarjetaPauta: { backgroundColor: "#fff", flex: 1, paddingBottom: 8 },
    imagenPauta: { alignItems: "center", padding: 8 },
    blanco: { backgroundColor: "#fff" },
    filaPauta: { flexDirection: "row", gap: 12, alignItems: "center" },
    fila: { flexDirection: "row", gap: 12 },
});
