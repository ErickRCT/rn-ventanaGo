import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, Text } from "react-native-paper";
import { Aviso } from "@/ui/Estados";
import { COLORES } from "@/ui/tema";
import type { ConfigVentana } from "@/ventana/geometria";
import { pedirPermisoCamara, useSoporteAR } from "./soporte";

interface BotonRealidadAumentadaProps {
    config: ConfigVentana;
    nombre: string;
    /** Deshabilita el botón (p. ej. con medidas inválidas). */
    deshabilitado?: boolean;
}

/**
 * Abre la ventana en realidad aumentada. Si el teléfono no es compatible (no es Android, Android antiguo,
 * sin ARCore o sin permiso de cámara) no deja entrar y explica el motivo.
 */
export const BotonRealidadAumentada = ({ config, nombre, deshabilitado }: BotonRealidadAumentadaProps) => {
    const soporte = useSoporteAR();
    const [motivoPermiso, setMotivoPermiso] = useState<string | null>(null);
    const [abriendo, setAbriendo] = useState(false);

    const abrir = async () => {
        setAbriendo(true);
        try {
            const motivo = await pedirPermisoCamara();
            setMotivoPermiso(motivo);
            if (motivo) return;
            router.push({ pathname: "/realidad-aumentada", params: { config: JSON.stringify(config), nombre } });
        } finally {
            setAbriendo(false);
        }
    };

    if (soporte.estado === "no-disponible") {
        return (
            <View style={{ gap: 8 }}>
                <Button mode="outlined" icon="cube-off-outline" disabled>
                    Ver en mi pared (no disponible)
                </Button>
                <Aviso tipo="aviso" titulo="Realidad aumentada no disponible en este teléfono" texto={soporte.motivo}>
                    <Button compact mode="text" onPress={soporte.reintentar} style={{ alignSelf: "flex-start" }}>
                        Volver a comprobar
                    </Button>
                </Aviso>
            </View>
        );
    }

    return (
        <View style={{ gap: 8 }}>
            <Button
                mode="contained-tonal"
                icon="cube-scan"
                onPress={abrir}
                loading={soporte.estado === "verificando" || abriendo}
                disabled={deshabilitado || soporte.estado === "verificando" || abriendo}
                contentStyle={{ paddingVertical: 6 }}
            >
                {soporte.estado === "verificando" ? "Comprobando el teléfono…" : "Ver en mi pared (realidad aumentada)"}
            </Button>
            {motivoPermiso ? (
                <Aviso tipo="aviso" texto={motivoPermiso} />
            ) : (
                <Text variant="bodySmall" style={{ color: COLORES.textoSecundario }}>
                    Apunta la cámara a una pared y la ventana aparecerá a tamaño real.
                </Text>
            )}
        </View>
    );
};
