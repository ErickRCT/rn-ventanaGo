import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { http, obtenerToken } from "./http";
import { API_BASE_URL } from "@/lib/config";
import type { Cliente, Comuna, Cotizacion, Region, Ventana } from "@/lib/tipos";

const datos = <T>(promesa: Promise<{ data: T }>) => promesa.then((r) => r.data);

// ---------- Cotizaciones y ventanas ----------
export const getCotizaciones = () => datos<Cotizacion[]>(http.get("/cotizacion"));
export const getCotizacion = (id: number) => datos<Cotizacion>(http.get(`/cotizacion/${id}`));
export const postCotizacion = (cotizacion: Cotizacion) => datos<Cotizacion>(http.post("/cotizacion/agregar", cotizacion));
export const putCotizacion = (cotizacion: Cotizacion) => datos<Cotizacion>(http.put("/cotizacion/modificar", cotizacion));

export const postVentana = (ventana: Ventana) => datos<Ventana>(http.post("/ventana/agregar", ventana));
export const deleteVentana = (id: number) => http.delete(`/ventana/eliminar/${id}`);
/** Calcula el precio neto de una ventana sin guardarla (lo usa también el cliente al diseñar). */
export const cotizarVentana = (ventana: Ventana) => datos<Ventana>(http.post("/ventana/cotizar", ventana));

// ---------- Clientes de las cotizaciones ----------
export const getClientes = () => datos<Cliente[]>(http.get("/cliente"));
export const getCliente = (id: number) => datos<Cliente>(http.get(`/cliente/${id}`));
export const postCliente = (cliente: Cliente) => datos<Cliente>(http.post("/cliente/agregar", cliente));
export const getRegiones = () => datos<Region[]>(http.get("/region"));
export const getComunas = (regionId: number) => datos<Comuna[]>(http.get(`/comuna/region/${regionId}`));

// ---------- Documentos PDF ----------
export type TipoDocumento = "cotizacion" | "orden-de-trabajo";

/**
 * Descarga el PDF que genera el backend y abre el menú del teléfono para verlo o compartirlo
 * (WhatsApp, correo, Drive, un lector de PDF, etc.).
 */
export const descargarDocumento = async (tipo: TipoDocumento, cotizacionId: number) => {
    const token = obtenerToken();
    // Si el servidor responde con error, la promesa se rechaza y no queda un archivo a medias.
    const archivo = await File.downloadFileAsync(
        `${API_BASE_URL}/documentos/${tipo}/${cotizacionId}`,
        new File(Paths.cache, `${tipo}_${cotizacionId}.pdf`),
        { headers: token ? { Authorization: `Bearer ${token}` } : {}, idempotent: true },
    );
    if (!(await Sharing.isAvailableAsync())) throw new Error("Este teléfono no permite abrir el documento.");
    await Sharing.shareAsync(archivo.uri, {
        mimeType: "application/pdf",
        dialogTitle: tipo === "cotizacion" ? "Cotización" : "Orden de trabajo",
        UTI: "com.adobe.pdf",
    });
};
