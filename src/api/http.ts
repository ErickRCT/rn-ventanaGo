import axios, { isAxiosError } from "axios";
import { API_BASE_URL } from "@/lib/config";

/**
 * Cliente HTTP de toda la app. El token de la sesión se agrega en cada petición; si el backend lo rechaza
 * (vencido o revocado) se cierra la sesión. Render puede tardar en despertar, por eso el tiempo de espera es largo.
 */
// eslint-disable-next-line import/no-named-as-default-member -- create existe en los tipos pero no siempre como export de la versión ESM
export const http = axios.create({ baseURL: API_BASE_URL, timeout: 60_000 });

let tokenActual: string | null = null;
let alExpirar: () => void = () => undefined;

export const fijarToken = (token: string | null) => {
    tokenActual = token;
};

export const obtenerToken = () => tokenActual;

export const alRechazarToken = (accion: () => void) => {
    alExpirar = accion;
};

http.interceptors.request.use((config) => {
    if (tokenActual) config.headers.Authorization = `Bearer ${tokenActual}`;
    return config;
});

http.interceptors.response.use(undefined, (error) => {
    if (tokenActual && isAxiosError(error) && error.response?.status === 401 && !error.config?.url?.includes("/auth/")) {
        alExpirar();
    }
    return Promise.reject(error);
});

/** Mensaje que envía el backend o uno genérico. */
export const mensajeDeError = (error: unknown, porDefecto = "No se pudo completar la operación. Inténtalo nuevamente.") => {
    if (isAxiosError(error)) {
        const mensaje = (error.response?.data as { message?: string } | undefined)?.message;
        if (mensaje) return mensaje;
        if (error.response?.status === 401) return "Usuario o contraseña incorrectos.";
        if (error.response?.status === 403) return "Tu cuenta no tiene permiso para esta acción.";
        if (!error.response) return "No hay conexión con el servidor. Revisa tu internet e inténtalo nuevamente.";
    }
    return porDefecto;
};
