import { useLocalSearchParams } from "expo-router";
import { EditorCotizacion } from "@/admin/EditorCotizacion";

/** Sin id se crea una cotización nueva; con ?id=N se edita esa cotización. */
export default function CrearCotizacion() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const numero = id ? Number(id) : NaN;
    const cotizacionId = Number.isInteger(numero) && numero > 0 ? numero : null;
    // La clave reinicia el editor al pasar de una cotización a otra (o a una nueva).
    return <EditorCotizacion key={cotizacionId ?? "nueva"} id={cotizacionId} />;
}
