import { http } from "./http";
import { crearRecurso } from "./recursoRemoto";
import { useAuth } from "@/context/AuthContext";
import type { Aviso, DatosContacto, ItemVentana, Servicio, Solicitud } from "@/lib/tipos";

/*
 * Carrito, solicitudes de cotización y avisos, guardados en el backend.
 * El backend identifica al usuario por el token; el usuario solo separa los datos en memoria al cambiar de sesión.
 */

// Las solicitudes nuevas y las respuestas llegan de otros usuarios: se revisan cada 30 s.
const INTERVALO_ACTUALIZACION_MS = 30_000;

const SIN_ITEMS: ItemVentana[] = [];
const SIN_SOLICITUDES: Solicitud[] = [];
const SIN_AVISOS: Aviso[] = [];

const carrito = crearRecurso(async () => (await http.get<ItemVentana[]>("/carrito")).data, SIN_ITEMS);
const solicitudes = crearRecurso(
    async () => (await http.get<Solicitud[]>("/solicitudes")).data, SIN_SOLICITUDES, INTERVALO_ACTUALIZACION_MS,
);
const avisos = crearRecurso(async () => (await http.get<Aviso[]>("/avisos")).data, SIN_AVISOS, INTERVALO_ACTUALIZACION_MS);

/** Al cerrar sesión se olvida todo lo cargado. */
export const limpiarDatosDeSesion = () => {
    carrito.limpiar();
    solicitudes.limpiar();
    avisos.limpiar();
};

// ---------- Hooks de lectura ----------

/** Solo clientes (y el administrador) tienen carrito. */
export const useCarrito = (): ItemVentana[] => {
    const { rol, usuario } = useAuth();
    return carrito.useValor(usuario && (rol === "cliente" || rol === "admin") ? usuario : null);
};

/** El cliente recibe las suyas; proveedores y administrador, todas. */
export const useSolicitudes = (): Solicitud[] => {
    const { usuario } = useAuth();
    return solicitudes.useValor(usuario || null);
};

export const refrescarSolicitudes = () => solicitudes.refrescar();

/** Avisos de la empresa (solicitudes nuevas) o del cliente (respuestas); el administrador no recibe. */
export const useAvisos = (): Aviso[] => {
    const { rol, usuario } = useAuth();
    return avisos.useValor(usuario && rol !== "admin" ? usuario : null);
};

// ---------- Carrito ----------

export type NuevoItem = Omit<ItemVentana, "id" | "precioUnitario">;

export const agregarAlCarrito = async (item: NuevoItem) => {
    carrito.setear((await http.post<ItemVentana[]>("/carrito", item)).data);
};

export const cambiarCantidad = async (itemId: string, cantidad: number) => {
    carrito.setear((await http.put<ItemVentana[]>(`/carrito/${itemId}/cantidad`, { cantidad })).data);
};

export const quitarDelCarrito = async (itemId: string) => {
    carrito.setear((await http.delete<ItemVentana[]>(`/carrito/${itemId}`)).data);
};

// ---------- Solicitudes ----------

export interface DatosSolicitud {
    contacto: DatosContacto;
    servicios: Servicio[];
    observaciones: string;
}

/** Convierte el carrito del cliente en una solicitud pendiente; el backend vacía el carrito y avisa a los proveedores. */
export const enviarSolicitud = async (datos: DatosSolicitud): Promise<Solicitud> => {
    const solicitud = (await http.post<Solicitud>("/solicitudes", datos)).data;
    carrito.setear(SIN_ITEMS);
    solicitudes.setear([...solicitudes.leer().filter((s) => s.numero !== solicitud.numero), solicitud]);
    return solicitud;
};

export interface RespuestaDeEmpresa {
    estado: Exclude<Solicitud["estado"], "PENDIENTE">;
    mensaje: string;
    items: ItemVentana[];
    notificarEnApp: boolean;
    notificarPorCorreo: boolean;
}

/** Registra lo que la empresa decidió; el backend calcula el total y avisa al cliente si corresponde. */
export const responderSolicitud = async (numero: number, respuesta: RespuestaDeEmpresa): Promise<Solicitud> => {
    const actualizada = (await http.post<Solicitud>(`/solicitudes/${numero}/respuesta`, respuesta)).data;
    solicitudes.setear(solicitudes.leer().map((s) => (s.numero === numero ? actualizada : s)));
    return actualizada;
};

// ---------- Avisos ----------

export const marcarAvisosLeidos = async () => {
    const actuales = avisos.leer();
    if (!actuales.some((a) => !a.leido)) return;
    avisos.setear(actuales.map((a) => ({ ...a, leido: true })));
    try {
        await http.post("/avisos/leidos");
    } catch (error) {
        console.warn("No se pudieron marcar los avisos como leídos:", error);
        void avisos.refrescar();
    }
};
