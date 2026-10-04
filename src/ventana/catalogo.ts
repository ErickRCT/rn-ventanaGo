import { getColores, getPautasDeSerie, getSeries, getVidrios } from "@/api/catalogo";
import type { Pauta } from "@/lib/tipos";
import type { ModeloVentana } from "./geometria";

export interface OpcionCatalogo {
    /** null en las opciones del catálogo básico, que no vienen del backend. */
    id: number | null;
    nombre: string;
    /** Valor que usa el backend para calcular el precio de la ventana; null en el catálogo básico. */
    valor: number | null;
}

// Se usan solo si el backend no responde, para que el cliente pueda seguir diseñando.
const COLORES_BASICOS: OpcionCatalogo[] = ["Blanco", "Negro", "Titanio", "Madera", "Mate"].map((nombre) => ({ id: null, nombre, valor: null }));
const VIDRIOS_BASICOS: OpcionCatalogo[] = ["Incoloro", "Bronce", "Gris"].map((nombre) => ({ id: null, nombre, valor: null }));

export interface Catalogo {
    colores: OpcionCatalogo[];
    vidrios: OpcionCatalogo[];
    /** true si se muestra el catálogo básico porque el backend no respondió. */
    basico: boolean;
}

export const cargarCatalogo = async (): Promise<Catalogo> => {
    try {
        const [colores, vidrios] = await Promise.all([getColores(), getVidrios()]);
        return {
            colores: colores.map((c) => ({ id: c.colorId, nombre: c.nombre, valor: c.valor })),
            vidrios: vidrios.map((v) => ({ id: v.vidrioId, nombre: v.nombre, valor: v.valor })),
            basico: false,
        };
    } catch {
        return { colores: COLORES_BASICOS, vidrios: VIDRIOS_BASICOS, basico: true };
    }
};

export interface PautaCatalogo {
    pauta: Pauta;
    serieNombre: string;
    /** Hojas para el dibujo y la AR: la pauta no las trae como dato, se deducen de su nombre. */
    hojas: number;
    /** Forma de la ventana, deducida de la imagen de la pauta. */
    modelo: ModeloVentana;
}

const decodificar = (texto: string) => {
    try {
        return decodeURIComponent(texto);
    } catch {
        return texto;
    }
};

const MODELOS: [RegExp, ModeloVentana][] = [
    [/granero/, "granero"],
    [/ba[ñn]o|ducha|shower|mampara/, "mampara"],
    [/batiente|abatible|puerta/, "batiente"],
    [/arcada|arco/, "arco"],
    [/mono\s*r+iel/, "monorriel"],
    [/corredera/, "corredera"],
    [/fij[ao]/, "fija"],
];

const modeloDeTexto = (texto: string) => MODELOS.find(([patron]) => patron.test(texto.toLowerCase()))?.[1];

/** La forma debe parecerse a la imagen de la pauta: primero el nombre del archivo, luego el tipo y la pauta. */
export const modeloDePauta = (pauta: Pauta): ModeloVentana =>
    modeloDeTexto(decodificar(pauta.tipoPauta?.rutaImagen ?? ""))
    ?? modeloDeTexto(pauta.tipoPauta?.nombre ?? "")
    ?? modeloDeTexto(pauta.nombre)
    ?? "corredera";

// Más que esto ya no es una variación razonable (metros de felpa/burlete por metro de ventana, o mm de descuento de vidrio).
const MAX_METROS_POR_METRO = 20;
const MAX_DESCUENTO_VIDRIO_MM = 300;

const pesoDeOrientacion = (pauta: Pauta, orientacion: string, cargado: number | null | undefined) => {
    if (cargado && cargado > 0) return cargado;
    return (pauta.perfiles ?? [])
        .filter((p) => p.orientacion?.toUpperCase() === orientacion)
        .reduce((suma, p) => suma + (parseFloat(String(p.perfil?.peso ?? "0").replace(",", ".")) || 0) * (p.cantidad ?? 1), 0);
};

/**
 * Datos de la pauta que harían que el precio del backend no sea real. Si hay alguno, al cliente
 * no se le muestra el precio: la pauta se debe corregir en el mantenedor de pautas.
 */
export const problemasDePrecio = (pauta: Pauta): string[] => {
    const problemas: string[] = [];
    if (pesoDeOrientacion(pauta, "H", pauta.pesoTeoricoHorizontal) <= 0) problemas.push("sin perfiles horizontales");
    if (pesoDeOrientacion(pauta, "V", pauta.pesoTeoricoVertical) <= 0) problemas.push("sin perfiles verticales");
    for (const q of pauta.quincallerias ?? []) {
        if (q.quincalleria?.unidad?.toLowerCase() === "mt"
            && ((q.variacionH ?? 0) > MAX_METROS_POR_METRO || (q.variacionV ?? 0) > MAX_METROS_POR_METRO)) {
            problemas.push(`${q.quincalleria.nombre.trim()}: variación de metros fuera de rango`);
        }
    }
    if (!pauta.vidrios?.length) problemas.push("sin vidrios");
    for (const v of pauta.vidrios ?? []) {
        if ((v.variacionH ?? 0) > MAX_DESCUENTO_VIDRIO_MM || (v.variacionV ?? 0) > MAX_DESCUENTO_VIDRIO_MM) {
            problemas.push("descuento de vidrio fuera de rango");
        }
    }
    return problemas;
};

export interface LimitesMedidas {
    maxAnchoMm: number;
    maxAltoMm: number;
}

// Cada hoja de corredera cubre hasta ~1,5 m, así que el ancho máximo crece con las hojas.
const ANCHO_MAX_POR_HOJA_MM = 1500;

/** Medidas máximas razonables de fabricación según la forma de la ventana (el mínimo es el general). */
export const limitesDeModelo = (modelo: ModeloVentana, hojas: number): LimitesMedidas => {
    switch (modelo) {
        case "corredera":
            return hojas <= 1
                ? { maxAnchoMm: 3000, maxAltoMm: 3000 }
                : { maxAnchoMm: Math.min(ANCHO_MAX_POR_HOJA_MM * hojas, 9000), maxAltoMm: hojas >= 3 ? 2600 : 2400 };
        case "monorriel": return { maxAnchoMm: 3000, maxAltoMm: 2400 };
        case "fija": return { maxAnchoMm: 3000, maxAltoMm: 3000 };
        case "arco": return { maxAnchoMm: 2400, maxAltoMm: 3000 };
        case "batiente": return { maxAnchoMm: 1200, maxAltoMm: 2700 };
        case "granero": return { maxAnchoMm: 4000, maxAltoMm: 3000 };
        case "mampara": return { maxAnchoMm: 3000, maxAltoMm: 2600 };
    }
};

// Tope solo para que un nombre absurdo no genere un modelo ilegible.
const MAX_HOJAS = 12;
const HOJAS_EN_LETRAS: Record<string, number> = { una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };

/** "Corredera 6 hojas" -> 6, "cuatro hojas" -> 4, "Ventana fija" -> 1, y 2 si no dice nada. */
export const hojasDePauta = (pauta: Pauta): number => {
    const texto = `${pauta.nombre} ${pauta.tipoPauta?.nombre ?? ""} ${pauta.tipoPauta?.rutaImagen ?? ""}`.toLowerCase();
    const indicada = texto.match(/(\d+|una|dos|tres|cuatro|cinco|seis|siete|ocho)\s*hojas?/);
    if (indicada) {
        const cantidad = HOJAS_EN_LETRAS[indicada[1]] ?? Number(indicada[1]);
        return Math.min(MAX_HOJAS, Math.max(1, cantidad));
    }
    return /\bfij[ao]s?\b/.test(texto) ? 1 : 2;
};

/** Pautas de todas las series. Lanza si el backend no responde. */
export const cargarPautas = async (): Promise<PautaCatalogo[]> => {
    const series = await getSeries();
    const porSerie = await Promise.all(series.map(async (serie) => {
        const pautas = await getPautasDeSerie(serie.serieId ?? 0);
        return pautas.map((pauta) => ({
            pauta, serieNombre: serie.nombre.trim(), hojas: hojasDePauta(pauta), modelo: modeloDePauta(pauta),
        }));
    }));
    return porSerie.flat();
};

// El backend solo entrega el nombre del color, así que el tono del dibujo se deduce de él.
const COLORES_MARCO: Record<string, number> = {
    blanco: 0xf4f4f4,
    negro: 0x1a1a1a,
    titanio: 0xa8a8a8,
    madera: 0x8b5a2b,
    mate: 0x4a4a4a,
};
const COLOR_MARCO_DEFECTO = 0xb8bcc7;

export const colorMarcoHex = (nombre: string) => COLORES_MARCO[nombre.trim().toLowerCase()] ?? COLOR_MARCO_DEFECTO;

const TINTES_VIDRIO: [string, number][] = [
    ["bronce", 0xb08a5a],
    ["gris", 0x8a929a],
    ["azul", 0x8fbfe8],
    ["verde", 0x9fd6b5],
];
const TINTE_VIDRIO_DEFECTO = 0xbfe6ff;

export const colorVidrioHex = (nombre: string) => {
    const buscado = nombre.toLowerCase();
    return TINTES_VIDRIO.find(([clave]) => buscado.includes(clave))?.[1] ?? TINTE_VIDRIO_DEFECTO;
};
