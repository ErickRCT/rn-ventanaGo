import { http } from "./http";
import type { Color, Pauta, Perfil, Quincalleria, Serie, TipoPauta, TipoPerfil, TipoProducto, Vidrio } from "@/lib/tipos";
import { urlImagen } from "@/lib/config";

/*
 * Catálogo técnico que mantiene el administrador. Las rutas son las mismas que usaba el front web.
 * Series, pautas, colores y vidrios se pueden leer sin ser administrador (las usa el cliente al diseñar).
 */

const datos = <T>(promesa: Promise<{ data: T }>) => promesa.then((r) => r.data);

// ---------- Series ----------
export const getSeries = () => datos<Serie[]>(http.get("/serie"));
export const postSerie = (serie: Serie) => datos<Serie>(http.post("/serie/agregar", serie));
export const putSerie = (serie: Serie) => datos<Serie>(http.put("/serie/modificar", serie));
export const deleteSerie = (id: number) => http.delete(`/serie/eliminar/${id}`);

// ---------- Colores ----------
export const getColores = () => datos<Color[]>(http.get("/color"));
export const postColor = (color: Color) => datos<Color>(http.post("/color/agregar", color));
export const putColor = (color: Color) => datos<Color>(http.put("/color/modificar", color));
export const deleteColor = (id: number) => http.delete(`/color/eliminar/${id}`);

// ---------- Vidrios ----------
export const getVidrios = () => datos<Vidrio[]>(http.get("/vidrio"));
export const postVidrio = (vidrio: Vidrio) => datos<Vidrio>(http.post("/vidrio/agregar", vidrio));
export const putVidrio = (vidrio: Vidrio) => datos<Vidrio>(http.put("/vidrio/modificar", vidrio));
export const deleteVidrio = (id: number) => http.delete(`/vidrio/eliminar/${id}`);

// ---------- Tipos de perfil ----------
export const getTiposPerfil = () => datos<TipoPerfil[]>(http.get("/tipo-perfil"));
export const postTipoPerfil = (tipo: TipoPerfil) => datos<TipoPerfil>(http.post("/tipo-perfil/agregar", tipo));
export const putTipoPerfil = (tipo: TipoPerfil) => datos<TipoPerfil>(http.put("/tipo-perfil/modificar", tipo));

// ---------- Perfiles ----------
export const getPerfiles = () => datos<Perfil[]>(http.get("/perfil"));
export const getPerfilesDeSerie = (serieId: number) => datos<Perfil[]>(http.get(`/perfil/serie/${serieId}`));
export const postPerfil = (perfil: Perfil) => datos<Perfil>(http.post("/perfil/agregar", perfil));
export const putPerfil = (perfil: Perfil) => datos<Perfil>(http.put("/perfil/modificar", perfil));
export const deletePerfil = (id: number) => http.delete(`/perfil/eliminar/${id}`);

// ---------- Quincallería ----------
export const getQuincallerias = () => datos<Quincalleria[]>(http.get("/quincalleria"));
export const getQuincalleriaDeSerie = (serieId: number) => datos<Quincalleria[]>(http.get(`/quincalleria/serie/${serieId}`));
export const postQuincalleria = (q: Quincalleria) => datos<Quincalleria>(http.post("/quincalleria/agregar", q));
export const putQuincalleria = (q: Quincalleria) => datos<Quincalleria>(http.put("/quincalleria/modificar", q));
export const deleteQuincalleria = (id: number) => http.delete(`/quincalleria/eliminar/${id}`);

// ---------- Tipos de pauta ----------
export const getTiposPauta = () => datos<TipoPauta[]>(http.get("/tipo-pauta"));
export const postTipoPauta = (tipo: TipoPauta) => datos<TipoPauta>(http.post("/tipo-pauta/agregar", tipo));
export const putTipoPauta = (tipo: TipoPauta) => datos<TipoPauta>(http.put("/tipo-pauta/modificar", tipo));
export const getTiposProducto = () => datos<TipoProducto[]>(http.get("/tipo-producto"));

// ---------- Pautas ----------
export const getPautas = () => datos<Pauta[]>(http.get("/pauta"));
export const getPautasDeSerie = (serieId: number) => datos<Pauta[]>(http.get(`/pauta/serie/${serieId}`));
export const postPauta = (pauta: Pauta) => datos<Pauta>(http.post("/pauta/agregar", pauta));
export const putPauta = (pauta: Pauta) => datos<Pauta>(http.put("/pauta/modificar", pauta));
export const deletePauta = (id: number) => http.delete(`/pauta/eliminar/${id}`);

// ---------- Imágenes del catálogo (servidas por el front web en /pautas) ----------
/** Rutas relativas ("pautas/archivo.jpg") de las imágenes que se pueden asignar a pautas y quincallería. */
export const getImagenesDisponibles = async (): Promise<string[]> => {
    const url = urlImagen("pautas/imagenes.json");
    if (!url) return [];
    const respuesta = await fetch(url);
    return (await respuesta.json()) as string[];
};
