import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { COLORES } from "./tema";

interface PantallaProps {
    children: ReactNode;
    /** Si se indica, se puede deslizar hacia abajo para recargar. */
    onRefrescar?: () => void;
    refrescando?: boolean;
    /** false para pantallas que ya tienen su propia lista con scroll. */
    scroll?: boolean;
    estilo?: ViewStyle;
}

export const Pantalla = ({ children, onRefrescar, refrescando = false, scroll = true, estilo }: PantallaProps) => {
    if (!scroll) return <View style={[estilos.fondo, estilos.contenido, { flex: 1 }, estilo]}>{children}</View>;
    return (
        <ScrollView
            style={estilos.fondo}
            contentContainerStyle={[estilos.contenido, estilo]}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefrescar ? <RefreshControl refreshing={refrescando} onRefresh={onRefrescar} colors={[COLORES.primario]} /> : undefined}
        >
            {children}
        </ScrollView>
    );
};

const estilos = StyleSheet.create({
    fondo: { flex: 1, backgroundColor: COLORES.fondo },
    contenido: { padding: 16, gap: 12, paddingBottom: 32 },
});
