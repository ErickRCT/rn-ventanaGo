import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
    ViroAmbientLight,
    ViroARPlaneSelector,
    ViroARScene,
    ViroBox,
    ViroDirectionalLight,
    ViroMaterials,
    ViroNode,
    ViroPolygon,
    ViroTrackingStateConstants,
} from "@reactvision/react-viro";
import { COLOR_HERRAJE, hexACss, opacidadVidrio, piezasVentana, type ConfigVentana } from "@/ventana/geometria";

/** Lo que la pantalla de AR comparte con la escena (la escena vive dentro del navegador de Viro). */
export interface ControlEscena {
    config: ConfigVentana;
    /** Giros extra de 90° que pidió el usuario (la escena no se vuelve a renderizar con viroAppProps). */
    giros: { leer: () => number; suscribir: (oyente: () => void) => () => void };
    alCambiarSeguimiento: (normal: boolean) => void;
    alDetectarPared: () => void;
    alColocar: () => void;
    /** La escena deja aquí la función para volver a elegir la pared. */
    registrarReinicio: (reiniciar: () => void) => void;
}

type Vec3 = [number, number, number];

const rad = (grados: number) => (grados * Math.PI) / 180;

/** Aplica R = Rx·Ry·Rz (el orden de los ángulos de los anchors de Viro) al vector v. */
const rotar = ([rx, ry, rz]: Vec3, [x, y, z]: Vec3): Vec3 => {
    const [cx, sx, cy, sy, cz, sz] = [Math.cos(rad(rx)), Math.sin(rad(rx)), Math.cos(rad(ry)), Math.sin(rad(ry)), Math.cos(rad(rz)), Math.sin(rad(rz))];
    // Rz
    let a: Vec3 = [cz * x - sz * y, sz * x + cz * y, z];
    // Ry
    a = [cy * a[0] + sy * a[2], a[1], -sy * a[0] + cy * a[2]];
    // Rx
    return [a[0], cx * a[1] - sx * a[2], sx * a[1] + cx * a[2]];
};

/**
 * La pared detectada tiene su normal en +Y local, pero el giro dentro del plano depende de cómo ARCore
 * orientó el anchor. Se prueba cada cuarto de vuelta y se elige el que deja la ventana derecha (su "arriba"
 * apuntando hacia arriba en el mundo).
 */
const giroParaQuedarDerecha = (rotacionPared: Vec3): number => {
    let mejor = 0;
    let mejorAltura = -Infinity;
    for (const grados of [0, 90, 180, 270]) {
        // Tras girar -90° en X, el "arriba" de la ventana queda en -Z local; luego se gira en Y (la normal).
        const arriba: Vec3 = [-Math.sin(rad(grados)), 0, -Math.cos(rad(grados))];
        const altura = rotar(rotacionPared, arriba)[1];
        if (altura > mejorAltura) {
            mejorAltura = altura;
            mejor = grados;
        }
    }
    return mejor;
};

const nombreMaterial = (tipo: string, color: number) => `ventana_${tipo}_${color.toString(16)}`;

const materialesDe = (config: ConfigVentana) => {
    const marco = nombreMaterial("marco", config.colorMarco);
    const vidrio = nombreMaterial("vidrio", config.colorVidrio);
    const herraje = nombreMaterial("herraje", COLOR_HERRAJE);
    ViroMaterials.createMaterials({
        [marco]: { lightingModel: "Blinn", diffuseColor: hexACss(config.colorMarco), shininess: 32, cullMode: "None" },
        [vidrio]: {
            lightingModel: "Blinn",
            diffuseColor: hexACss(config.colorVidrio),
            shininess: 64,
            blendMode: "Alpha",
            cullMode: "None",
            writesToDepthBuffer: false,
        },
        [herraje]: { lightingModel: "Blinn", diffuseColor: hexACss(COLOR_HERRAJE), shininess: 64, cullMode: "None" },
    });
    return { marco, vidrio, herraje };
};

/** Ventana a escala real (1 unidad de Viro = 1 metro), centrada en el origen y con el frente hacia +Z. */
const ModeloVentana = ({ config }: { config: ConfigVentana }) => {
    const materiales = materialesDe(config);
    const opacidad = opacidadVidrio(config.modelo);
    return (
        <>
            {piezasVentana(config).map((p, i) =>
                p.tipo === "caja" ? (
                    <ViroBox
                        key={i}
                        position={[p.x, p.y, p.z]}
                        width={p.w}
                        height={p.h}
                        length={p.d}
                        materials={[materiales[p.material]]}
                        opacity={p.material === "vidrio" ? opacidad : 1}
                    />
                ) : (
                    <ViroPolygon
                        key={i}
                        position={[0, 0, p.z]}
                        vertices={p.contorno}
                        holes={p.huecos}
                        materials={[materiales[p.material]]}
                        opacity={p.material === "vidrio" ? opacidad : 1}
                    />
                ),
            )}
        </>
    );
};

interface PropsEscena {
    sceneNavigator: { viroAppProps: ControlEscena };
}

/** Escena de AR: detecta paredes; al tocar una, la ventana queda pegada a ella en el punto tocado. */
export const EscenaVentana = (props: PropsEscena) => {
    const control = props.sceneNavigator.viroAppProps;
    const selector = useRef<ViroARPlaneSelector>(null);
    const [giroBase, setGiroBase] = useState(0);
    const paredesVistas = useRef(0);
    const giros = useSyncExternalStore(control.giros.suscribir, control.giros.leer);

    useEffect(() => {
        control.registrarReinicio(() => selector.current?.reset());
    }, [control]);

    // La ventana sobresale la mitad de su profundidad para quedar apoyada sobre la pared, no hundida en ella.
    const separacion = 0.04;

    return (
        <ViroARScene
            anchorDetectionTypes={["PlanesVertical"]}
            onTrackingUpdated={(estado) => control.alCambiarSeguimiento(estado === ViroTrackingStateConstants.TRACKING_NORMAL)}
            onAnchorFound={(anchor) => {
                selector.current?.handleAnchorFound(anchor);
                if (anchor.type === "plane" && anchor.alignment?.includes("Vertical") && paredesVistas.current++ === 0) {
                    control.alDetectarPared();
                }
            }}
            onAnchorUpdated={(anchor) => selector.current?.handleAnchorUpdated(anchor)}
            onAnchorRemoved={(anchor) => anchor && selector.current?.handleAnchorRemoved(anchor)}
        >
            <ViroAmbientLight color="#ffffff" intensity={600} />
            <ViroDirectionalLight color="#ffffff" direction={[0.2, -1, -0.6]} intensity={500} />
            <ViroARPlaneSelector
                ref={selector}
                alignment="Vertical"
                minWidth={0.2}
                minHeight={0.2}
                onPlaneSelected={(plano) => {
                    setGiroBase(giroParaQuedarDerecha(plano.rotation as Vec3));
                    control.alColocar();
                }}
            >
                <ViroNode position={[0, separacion, 0]} rotation={[0, giroBase + giros * 90, 0]}>
                    <ViroNode rotation={[-90, 0, 0]}>
                        <ModeloVentana config={control.config} />
                    </ViroNode>
                </ViroNode>
            </ViroARPlaneSelector>
        </ViroARScene>
    );
};
