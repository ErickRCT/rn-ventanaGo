import { useFocusEffect, router } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { useCotizaciones } from "@/admin/useCotizaciones";
import { formatoFecha, formatoPesos } from "@/lib/formato";
import { Cargando, ErrorCarga, Vacio } from "@/ui/Estados";
import { Pantalla } from "@/ui/Pantalla";
import { COLORES } from "@/ui/tema";

/** Inicio del administrador: acceso a crear cotización y la lista de cotizaciones (tocar una para editarla). */
export default function Inicio() {
    const { cotizaciones, error, cargar, refrescar, refrescando } = useCotizaciones();

    // Al volver de editar una cotización se actualizan los totales.
    useFocusEffect(useCallback(() => {
        void cargar();
    }, [cargar]));

    const totalMes = (cotizaciones ?? [])
        .filter((c) => c.fecha?.slice(0, 7) === new Date().toISOString().slice(0, 7))
        .length;

    return (
        <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
            <Button mode="contained" icon="plus" onPress={() => router.navigate({ pathname: "/crear-cotizacion", params: { id: "" } })} contentStyle={{ paddingVertical: 6 }}>
                Crear cotización
            </Button>

            {cotizaciones && (
                <View style={estilos.indicadores}>
                    <Card style={estilos.indicador}><Card.Content>
                        <Text variant="headlineMedium" style={estilos.numero}>{cotizaciones.length}</Text>
                        <Text variant="bodySmall" style={estilos.secundario}>Cotizaciones</Text>
                    </Card.Content></Card>
                    <Card style={estilos.indicador}><Card.Content>
                        <Text variant="headlineMedium" style={estilos.numero}>{totalMes}</Text>
                        <Text variant="bodySmall" style={estilos.secundario}>Este mes</Text>
                    </Card.Content></Card>
                </View>
            )}

            {error && <ErrorCarga mensaje={error} onReintentar={cargar} />}
            {cotizaciones === null && !error && <Cargando />}
            {cotizaciones?.length === 0 && <Vacio titulo="Aún no hay cotizaciones" />}

            {cotizaciones?.map((c) => (
                <Card key={c.cotizacionId} mode="outlined" style={estilos.tarjeta}
                    onPress={() => router.navigate({ pathname: "/crear-cotizacion", params: { id: String(c.cotizacionId) } })}>
                    <Card.Content style={estilos.fila}>
                        <View style={{ flex: 1, gap: 2 }}>
                            <Text variant="titleSmall">N°{c.cotizacionId} · {c.nombreCotizacion || "Sin nombre"}</Text>
                            <Text variant="bodySmall" style={estilos.secundario}>{c.cliente?.nombre ?? "Sin cliente"} · {formatoFecha(c.fecha)}</Text>
                        </View>
                        <Text variant="titleSmall">{formatoPesos(c.valorFinal)}</Text>
                    </Card.Content>
                </Card>
            ))}
        </Pantalla>
    );
}

const estilos = StyleSheet.create({
    indicadores: { flexDirection: "row", gap: 12 },
    indicador: { flex: 1, backgroundColor: "#fff" },
    numero: { color: COLORES.primario, fontWeight: "700" },
    tarjeta: { backgroundColor: "#fff" },
    fila: { flexDirection: "row", alignItems: "center", gap: 12 },
    secundario: { color: COLORES.textoSecundario },
});
