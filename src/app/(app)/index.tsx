import { Redirect, type Href } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { RUTA_INICIAL } from "@/navegacion/menu";

/** Cada rol parte en su pantalla principal. */
export default function Inicio() {
    const { rol } = useAuth();
    return <Redirect href={`/${RUTA_INICIAL[rol ?? "cliente"]}` as Href} />;
}
