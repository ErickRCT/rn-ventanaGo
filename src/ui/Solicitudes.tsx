import { StyleSheet, View } from "react-native";
import { Chip, Divider, Text } from "react-native-paper";
import { formatoPesos } from "@/lib/formato";
import { ETIQUETA_ESTADO, totalItems, type EstadoSolicitud, type ItemVentana } from "@/lib/tipos";
import { COLORES } from "./tema";

const COLOR_ESTADO: Record<EstadoSolicitud, { fondo: string; texto: string }> = {
    PENDIENTE: { fondo: "#fff4e5", texto: "#b45309" },
    ACEPTADA: { fondo: "#edf7ed", texto: COLORES.exito },
    MODIFICADA: { fondo: "#e5f6fd", texto: COLORES.info },
    RECHAZADA: { fondo: "#fdeded", texto: COLORES.error },
};

export const ChipEstado = ({ estado }: { estado: EstadoSolicitud }) => (
    <Chip compact style={{ backgroundColor: COLOR_ESTADO[estado].fondo }} textStyle={{ color: COLOR_ESTADO[estado].texto, fontWeight: "600" }}>
        {ETIQUETA_ESTADO[estado]}
    </Chip>
);

/** Ventanas de una solicitud, con precios si la empresa ya los definió. */
export const ListaItems = ({ items }: { items: ItemVentana[] }) => {
    const total = totalItems(items);
    return (
        <View style={estilos.lista}>
            {items.map((item, i) => (
                <View key={item.id}>
                    {i > 0 && <Divider style={{ marginBottom: 8 }} />}
                    <Text variant="bodyLarge" style={{ fontWeight: "600" }}>{item.cantidad} × {item.descripcion}</Text>
                    <Text variant="bodyMedium" style={estilos.secundario}>
                        {item.anchoMm} × {item.altoMm} mm · {item.colorNombre} · Vidrio {item.vidrioNombre}
                    </Text>
                    {item.observaciones ? <Text variant="bodySmall" style={estilos.secundario}>Obs.: {item.observaciones}</Text> : null}
                    {item.precioUnitario !== null && (
                        <Text variant="bodyMedium">
                            {formatoPesos(item.precioUnitario)} c/u · Subtotal {formatoPesos(item.precioUnitario * item.cantidad)}
                        </Text>
                    )}
                </View>
            ))}
            {total !== null && (
                <Text variant="titleMedium" style={{ textAlign: "right" }}>Total: {formatoPesos(total)}</Text>
            )}
        </View>
    );
};

const estilos = StyleSheet.create({
    lista: { gap: 8 },
    secundario: { color: COLORES.textoSecundario },
});
