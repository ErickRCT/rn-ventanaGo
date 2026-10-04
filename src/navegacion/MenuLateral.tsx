import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { DrawerContentScrollView, type DrawerContentComponentProps } from "expo-router/drawer";
import { Badge, Divider, Icon, Text, TouchableRipple } from "react-native-paper";
import { useAuth } from "@/context/AuthContext";
import { useCarrito, useSolicitudes } from "@/api/solicitudes";
import { confirmar } from "@/ui/Mensajes";
import { ETIQUETA_ROL, gruposDeRol } from "./menu";

const BLANCO_SUAVE = "rgba(255,255,255,0.72)";
const ACENTO = "#b3e5fc";

/** Menú lateral oscuro, agrupado por rol como en la web. */
export const MenuLateral = ({ state, navigation }: DrawerContentComponentProps) => {
    const { rol, nombre, usuario, logout } = useAuth();
    const carrito = useCarrito();
    const pendientes = useSolicitudes().filter((s) => s.estado === "PENDIENTE").length;
    const grupos = gruposDeRol(rol);
    const actual = state.routes[state.index]?.name;
    // Con un solo grupo (cliente o empresa) no hace falta plegarlo.
    const [abiertos, setAbiertos] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(grupos.map((g) => [g.id, grupos.length === 1 || g.items.some((i) => i.ruta === actual)])),
    );

    const insignia = (ruta: string) => (ruta === "carrito" ? carrito.length : ruta === "solicitudes" ? pendientes : 0);

    const cerrarSesion = async () => {
        if (await confirmar("Cerrar sesión", "¿Quieres salir de tu cuenta?", "Salir")) await logout();
    };

    return (
        <View style={estilos.fondo}>
            <DrawerContentScrollView contentContainerStyle={{ paddingTop: 0 }}>
                <View style={estilos.cabecera}>
                    <Text variant="titleLarge" style={estilos.marca}>VentanaGo</Text>
                    <Text variant="bodyMedium" style={{ color: "#fff" }} numberOfLines={1}>{nombre ?? usuario}</Text>
                    {rol && <Text variant="bodySmall" style={{ color: ACENTO }}>{ETIQUETA_ROL[rol]}</Text>}
                </View>
                <Divider style={estilos.divisor} />

                {grupos.map((grupo) => {
                    const abierto = abiertos[grupo.id];
                    return (
                        <View key={grupo.id}>
                            {grupos.length > 1 && (
                                <TouchableRipple
                                    onPress={() => setAbiertos((p) => ({ ...p, [grupo.id]: !p[grupo.id] }))}
                                    style={estilos.grupo}
                                    accessibilityRole="button"
                                    accessibilityState={{ expanded: abierto }}
                                >
                                    <View style={estilos.fila}>
                                        <Icon source={grupo.icono} size={20} color={BLANCO_SUAVE} />
                                        <Text variant="labelLarge" style={estilos.tituloGrupo}>{grupo.titulo}</Text>
                                        <Icon source={abierto ? "chevron-up" : "chevron-down"} size={20} color={BLANCO_SUAVE} />
                                    </View>
                                </TouchableRipple>
                            )}
                            {abierto && grupo.items.map((item) => {
                                const activo = item.ruta === actual;
                                const cantidad = insignia(item.ruta);
                                return (
                                    <TouchableRipple
                                        key={item.ruta}
                                        onPress={() => navigation.navigate(item.ruta, item.ruta === "crear-cotizacion" ? { id: "" } : undefined)}
                                        style={[estilos.item, activo && estilos.itemActivo]}
                                        accessibilityRole="menuitem"
                                        accessibilityState={{ selected: activo }}
                                    >
                                        <View style={estilos.fila}>
                                            <Icon source={item.icono} size={20} color={activo ? ACENTO : BLANCO_SUAVE} />
                                            <Text style={[estilos.textoItem, activo && { color: "#fff", fontWeight: "600" }]}>{item.titulo}</Text>
                                            {cantidad > 0 && <Badge>{cantidad > 99 ? "99+" : cantidad}</Badge>}
                                        </View>
                                    </TouchableRipple>
                                );
                            })}
                        </View>
                    );
                })}
            </DrawerContentScrollView>

            <Divider style={estilos.divisor} />
            <TouchableRipple onPress={cerrarSesion} style={estilos.salir} accessibilityRole="button">
                <View style={estilos.fila}>
                    <Icon source="logout" size={20} color={BLANCO_SUAVE} />
                    <Text style={estilos.textoItem}>Cerrar sesión</Text>
                </View>
            </TouchableRipple>
        </View>
    );
};

const estilos = StyleSheet.create({
    fondo: { flex: 1, backgroundColor: "#1a2332" },
    cabecera: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16, gap: 2 },
    marca: { color: "#fff", fontWeight: "700", marginBottom: 6 },
    divisor: { backgroundColor: "rgba(255,255,255,0.12)" },
    grupo: { paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
    tituloGrupo: { color: "#fff", flex: 1, fontWeight: "700" },
    fila: { flexDirection: "row", alignItems: "center", gap: 14 },
    item: { paddingLeft: 32, paddingRight: 16, paddingVertical: 12, marginHorizontal: 8, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: "transparent" },
    itemActivo: { backgroundColor: "rgba(255,255,255,0.08)", borderLeftColor: ACENTO },
    textoItem: { color: BLANCO_SUAVE, flex: 1 },
    salir: { paddingHorizontal: 20, paddingVertical: 16, marginBottom: 24 },
});
