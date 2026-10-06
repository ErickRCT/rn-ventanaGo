import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";

/**
 * Dato del backend compartido entre pantallas (carrito, solicitudes, avisos), con suscripción al estilo
 * useSyncExternalStore. Se identifica por una clave (el usuario): si cambia, se descarta lo cargado.
 * Se recarga al volver a la app y, si se indica, cada cierto tiempo para ver lo que llega de otros usuarios.
 */
export const crearRecurso = <T,>(cargar: () => Promise<T>, vacio: T, intervaloMs?: number) => {
    const oyentes = new Set<() => void>();
    // Estado en un objeto (no en variables sueltas capturadas por cierres): evita un fallo de Hermes en release.
    const estado: { clave: string | null; dato: T; enCurso: Promise<void> | null; ultimaCarga: number } = {
        clave: null, dato: vacio, enCurso: null, ultimaCarga: 0,
    };

    const avisar = () => oyentes.forEach((oyente) => oyente());

    const cambiarClave = (nueva: string | null) => {
        if (nueva === estado.clave) return;
        estado.clave = nueva;
        estado.dato = vacio;
        estado.enCurso = null;
        estado.ultimaCarga = 0;
        avisar();
    };

    /** Vuelve a pedir el dato; las llamadas simultáneas comparten la misma petición. */
    const refrescar = (): Promise<void> => {
        const paraClave = estado.clave;
        if (!paraClave) return Promise.resolve();
        if (!estado.enCurso) {
            estado.enCurso = cargar()
                .then((cargado) => {
                    if (paraClave !== estado.clave) return;
                    estado.dato = cargado;
                    estado.ultimaCarga = Date.now();
                    avisar();
                })
                .catch((error) => console.warn("No se pudo cargar desde el servidor:", error))
                .finally(() => {
                    estado.enCurso = null;
                });
        }
        return estado.enCurso;
    };

    /** Reemplaza el dato con lo que devolvió una operación (evita otra petición). */
    const setear = (nuevo: T) => {
        estado.dato = nuevo;
        estado.ultimaCarga = Date.now();
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
            if (Date.now() - estado.ultimaCarga > 2000) void refrescar();
            const suscripcion = AppState.addEventListener("change", (nuevoEstado) => {
                if (nuevoEstado === "active") void refrescar();
            });
            const temporizador = intervaloMs ? setInterval(() => {
                if (AppState.currentState === "active") void refrescar();
            }, intervaloMs) : undefined;
            return () => {
                suscripcion.remove();
                if (temporizador) clearInterval(temporizador);
            };
        }, [claveActual]);

        const actual = useSyncExternalStore(suscribir, () => estado.dato);
        return claveActual !== null && claveActual === estado.clave ? actual : vacio;
    };

    return { useValor, refrescar, setear, leer: () => estado.dato, limpiar: () => cambiarClave(null) };
};
