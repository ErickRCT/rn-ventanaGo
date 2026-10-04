import { useEffect, useState } from "react";
import { NativeModules, PermissionsAndroid, Platform } from "react-native";

/*
 * La realidad aumentada usa ARCore, así que solo está disponible en Android y en teléfonos certificados
 * por Google. Antes de abrirla se revisa el teléfono; si no puede, el botón queda bloqueado y se explica el motivo.
 */

export type EstadoSoporteAR =
    | { estado: "verificando" }
    | { estado: "disponible" }
    | { estado: "no-disponible"; motivo: string };

/** Android 7.0 (API 24) es lo mínimo que exige ARCore. */
const API_MINIMA_ARCORE = 24;
// ARCore puede tardar en responder la primera vez ("TRANSIENT" o "UNKNOWN" mientras consulta a Google Play).
const REINTENTOS = 6;
const ESPERA_REINTENTO_MS = 700;

const MOTIVOS = {
    plataforma: "La realidad aumentada está disponible solo en teléfonos Android con ARCore.",
    version: "La realidad aumentada necesita Android 7.0 o superior. Este teléfono tiene una versión anterior.",
    sinModulo: "Esta versión de la app no incluye la realidad aumentada. Instala el APK de VentanaGo (no funciona en Expo Go).",
    noCompatible:
        "Este teléfono no es compatible con ARCore (Servicios de Google Play para RA), que es lo que permite ver la ventana sobre tu pared. Puedes seguir diseñando y cotizando con normalidad.",
    desconocido:
        "No se pudo confirmar si este teléfono es compatible con ARCore. Revisa tu conexión a internet y que tengas instalados los Servicios de Google Play para RA, y vuelve a intentarlo.",
};

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

type RespuestaArcore = "SUPPORTED" | "UNSUPPORTED" | "UNKNOWN" | "TRANSIENT";

const consultarArcore = () =>
    new Promise<RespuestaArcore>((resolver) => {
        // Se usa el módulo nativo de ViroReact directamente para recibir también "TRANSIENT" y "UNKNOWN" sin excepciones.
        NativeModules.VRTARSceneNavigatorModule.isARSupportedOnDevice((resultado: RespuestaArcore) => resolver(resultado));
    });

/** Revisa si el teléfono puede usar la realidad aumentada; no pide permisos. */
export const verificarSoporteAR = async (): Promise<EstadoSoporteAR> => {
    if (Platform.OS !== "android") return { estado: "no-disponible", motivo: MOTIVOS.plataforma };
    if (Number(Platform.Version) < API_MINIMA_ARCORE) return { estado: "no-disponible", motivo: MOTIVOS.version };
    if (!NativeModules.VRTARSceneNavigatorModule) return { estado: "no-disponible", motivo: MOTIVOS.sinModulo };

    for (let intento = 0; intento < REINTENTOS; intento++) {
        try {
            const resultado = await consultarArcore();
            if (resultado === "SUPPORTED") return { estado: "disponible" };
            if (resultado === "UNSUPPORTED") return { estado: "no-disponible", motivo: MOTIVOS.noCompatible };
        } catch {
            // Se trata igual que "UNKNOWN".
        }
        await esperar(ESPERA_REINTENTO_MS);
    }
    return { estado: "no-disponible", motivo: MOTIVOS.desconocido };
};

/** Pide el permiso de cámara. Devuelve el motivo si se negó, o null si se concedió. */
export const pedirPermisoCamara = async (): Promise<string | null> => {
    if (Platform.OS !== "android") return MOTIVOS.plataforma;
    const resultado = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
        title: "Permiso de cámara",
        message: "VentanaGo usa la cámara para mostrar la ventana sobre tu pared, a tamaño real.",
        buttonPositive: "Permitir",
        buttonNegative: "Ahora no",
    });
    if (resultado === PermissionsAndroid.RESULTS.GRANTED) return null;
    return resultado === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
        ? "Bloqueaste el permiso de cámara. Para usar la realidad aumentada, actívalo en Ajustes > Aplicaciones > VentanaGo > Permisos."
        : "Sin permiso de cámara no se puede mostrar la ventana sobre tu pared.";
};

/** Estado del soporte de AR, revisado una vez por sesión de la app. */
let soporteGuardado: Promise<EstadoSoporteAR> | null = null;

export const useSoporteAR = (): EstadoSoporteAR & { reintentar: () => void } => {
    const [soporte, setSoporte] = useState<EstadoSoporteAR>({ estado: "verificando" });
    const [intento, setIntento] = useState(0);

    useEffect(() => {
        let cancelado = false;
        soporteGuardado ??= verificarSoporteAR();
        soporteGuardado.then((resultado) => {
            if (!cancelado) setSoporte(resultado);
        });
        return () => {
            cancelado = true;
        };
    }, [intento]);

    const reintentar = () => {
        soporteGuardado = null;
        setSoporte({ estado: "verificando" });
        setIntento((n) => n + 1);
    };

    return { ...soporte, reintentar };
};
