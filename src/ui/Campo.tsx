import { View, type StyleProp, type ViewStyle } from "react-native";
import { HelperText, TextInput, type TextInputProps } from "react-native-paper";

type CampoProps = Omit<TextInputProps, "error" | "mode" | "style"> & {
    /** Estilo del contenedor (campo + mensaje). */
    style?: StyleProp<ViewStyle>;
    error?: string | null;
    ayuda?: string;
    /** Sufijo dentro del campo, p. ej. "mm" o "%". */
    unidad?: string;
};

/** Campo de texto con su mensaje de error o de ayuda debajo. */
export const Campo = ({ error, ayuda, unidad, style, ...props }: CampoProps) => (
    <View style={style}>
        <TextInput mode="outlined" error={Boolean(error)} right={unidad ? <TextInput.Affix text={unidad} /> : undefined} {...props} />
        {error ? <HelperText type="error">{error}</HelperText> : ayuda ? <HelperText type="info">{ayuda}</HelperText> : null}
    </View>
);

/** Teclado numérico para medidas, cantidades y precios. */
export const NUMERICO = { keyboardType: "numeric", inputMode: "numeric" } as const;
export const DECIMAL = { keyboardType: "decimal-pad", inputMode: "decimal" } as const;
