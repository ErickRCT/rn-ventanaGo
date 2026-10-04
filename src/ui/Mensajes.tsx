import { createContext, useContext, useState, type ReactNode } from "react";
import { Alert } from "react-native";
import { Snackbar } from "react-native-paper";

interface Mensaje {
    texto: string;
    accion?: { etiqueta: string; onPress: () => void };
}

const MensajesContext = createContext<(mensaje: Mensaje | string) => void>(() => undefined);

/** Mensajes breves en la parte inferior (ventana agregada, guardado, etc.). */
export const MensajesProvider = ({ children }: { children: ReactNode }) => {
    const [actual, setActual] = useState<Mensaje | null>(null);
    const mostrar = (mensaje: Mensaje | string) => setActual(typeof mensaje === "string" ? { texto: mensaje } : mensaje);

    return (
        <MensajesContext.Provider value={mostrar}>
            {children}
            <Snackbar
                visible={actual !== null}
                onDismiss={() => setActual(null)}
                duration={4000}
                action={actual?.accion ? { label: actual.accion.etiqueta, onPress: actual.accion.onPress } : undefined}
            >
                {actual?.texto ?? ""}
            </Snackbar>
        </MensajesContext.Provider>
    );
};

export const useMensaje = () => useContext(MensajesContext);

/** Pregunta de confirmación nativa (p. ej. antes de eliminar). */
export const confirmar = (titulo: string, mensaje: string, etiquetaAceptar = "Eliminar") =>
    new Promise<boolean>((resolver) => {
        Alert.alert(titulo, mensaje, [
            { text: "Cancelar", style: "cancel", onPress: () => resolver(false) },
            { text: etiquetaAceptar, style: "destructive", onPress: () => resolver(true) },
        ], { cancelable: true, onDismiss: () => resolver(false) });
    });
