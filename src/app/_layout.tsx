import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { limpiarDatosDeSesion } from "@/api/solicitudes";
import { MensajesProvider } from "@/ui/Mensajes";
import { tema } from "@/ui/tema";

void SplashScreen.preventAutoHideAsync();

/** Sin sesión solo se ve el login; con sesión, el menú del rol y la pantalla de realidad aumentada. */
const Navegacion = () => {
    const { cargando, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!cargando) void SplashScreen.hideAsync();
    }, [cargando]);

    useEffect(() => {
        if (!isAuthenticated) limpiarDatosDeSesion();
    }, [isAuthenticated]);

    if (cargando) return null;

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!isAuthenticated}>
                <Stack.Screen name="login" />
            </Stack.Protected>
            <Stack.Protected guard={isAuthenticated}>
                <Stack.Screen name="(app)" />
                <Stack.Screen name="realidad-aumentada" options={{ animation: "fade", orientation: "portrait" }} />
            </Stack.Protected>
        </Stack>
    );
};

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <PaperProvider theme={tema}>
                    <AuthProvider>
                        <MensajesProvider>
                            <StatusBar style="light" />
                            <Navegacion />
                        </MensajesProvider>
                    </AuthProvider>
                </PaperProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
