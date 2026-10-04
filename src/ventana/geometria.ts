/*
 * Geometría de la ventana, en metros, con el centro en el origen y el frente hacia +Z.
 * Es la misma que dibujaba el visor 3D de la web (ventana3d.ts), pero como datos: la usan
 * tanto el dibujo de vista previa (SVG) como la realidad aumentada (ViroReact).
 */

/** Formas de ventana que sabe dibujar la app, según las imágenes de las pautas. */
export type ModeloVentana = "corredera" | "monorriel" | "fija" | "arco" | "batiente" | "granero" | "mampara";

/** Lo que define una ventana: medidas en milímetros (como en las cotizaciones) y colores 0xRRGGBB. */
export interface ConfigVentana {
    anchoMm: number;
    altoMm: number;
    /** Hojas de la corredera: 1 es fija, desde 2 son corredizas. */
    hojas: number;
    modelo: ModeloVentana;
    colorMarco: number;
    colorVidrio: number;
}

export type Material = "marco" | "vidrio" | "herraje";

/** Caja (perfil, paño de vidrio o herraje) con su centro en (x, y, z). */
export interface Caja {
    tipo: "caja";
    material: Material;
    w: number;
    h: number;
    d: number;
    x: number;
    y: number;
    z: number;
}

/** Figura plana (el arco), con huecos opcionales, a la profundidad z. */
export interface Figura {
    tipo: "figura";
    material: Material;
    contorno: [number, number][];
    huecos: [number, number][][];
    z: number;
}

export type Pieza = Caja | Figura;

export const COLOR_HERRAJE = 0xc9ccd1;

const PROFUNDIDAD = 0.07;
const GROSOR_MARCO = 0.05;
const GROSOR_HOJA = 0.04;
const PROFUNDIDAD_HOJA = 0.03;
const GROSOR_TRAVESANO = 0.03;
const GROSOR_VIDRIO = 0.008;
/** Lo que se montan las hojas de una corredera una sobre otra. */
const SOLAPE = 0.03;
/** Separación entre rieles de la corredera. */
const PASO_RIEL = 0.016;

export const dimensionesM = ({ anchoMm, altoMm }: ConfigVentana) => ({ ancho: anchoMm / 1000, alto: altoMm / 1000 });

class Constructor {
    piezas: Pieza[] = [];

    caja(material: Material, w: number, h: number, d: number, x: number, y: number, z = 0) {
        if (w <= 0 || h <= 0 || d <= 0) return;
        this.piezas.push({ tipo: "caja", material, w, h, d, x, y, z });
    }

    /** Rectángulo de perfiles (marco u hoja) centrado en (x, y). */
    rectangulo(w: number, h: number, grosor: number, d: number, x: number, y: number, z = 0) {
        this.caja("marco", w, grosor, d, x, y + (h - grosor) / 2, z);
        this.caja("marco", w, grosor, d, x, y - (h - grosor) / 2, z);
        this.caja("marco", grosor, h - 2 * grosor, d, x - (w - grosor) / 2, y, z);
        this.caja("marco", grosor, h - 2 * grosor, d, x + (w - grosor) / 2, y, z);
    }

    /** Hoja con su propio perfil y vidrio, como las correderas y las puertas de las imágenes. */
    hoja(w: number, h: number, x: number, y: number, z: number) {
        this.caja("vidrio", w - 2 * GROSOR_HOJA, h - 2 * GROSOR_HOJA, GROSOR_VIDRIO, x, y, z);
        this.rectangulo(w, h, GROSOR_HOJA, PROFUNDIDAD_HOJA, x, y, z);
    }

    /** Tirador vertical de corredera, sobre la cara de la hoja. */
    tirador(x: number, z: number) {
        this.caja("herraje", 0.018, 0.12, 0.02, x, 0, z + PROFUNDIDAD_HOJA / 2 + 0.01);
    }
}

/** Corredera de n hojas: cada hoja en su riel, montadas unas sobre otras (2 rieles, o 3 desde 6 hojas). */
const corredera = (c: Constructor, ancho: number, alto: number, n: number) => {
    const anchoInterior = ancho - 2 * GROSOR_MARCO;
    const altoInterior = alto - 2 * GROSOR_MARCO;
    if (n <= 1) {
        c.caja("vidrio", anchoInterior, altoInterior, GROSOR_VIDRIO, 0, 0);
        c.rectangulo(ancho, alto, GROSOR_MARCO, PROFUNDIDAD, 0, 0);
        return;
    }
    c.rectangulo(ancho, alto, GROSOR_MARCO, PROFUNDIDAD, 0, 0);
    const rieles = n >= 6 ? 3 : 2;
    const anchoHoja = anchoInterior / n + SOLAPE;
    const paso = (anchoInterior - anchoHoja) / (n - 1);
    // Con un número par de hojas (desde 4) abren desde el centro: las centrales van en el riel de adelante.
    const simetrica = n >= 4 && n % 2 === 0;
    for (let i = 0; i < n; i++) {
        const riel = simetrica ? Math.min(i, n - 1 - i, rieles - 1) : i % rieles;
        const z = (riel - (rieles - 1) / 2) * PASO_RIEL;
        const x = -anchoInterior / 2 + anchoHoja / 2 + i * paso;
        c.hoja(anchoHoja, altoInterior, x, 0, z);
        // Los tiradores quedan donde se juntan las hojas del centro.
        if (i === Math.floor((n - 1) / 2)) c.tirador(x + anchoHoja / 2 - GROSOR_HOJA / 2, z);
        if (i === Math.ceil((n - 1) / 2) && n % 2 === 0) c.tirador(x - anchoHoja / 2 + GROSOR_HOJA / 2, z);
    }
};

/** Monorriel: un paño fijo a la izquierda y una hoja corredera a la derecha con su tirador. */
const monorriel = (c: Constructor, ancho: number, alto: number) => {
    const anchoInterior = ancho - 2 * GROSOR_MARCO;
    const altoInterior = alto - 2 * GROSOR_MARCO;
    const mitad = anchoInterior / 2;
    c.caja("vidrio", mitad - GROSOR_TRAVESANO / 2, altoInterior, GROSOR_VIDRIO, -mitad / 2 - GROSOR_TRAVESANO / 4, 0, -PASO_RIEL / 2);
    c.rectangulo(ancho, alto, GROSOR_MARCO, PROFUNDIDAD, 0, 0);
    c.caja("marco", GROSOR_TRAVESANO, altoInterior, PROFUNDIDAD, 0, 0);
    const xHoja = mitad / 2 + GROSOR_TRAVESANO / 4;
    const anchoHoja = mitad - GROSOR_TRAVESANO / 2;
    c.hoja(anchoHoja, altoInterior, xHoja, 0, PASO_RIEL / 2);
    c.tirador(xHoja + anchoHoja / 2 - GROSOR_HOJA / 2, PASO_RIEL / 2);
};

/** Contorno de ventana con arco arriba: tramo recto y medio óvalo que ocupa todo el ancho. */
const contornoArco = (w: number, h: number, altoArco: number, segmentos = 32): [number, number][] => {
    const base = -h / 2;
    const inicioArco = h / 2 - altoArco;
    const puntos: [number, number][] = [[-w / 2, base], [w / 2, base], [w / 2, inicioArco]];
    for (let i = 1; i < segmentos; i++) {
        const angulo = (Math.PI * i) / segmentos;
        puntos.push([(w / 2) * Math.cos(angulo), inicioArco + altoArco * Math.sin(angulo)]);
    }
    puntos.push([-w / 2, inicioArco]);
    return puntos;
};

/** Ventana fija con la parte de arriba en arco. */
const arco = (c: Constructor, ancho: number, alto: number) => {
    // El arco es semicircular salvo que la ventana sea tan baja que no quepa.
    const altoArco = Math.min(ancho / 2, alto * 0.6);
    const anchoInt = ancho - 2 * GROSOR_MARCO;
    const altoInt = alto - 2 * GROSOR_MARCO;
    const altoArcoInt = Math.max(0.01, altoArco - GROSOR_MARCO);
    const interior = contornoArco(anchoInt, altoInt, altoArcoInt);
    c.piezas.push({ tipo: "figura", material: "vidrio", contorno: interior, huecos: [], z: 0 });
    // El marco es plano por delante y por detrás, para que se vea desde cualquier lado.
    for (const z of [PROFUNDIDAD / 2, -PROFUNDIDAD / 2]) {
        c.piezas.push({ tipo: "figura", material: "marco", contorno: contornoArco(ancho, alto, altoArco), huecos: [interior], z });
    }
};

/** Puerta o ventana batiente de una hoja: manilla a la izquierda y bisagras a la derecha. */
const batiente = (c: Constructor, ancho: number, alto: number) => {
    c.rectangulo(ancho, alto, GROSOR_MARCO, PROFUNDIDAD, 0, 0);
    const anchoInterior = ancho - 2 * GROSOR_MARCO;
    const altoInterior = alto - 2 * GROSOR_MARCO;
    c.hoja(anchoInterior, altoInterior, 0, 0, 0.01);
    const zFrente = 0.01 + PROFUNDIDAD_HOJA / 2;
    // En puertas la manilla va a ~1 m del piso; en ventanas bajas, al medio.
    const yManilla = alto > 1.6 ? -alto / 2 + 1.0 : 0;
    const xManilla = -anchoInterior / 2 + GROSOR_HOJA / 2;
    c.caja("herraje", 0.03, 0.14, 0.012, xManilla, yManilla - 0.03, zFrente + 0.006);
    c.caja("herraje", 0.13, 0.02, 0.02, xManilla + 0.065, yManilla, zFrente + 0.035);
    c.caja("herraje", 0.016, 0.02, 0.035, xManilla, yManilla, zFrente + 0.018);
    for (const y of [altoInterior / 2 - 0.12, -altoInterior / 2 + 0.12]) {
        c.caja("herraje", 0.018, 0.1, 0.03, anchoInterior / 2 + 0.004, y, zFrente);
    }
};

/** Puerta doble de granero: dos vidrios sin marco colgados con ruedas de un riel superior, con tiradores largos. */
const granero = (c: Constructor, ancho: number, alto: number) => {
    const altoRiel = 0.06;
    const altoVidrio = alto - altoRiel - 0.05;
    const yVidrio = -alto / 2 + altoVidrio / 2;
    const zVidrio = 0.03;
    const yRiel = alto / 2 - altoRiel / 2;
    const hueco = 0.01;
    const anchoHoja = (ancho - hueco) / 2;
    for (const lado of [-1, 1]) {
        c.caja("vidrio", anchoHoja, altoVidrio, 0.01, lado * (anchoHoja + hueco) / 2, yVidrio, zVidrio);
    }
    // Barra del riel, un poco más ancha que el vano, separada de la pared.
    c.caja("herraje", ancho + 0.1, 0.025, 0.025, 0, yRiel, zVidrio + 0.03);
    for (const x of [-(ancho + 0.1) / 2 + 0.05, 0, (ancho + 0.1) / 2 - 0.05]) {
        c.caja("herraje", 0.02, 0.02, 0.05, x, yRiel, zVidrio + 0.005);
    }
    for (const lado of [-1, 1]) {
        const x = lado * (anchoHoja + hueco) / 2;
        // Dos ruedas por hoja, unidas al vidrio por una platina.
        for (const dx of [-anchoHoja / 2 + 0.1, anchoHoja / 2 - 0.1]) {
            c.caja("herraje", 0.07, 0.07, 0.015, x + dx, yRiel + 0.02, zVidrio + 0.03);
            c.caja("herraje", 0.03, yRiel - (yVidrio + altoVidrio / 2) + 0.06, 0.006, x + dx, (yRiel + yVidrio + altoVidrio / 2) / 2, zVidrio + 0.012);
        }
        // Tirador vertical largo junto a la unión de las hojas.
        const largo = Math.min(1.2, altoVidrio * 0.6);
        const xTirador = x - lado * (anchoHoja / 2 - 0.08);
        c.caja("herraje", 0.024, largo, 0.024, xTirador, yVidrio, zVidrio + 0.05);
        for (const dy of [-largo / 2 + 0.05, largo / 2 - 0.05]) {
            c.caja("herraje", 0.012, 0.012, 0.045, xTirador, yVidrio + dy, zVidrio + 0.027);
        }
    }
};

/** Mampara de baño: puerta de vidrio abatible entre dos paños fijos, sin marco, con bisagras y manilla en L. */
const mampara = (c: Constructor, ancho: number, alto: number) => {
    const hueco = 0.008;
    const proporciones = [0.35, 0.34, 0.31];
    const util = ancho - hueco * (proporciones.length - 1);
    let x = -ancho / 2;
    const vidrios = proporciones.map((proporcion) => {
        const w = util * proporcion;
        const centro = x + w / 2;
        x += w + hueco;
        c.caja("vidrio", w, alto, 0.01, centro, 0, 0);
        return { centro, w };
    });
    const [fijoIzq, puerta, fijoDer] = vidrios;
    const clip = (cx: number, cy: number) => c.caja("herraje", 0.035, 0.035, 0.025, cx, cy, 0);
    // Pinzas a la pared y al piso de los fijos.
    clip(fijoIzq.centro - fijoIzq.w / 2 + 0.018, alto / 2 - 0.2);
    clip(fijoIzq.centro - fijoIzq.w / 2 + 0.018, -alto / 2 + 0.2);
    for (const fijo of [fijoIzq, fijoDer]) {
        clip(fijo.centro - fijo.w / 4, -alto / 2 + 0.018);
        clip(fijo.centro + fijo.w / 4, -alto / 2 + 0.018);
    }
    clip(fijoDer.centro + fijoDer.w / 2 - 0.018, alto / 2 - 0.2);
    clip(fijoDer.centro + fijoDer.w / 2 - 0.018, -alto / 2 + 0.2);
    // Bisagras entre la puerta y el fijo derecho.
    const xBisagra = puerta.centro + puerta.w / 2;
    for (const y of [alto / 2 - 0.25, -alto / 2 + 0.25]) {
        c.caja("herraje", 0.05, 0.08, 0.03, xBisagra, y, 0);
    }
    // Manilla en L a media altura, cerca del borde que abre.
    const yManilla = alto > 1.6 ? -alto / 2 + 1.05 : 0;
    const xManilla = puerta.centro - puerta.w / 2 + 0.08;
    const largo = Math.min(0.3, puerta.w * 0.6);
    c.caja("herraje", 0.018, 0.12, 0.018, xManilla, yManilla + 0.06, 0.04);
    c.caja("herraje", largo, 0.018, 0.018, xManilla + largo / 2, yManilla, 0.04);
    c.caja("herraje", 0.012, 0.012, 0.035, xManilla, yManilla, 0.02);
    c.caja("herraje", 0.012, 0.012, 0.035, xManilla + largo, yManilla, 0.02);
};

/** Piezas de la ventana según su modelo, ordenadas de atrás hacia adelante (útil para dibujarla de frente). */
export const piezasVentana = (config: ConfigVentana): Pieza[] => {
    const { ancho, alto } = dimensionesM(config);
    const c = new Constructor();
    switch (config.modelo) {
        case "monorriel": monorriel(c, ancho, alto); break;
        case "fija": corredera(c, ancho, alto, 1); break;
        case "arco": arco(c, ancho, alto); break;
        case "batiente": batiente(c, ancho, alto); break;
        case "granero": granero(c, ancho, alto); break;
        case "mampara": mampara(c, ancho, alto); break;
        default: corredera(c, ancho, alto, config.hojas);
    }
    const frente = (p: Pieza) => (p.tipo === "caja" ? p.z + p.d / 2 : p.z);
    return c.piezas
        .map((pieza, orden) => ({ pieza, orden }))
        .sort((a, b) => frente(a.pieza) - frente(b.pieza) || a.orden - b.orden)
        .map(({ pieza }) => pieza);
};

/** Vidrios sin marco (granero y mampara) se ven más opacos, como en las imágenes de las pautas. */
export const opacidadVidrio = (modelo: ModeloVentana) => (modelo === "granero" || modelo === "mampara" ? 0.45 : 0.3);

export const hexACss = (color: number) => `#${color.toString(16).padStart(6, "0")}`;
