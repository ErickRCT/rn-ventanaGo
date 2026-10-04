import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Text } from "react-native-paper";
import { refrescarSolicitudes, useSolicitudes } from "@/api/solicitudes";
import { DetalleSolicitud } from "@/empresa/DetalleSolicitud";
import { formatoFecha, formatoPesos } from "@/lib/formato";
import { cantidadVentanas, ETIQUETA_ESTADO, etiquetaServicio, totalItems, type EstadoSolicitud } from "@/lib/tipos";
import { Aviso } from "@/ui/Estados";
import { Pantalla } from "@/ui/Pantalla";
import { ChipEstado } from "@/ui/Solicitudes";
import { COLORES } from "@/ui/tema";

type Filtro = EstadoSolicitud | "TODAS";
const FILTROS: Filtro[] = ["PENDIENTE", "ACEPTADA", "MODIFICADA", "RECHAZADA", "TODAS"];

/** Solicitudes de cotización de los clientes, para que el proveedor las acepte, modifique o rechace. */
export default function Solicitudes() {
    const solicitudes = useSolicitudes();
    const [filtro, setFiltro] = useState<Filtro>("PENDIENTE");
    const [abierta, setAbierta] = useState<number | null>(null);
    const [refrescando, setRefrescando] = useState(false);

    const visibles = solicitudes.filter((s) => filtro === "TODAS" || s.estado === filtro).sort((a, b) => b.numero - a.numero);
    const seleccionada = solicitudes.find((s) => s.numero === abierta);

    return (
        <Pantalla
            refrescando={refrescando}
            onRefrescar={async () => {
                setRefrescando(true);
                await refrescarSolicitudes();
                setRefrescando(false);
            }}
        >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filtros}>
                {FILTROS.map((f) => {
                    const cantidad = solicitudes.filter((s) => f === "TODAS" || s.estado === f).length;
                    return (
                        <Chip key={f} selected={f === filtro} showSelectedOverlay onPress={() => setFiltro(f)}>
                            {`${f === "TODAS" ? "Todas" : ETIQUETA_ESTADO[f]} (${cantidad})`}
                        </Chip>
                    );
                })}
            </ScrollView>

            {visibles.length === 0 ? (
                <Aviso texto={solicitudes.length === 0 ? "Aún no llegan solicitudes de cotización de los clientes." : "No hay solicitudes en este estado."} />
            ) : (
                visibles.map((s) => {
                    const total = totalItems(s.items);
                    return (
                        <Card key={s.numero} mode="outlined" style={estilos.tarjeta} onPress={() => setAbierta(s.numero)}>
                            <Card.Content style={{ gap: 4 }}>
                                <View style={estilos.fila}>
                                    <Text variant="titleMedium" style={{ flex: 1 }}>N°{s.numero} · {s.contacto.nombre}</Text>
                                    <ChipEstado estado={s.estado} />
                                </View>
                                <Text variant="bodySmall" style={estilos.secundario}>{s.contacto.email} · {formatoFecha(s.fecha)}</Text>
                                <Text variant="bodyMedium">
                                    {cantidadVentanas(s.items)} ventana(s) · {s.servicios.map(etiquetaServicio).join(", ")}
                                </Text>
                                {total !== null && s.estado !== "RECHAZADA" && <Text variant="bodyMedium">Total: {formatoPesos(total)}</Text>}
                            </Card.Content>
                            <Card.Actions>
                                <Button onPress={() => setAbierta(s.numero)}>{s.estado === "PENDIENTE" ? "Responder" : "Ver"}</Button>
                            </Card.Actions>
                        </Card>
                    );
                })
            )}

            {seleccionada && <DetalleSolicitud key={seleccionada.numero} solicitud={seleccionada} onCerrar={() => setAbierta(null)} />}
        </Pantalla>
    );
}

const estilos = StyleSheet.create({
    filtros: { gap: 8, paddingVertical: 2 },
    tarjeta: { backgroundColor: "#fff" },
    fila: { flexDirection: "row", alignItems: "center", gap: 8 },
    secundario: { color: COLORES.textoSecundario },
});
