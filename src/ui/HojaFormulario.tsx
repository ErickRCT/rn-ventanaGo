import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet } from "react-native";
import { Appbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORES } from "./tema";

interface HojaFormularioProps {
    visible: boolean;
    titulo: string;
    onCerrar: () => void;
    /** Si se indica, aparece el botón Guardar en la barra superior. */
    onGuardar?: () => void;
    guardando?: boolean;
    etiquetaGuardar?: string;
    children: ReactNode;
}

/** Formulario a pantalla completa, con Cancelar y Guardar arriba (cómodo con el teclado abierto). */
export const HojaFormulario = ({ visible, titulo, onCerrar, onGuardar, guardando, etiquetaGuardar = "Guardar", children }: HojaFormularioProps) => (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar}>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }} edges={["top", "bottom"]}>
            <Appbar.Header style={{ backgroundColor: COLORES.primario }}>
                <Appbar.Action icon="close" color="#fff" onPress={onCerrar} accessibilityLabel="Cancelar" />
                <Appbar.Content title={titulo} color="#fff" />
                {onGuardar && (
                    <Appbar.Action
                        icon={guardando ? "progress-clock" : "content-save"}
                        color="#fff"
                        disabled={guardando}
                        onPress={onGuardar}
                        accessibilityLabel={etiquetaGuardar}
                    />
                )}
            </Appbar.Header>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
                    {children}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    </Modal>
);

const estilos = StyleSheet.create({
    contenido: { padding: 16, gap: 12, paddingBottom: 48 },
});
