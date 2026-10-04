import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { Appbar, Button, Searchbar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { getImagenesDisponibles } from "@/api/catalogo";
import { Cargando, ErrorCarga } from "@/ui/Estados";
import { ImagenCatalogo } from "@/ui/Imagen";
import { COLORES } from "@/ui/tema";

interface SelectorImagenProps {
    etiqueta: string;
    valor: string | null;
    onCambiar: (ruta: string | null) => void;
}

const nombreArchivo = (ruta: string) => {
    const archivo = ruta.split("/").pop() ?? ruta;
    try {
        return decodeURIComponent(archivo);
    } catch {
        return archivo;
    }
};

/**
 * Elige una de las imágenes publicadas junto al front web (public/pautas, listadas en imagenes.json).
 * Es el mismo origen que usaba la web, porque el backend no recibe archivos.
 */
export const SelectorImagen = ({ etiqueta, valor, onCambiar }: SelectorImagenProps) => {
    const [abierto, setAbierto] = useState(false);
    const [imagenes, setImagenes] = useState<string[] | null>(null);
    const [error, setError] = useState(false);
    const [busqueda, setBusqueda] = useState("");

    const cargar = () => {
        setError(false);
        getImagenesDisponibles().then(setImagenes).catch(() => setError(true));
    };

    const abrir = () => {
        setAbierto(true);
        if (imagenes === null) cargar();
    };

    const visibles = (imagenes ?? []).filter((r) => nombreArchivo(r).toLowerCase().includes(busqueda.trim().toLowerCase()));

    return (
        <View style={{ gap: 8 }}>
            <Text variant="titleSmall">{etiqueta}</Text>
            <View style={estilos.actual}>
                <ImagenCatalogo ruta={valor} tamano={96} />
                <View style={{ flex: 1, gap: 4 }}>
                    <Text variant="bodySmall" numberOfLines={2} style={{ color: COLORES.textoSecundario }}>
                        {valor ? nombreArchivo(valor) : "Sin imagen"}
                    </Text>
                    <Button mode="outlined" icon="image-search-outline" onPress={abrir}>Elegir imagen</Button>
                    {valor && <Button compact onPress={() => onCambiar(null)}>Quitar imagen</Button>}
                </View>
            </View>

            <Modal visible={abierto} animationType="slide" onRequestClose={() => setAbierto(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
                    <Appbar.Header style={{ backgroundColor: COLORES.primario }}>
                        <Appbar.Action icon="close" color="#fff" onPress={() => setAbierto(false)} accessibilityLabel="Cerrar" />
                        <Appbar.Content title="Elegir imagen" color="#fff" />
                    </Appbar.Header>
                    {error ? (
                        <View style={{ padding: 16 }}><ErrorCarga mensaje="No se pudieron cargar las imágenes." onReintentar={cargar} /></View>
                    ) : imagenes === null ? (
                        <Cargando />
                    ) : (
                        <FlatList
                            data={visibles}
                            numColumns={3}
                            keyExtractor={(r) => r}
                            ListHeaderComponent={<Searchbar placeholder="Buscar por nombre" value={busqueda} onChangeText={setBusqueda} style={{ marginBottom: 8 }} />}
                            contentContainerStyle={{ padding: 8 }}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={[estilos.celda, item === valor && estilos.elegida]}
                                    onPress={() => {
                                        onCambiar(item);
                                        setAbierto(false);
                                    }}
                                    accessibilityLabel={nombreArchivo(item)}
                                >
                                    <ImagenCatalogo ruta={item} tamano={96} />
                                    <Text variant="bodySmall" numberOfLines={2} style={{ textAlign: "center" }}>{nombreArchivo(item)}</Text>
                                </Pressable>
                            )}
                        />
                    )}
                </SafeAreaView>
            </Modal>
        </View>
    );
};

const estilos = StyleSheet.create({
    actual: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#fff", padding: 8, borderRadius: 8 },
    celda: { flex: 1 / 3, alignItems: "center", padding: 6, gap: 4, borderRadius: 8, borderWidth: 2, borderColor: "transparent" },
    elegida: { borderColor: COLORES.primario, backgroundColor: "#eef3fb" },
});
