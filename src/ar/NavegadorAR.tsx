import { StyleSheet } from "react-native";
import { ViroARSceneNavigator } from "@reactvision/react-viro";
import { EscenaVentana, type ControlEscena } from "./EscenaVentana";

/**
 * Cámara con la escena de la ventana. Está en su propio módulo para que ViroReact se cargue
 * solo al abrir la realidad aumentada, y no al iniciar la app.
 */
export default function NavegadorAR({ control }: { control: ControlEscena }) {
    return (
        <ViroARSceneNavigator
            style={StyleSheet.absoluteFill}
            autofocus
            initialScene={{ scene: EscenaVentana as never }}
            viroAppProps={control}
        />
    );
}
