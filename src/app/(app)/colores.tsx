import { deleteColor, getColores, postColor, putColor } from "@/api/catalogo";
import { Mantenedor } from "@/admin/Mantenedor";
import { formatoPesos } from "@/lib/formato";
import type { Color } from "@/lib/tipos";
import { PuntoColor } from "@/ui/Imagen";
import { colorMarcoHex } from "@/ventana/catalogo";
import { hexACss } from "@/ventana/geometria";

/** Terminaciones del aluminio: cada color define el precio por kilo de aluminio. */
export default function Colores() {
    return (
        <Mantenedor<Color>
            nombre="color"
            cargar={getColores}
            idDe={(c) => c.colorId}
            tituloDe={(c) => c.nombre.trim()}
            descripcionDe={(c) => `${formatoPesos(c.valor)} por kg de aluminio`}
            izquierdaDe={(c) => <PuntoColor color={hexACss(colorMarcoHex(c.nombre))} tamano={28} />}
            nuevo={() => ({ colorId: null, nombre: "", valor: 0 })}
            campos={[
                { tipo: "texto", clave: "nombre", etiqueta: "Nombre", requerido: true },
                { tipo: "decimal", clave: "valor", etiqueta: "Valor por kg", unidad: "$", requerido: true, minimo: 0 },
            ]}
            guardar={(c, esNuevo) => (esNuevo ? postColor(c) : putColor(c))}
            eliminar={deleteColor}
        />
    );
}
