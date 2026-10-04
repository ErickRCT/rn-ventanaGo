import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Chip, List, Text } from "react-native-paper";
import { refrescarSolicitudes, useSolicitudes } from "@/api/solicitudes";
import { useAuth } from "@/context/AuthContext";
import { formatoFecha, formatoPesos } from "@/lib/formato";
import { etiquetaServicio, type Solicitud } from "@/lib/tipos";
import { Aviso, Vacio } from "@/ui/Estados";
import { Pantalla } from "@/ui/Pantalla";
import { ChipEstado, ListaItems } from "@/ui/Solicitudes";
import { COLORES } from "@/ui/tema";

const TITULO_RESPUESTA = {
    ACEPTADA: "La empresa aceptó tu solicitud",
    MODIFICADA: "La empresa modificó tu solicitud",
    RECHAZADA: "La empresa rechazó tu solicitud",
    PENDIENTE: "",
};

const RespuestaEmpresa = ({ solicitud }: { solicitud: Solicitud }) => {
    const { respuesta, estado } = solicitud;
    if (!respuesta) return <Aviso texto="La empresa aún no responde tu solicitud." />;
    const tipo = estado === "ACEPTADA" ? "exito" : estado === "MODIFICADA" ? "info" : "error";
    return (
        <Aviso tipo={tipo} titulo={`${TITULO_RESPUESTA[estado]} · ${formatoFecha(respuesta.fecha)}`} texto={respuesta.mensaje || undefined}>
            {respuesta.total !== null && <Text variant="bodyMedium">Total: {formatoPesos(respuesta.total)}</Text>}
        </Aviso>
    );
};

export default function MisCotizaciones() {
    const { usuario } = useAuth();
    const [refrescando, setRefrescando] = useState(false);
    const solicitudes = useSolicitudes()
        .filter((s) => s.usuario === usuario)
        .sort((a, b) => b.numero - a.numero);
    const [abierta, setAbierta] = useState<number | null>(null);
    const expandida = abierta ?? solicitudes[0]?.numero ?? null;

    const refrescar = async () => {
        setRefrescando(true);
        await refrescarSolicitudes();
        setRefrescando(false);
    };

    if (solicitudes.length === 0) {
        return (
            <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
                <Vacio
                    icono="history"
                    titulo="Aún no has solicitado cotizaciones"
                    texto="Cuando envíes tu carrito a la empresa, verás aquí su respuesta."
                    accion={{ etiqueta: "Diseñar una ventana", onPress: () => router.navigate("/disenar") }}
                />
            </Pantalla>
        );
    }

    return (
        <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
            {solicitudes.map((solicitud) => (
                <List.Accordion
                    key={solicitud.numero}
                    title={`Cotización N°${solicitud.numero}`}
                    description={formatoFecha(solicitud.fecha)}
                    expanded={expandida === solicitud.numero}
                    onPress={() => setAbierta(expandida === solicitud.numero ? -1 : solicitud.numero)}
                    right={(p) => (
                        <View style={estilos.derecha}>
                            <ChipEstado estado={solicitud.estado} />
                            <List.Icon {...p} icon={p.isExpanded ? "chevron-up" : "chevron-down"} />
                        </View>
                    )}
                    style={estilos.cabecera}
                >
                    <View style={estilos.detalle}>
                        <RespuestaEmpresa solicitud={solicitud} />
                        <View style={estilos.chips}>
                            <Text variant="bodySmall" style={{ color: COLORES.textoSecundario }}>Servicios:</Text>
                            {solicitud.servicios.map((s) => <Chip key={s} compact mode="outlined">{etiquetaServicio(s)}</Chip>)}
                        </View>
                        {solicitud.itemsOriginales && (
                            <View style={{ gap: 6 }}>
                                <Text variant="titleSmall">Lo que solicitaste</Text>
                                <ListaItems items={solicitud.itemsOriginales} />
                            </View>
                        )}
                        <View style={{ gap: 6 }}>
                            {solicitud.itemsOriginales && <Text variant="titleSmall">Propuesta de la empresa</Text>}
                            <ListaItems items={solicitud.items} />
                        </View>
                    </View>
                </List.Accordion>
            ))}
        </Pantalla>
    );
}

const estilos = StyleSheet.create({
    cabecera: { backgroundColor: "#fff", borderRadius: 8 },
    derecha: { flexDirection: "row", alignItems: "center", gap: 4 },
    detalle: { backgroundColor: "#fff", padding: 16, gap: 12, marginTop: -4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
});
