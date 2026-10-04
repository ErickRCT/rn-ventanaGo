import { MD3LightTheme, type MD3Theme } from "react-native-paper";

/** Colores de la web de VentanaGo: azul #2b4c7e, menú oscuro y fondo gris claro. */
export const COLORES = {
    primario: "#2b4c7e",
    primarioOscuro: "#1d355a",
    menu: "#1a2332",
    fondo: "#f7fafc",
    texto: "#2d3748",
    textoSecundario: "#4a5568",
    borde: "#e2e8f0",
    exito: "#2e7d32",
    aviso: "#ed6c02",
    info: "#0288d1",
    error: "#d32f2f",
};

export const tema: MD3Theme = {
    ...MD3LightTheme,
    roundness: 3,
    colors: {
        ...MD3LightTheme.colors,
        primary: COLORES.primario,
        onPrimary: "#ffffff",
        primaryContainer: "#d6e2f5",
        onPrimaryContainer: COLORES.primarioOscuro,
        secondary: "#718096",
        secondaryContainer: "#e2e8f0",
        onSecondaryContainer: COLORES.texto,
        background: COLORES.fondo,
        surface: "#ffffff",
        onSurface: COLORES.texto,
        onSurfaceVariant: COLORES.textoSecundario,
        outline: "#cbd5e0",
        outlineVariant: COLORES.borde,
        error: COLORES.error,
    },
};
