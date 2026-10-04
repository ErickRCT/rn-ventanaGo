import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Icon, Text } from "react-native-paper";
import { COLORES } from "./tema";

export const Cargando = ({ texto = "Cargando…" }: { texto?: string }) => (
    <View style={estilos.centro}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={estilos.secundario}>{texto}</Text>
    </View>
);

interface ErrorCargaProps {
    mensaje: string;
    onReintentar?: () => void;
}

export const ErrorCarga = ({ mensaje, onReintentar }: ErrorCargaProps) => (
    <Aviso tipo="error" texto={mensaje}>
        {onReintentar && <Button mode="text" onPress={onReintentar}>Reintentar</Button>}
    </Aviso>
);

interface VacioProps {
    icono?: string;
    titulo: string;
    texto?: string;
    accion?: { etiqueta: string; onPress: () => void };
}

export const Vacio = ({ icono = "inbox-outline", titulo, texto, accion }: VacioProps) => (
    <Card mode="outlined" style={estilos.tarjetaVacia}>
        <Card.Content style={estilos.vacio}>
            <Icon source={icono} size={48} color={COLORES.textoSecundario} />
            <Text variant="titleMedium" style={estilos.centrado}>{titulo}</Text>
            {texto && <Text variant="bodyMedium" style={[estilos.secundario, estilos.centrado]}>{texto}</Text>}
            {accion && <Button mode="contained" onPress={accion.onPress} style={{ marginTop: 8 }}>{accion.etiqueta}</Button>}
        </Card.Content>
    </Card>
);

type TipoAviso = "info" | "exito" | "aviso" | "error";

const ESTILO_AVISO: Record<TipoAviso, { fondo: string; color: string; icono: string }> = {
    info: { fondo: "#e5f6fd", color: "#014361", icono: "information-outline" },
    exito: { fondo: "#edf7ed", color: "#1e4620", icono: "check-circle-outline" },
    aviso: { fondo: "#fff4e5", color: "#663c00", icono: "alert-outline" },
    error: { fondo: "#fdeded", color: "#5f2120", icono: "alert-circle-outline" },
};

interface AvisoProps {
    tipo?: TipoAviso;
    titulo?: string;
    texto?: string;
    children?: ReactNode;
}

/** Recuadro de mensaje, como los Alert de la web. */
export const Aviso = ({ tipo = "info", titulo, texto, children }: AvisoProps) => {
    const { fondo, color, icono } = ESTILO_AVISO[tipo];
    return (
        <View style={[estilos.aviso, { backgroundColor: fondo }]} accessibilityRole="alert">
            <Icon source={icono} size={22} color={color} />
            <View style={{ flex: 1, gap: 2 }}>
                {titulo && <Text variant="titleSmall" style={{ color }}>{titulo}</Text>}
                {texto && <Text variant="bodyMedium" style={{ color }}>{texto}</Text>}
                {children}
            </View>
        </View>
    );
};

const estilos = StyleSheet.create({
    centro: { padding: 32, alignItems: "center", gap: 12 },
    secundario: { color: COLORES.textoSecundario },
    centrado: { textAlign: "center" },
    tarjetaVacia: { backgroundColor: "#fff" },
    vacio: { alignItems: "center", gap: 8, paddingVertical: 24 },
    aviso: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 8, alignItems: "flex-start" },
});
