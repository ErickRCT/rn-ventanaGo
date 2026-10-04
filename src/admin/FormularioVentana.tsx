import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { aNumero } from "@/lib/formato";
import type { Color, Pauta, Vidrio } from "@/lib/tipos";
import { Campo, NUMERICO } from "@/ui/Campo";
import { Aviso } from "@/ui/Estados";
import { HojaFormulario } from "@/ui/HojaFormulario";
import { ImagenCatalogo, PuntoColor } from "@/ui/Imagen";
import { Selector } from "@/ui/Selector";
import { colorMarcoHex } from "@/ventana/catalogo";
import { hexACss } from "@/ventana/geometria";

// Medidas mínimas, iguales a las de la web.
const MIN_ANCHO = 300;
const MIN_ALTO = 300;

export interface DatosVentana {
    descripcion: string;
    cantidad: number;
    ancho: number;
    alto: number;
    color: Color;
    vidrio: Vidrio;
    observaciones: string;
}

interface FormularioVentanaProps {
    pauta: Pauta;
    colores: Color[];
    vidrios: Vidrio[];
    guardando: boolean;
    onCerrar: () => void;
    onAgregar: (datos: DatosVentana) => void;
}

/** Ventana de una cotización formal: medidas, color y vidrio sobre la pauta elegida. Se monta al elegir la pauta. */
export const FormularioVentana = ({ pauta, colores, vidrios, guardando, onCerrar, onAgregar }: FormularioVentanaProps) => {
    const [descripcion, setDescripcion] = useState(pauta.nombre.trim());
    const [cantidad, setCantidad] = useState("1");
    const [ancho, setAncho] = useState("");
    const [alto, setAlto] = useState("");
    const [color, setColor] = useState<Color | null>(null);
    const [vidrio, setVidrio] = useState<Vidrio | null>(null);
    const [observaciones, setObservaciones] = useState("");
    const [error, setError] = useState<string | null>(null);

    const reforzadaAncho = pauta.isReforzada && aNumero(ancho) >= pauta.horizontalReforzada;
    const reforzadaAlto = pauta.isReforzada && aNumero(alto) >= pauta.verticalReforzada;

    const agregar = () => {
        const [c, an, al] = [aNumero(cantidad), aNumero(ancho), aNumero(alto)];
        if (!descripcion.trim() || !color || !vidrio) return setError("Todos los campos son obligatorios excepto Observaciones.");
        if (!(c > 0 && an > 0 && al > 0)) return setError("Cantidad, ancho y alto deben ser números positivos.");
        if (an < MIN_ANCHO) return setError(`El ancho mínimo permitido es ${MIN_ANCHO} mm.`);
        if (al < MIN_ALTO) return setError(`El alto mínimo permitido es ${MIN_ALTO} mm.`);
        setError(null);
        onAgregar({ descripcion: descripcion.trim(), cantidad: c, ancho: an, alto: al, color, vidrio, observaciones: observaciones.trim() });
    };

    return (
        <HojaFormulario visible titulo="Agregar ventana" onCerrar={onCerrar} onGuardar={agregar} guardando={guardando} etiquetaGuardar="Agregar producto">
            <View style={estilos.pauta}>
                <ImagenCatalogo ruta={pauta.tipoPauta?.rutaImagen} tamano={72} />
                <Text variant="titleMedium" style={{ flex: 1 }}>{pauta.nombre.trim()}</Text>
            </View>
            {pauta.isReforzada && (
                <Aviso tipo={reforzadaAncho || reforzadaAlto ? "aviso" : "info"}
                    texto={`Reforzado desde ${pauta.horizontalReforzada} mm de ancho y ${pauta.verticalReforzada} mm de alto.`} />
            )}
            <Campo label="Descripción" value={descripcion} onChangeText={setDescripcion} />
            <Campo label="Cantidad" value={cantidad} onChangeText={setCantidad} {...NUMERICO} />
            <View style={estilos.fila}>
                <Campo style={{ flex: 1 }} label="Ancho" unidad="mm" value={ancho} onChangeText={setAncho} {...NUMERICO}
                    ayuda={reforzadaAncho ? "Lleva refuerzo" : undefined} />
                <Campo style={{ flex: 1 }} label="Alto" unidad="mm" value={alto} onChangeText={setAlto} {...NUMERICO}
                    ayuda={reforzadaAlto ? "Lleva refuerzo" : undefined} />
            </View>
            <Selector
                etiqueta="Color"
                opciones={colores}
                valor={color}
                onCambiar={setColor}
                textoDe={(c) => c.nombre}
                claveDe={(c) => c.colorId ?? c.nombre}
                izquierdaDe={(c) => <PuntoColor color={hexACss(colorMarcoHex(c.nombre))} />}
            />
            <Selector etiqueta="Vidrio" opciones={vidrios} valor={vidrio} onCambiar={setVidrio} textoDe={(v) => v.nombre} claveDe={(v) => v.vidrioId ?? v.nombre} buscador />
            <Campo label="Observaciones" value={observaciones} onChangeText={setObservaciones} multiline numberOfLines={2} />
            {error && <Aviso tipo="error" texto={error} />}
        </HojaFormulario>
    );
};

const estilos = StyleSheet.create({
    pauta: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 8, borderRadius: 8 },
    fila: { flexDirection: "row", gap: 12 },
});
