import { getTiposPauta, postTipoPauta, putTipoPauta } from "@/api/catalogo";
import { Mantenedor } from "@/admin/Mantenedor";
import type { TipoPauta } from "@/lib/tipos";
import { ImagenCatalogo } from "@/ui/Imagen";

/** Modelo visual de la ventana con su imagen; de la imagen se deduce la forma que se ve en realidad aumentada. */
export default function TiposPauta() {
    return (
        <Mantenedor<TipoPauta>
            nombre="tipo de pauta"
            cargar={getTiposPauta}
            idDe={(t) => t.tipoPautaId}
            tituloDe={(t) => t.nombre.trim()}
            izquierdaDe={(t) => <ImagenCatalogo ruta={t.rutaImagen} tamano={40} />}
            nuevo={() => ({ tipoPautaId: null, nombre: "", rutaImagen: null })}
            campos={[
                { tipo: "texto", clave: "nombre", etiqueta: "Nombre", requerido: true },
                { tipo: "imagen", clave: "rutaImagen", etiqueta: "Imagen" },
            ]}
            guardar={(t, esNuevo) => (esNuevo ? postTipoPauta(t) : putTipoPauta(t))}
            ayuda="La imagen define la forma con que se dibuja la ventana (corredera, fija, arco, batiente, granero o mampara)."
        />
    );
}
