import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Avatar, Card, FAB, Searchbar, Text } from "react-native-paper";
import { getClientes } from "@/api/cotizaciones";
import { mensajeDeError } from "@/api/http";
import { FormularioCliente } from "@/admin/FormularioCliente";
import type { Cliente } from "@/lib/tipos";
import { Cargando, ErrorCarga, Vacio } from "@/ui/Estados";
import { useMensaje } from "@/ui/Mensajes";
import { COLORES } from "@/ui/tema";

const iniciales = (nombre: string) =>
    nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

/** Clientes a los que el administrador les arma cotizaciones formales. */
export default function Clientes() {
    const mensaje = useMensaje();
    const [clientes, setClientes] = useState<Cliente[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState("");
    const [formulario, setFormulario] = useState(false);
    const [refrescando, setRefrescando] = useState(false);

    const cargar = () =>
        getClientes().then(
            (lista) => {
                setClientes(lista.sort((a, b) => (b.clienteId ?? 0) - (a.clienteId ?? 0)));
                setError(null);
            },
            (e) => setError(mensajeDeError(e, "No se pudieron cargar los clientes.")),
        );

    useEffect(() => {
        void cargar();
    }, []);

    const texto = busqueda.trim().toLowerCase();
    const visibles = (clientes ?? []).filter((c) => `${c.nombre} ${c.rut} ${c.email}`.toLowerCase().includes(texto));

    return (
        <View style={estilos.fondo}>
            <FlatList
                data={visibles}
                keyExtractor={(c) => String(c.clienteId)}
                contentContainerStyle={estilos.lista}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                refreshControl={<RefreshControl refreshing={refrescando} colors={[COLORES.primario]} onRefresh={async () => {
                    setRefrescando(true);
                    await cargar();
                    setRefrescando(false);
                }} />}
                ListHeaderComponent={
                    <View style={{ gap: 12, marginBottom: 12 }}>
                        <Searchbar placeholder="Nombre, RUT o correo" value={busqueda} onChangeText={setBusqueda} />
                        {error && <ErrorCarga mensaje={error} onReintentar={cargar} />}
                        {clientes === null && !error && <Cargando />}
                    </View>
                }
                ListEmptyComponent={clientes !== null ? <Vacio icono="account-group-outline" titulo={texto ? "Sin resultados" : "Aún no hay clientes"} /> : null}
                renderItem={({ item }) => (
                    <Card mode="outlined" style={{ backgroundColor: "#fff" }}>
                        <Card.Title
                            title={item.nombre}
                            subtitle={`${item.rut} · ${item.email}`}
                            left={(p) => <Avatar.Text {...p} label={iniciales(item.nombre)} style={{ backgroundColor: COLORES.primario }} />}
                        />
                        <Card.Content style={{ gap: 2 }}>
                            <Text variant="bodySmall" style={{ color: COLORES.textoSecundario }}>{item.telefono}</Text>
                            <Text variant="bodySmall" style={{ color: COLORES.textoSecundario }}>
                                {item.direccion}{item.comuna ? `, ${item.comuna.nombre}` : ""}
                            </Text>
                        </Card.Content>
                    </Card>
                )}
            />
            <FAB icon="account-plus" label="Nuevo cliente" color="#fff" style={estilos.fab} onPress={() => setFormulario(true)} />
            {formulario && (
                <FormularioCliente
                    onCerrar={() => setFormulario(false)}
                    onCreado={() => {
                        setFormulario(false);
                        mensaje("Cliente creado.");
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
    fab: { position: "absolute", right: 16, bottom: 24, backgroundColor: COLORES.primario },
});
