import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Chip, Divider, IconButton, Portal, Text, Modal as ModalPaper, ActivityIndicator } from "react-native-paper";
import { getColores, getPautasDeSerie, getSeries, getVidrios } from "@/api/catalogo";
import {
    deleteVentana, descargarDocumento, getClientes, getCotizacion, postCotizacion, postVentana, putCotizacion, type TipoDocumento,
} from "@/api/cotizaciones";
import { mensajeDeError } from "@/api/http";
import { aNumero, formatoNumero, formatoPesos } from "@/lib/formato";
import type { Cliente, Color, Cotizacion, Pauta, Serie, Vidrio } from "@/lib/tipos";
import { Campo, NUMERICO } from "@/ui/Campo";
import { Aviso, Cargando, ErrorCarga } from "@/ui/Estados";
import { HojaFormulario } from "@/ui/HojaFormulario";
import { ImagenCatalogo } from "@/ui/Imagen";
import { confirmar, useMensaje } from "@/ui/Mensajes";
import { Pantalla } from "@/ui/Pantalla";
import { Selector } from "@/ui/Selector";
import { COLORES } from "@/ui/tema";
import { FormularioCliente } from "./FormularioCliente";
import { FormularioVentana, type DatosVentana } from "./FormularioVentana";

const COTIZACION_NUEVA = (): Cotizacion => ({
    cotizacionId: null, cliente: null, nombreCotizacion: null, estado: "CREADA", fecha: new Date().toISOString().split("T")[0],
    ganancia: 50, descuento: 0, neto: 0, valorFinal: 0, totalm2: 0, cantidadProductos: 1, valorManoDeObra: 0,
    flete: null, valorFlete: 0, instalacion: null, valorInstalacion: 0, otrosGastos: null, valorOtrosGastos: 0, condiciones: null, ventanas: [],
});

interface CostosExtras {
    flete: string;
    valorFlete: string;
    instalacion: string;
    valorInstalacion: string;
    otrosGastos: string;
    valorOtrosGastos: string;
    valorManoDeObra: string;
}

const costosDe = (c: Cotizacion): CostosExtras => ({
    flete: c.flete ?? "",
    valorFlete: c.valorFlete ? String(c.valorFlete) : "",
    instalacion: c.instalacion ?? "",
    valorInstalacion: c.valorInstalacion ? String(c.valorInstalacion) : "",
    otrosGastos: c.otrosGastos ?? "",
    valorOtrosGastos: c.valorOtrosGastos ? String(c.valorOtrosGastos) : "",
    valorManoDeObra: c.valorManoDeObra ? String(c.valorManoDeObra) : "",
});

const valor = (texto: string) => {
    const n = aNumero(texto);
    return Number.isFinite(n) ? n : 0;
};

/** Mismo cálculo que el resumen de la web: ganancia y descuento sobre las ventanas, luego costos extra e IVA. */
const calcular = (neto: number, ganancia: number, descuento: number, extras: CostosExtras) => {
    const costosExtras = valor(extras.valorFlete) + valor(extras.valorInstalacion) + valor(extras.valorManoDeObra) + valor(extras.valorOtrosGastos);
    let ventanasConGanancia = neto + (neto * ganancia) / 100;
    if (descuento > 0) ventanasConGanancia -= (ventanasConGanancia * descuento) / 100;
    const subtotal = ventanasConGanancia + costosExtras;
    const iva = subtotal * 0.19;
    return { neto, ventanasConGanancia, costosExtras, subtotal, iva, total: subtotal + iva };
};

/** Crear o editar una cotización formal: cliente, ventanas sobre pautas, ganancia, costos extra y PDF. */
export const EditorCotizacion = ({ id }: { id: number | null }) => {
    const mensaje = useMensaje();
    const [cotizacion, setCotizacion] = useState<Cotizacion>(COTIZACION_NUEVA);
    const [cargando, setCargando] = useState(id !== null);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [series, setSeries] = useState<Serie[]>([]);
    const [serie, setSerie] = useState<Serie | null>(null);
    // Pautas de la serie elegida; mientras llegan las de otra serie, se muestra "cargando".
    const [pautasDeSerie, setPautasDeSerie] = useState<{ serieId: number; pautas: Pauta[] } | null>(null);
    const [colores, setColores] = useState<Color[]>([]);
    const [vidrios, setVidrios] = useState<Vidrio[]>([]);
    const [pautaElegida, setPautaElegida] = useState<Pauta | null>(null);
    const [nuevoCliente, setNuevoCliente] = useState(false);
    const [nombre, setNombre] = useState("");
    const [ganancia, setGanancia] = useState("50");
    const [descuento, setDescuento] = useState("");
    const [extras, setExtras] = useState<CostosExtras>(costosDe(COTIZACION_NUEVA()));
    const [editandoExtras, setEditandoExtras] = useState(false);
    const [ocupado, setOcupado] = useState<string | null>(null);

    /** Lee la cotización; solo actualiza el estado cuando responde el servidor. */
    const leerCotizacion = (cotizacionId: number) =>
        getCotizacion(cotizacionId).then((existente) => {
            setCotizacion(existente);
            setNombre(existente.nombreCotizacion ?? "");
            setGanancia(existente.ganancia != null ? String(existente.ganancia) : "");
            setDescuento(existente.descuento ? String(existente.descuento) : "");
            setExtras(costosDe(existente));
            setErrorCarga(null);
            setCargando(false);
        }, (e) => {
            setErrorCarga(mensajeDeError(e, "No se pudo cargar la cotización."));
            setCargando(false);
        });

    useEffect(() => {
        getSeries().then((s) => {
            setSeries(s);
            setSerie((actual) => actual ?? s[0] ?? null);
        }).catch(() => undefined);
        getColores().then(setColores).catch(() => undefined);
        getVidrios().then(setVidrios).catch(() => undefined);
        getClientes().then(setClientes).catch(() => undefined);
        if (id !== null) void leerCotizacion(id);
    }, [id]);

    const reintentarCarga = () => {
        if (id === null) return;
        setErrorCarga(null);
        setCargando(true);
        void leerCotizacion(id);
    };

    const serieId = serie?.serieId ?? null;
    useEffect(() => {
        if (serieId === null) return;
        let cancelado = false;
        getPautasDeSerie(serieId)
            .catch(() => [] as Pauta[])
            .then((pautas) => {
                if (!cancelado) setPautasDeSerie({ serieId, pautas });
            });
        return () => {
            cancelado = true;
        };
    }, [serieId]);
    const pautas = pautasDeSerie?.serieId === serieId ? pautasDeSerie.pautas : null;

    /** Guarda los datos generales si la cotización ya existe (si no, se guardan al agregar la primera ventana). */
    const guardarCambios = async (cambios: Partial<Cotizacion>, aviso?: string) => {
        const actualizada = { ...cotizacion, ...cambios };
        setCotizacion(actualizada);
        if (actualizada.cotizacionId === null) return;
        try {
            const respuesta = await putCotizacion(actualizada);
            setCotizacion(await getCotizacion(respuesta.cotizacionId ?? actualizada.cotizacionId));
            if (aviso) mensaje(aviso);
        } catch (e) {
            mensaje(mensajeDeError(e, "No se pudieron guardar los cambios."));
        }
    };

    const agregarVentana = async (datos: DatosVentana) => {
        setOcupado("ventana");
        try {
            let cotizacionId = cotizacion.cotizacionId;
            if (cotizacionId === null) {
                const nueva = await postCotizacion({ ...cotizacion, nombreCotizacion: nombre.trim() || null });
                cotizacionId = nueva.cotizacionId;
                setCotizacion(nueva);
            }
            if (cotizacionId === null) throw new Error("El servidor no devolvió el número de la cotización.");
            await postVentana({
                ventanaId: null, descripcion: datos.descripcion, cantidad: datos.cantidad, ancho: datos.ancho, alto: datos.alto,
                observaciones: datos.observaciones, precioNeto: 0, cotizacionId, color: datos.color, vidrio: datos.vidrio, pauta: pautaElegida,
            });
            // Igual que la web: se vuelve a leer y a guardar la cotización para que el servidor actualice sus totales.
            const actualizada = await getCotizacion(cotizacionId);
            await putCotizacion(actualizada);
            setCotizacion(await getCotizacion(cotizacionId));
            setPautaElegida(null);
            mensaje("Ventana agregada a la cotización.");
        } catch (e) {
            mensaje(mensajeDeError(e, "No se pudo agregar la ventana."));
        } finally {
            setOcupado(null);
        }
    };

    const quitarVentana = async (ventanaId: number | null, descripcion: string | null) => {
        if (ventanaId === null || cotizacion.cotizacionId === null) return;
        if (!(await confirmar("Eliminar ventana", `¿Quitar "${descripcion ?? "ventana"}" de la cotización?`))) return;
        try {
            await deleteVentana(ventanaId);
            setCotizacion(await getCotizacion(cotizacion.cotizacionId));
        } catch (e) {
            mensaje(mensajeDeError(e, "No se pudo eliminar la ventana."));
        }
    };

    const guardarExtras = async () => {
        const total = valor(extras.valorFlete) + valor(extras.valorInstalacion) + valor(extras.valorManoDeObra) + valor(extras.valorOtrosGastos);
        setEditandoExtras(false);
        // Igual que la web: los costos extra se suman al neto que usa el PDF.
        await guardarCambios({
            flete: extras.flete || null,
            valorFlete: valor(extras.valorFlete),
            instalacion: extras.instalacion || null,
            valorInstalacion: valor(extras.valorInstalacion),
            valorManoDeObra: valor(extras.valorManoDeObra),
            otrosGastos: extras.otrosGastos || null,
            valorOtrosGastos: valor(extras.valorOtrosGastos),
            neto: (cotizacion.neto || 0) + total,
        }, "Costos extra guardados.");
    };

    const descargar = async (tipo: TipoDocumento) => {
        if (cotizacion.cotizacionId === null) return;
        setOcupado(tipo);
        try {
            await descargarDocumento(tipo, cotizacion.cotizacionId);
        } catch (e) {
            mensaje(mensajeDeError(e, "No se pudo descargar el documento. Inténtalo nuevamente."));
        } finally {
            setOcupado(null);
        }
    };

    if (cargando) return <Cargando texto="Cargando cotización…" />;
    if (errorCarga) return <Pantalla><ErrorCarga mensaje={errorCarga} onReintentar={reintentarCarga} /></Pantalla>;

    const valores = calcular(cotizacion.neto || 0, valor(ganancia), valor(descuento), extras);
    const existe = cotizacion.cotizacionId !== null;

    return (
        <Pantalla>
            <Card mode="outlined" style={estilos.tarjeta}>
                <Card.Title title={existe ? `Cotización N°${cotizacion.cotizacionId}` : "Nueva cotización"} subtitle={existe ? `Estado: ${cotizacion.estado}` : "Se guarda al agregar la primera ventana"} />
                <Card.Content style={{ gap: 8 }}>
                    <Selector
                        etiqueta="Cliente"
                        opciones={clientes}
                        valor={cotizacion.cliente}
                        onCambiar={(cliente) => void guardarCambios({ cliente }, "Cliente asignado.")}
                        textoDe={(c) => c.nombre}
                        descripcionDe={(c) => `${c.rut} · ${c.email}`}
                        claveDe={(c) => c.clienteId ?? c.rut}
                        buscador
                    />
                    <Button mode="text" icon="account-plus" onPress={() => setNuevoCliente(true)} style={{ alignSelf: "flex-start" }}>Nuevo cliente</Button>
                    <Campo
                        label="Nombre de la cotización"
                        value={nombre}
                        onChangeText={setNombre}
                        onEndEditing={() => nombre.trim() !== (cotizacion.nombreCotizacion ?? "") && void guardarCambios({ nombreCotizacion: nombre.trim() || null })}
                    />
                </Card.Content>
            </Card>

            <Text variant="titleMedium">Agregar ventana</Text>
            <View style={estilos.chips}>
                {series.map((s) => (
                    <Chip key={s.serieId} selected={s.serieId === serie?.serieId} showSelectedOverlay onPress={() => setSerie(s)}>{s.nombre.trim()}</Chip>
                ))}
            </View>
            {pautas === null ? (
                <Cargando texto="Cargando pautas…" />
            ) : pautas.length === 0 ? (
                <Aviso texto="Esta serie no tiene pautas." />
            ) : (
                <View style={estilos.grilla}>
                    {pautas.map((p) => (
                        <View key={p.pautaId} style={estilos.celda}>
                            <Card mode="outlined" style={estilos.tarjeta} onPress={() => setPautaElegida(p)}>
                                <View style={{ alignItems: "center", paddingTop: 8 }}>
                                    <ImagenCatalogo ruta={p.tipoPauta?.rutaImagen} tamano={88} />
                                </View>
                                <Card.Content>
                                    <Text variant="bodySmall" style={{ textAlign: "center", fontWeight: "600" }} numberOfLines={3}>{p.nombre.trim()}</Text>
                                    {p.isReforzada && <Text variant="labelSmall" style={{ textAlign: "center", color: COLORES.aviso }}>Reforzada</Text>}
                                </Card.Content>
                            </Card>
                        </View>
                    ))}
                </View>
            )}

            {cotizacion.ventanas.length > 0 && (
                <>
                    <Text variant="titleMedium">Ventanas de la cotización</Text>
                    {cotizacion.ventanas.map((v) => (
                        <Card key={v.ventanaId} mode="outlined" style={estilos.tarjeta}>
                            <Card.Title
                                title={v.descripcion || "Sin descripción"}
                                titleStyle={{ color: COLORES.primario }}
                                left={() => <ImagenCatalogo ruta={v.pauta?.tipoPauta?.rutaImagen} tamano={40} />}
                                leftStyle={{ marginRight: 24 }}
                                right={() => <IconButton icon="delete-outline" iconColor={COLORES.error} onPress={() => quitarVentana(v.ventanaId, v.descripcion)} accessibilityLabel="Eliminar ventana" />}
                            />
                            <Card.Content style={{ gap: 2 }}>
                                <Text variant="bodyMedium">{v.cantidad} × {v.ancho} × {v.alto} mm</Text>
                                <Text variant="bodySmall" style={estilos.secundario}>{v.color?.nombre ?? "N/A"} · Vidrio {v.vidrio?.nombre ?? "N/A"}</Text>
                                <Text variant="bodyMedium">Precio: {formatoPesos(v.precioNeto)}</Text>
                            </Card.Content>
                        </Card>
                    ))}

                    <Card mode="outlined" style={estilos.tarjeta}>
                        <Card.Title title="Resumen de precios" />
                        <Card.Content style={{ gap: 8 }}>
                            <View style={estilos.fila}>
                                <Campo style={{ flex: 1 }} label="Ganancia" unidad="%" value={ganancia} onChangeText={setGanancia} {...NUMERICO}
                                    onEndEditing={() => void guardarCambios({ ganancia: valor(ganancia) || null })} />
                                <Campo style={{ flex: 1 }} label="Descuento" unidad="%" value={descuento} onChangeText={setDescuento} {...NUMERICO}
                                    onEndEditing={() => void guardarCambios({ descuento: Math.min(100, valor(descuento)) })} />
                            </View>
                            <Button mode="outlined" icon="cash-plus" onPress={() => setEditandoExtras(true)}>Costos extra</Button>
                            <Divider />
                            <Fila etiqueta="Neto ventanas" valor={valores.neto} />
                            <Fila etiqueta="Ventanas + ganancia − descuento" valor={valores.ventanasConGanancia} />
                            <Fila etiqueta="Costos extra" valor={valores.costosExtras} />
                            <Fila etiqueta="Subtotal" valor={valores.subtotal} />
                            <Fila etiqueta="IVA 19%" valor={valores.iva} />
                            <Fila etiqueta="Valor final" valor={valores.total} destacado />
                            {cotizacion.totalm2 ? <Text variant="bodySmall" style={estilos.secundario}>Total: {formatoNumero(cotizacion.totalm2)} m²</Text> : null}
                        </Card.Content>
                    </Card>

                    <Text variant="titleMedium">Documentos</Text>
                    <View style={estilos.fila}>
                        <Button style={{ flex: 1 }} mode="contained" icon="file-pdf-box" onPress={() => descargar("cotizacion")} loading={ocupado === "cotizacion"} disabled={ocupado !== null}>
                            Cotización
                        </Button>
                        <Button style={{ flex: 1 }} mode="contained-tonal" icon="hammer-wrench" onPress={() => descargar("orden-de-trabajo")} loading={ocupado === "orden-de-trabajo"} disabled={ocupado !== null}>
                            Orden de trabajo
                        </Button>
                    </View>
                </>
            )}

            {pautaElegida && (
            <FormularioVentana
                key={pautaElegida.pautaId}
                pauta={pautaElegida}
                colores={colores}
                vidrios={vidrios}
                guardando={ocupado === "ventana"}
                onCerrar={() => setPautaElegida(null)}
                onAgregar={agregarVentana}
            />
            )}

            {nuevoCliente && (
                <FormularioCliente
                    onCerrar={() => setNuevoCliente(false)}
                    onCreado={(cliente) => {
                        setNuevoCliente(false);
                        setClientes((p) => [cliente, ...p]);
                        void guardarCambios({ cliente }, "Cliente creado y asignado.");
                    }}
                />
            )}

            <HojaFormulario visible={editandoExtras} titulo="Costos extra" onCerrar={() => setEditandoExtras(false)} onGuardar={guardarExtras}>
                {([
                    ["flete", "valorFlete", "Flete"],
                    ["instalacion", "valorInstalacion", "Instalación"],
                    ["otrosGastos", "valorOtrosGastos", "Otros gastos"],
                ] as const).map(([desc, monto, titulo]) => (
                    <View key={desc} style={{ gap: 8 }}>
                        <Text variant="titleSmall">{titulo}</Text>
                        <Campo label="Descripción" value={extras[desc]} onChangeText={(t) => setExtras((p) => ({ ...p, [desc]: t }))} />
                        <Campo label="Valor" unidad="$" value={extras[monto]} onChangeText={(t) => setExtras((p) => ({ ...p, [monto]: t }))} {...NUMERICO} />
                    </View>
                ))}
                <Text variant="titleSmall">Mano de obra</Text>
                <Campo label="Valor" unidad="$" value={extras.valorManoDeObra} onChangeText={(t) => setExtras((p) => ({ ...p, valorManoDeObra: t }))} {...NUMERICO} />
            </HojaFormulario>

            <Portal>
                <ModalPaper visible={ocupado === "ventana"} dismissable={false} contentContainerStyle={estilos.espera}>
                    <ActivityIndicator size="large" />
                    <Text>Calculando y guardando la ventana…</Text>
                </ModalPaper>
            </Portal>
        </Pantalla>
    );
};

const Fila = ({ etiqueta, valor: monto, destacado }: { etiqueta: string; valor: number; destacado?: boolean }) => (
    <View style={estilos.filaResumen}>
        <Text variant={destacado ? "titleMedium" : "bodyMedium"} style={{ flex: 1, fontWeight: destacado ? "700" : "400" }}>{etiqueta}</Text>
        <Text variant={destacado ? "titleMedium" : "bodyMedium"} style={{ fontWeight: destacado ? "700" : "600" }}>{formatoPesos(monto)}</Text>
    </View>
);

const estilos = StyleSheet.create({
    tarjeta: { backgroundColor: "#fff" },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    grilla: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
    celda: { width: "50%", padding: 6 },
    fila: { flexDirection: "row", gap: 12 },
    filaResumen: { flexDirection: "row", alignItems: "center", gap: 8 },
    secundario: { color: COLORES.textoSecundario },
    espera: { backgroundColor: "#fff", margin: 32, padding: 24, borderRadius: 12, alignItems: "center", gap: 12 },
});
