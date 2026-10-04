import { deleteVidrio, getVidrios, postVidrio, putVidrio } from "@/api/catalogo";
import { Mantenedor } from "@/admin/Mantenedor";
import { formatoPesos } from "@/lib/formato";
import type { Vidrio } from "@/lib/tipos";

/** Tipos de vidrio: cada uno define el precio por metro cuadrado. */
export default function Vidrios() {
    return (
        <Mantenedor<Vidrio>
            nombre="vidrio"
            cargar={getVidrios}
            idDe={(v) => v.vidrioId}
            tituloDe={(v) => v.nombre.trim()}
            descripcionDe={(v) => `${formatoPesos(v.valor)} por m²`}
            nuevo={() => ({ vidrioId: null, nombre: "", valor: 0 })}
            campos={[
                { tipo: "texto", clave: "nombre", etiqueta: "Nombre", requerido: true },
                { tipo: "decimal", clave: "valor", etiqueta: "Valor por m²", unidad: "$", requerido: true, minimo: 0 },
            ]}
            guardar={(v, esNuevo) => (esNuevo ? postVidrio(v) : putVidrio(v))}
            eliminar={deleteVidrio}
        />
    );
}
