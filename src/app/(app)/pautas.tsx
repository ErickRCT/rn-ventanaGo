import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Card, Chip, FAB, IconButton, Searchbar, Text } from "react-native-paper";
import { deletePauta, getPautas } from "@/api/catalogo";
import { mensajeDeError } from "@/api/http";
import { FormularioPauta } from "@/admin/FormularioPauta";
import type { Pauta } from "@/lib/tipos";
import { Aviso, Cargando, ErrorCarga, Vacio } from "@/ui/Estados";
import { ImagenCatalogo } from "@/ui/Imagen";
import { confirmar, useMensaje } from "@/ui/Mensajes";
import { COLORES } from "@/ui/tema";
import { problemasDePrecio } from "@/ventana/catalogo";

/**
 * Pautas: el bosquejo de cada ventana. Dicen qué perfiles, vidrios y quincallería lleva, y con ellas se calcula
 * el precio a cualquier medida, se arma la orden de trabajo y se dibuja la ventana en realidad aumentada.
 */
export default function Pautas() {
    const mensaje = useMensaje();
    const [pautas, setPautas] = useState<Pauta[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState("");
    const [editando, setEditando] = useState<Pauta | null | undefined>(undefined);
    const [refrescando, setRefrescando] = useState(false);

    const cargar = () =>
        getPautas().then(
            (lista) => {
                setPautas(lista.sort((a, b) => (b.pautaId ?? 0) - (a.pautaId ?? 0)));
                setError(null);
            },
            (e) => setError(mensajeDeError(e, "No se pudieron cargar las pautas.")),
        );

    useEffect(() => {
        void cargar();
    }, []);

    const eliminar = async (pauta: Pauta) => {
        if (pauta.pautaId == null) return;
        if (!(await confirmar("Eliminar pauta", `¿Eliminar "${pauta.nombre.trim()}"? Esta acción no se puede deshacer.`))) return;
        try {
            await deletePauta(pauta.pautaId);
            mensaje("Pauta eliminada.");
            await cargar();
        } catch (e) {
            mensaje(mensajeDeError(e, "No se pudo eliminar la pauta. Puede que esté en uso en cotizaciones."));
        }
    };

    const texto = busqueda.trim().toLowerCase();
    const visibles = (pautas ?? []).filter((p) => `${p.nombre} ${p.serie?.nombre ?? ""} ${p.tipoPauta?.nombre ?? ""}`.toLowerCase().includes(texto));

    return (
        <View style={estilos.fondo}>
            <FlatList
                data={visibles}
                keyExtractor={(p) => String(p.pautaId)}
                contentContainerStyle={estilos.lista}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                refreshControl={<RefreshControl refreshing={refrescando} colors={[COLORES.primario]} onRefresh={async () => {
                    setRefrescando(true);
                    await cargar();
                    setRefrescando(false);
                }} />}
                ListHeaderComponent={
                    <View style={{ gap: 12, marginBottom: 12 }}>
                        <Aviso texto="La pauta es el bosquejo de la ventana: con ella se calcula el precio a cualquier medida, se arma la orden de trabajo y se dibuja la ventana." />
                        <Searchbar placeholder="Nombre, serie o tipo" value={busqueda} onChangeText={setBusqueda} />
                        {error && <ErrorCarga mensaje={error} onReintentar={cargar} />}
                        {pautas === null && !error && <Cargando />}
                    </View>
                }
                ListEmptyComponent={pautas !== null ? <Vacio icono="view-agenda-outline" titulo={texto ? "Sin resultados" : "Aún no hay pautas"} /> : null}
                renderItem={({ item }) => {
                    const problemas = problemasDePrecio(item);
                    return (
                        <Card mode="outlined" style={{ backgroundColor: "#fff" }} onPress={() => setEditando(item)}>
                            <Card.Title
                                title={item.nombre.trim()}
                                titleNumberOfLines={2}
                                subtitle={`${item.serie?.nombre.trim() ?? "Sin serie"} · ${item.tipoPauta?.nombre.trim() ?? "Sin tipo"}`}
                                left={() => <ImagenCatalogo ruta={item.tipoPauta?.rutaImagen} tamano={40} />}
                                leftStyle={{ marginRight: 24 }}
                                right={() => (
                                    <View style={{ flexDirection: "row" }}>
                                        <IconButton icon="pencil-outline" onPress={() => setEditando(item)} accessibilityLabel={`Editar ${item.nombre}`} />
                                        <IconButton icon="delete-outline" iconColor={COLORES.error} onPress={() => eliminar(item)} accessibilityLabel={`Eliminar ${item.nombre}`} />
                                    </View>
                                )}
                            />
                            <Card.Content style={estilos.chips}>
                                <Chip compact icon="ruler">{item.perfiles?.length ?? 0} perfiles</Chip>
                                <Chip compact icon="window-closed-variant">{item.vidrios?.length ?? 0} vidrios</Chip>
                                <Chip compact icon="cog-outline">{item.quincallerias?.length ?? 0} quincallería</Chip>
                                {item.isReforzada && <Chip compact icon="shield-check-outline">Reforzada</Chip>}
                            </Card.Content>
                            {problemas.length > 0 && (
                                <Card.Content style={{ marginTop: 8 }}>
                                    <Text variant="bodySmall" style={{ color: COLORES.aviso }}>
                                        Datos incompletos ({problemas.join(", ")}): el cliente verá el precio “a confirmar”.
                                    </Text>
                                </Card.Content>
                            )}
                        </Card>
                    );
                }}
            />
            <FAB icon="plus" label="Nueva pauta" color="#fff" style={estilos.fab} onPress={() => setEditando(null)} />
            {editando !== undefined && (
                <FormularioPauta
                    pauta={editando}
                    onCerrar={() => setEditando(undefined)}
                    onGuardada={() => {
                        setEditando(undefined);
                        mensaje("Pauta guardada.");
                        void cargar();
                    }}
                />
            )}
        </View>
    );
}

const estilos = StyleSheet.create({
    fondo: { flex: 1, backgroundColor: COLORES.fondo },
    lista: { padding: 16, paddingBottom: 96 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    fab: { position: "absolute", right: 16, bottom: 24, backgroundColor: COLORES.primario },
});
