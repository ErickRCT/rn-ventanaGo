import { http } from "./http";

export type RolBackend = "ADMIN" | "CLIENTE" | "PROVEEDOR";

export interface CuentaSesion {
    cuentaId: number;
    email: string;
    nombre: string | null;
    rol: RolBackend;
}

/** Respuesta de /auth: el token va en el header Authorization de cada petición. */
export interface Sesion {
    token: string;
    /** Fecha de vencimiento en milisegundos. */
    expiraEn: number;
    cuenta: CuentaSesion;
}

/** Usuario y contraseña, para todos los roles (igual que la web). */
export const loginConPassword = async (email: string, password: string): Promise<Sesion> =>
    (await http.post<Sesion>("/auth/login", { email, password })).data;
