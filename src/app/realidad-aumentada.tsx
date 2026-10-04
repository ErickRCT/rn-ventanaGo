import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ViroARSceneNavigator } from "@reactvision/react-viro";
import { ActivityIndicator, Button, IconButton, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { EscenaVentana, type ControlEscena } from "@/ar/EscenaVentana";
import { verificarSoporteAR, type EstadoSoporteAR } from "@/ar/soporte";
import { Aviso } from "@/ui/Estados";
import { COLORES } from "@/ui/tema";
import type { ConfigVentana } from "@/ventana/geometria";

type Fase = "iniciando" | "buscando" | "pared" | "colocada";

const INSTRUCCION: Record<Fase, string> = {
    iniciando: "Mueve el teléfono despacio para que la cámara reconozca el lugar.",
    buscando: "Apunta a la pared donde irá la ventana y muévete un poco de lado a lado.",
    pared: "Toca la zona azul de la pared donde quieres poner la ventana.",
    colocada: "La ventana está a tamaño real. Acércate o aléjate para verla.",
};

/** Cuartos de vuelta que pidió el usuario; la escena de Viro se suscribe porque no se re-renderiza con viroAppProps. */
const crearContadorGiros = () => {
    let valor = 0;
    const oyentes = new Set<() => void>();
    return {
        leer: () => valor,
        suscribir: (oyente: () => void) => {
            oyentes.add(oyente);
            return () => {
                oyentes.delete(oyente);
            };
        },
        girar: () => {
            valor = (valor + 1) % 4;
            oyentes.forEach((o) => o());
        },
    };
};

const leerConfig = (texto: string | undefined): ConfigVentana | null => {
    try {
        const config = JSON.parse(texto ?? "") as ConfigVentana;
        return config.anchoMm > 0 && config.altoMm > 0 ? config : null;
    } catch {
        return null;
    }
};

/** Pantalla completa de realidad aumentada (solo Android con ARCore). */
export default function RealidadAumentada() {
    const params = useLocalSearchParams<{ config?: string; nombre?: string }>();
    const config = leerConfig(params.config);
    const [soporte, setSoporte] = useState<EstadoSoporteAR>({ estado: "verificando" });
    const [fase, setFase] = useState<Fase>("iniciando");
    const [seguimientoNormal, setSeguimientoNormal] = useState(true);
    const reiniciar = useRef<() => void>(() => undefined);

    // Giros manuales: un pequeño store para que la escena de Viro se entere (no se re-renderiza con viroAppProps).
    const [giros] = useState(crearContadorGiros);

    // Se vuelve a comprobar aquí por si se llegó a esta pantalla por un enlace: sin soporte no se abre la cámara.
    useEffect(() => {
        void verificarSoporteAR().then(setSoporte);
    }, []);

    if (!config || soporte.estado !== "disponible") {
        return (
            <SafeAreaView style={[estilos.fondo, estilos.centro]}>
                {soporte.estado === "verificando" && config ? (
                    <ActivityIndicator color="#fff" size="large" />
                ) : (
                    <View style={{ gap: 16, padding: 24 }}>
                        <Aviso
                            tipo="aviso"
                            titulo="No se puede abrir la realidad aumentada"
                            texto={!config ? "Faltan las medidas de la ventana." : soporte.estado === "no-disponible" ? soporte.motivo : ""}
                        />
                        <Button mode="contained" onPress={() => router.back()}>Volver</Button>
                    </View>
                )}
            </SafeAreaView>
        );
    }

    const control: ControlEscena = {
        config,
        giros: giros,
        alCambiarSeguimiento: (normal) => {
            setSeguimientoNormal(normal);
            if (normal) setFase((f) => (f === "iniciando" ? "buscando" : f));
        },
        alDetectarPared: () => setFase((f) => (f === "colocada" ? f : "pared")),
        alColocar: () => setFase("colocada"),
        registrarReinicio: (funcion) => {
            reiniciar.current = funcion;
        },
    };

    return (
        <View style={estilos.fondo}>
            <ViroARSceneNavigator
                style={StyleSheet.absoluteFill}
                autofocus
                initialScene={{ scene: EscenaVentana as never }}
                viroAppProps={control}
            />

            <SafeAreaView style={estilos.superior} edges={["top"]} pointerEvents="box-none">
                <View style={estilos.barra}>
                    <IconButton icon="close" iconColor="#fff" containerColor="rgba(0,0,0,0.5)" onPress={() => router.back()} accessibilityLabel="Cerrar realidad aumentada" />
                    <View style={estilos.titulo}>
                        <Text variant="titleSmall" style={{ color: "#fff" }} numberOfLines={1}>{params.nombre ?? "Ventana"}</Text>
                        <Text variant="bodySmall" style={{ color: "rgba(255,255,255,0.85)" }}>
                            {config.anchoMm} × {config.altoMm} mm · escala real
                        </Text>
                    </View>
                </View>
                <View style={estilos.instruccion}>
                    <Text style={{ color: "#fff", textAlign: "center" }}>
                        {!seguimientoNormal && fase !== "colocada"
                            ? "Hay poca luz o el teléfono se mueve muy rápido. Mueve el teléfono más despacio."
                            : INSTRUCCION[fase]}
                    </Text>
                </View>
            </SafeAreaView>

            {fase === "colocada" && (
                <SafeAreaView style={estilos.inferior} edges={["bottom"]}>
                    <Button mode="contained" icon="rotate-right" onPress={giros.girar} buttonColor="rgba(0,0,0,0.6)">Girar</Button>
                    <Button
                        mode="contained"
                        icon="target"
                        onPress={() => {
                            reiniciar.current();
                            setFase("pared");
                        }}
                        buttonColor={COLORES.primario}
                    >
                        Cambiar de lugar
                    </Button>
                </SafeAreaView>
            )}
        </View>
    );
}

const estilos = StyleSheet.create({
    fondo: { flex: 1, backgroundColor: "#000" },
    centro: { justifyContent: "center", alignItems: "center" },
    superior: { position: "absolute", top: 0, left: 0, right: 0, padding: 8, gap: 8 },
    barra: { flexDirection: "row", alignItems: "center", gap: 4 },
    titulo: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    instruccion: { backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8, padding: 12, marginHorizontal: 8 },
    inferior: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 12, padding: 16 },
});
