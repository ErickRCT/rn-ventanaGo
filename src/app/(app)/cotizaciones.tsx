import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Button, Card, Searchbar, Text } from "react-native-paper";
import { descargarDocumento, type TipoDocumento } from "@/api/cotizaciones";
import { mensajeDeError } from "@/api/http";
import { useCotizaciones } from "@/admin/useCotizaciones";
import { formatoFecha, formatoNumero, formatoPesos } from "@/lib/formato";
import type { Cotizacion } from "@/lib/tipos";
import { Cargando, ErrorCarga, Vacio } from "@/ui/Estados";
import { useMensaje } from "@/ui/Mensajes";
import { Pantalla } from "@/ui/Pantalla";
import { COLORES } from "@/ui/tema";

const datosAdicionales = (c: Cotizacion) =>
    [
        ["Ganancia", c.ganancia != null ? `${c.ganancia}%` : null],
        ["Descuento", c.descuento ? `${c.descuento}%` : null],
        ["Flete", c.valorFlete ? formatoPesos(c.valorFlete) : null],
        ["Instalación", c.valorInstalacion ? formatoPesos(c.valorInstalacion) : null],
        ["Otros gastos", c.valorOtrosGastos ? `${c.otrosGastos ? `${c.otrosGastos}: ` : ""}${formatoPesos(c.valorOtrosGastos)}` : null],
        ["Mano de obra", c.valorManoDeObra ? formatoPesos(c.valorManoDeObra) : null],
        ["Total m²", c.totalm2 ? formatoNumero(c.totalm2) : null],
        ["Ventanas", c.ventanas?.length ? String(c.ventanas.length) : null],
    ].filter((d): d is [string, string] => d[1] !== null);

/** Todas las cotizaciones, con sus datos, edición y descarga de los PDF. */
export default function Cotizaciones() {
    const mensaje = useMensaje();
    const { cotizaciones, error, cargar, refrescar, refrescando } = useCotizaciones();
    const [busqueda, setBusqueda] = useState("");
    const [abierta, setAbierta] = useState<number | null>(null);
    const [descargando, setDescargando] = useState<string | null>(null);

    useFocusEffect(useCallback(() => {
        void cargar();
    }, [cargar]));

    const descargar = async (tipo: TipoDocumento, id: number) => {
        setDescargando(`${tipo}-${id}`);
        try {
            await descargarDocumento(tipo, id);
        } catch (e) {
            mensaje(mensajeDeError(e, "No se pudo descargar el documento."));
        } finally {
            setDescargando(null);
        }
    };

    const texto = busqueda.trim().toLowerCase();
    const visibles = (cotizaciones ?? []).filter((c) =>
        `${c.cotizacionId} ${c.nombreCotizacion ?? ""} ${c.cliente?.nombre ?? ""} ${formatoFecha(c.fecha)}`.toLowerCase().includes(texto));

    return (
        <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
            <Searchbar placeholder="Cliente, N° o fecha" value={busqueda} onChangeText={setBusqueda} />
            {error && <ErrorCarga mensaje={error} onReintentar={cargar} />}
            {cotizaciones === null && !error && <Cargando />}
            {cotizaciones !== null && visibles.length === 0 && <Vacio titulo={texto ? "Sin resultados" : "Aún no hay cotizaciones"} />}

            {visibles.map((c) => {
                const id = c.cotizacionId ?? 0;
                const expandida = abierta === id;
                return (
                    <Card key={id} mode="outlined" style={estilos.tarjeta} onPress={() => setAbierta(expandida ? null : id)}>
                        <Card.Title
                            title={`N°${id} · ${c.nombreCotizacion || "Sin nombre"}`}
                            subtitle={`${c.cliente?.nombre ?? "Sin cliente"} · ${formatoFecha(c.fecha)} · ${c.estado}`}
                        />
                        <Card.Content style={{ gap: 4 }}>
                            <View style={estilos.fila}>
                                <Text variant="bodyMedium" style={{ flex: 1 }}>Neto: {formatoPesos(c.neto)}</Text>
                                <Text variant="titleSmall">Final: {formatoPesos(c.valorFinal)}</Text>
                            </View>
                            {expandida && (
                                <View style={estilos.detalle}>
                                    {datosAdicionales(c).length === 0
                                        ? <Text variant="bodySmall" style={estilos.secundario}>No se encontraron datos adicionales.</Text>
                                        : datosAdicionales(c).map(([etiqueta, valor]) => (
                                            <Text key={etiqueta} variant="bodySmall"><Text style={{ fontWeight: "700" }}>{etiqueta}: </Text>{valor}</Text>
                                        ))}
                                </View>
                            )}
                        </Card.Content>
                        <Card.Actions style={{ flexWrap: "wrap" }}>
                            <Button compact icon="file-pdf-box" loading={descargando === `cotizacion-${id}`} disabled={descargando !== null} onPress={() => descargar("cotizacion", id)}>PDF</Button>
                            <Button compact icon="hammer-wrench" loading={descargando === `orden-de-trabajo-${id}`} disabled={descargando !== null} onPress={() => descargar("orden-de-trabajo", id)}>Orden</Button>
                            <Button compact mode="contained" icon="pencil" onPress={() => router.navigate({ pathname: "/crear-cotizacion", params: { id: String(id) } })}>Editar</Button>
                        </Card.Actions>
                    </Card>
                );
            })}
        </Pantalla>
    );
}

const estilos = StyleSheet.create({
    tarjeta: { backgroundColor: "#fff" },
    fila: { flexDirection: "row", alignItems: "center", gap: 8 },
    detalle: { backgroundColor: COLORES.fondo, padding: 10, borderRadius: 8, gap: 2, marginTop: 4 },
    secundario: { color: COLORES.textoSecundario },
});
