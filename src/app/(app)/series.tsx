import { deleteSerie, getSeries, postSerie, putSerie } from "@/api/catalogo";
import { Mantenedor } from "@/admin/Mantenedor";
import type { Serie } from "@/lib/tipos";

/** Líneas de aluminio (AL-25, L-5000…): agrupan los perfiles, la quincallería y las pautas. */
export default function Series() {
    return (
        <Mantenedor<Serie>
            nombre="serie"
            cargar={getSeries}
            idDe={(s) => s.serieId}
            tituloDe={(s) => s.nombre.trim()}
            descripcionDe={(s) => s.descripcion?.trim() || undefined}
            nuevo={() => ({ serieId: null, nombre: "", descripcion: "" })}
            campos={[
                { tipo: "texto", clave: "nombre", etiqueta: "Nombre", requerido: true },
                { tipo: "texto", clave: "descripcion", etiqueta: "Descripción", multilinea: true },
            ]}
            guardar={(s, esNuevo) => (esNuevo ? postSerie(s) : putSerie(s))}
            eliminar={deleteSerie}
        />
    );
}
