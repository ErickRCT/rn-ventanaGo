import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { alRechazarToken, fijarToken } from "@/api/http";
import type { RolBackend, Sesion } from "@/api/auth";

export type Rol = "admin" | "cliente" | "empresa";

/** Rol del backend -> rol de las pantallas. Los proveedores (empresas y particulares) usan el panel de empresa. */
const ROL_APP: Record<RolBackend, Rol> = { ADMIN: "admin", CLIENTE: "cliente", PROVEEDOR: "empresa" };

const CLAVE_SESION = "ventanago.sesion";

interface AuthContextType {
    /** true mientras se lee la sesión guardada en el teléfono. */
    cargando: boolean;
    isAuthenticated: boolean;
    rol: Rol | null;
    /** Correo de la cuenta; identifica el carrito y las solicitudes del usuario. */
    usuario: string;
    nombre: string | null;
    login: (sesion: Sesion) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const leerSesion = async (): Promise<Sesion | null> => {
    try {
        const guardada = JSON.parse((await SecureStore.getItemAsync(CLAVE_SESION)) ?? "null") as Sesion | null;
        return guardada && guardada.token && guardada.expiraEn > Date.now() ? guardada : null;
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [sesion, setSesion] = useState<Sesion | null>(null);
    const [cargando, setCargando] = useState(true);

    const logout = async () => {
        fijarToken(null);
        setSesion(null);
        await SecureStore.deleteItemAsync(CLAVE_SESION);
    };

    const login = async (nueva: Sesion) => {
        fijarToken(nueva.token);
        setSesion(nueva);
        await SecureStore.setItemAsync(CLAVE_SESION, JSON.stringify(nueva));
    };

    useEffect(() => {
        alRechazarToken(() => void logout());
        leerSesion().then((guardada) => {
            fijarToken(guardada?.token ?? null);
            setSesion(guardada);
            setCargando(false);
        });
    }, []);

    // Al vencer el token (12 h) la sesión se cierra sola.
    useEffect(() => {
        if (!sesion) return;
        const vence = setTimeout(() => void logout(), Math.max(0, sesion.expiraEn - Date.now()));
        return () => clearTimeout(vence);
    }, [sesion]);

    const value: AuthContextType = {
        cargando,
        isAuthenticated: sesion !== null,
        rol: sesion ? ROL_APP[sesion.cuenta.rol] : null,
        usuario: sesion?.cuenta.email ?? "",
        nombre: sesion?.cuenta.nombre ?? null,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider");
    return context;
};
