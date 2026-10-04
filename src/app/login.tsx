import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Icon, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { loginConPassword } from "@/api/auth";
import { mensajeDeError } from "@/api/http";
import { useAuth } from "@/context/AuthContext";
import { Aviso } from "@/ui/Estados";
import { COLORES } from "@/ui/tema";

/** Usuario y contraseña para todos los roles; la app muestra después el menú que corresponde a la cuenta. */
export default function Login() {
    const { login } = useAuth();
    const [usuario, setUsuario] = useState("");
    const [password, setPassword] = useState("");
    const [verPassword, setVerPassword] = useState(false);
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);

    const ingresar = async () => {
        setError("");
        setCargando(true);
        try {
            await login(await loginConPassword(usuario.trim(), password));
        } catch (e) {
            setError(mensajeDeError(e));
        } finally {
            setCargando(false);
        }
    };

    return (
        <SafeAreaView style={estilos.fondo}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
                    <View style={estilos.marca}>
                        <View style={estilos.logo}>
                            <Icon source="window-closed-variant" size={44} color="#fff" />
                        </View>
                        <Text variant="headlineMedium" style={estilos.titulo}>VentanaGo</Text>
                        <Text variant="bodyMedium" style={estilos.subtitulo}>
                            Diseña, cotiza y pide ventanas de aluminio, y míralas en tu pared antes de comprarlas.
                        </Text>
                    </View>

                    <Card style={estilos.tarjeta}>
                        <Card.Content style={{ gap: 12 }}>
                            <Text variant="titleLarge" style={{ textAlign: "center" }}>Iniciar sesión</Text>
                            <TextInput
                                mode="outlined"
                                label="Usuario"
                                value={usuario}
                                onChangeText={setUsuario}
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="username"
                                keyboardType="email-address"
                                left={<TextInput.Icon icon="account-outline" />}
                            />
                            <TextInput
                                mode="outlined"
                                label="Contraseña"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!verPassword}
                                autoComplete="current-password"
                                onSubmitEditing={() => usuario.trim() && password && void ingresar()}
                                left={<TextInput.Icon icon="lock-outline" />}
                                right={
                                    <TextInput.Icon
                                        icon={verPassword ? "eye-off-outline" : "eye-outline"}
                                        onPress={() => setVerPassword((v) => !v)}
                                        accessibilityLabel={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    />
                                }
                            />
                            <Button
                                mode="contained"
                                onPress={ingresar}
                                loading={cargando}
                                disabled={cargando || !usuario.trim() || !password}
                                contentStyle={{ paddingVertical: 6 }}
                            >
                                Ingresar
                            </Button>
                            {error ? <Aviso tipo="error" texto={error} /> : null}
                            {cargando && (
                                <Text variant="bodySmall" style={{ textAlign: "center", color: COLORES.textoSecundario }}>
                                    Si el servidor estaba inactivo puede tardar hasta un minuto en responder.
                                </Text>
                            )}
                        </Card.Content>
                    </Card>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const estilos = StyleSheet.create({
    fondo: { flex: 1, backgroundColor: COLORES.primario },
    contenido: { flexGrow: 1, justifyContent: "center", padding: 20, gap: 24 },
    marca: { alignItems: "center", gap: 8 },
    logo: { width: 80, height: 80, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
    titulo: { color: "#fff", fontWeight: "700" },
    subtitulo: { color: "rgba(255,255,255,0.85)", textAlign: "center", maxWidth: 320 },
    tarjeta: { backgroundColor: "#fff" },
});
