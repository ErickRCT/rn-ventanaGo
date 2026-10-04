import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";

/**
 * Dato del backend compartido entre pantallas (carrito, solicitudes, avisos), con suscripción al estilo
 * useSyncExternalStore. Se identifica por una clave (el usuario): si cambia, se descarta lo cargado.
 * Se recarga al volver a la app y, si se indica, cada cierto tiempo para ver lo que llega de otros usuarios.
 */
export const crearRecurso = <T,>(cargar: () => Promise<T>, vacio: T, intervaloMs?: number) => {
    const oyentes = new Set<() => void>();
    let clave: string | null = null;
    let valor: T = vacio;
    let enCurso: Promise<void> | null = null;
    let ultimaCarga = 0;

    const avisar = () => oyentes.forEach((oyente) => oyente());

    const cambiarClave = (nueva: string | null) => {
        if (nueva === clave) return;
        clave = nueva;
        valor = vacio;
        enCurso = null;
        ultimaCarga = 0;
        avisar();
    };

    /** Vuelve a pedir el dato; las llamadas simultáneas comparten la misma petición. */
    const refrescar = (): Promise<void> => {
        const paraClave = clave;
        if (!paraClave) return Promise.resolve();
        enCurso ??= cargar()
            .then((cargado) => {
                if (paraClave !== clave) return;
                valor = cargado;
                ultimaCarga = Date.now();
                avisar();
            })
            .catch((error) => console.warn("No se pudo cargar desde el servidor:", error))
            .finally(() => {
                enCurso = null;
            });
        return enCurso;
    };

    /** Reemplaza el dato con lo que devolvió una operación (evita otra petición). */
    const setear = (nuevo: T) => {
        valor = nuevo;
        ultimaCarga = Date.now();
        avisar();
    };

    const suscribir = (oyente: () => void) => {
        oyentes.add(oyente);
        return () => {
            oyentes.delete(oyente);
        };
    };

    /** claveActual null: el recurso no aplica a este usuario (p. ej. el carrito de un proveedor). */
    const useValor = (claveActual: string | null): T => {
        useEffect(() => {
            cambiarClave(claveActual);
            if (!claveActual) return;
            // Varias pantallas montan a la vez: solo se carga si el dato no es reciente.
            if (Date.now() - ultimaCarga > 2000) void refrescar();
            const suscripcion = AppState.addEventListener("change", (estado) => {
                if (estado === "active") void refrescar();
            });
            const temporizador = intervaloMs ? setInterval(() => {
                if (AppState.currentState === "active") void refrescar();
            }, intervaloMs) : undefined;
            return () => {
                suscripcion.remove();
                if (temporizador) clearInterval(temporizador);
            };
        }, [claveActual]);

        const actual = useSyncExternalStore(suscribir, () => valor);
        return claveActual !== null && claveActual === clave ? actual : vacio;
    };

    return { useValor, refrescar, setear, leer: () => valor, limpiar: () => cambiarClave(null) };
};
