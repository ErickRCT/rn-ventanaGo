import { Drawer } from "expo-router/drawer";
import { useAuth } from "@/context/AuthContext";
import { BotonAvisos } from "@/navegacion/BotonAvisos";
import { GRUPOS_MENU, gruposDeRol } from "@/navegacion/menu";
import { MenuLateral } from "@/navegacion/MenuLateral";
import { COLORES } from "@/ui/tema";

/** Menú lateral con las pantallas del rol de la cuenta (el administrador ve las de todos). */
export default function LayoutApp() {
    const { rol } = useAuth();
    const permitidas = new Set(gruposDeRol(rol).flatMap((g) => g.items.map((i) => i.ruta)));

    return (
        <Drawer
            drawerContent={(props) => <MenuLateral {...props} />}
            screenOptions={{
                headerStyle: { backgroundColor: COLORES.primario },
                headerTintColor: "#fff",
                headerTitleStyle: { fontWeight: "600" },
                headerRight: () => <BotonAvisos />,
                drawerStyle: { backgroundColor: "#1a2332", width: 290 },
                sceneStyle: { backgroundColor: COLORES.fondo },
            }}
        >
            <Drawer.Screen name="index" options={{ headerShown: false, drawerItemStyle: { display: "none" } }} />
            {GRUPOS_MENU.flatMap((grupo) => grupo.items).map((item) => (
                <Drawer.Screen
                    key={item.ruta}
                    name={item.ruta}
                    // Las pantallas de otros roles no se pueden abrir; el servidor además rechaza sus datos.
                    redirect={!permitidas.has(item.ruta)}
                    options={{ title: item.encabezado ?? item.titulo }}
                />
            ))}
        </Drawer>
    );
}
