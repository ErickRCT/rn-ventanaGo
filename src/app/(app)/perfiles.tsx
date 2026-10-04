import { deletePerfil, getPerfiles, getSeries, getTiposPerfil, postPerfil, putPerfil } from "@/api/catalogo";
import { Mantenedor } from "@/admin/Mantenedor";
import { formatoNumero } from "@/lib/formato";
import type { Perfil, Serie, TipoPerfil } from "@/lib/tipos";

/** Barras de aluminio concretas: código, serie, tipo, orientación y peso en kg por metro. */
export default function Perfiles() {
    return (
        <Mantenedor<Perfil>
            nombre="perfil"
            cargar={getPerfiles}
            idDe={(p) => p.perfilId}
            tituloDe={(p) => `${p.codigo}${p.tipoPerfil ? ` · ${p.tipoPerfil.nombre.trim()}` : ""}`}
            descripcionDe={(p) =>
                [
                    p.serie?.nombre.trim(),
                    p.orientacion === "H" ? "Horizontal" : "Vertical",
                    p.peso != null ? `${formatoNumero(Number(p.peso), 3)} kg/m` : null,
                    p.reforzado ? "Reforzado" : null,
                    p.isBastidor ? "Bastidor" : null,
                    p.descripcion?.trim() || null,
                ].filter(Boolean).join(" · ")
            }
            nuevo={() => ({
                perfilId: null, codigo: "", descripcion: "", peso: null, isBastidor: false,
                tipoPerfil: null, serie: null, reforzado: false, orientacion: "H",
            })}
            campos={[
                { tipo: "texto", clave: "codigo", etiqueta: "Código", requerido: true },
                { tipo: "decimal", clave: "peso", etiqueta: "Peso", unidad: "kg/m", requerido: true, minimo: 0 },
                { tipo: "texto", clave: "descripcion", etiqueta: "Descripción" },
                {
                    tipo: "seleccion", clave: "tipoPerfil", etiqueta: "Tipo de perfil", requerido: true,
                    cargar: getTiposPerfil, textoDe: (t: TipoPerfil) => t.nombre.trim(), claveDe: (t: TipoPerfil) => t.tipoPerfilId ?? 0,
                },
                {
                    tipo: "seleccion", clave: "serie", etiqueta: "Serie", requerido: true,
                    cargar: getSeries, textoDe: (s: Serie) => s.nombre.trim(), claveDe: (s: Serie) => s.serieId ?? 0,
                },
                {
                    tipo: "opciones", clave: "orientacion", etiqueta: "Orientación",
                    opciones: [{ valor: "H", etiqueta: "Horizontal" }, { valor: "V", etiqueta: "Vertical" }],
                },
                { tipo: "interruptor", clave: "isBastidor", etiqueta: "¿Es bastidor?" },
                { tipo: "interruptor", clave: "reforzado", etiqueta: "¿Reforzado?" },
            ]}
            guardar={(p, esNuevo) => (esNuevo ? postPerfil(p) : putPerfil(p))}
            eliminar={deletePerfil}
        />
    );
}
