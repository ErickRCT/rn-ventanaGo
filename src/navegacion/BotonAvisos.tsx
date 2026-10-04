import { useState } from "react";
import { FlatList, Modal, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Appbar, Badge, Divider, List, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { marcarAvisosLeidos, useAvisos } from "@/api/solicitudes";
import { useAuth } from "@/context/AuthContext";
import { formatoFechaHora } from "@/lib/formato";
import { COLORES } from "@/ui/tema";

/** Campana del encabezado: solicitudes nuevas (empresa) o respuestas (cliente). El administrador no recibe avisos. */
export const BotonAvisos = () => {
    const { rol } = useAuth();
    const avisos = useAvisos();
    const [abierto, setAbierto] = useState(false);
    if (!rol || rol === "admin") return null;

    const sinLeer = avisos.filter((a) => !a.leido).length;
    const destino = rol === "empresa" ? "/solicitudes" : "/mis-cotizaciones";
    const ordenados = [...avisos].sort((a, b) => b.fecha.localeCompare(a.fecha));

    const cerrar = () => {
        setAbierto(false);
        void marcarAvisosLeidos();
    };

    return (
        <>
            <View>
                <Appbar.Action icon="bell-outline" color="#fff" onPress={() => setAbierto(true)} accessibilityLabel={`Notificaciones, ${sinLeer} sin leer`} />
                {sinLeer > 0 && <Badge style={estilos.insignia} size={18}>{sinLeer}</Badge>}
            </View>
            <Modal visible={abierto} animationType="slide" onRequestClose={cerrar}>
                <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
                    <Appbar.Header style={{ backgroundColor: COLORES.primario }}>
                        <Appbar.Action icon="close" color="#fff" onPress={cerrar} accessibilityLabel="Cerrar" />
                        <Appbar.Content title="Notificaciones" color="#fff" />
                    </Appbar.Header>
                    <FlatList
                        data={ordenados}
                        keyExtractor={(a) => a.id}
                        ItemSeparatorComponent={Divider}
                        ListEmptyComponent={<Text style={estilos.vacio}>Sin notificaciones</Text>}
                        renderItem={({ item }) => (
                            <List.Item
                                title={item.titulo}
                                titleStyle={{ fontWeight: item.leido ? "400" : "700" }}
                                description={`${item.mensaje}\n${formatoFechaHora(item.fecha)}`}
                                descriptionNumberOfLines={4}
                                left={(p) => <List.Icon {...p} icon={item.leido ? "bell-outline" : "bell-ring"} color={item.leido ? undefined : COLORES.primario} />}
                                onPress={() => {
                                    cerrar();
                                    router.navigate(destino);
                                }}
                            />
                        )}
                    />
                </SafeAreaView>
            </Modal>
        </>
    );
};

const estilos = StyleSheet.create({
    insignia: { position: "absolute", top: 6, right: 6 },
    vacio: { padding: 24, textAlign: "center", color: COLORES.textoSecundario },
});
