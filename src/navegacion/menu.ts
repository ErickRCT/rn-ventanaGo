import type { Rol } from "@/context/AuthContext";

export interface ItemMenu {
    /** Nombre de la pantalla dentro de src/app/(app). */
    ruta: string;
    titulo: string;
    icono: string;
    /** Texto del encabezado de la pantalla (si es distinto del título del menú). */
    encabezado?: string;
}

export interface GrupoMenu {
    id: "administrador" | "cliente" | "empresa";
    titulo: string;
    icono: string;
    /** Roles que ven el grupo; el administrador ve todo, como en la web. */
    roles: Rol[];
    items: ItemMenu[];
}

export const GRUPOS_MENU: GrupoMenu[] = [
    {
        id: "administrador",
        titulo: "Administrador",
        icono: "shield-account-outline",
        roles: ["admin"],
        items: [
            { ruta: "inicio", titulo: "Inicio", icono: "home-outline" },
            { ruta: "crear-cotizacion", titulo: "Crear cotización", icono: "file-document-edit-outline" },
            { ruta: "cotizaciones", titulo: "Cotizaciones", icono: "clipboard-text-outline" },
            { ruta: "clientes", titulo: "Clientes", icono: "account-group-outline" },
            { ruta: "pautas", titulo: "Pautas", icono: "view-agenda-outline" },
            { ruta: "tipo-pautas", titulo: "Tipos de pauta", icono: "shape-outline" },
            { ruta: "perfiles", titulo: "Perfiles", icono: "ruler" },
            { ruta: "tipo-perfil", titulo: "Tipos de perfil", icono: "file-tree-outline" },
            { ruta: "quincalleria", titulo: "Quincallería", icono: "cog-outline" },
            { ruta: "vidrios", titulo: "Vidrios", icono: "window-closed-variant" },
            { ruta: "colores", titulo: "Colores", icono: "palette-outline" },
            { ruta: "series", titulo: "Series", icono: "format-list-bulleted" },
        ],
    },
    {
        id: "cliente",
        titulo: "Cliente",
        icono: "account-outline",
        roles: ["admin", "cliente"],
        items: [
            { ruta: "disenar", titulo: "Diseñar ventana", icono: "cube-scan", encabezado: "Diseñar ventana" },
            { ruta: "carrito", titulo: "Carrito", icono: "cart-outline" },
            { ruta: "mis-cotizaciones", titulo: "Mis cotizaciones", icono: "history" },
        ],
    },
    {
        id: "empresa",
        titulo: "Empresa",
        icono: "domain",
        roles: ["admin", "empresa"],
        items: [{ ruta: "solicitudes", titulo: "Solicitudes", icono: "inbox-arrow-down-outline" }],
    },
];

/** Pantalla con la que parte cada rol al entrar. */
export const RUTA_INICIAL: Record<Rol, string> = {
    admin: "inicio",
    cliente: "disenar",
    empresa: "solicitudes",
};

export const ETIQUETA_ROL: Record<Rol, string> = {
    admin: "Administrador",
    cliente: "Cliente",
    empresa: "Proveedor",
};

export const gruposDeRol = (rol: Rol | null) => GRUPOS_MENU.filter((g) => rol !== null && g.roles.includes(rol));
