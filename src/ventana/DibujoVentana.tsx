import Svg, { G, Path, Rect } from "react-native-svg";
import { COLOR_HERRAJE, hexACss, opacidadVidrio, piezasVentana, type ConfigVentana, type Material } from "./geometria";

interface DibujoVentanaProps {
    config: ConfigVentana;
    /** Lado mayor del dibujo, en píxeles. */
    tamano?: number;
}

const MARGEN = 0.08;

/** Vista de frente de la ventana, a escala, con las mismas piezas que se proyectan en realidad aumentada. */
export const DibujoVentana = ({ config, tamano = 260 }: DibujoVentanaProps) => {
    const piezas = piezasVentana(config);
    // Caja que encierra todas las piezas (el riel del granero sobresale del vano).
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of piezas) {
        const puntos: [number, number][] = p.tipo === "caja"
            ? [[p.x - p.w / 2, p.y - p.h / 2], [p.x + p.w / 2, p.y + p.h / 2]]
            : p.contorno;
        for (const [x, y] of puntos) {
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
    }
    const anchoM = maxX - minX + 2 * MARGEN;
    const altoM = maxY - minY + 2 * MARGEN;
    const escala = tamano / Math.max(anchoM, altoM);
    const ancho = anchoM * escala;
    const alto = altoM * escala;

    // En el SVG el eje Y crece hacia abajo.
    const px = (x: number) => (x - minX + MARGEN) * escala;
    const py = (y: number) => (maxY + MARGEN - y) * escala;

    const relleno: Record<Material, string> = {
        marco: hexACss(config.colorMarco),
        vidrio: hexACss(config.colorVidrio),
        herraje: hexACss(COLOR_HERRAJE),
    };
    const opacidad: Record<Material, number> = { marco: 1, vidrio: opacidadVidrio(config.modelo) + 0.25, herraje: 1 };
    const trazo = "rgba(0,0,0,0.28)";

    const camino = (puntos: [number, number][]) =>
        puntos.map(([x, y], i) => `${i === 0 ? "M" : "L"}${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" ") + " Z";

    return (
        <Svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} accessibilityLabel={`Ventana de ${config.anchoMm} por ${config.altoMm} milímetros`}>
            <G>
                {piezas.map((p, i) =>
                    p.tipo === "caja" ? (
                        <Rect
                            key={i}
                            x={px(p.x - p.w / 2)}
                            y={py(p.y + p.h / 2)}
                            width={p.w * escala}
                            height={p.h * escala}
                            fill={relleno[p.material]}
                            fillOpacity={opacidad[p.material]}
                            stroke={p.material === "vidrio" ? "none" : trazo}
                            strokeWidth={0.6}
                        />
                    ) : (
                        <Path
                            key={i}
                            d={[camino(p.contorno), ...p.huecos.map(camino)].join(" ")}
                            fillRule="evenodd"
                            fill={relleno[p.material]}
                            fillOpacity={opacidad[p.material]}
                            stroke={p.material === "vidrio" ? "none" : trazo}
                            strokeWidth={0.6}
                        />
                    ),
                )}
            </G>
        </Svg>
    );
};
