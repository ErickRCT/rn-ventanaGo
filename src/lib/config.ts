import Constants from "expo-constants";

interface Extra {
    apiBaseUrl?: string;
    imagenBaseUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Backend desplegado en Render (el mismo que usa la web). */
export const API_BASE_URL = extra.apiBaseUrl ?? "https://ventanago-api.onrender.com";

/** Las imágenes del catálogo se siguen sirviendo desde el front web (Vercel), en /pautas. */
export const IMAGEN_BASE_URL = extra.imagenBaseUrl ?? "https://ventanago.vercel.app/";

/** URL completa de una imagen guardada en la BD como ruta relativa (p. ej. "pautas/ventana.jpg"). */
export const urlImagen = (rutaImagen?: string | null): string | null => {
    if (!rutaImagen) return null;
    if (/^https?:\/\//.test(rutaImagen)) return rutaImagen;
    return IMAGEN_BASE_URL + rutaImagen.replace(/^\/+/, "");
};
