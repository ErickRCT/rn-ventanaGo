import { getTiposPerfil, postTipoPerfil, putTipoPerfil } from "@/api/catalogo";
import { Mantenedor } from "@/admin/Mantenedor";
import type { TipoPerfil } from "@/lib/tipos";

/** Función de cada barra dentro de la ventana: riel superior, jamba, zócalo… */
export default function TiposPerfil() {
    return (
        <Mantenedor<TipoPerfil>
            nombre="tipo de perfil"
            cargar={getTiposPerfil}
            idDe={(t) => t.tipoPerfilId}
            tituloDe={(t) => t.nombre.trim()}
            nuevo={() => ({ tipoPerfilId: null, nombre: "" })}
            campos={[{ tipo: "texto", clave: "nombre", etiqueta: "Nombre", requerido: true }]}
            guardar={(t, esNuevo) => (esNuevo ? postTipoPerfil(t) : putTipoPerfil(t))}
        />
    );
}
