import { useState } from "react";
import { View, type ImageStyle, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Icon } from "react-native-paper";
import { urlImagen } from "@/lib/config";
import { COLORES } from "./tema";

interface ImagenCatalogoProps {
    /** Ruta guardada en la BD ("pautas/archivo.jpg") o URL completa. */
    ruta: string | null | undefined;
    tamano?: number;
    estilo?: ViewStyle;
}

/** Imagen del catálogo (servida por el front web); si no existe, muestra un ícono. */
export const ImagenCatalogo = ({ ruta, tamano = 72, estilo }: ImagenCatalogoProps) => {
    const [fallo, setFallo] = useState(false);
    const url = urlImagen(ruta);
    const caja: ViewStyle = { width: tamano, height: tamano, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" };

    if (!url || fallo) {
        return (
            <View style={[caja, { backgroundColor: COLORES.borde }, estilo]}>
                <Icon source="image-off-outline" size={tamano / 2.5} color={COLORES.textoSecundario} />
            </View>
        );
    }
    return (
        <Image
            source={url}
            style={[caja, estilo] as ImageStyle[]}
            contentFit="contain"
            transition={150}
            onError={() => setFallo(true)}
            accessibilityIgnoresInvertColors
        />
    );
};

/** Círculo con el color del marco. */
export const PuntoColor = ({ color, tamano = 18 }: { color: string; tamano?: number }) => (
    <View style={{ width: tamano, height: tamano, borderRadius: tamano / 2, backgroundColor: color, borderWidth: 1, borderColor: "rgba(0,0,0,0.25)" }} />
);
