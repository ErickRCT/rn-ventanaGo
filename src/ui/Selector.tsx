import { useState, type ReactNode } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { Appbar, Divider, HelperText, List, Searchbar, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORES } from "./tema";

interface SelectorProps<T> {
    etiqueta: string;
    opciones: T[];
    valor: T | null;
    onCambiar: (valor: T) => void;
    textoDe: (opcion: T) => string;
    claveDe: (opcion: T) => string | number;
    descripcionDe?: (opcion: T) => string | undefined;
    /** Dibujo a la izquierda de cada opción (p. ej. el color). */
    izquierdaDe?: (opcion: T) => ReactNode;
    deshabilitado?: boolean;
    error?: string;
    /** Muestra un buscador cuando hay muchas opciones. */
    buscador?: boolean;
    vacio?: string;
}

/** Campo de selección: se ve como un campo de texto y abre una lista a pantalla completa. */
export const Selector = <T,>({
    etiqueta, opciones, valor, onCambiar, textoDe, claveDe, descripcionDe, izquierdaDe, deshabilitado, error,
    buscador = opciones.length > 8, vacio = "No hay opciones disponibles.",
}: SelectorProps<T>) => {
    const [abierto, setAbierto] = useState(false);
    const [busqueda, setBusqueda] = useState("");

    const visibles = busqueda.trim()
        ? opciones.filter((o) => `${textoDe(o)} ${descripcionDe?.(o) ?? ""}`.toLowerCase().includes(busqueda.trim().toLowerCase()))
        : opciones;

    const cerrar = () => {
        setAbierto(false);
        setBusqueda("");
    };

    return (
        <View>
            <Pressable onPress={() => !deshabilitado && setAbierto(true)} accessibilityRole="button" accessibilityLabel={`${etiqueta}: ${valor ? textoDe(valor) : "sin elegir"}`}>
                <View pointerEvents="none">
                    <TextInput
                        mode="outlined"
                        label={etiqueta}
                        value={valor ? textoDe(valor) : ""}
                        editable={false}
                        disabled={deshabilitado}
                        error={Boolean(error)}
                        left={valor && izquierdaDe ? <TextInput.Icon icon={() => izquierdaDe(valor)} /> : undefined}
                        right={<TextInput.Icon icon="menu-down" />}
                    />
                </View>
            </Pressable>
            {error ? <HelperText type="error">{error}</HelperText> : null}

            <Modal visible={abierto} animationType="slide" onRequestClose={cerrar}>
                <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
                    <Appbar.Header style={{ backgroundColor: COLORES.primario }}>
                        <Appbar.Action icon="close" color="#fff" onPress={cerrar} accessibilityLabel="Cerrar" />
                        <Appbar.Content title={etiqueta} color="#fff" />
                    </Appbar.Header>
                    {buscador && (
                        <Searchbar placeholder="Buscar" value={busqueda} onChangeText={setBusqueda} style={estilos.buscador} />
                    )}
                    <FlatList
                        data={visibles}
                        keyExtractor={(o) => String(claveDe(o))}
                        ItemSeparatorComponent={Divider}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={<Text style={estilos.vacio}>{vacio}</Text>}
                        renderItem={({ item }) => {
                            const elegido = valor !== null && claveDe(valor) === claveDe(item);
                            return (
                                <List.Item
                                    title={textoDe(item)}
                                    description={descripcionDe?.(item)}
                                    left={izquierdaDe ? () => <View style={estilos.izquierda}>{izquierdaDe(item)}</View> : undefined}
                                    right={elegido ? (p) => <List.Icon {...p} icon="check" color={COLORES.primario} /> : undefined}
                                    onPress={() => {
                                        onCambiar(item);
                                        cerrar();
                                    }}
                                    style={elegido ? { backgroundColor: "#eef3fb" } : undefined}
                                />
                            );
                        }}
                    />
                </SafeAreaView>
            </Modal>
        </View>
    );
};

const estilos = StyleSheet.create({
    buscador: { margin: 12 },
    vacio: { padding: 24, textAlign: "center", color: COLORES.textoSecundario },
    izquierda: { justifyContent: "center", paddingLeft: 12 },
});
