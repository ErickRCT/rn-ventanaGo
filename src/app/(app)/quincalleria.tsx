import { deleteQuincalleria, getQuincallerias, getSeries, postQuincalleria, putQuincalleria } from "@/api/catalogo";
import { Mantenedor } from "@/admin/Mantenedor";
import { formatoPesos } from "@/lib/formato";
import type { Quincalleria, Serie } from "@/lib/tipos";
import { ImagenCatalogo } from "@/ui/Imagen";

/** Accesorios de la ventana (carros, pestillos, felpas…): se cobran por pieza o por metro. */
export default function QuincalleriaPantalla() {
    return (
        <Mantenedor<Quincalleria>
            nombre="quincallería"
            cargar={getQuincallerias}
            idDe={(q) => q.quincalleriaId}
            tituloDe={(q) => q.nombre.trim()}
            descripcionDe={(q) => `${formatoPesos(q.valor)} por ${q.unidad === "Pz" ? "pieza" : "metro"}${q.serie ? ` · ${q.serie.nombre.trim()}` : ""}`}
            izquierdaDe={(q) => <ImagenCatalogo ruta={q.rutaImagen} tamano={40} />}
            nuevo={() => ({ quincalleriaId: null, nombre: "", unidad: "Pz", valor: 0, rutaImagen: "", serie: null })}
            campos={[
                { tipo: "texto", clave: "nombre", etiqueta: "Nombre", requerido: true },
                { tipo: "decimal", clave: "valor", etiqueta: "Valor", unidad: "$", requerido: true, minimo: 0 },
                { tipo: "opciones", clave: "unidad", etiqueta: "Unidad", opciones: [{ valor: "Pz", etiqueta: "Por pieza (Pz)" }, { valor: "Mt", etiqueta: "Por metro (Mt)" }] },
                {
                    tipo: "seleccion", clave: "serie", etiqueta: "Serie", requerido: true,
                    cargar: getSeries, textoDe: (s: Serie) => s.nombre.trim(), claveDe: (s: Serie) => s.serieId ?? 0,
                },
                { tipo: "imagen", clave: "rutaImagen", etiqueta: "Imagen" },
            ]}
            guardar={(q, esNuevo) => (esNuevo ? postQuincalleria(q) : putQuincalleria(q))}
            eliminar={deleteQuincalleria}
        />
    );
}
