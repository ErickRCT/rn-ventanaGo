import { useEffect, useState, type ReactNode } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Card, Divider, FAB, IconButton, SegmentedButtons, Searchbar, Switch, Text } from "react-native-paper";
import { mensajeDeError } from "@/api/http";
import { aNumero } from "@/lib/formato";
import { Campo, DECIMAL, NUMERICO } from "@/ui/Campo";
import { Aviso, Cargando, ErrorCarga, Vacio } from "@/ui/Estados";
import { HojaFormulario } from "@/ui/HojaFormulario";
import { confirmar, useMensaje } from "@/ui/Mensajes";
import { Selector } from "@/ui/Selector";
import { COLORES } from "@/ui/tema";
import { SelectorImagen } from "./SelectorImagen";

type Valores = Record<string, any>;

/** Descripción de un campo del formulario de un mantenedor. */
export type CampoMantenedor =
    | { tipo: "texto"; clave: string; etiqueta: string; requerido?: boolean; multilinea?: boolean }
    | { tipo: "entero" | "decimal"; clave: string; etiqueta: string; requerido?: boolean; unidad?: string; minimo?: number }
    | { tipo: "opciones"; clave: string; etiqueta: string; opciones: { valor: string; etiqueta: string }[] }
    | { tipo: "interruptor"; clave: string; etiqueta: string }
    | {
        tipo: "seleccion"; clave: string; etiqueta: string; requerido?: boolean;
        cargar: () => Promise<any[]>; textoDe: (o: any) => string; claveDe: (o: any) => string | number;
    }
    | { tipo: "imagen"; clave: string; etiqueta: string };

interface MantenedorProps<T> {
    /** Nombre en singular, en minúsculas ("serie", "color"). */
    nombre: string;
    cargar: () => Promise<T[]>;
    idDe: (item: T) => number | null | undefined;
    tituloDe: (item: T) => string;
    descripcionDe?: (item: T) => string | undefined;
    izquierdaDe?: (item: T) => ReactNode;
    /** Texto donde se busca (por defecto, título y descripción). */
    textoBusqueda?: (item: T) => string;
    nuevo: () => T;
    campos: CampoMantenedor[];
    guardar: (item: T, esNuevo: boolean) => Promise<unknown>;
    /** Si no se indica, el backend no permite eliminar este tipo de registro. */
    eliminar?: (id: number) => Promise<unknown>;
    /** Texto de ayuda sobre la pantalla. */
    ayuda?: string;
}

/** Valores del formulario: los números se editan como texto para poder borrarlos y reescribirlos. */
const aFormulario = (item: Valores, campos: CampoMantenedor[]): Valores => {
    const valores: Valores = { ...item };
    for (const campo of campos) {
        if (campo.tipo === "entero" || campo.tipo === "decimal") {
            const v = item[campo.clave];
            valores[campo.clave] = v === null || v === undefined ? "" : String(v).replace(".", ",");
        }
    }
    return valores;
};

const validarYConvertir = (valores: Valores, campos: CampoMantenedor[]): { item: Valores; errores: Record<string, string> } => {
    const item: Valores = { ...valores };
    const errores: Record<string, string> = {};
    for (const campo of campos) {
        const v = valores[campo.clave];
        if (campo.tipo === "texto") {
            item[campo.clave] = typeof v === "string" ? v.trim() : v;
            if (campo.requerido && !item[campo.clave]) errores[campo.clave] = "Campo requerido.";
        } else if (campo.tipo === "entero" || campo.tipo === "decimal") {
            const texto = String(v ?? "").trim();
            if (texto === "") {
                item[campo.clave] = null;
                if (campo.requerido) errores[campo.clave] = "Campo requerido.";
                continue;
            }
            const numero = aNumero(texto);
            if (!Number.isFinite(numero) || (campo.tipo === "entero" && !Number.isInteger(numero))) {
                errores[campo.clave] = campo.tipo === "entero" ? "Ingresa un número entero." : "Ingresa un número.";
            } else if (campo.minimo !== undefined && numero < campo.minimo) {
                errores[campo.clave] = `Debe ser mayor o igual a ${campo.minimo}.`;
            }
            item[campo.clave] = numero;
        } else if (campo.tipo === "seleccion" && campo.requerido && !v) {
            errores[campo.clave] = "Elige una opción.";
        }
    }
    return { item, errores };
};

/** Lista con búsqueda y formulario para agregar, editar y eliminar registros del catálogo técnico. */
export const Mantenedor = <T,>(props: MantenedorProps<T>) => {
    const { nombre, cargar, idDe, tituloDe, descripcionDe, izquierdaDe, nuevo, campos, guardar, eliminar, ayuda } = props;
    const mensaje = useMensaje();
    const [items, setItems] = useState<T[] | null>(null);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState("");
    const [refrescando, setRefrescando] = useState(false);
    const [editando, setEditando] = useState<{ valores: Valores; esNuevo: boolean } | null>(null);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [opciones, setOpciones] = useState<Record<string, any[]>>({});

    const obtener = () =>
        cargar().then(
            (datos) => {
                setItems([...datos].sort((a, b) => (idDe(b) ?? 0) - (idDe(a) ?? 0)));
                setErrorCarga(null);
            },
            (error) => setErrorCarga(mensajeDeError(error, `No se pudieron cargar los registros de ${nombre}.`)),
        );

    useEffect(() => {
        void obtener();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir la pantalla; después se recarga al guardar o deslizar
    }, []);

    const abrir = (item: T | null) => {
        // Las listas de los selectores (series, tipos, etc.) se cargan al abrir el formulario.
        for (const campo of campos) {
            if (campo.tipo === "seleccion" && !opciones[campo.clave]) {
                campo.cargar().then((lista) => setOpciones((p) => ({ ...p, [campo.clave]: lista }))).catch(() => undefined);
            }
        }
        setErrores({});
        setErrorGuardar(null);
        setEditando({ valores: aFormulario((item ?? nuevo()) as Valores, campos), esNuevo: item === null });
    };

    const cambiar = (clave: string, valor: unknown) => {
        setErrores((p) => ({ ...p, [clave]: "" }));
        setEditando((p) => (p ? { ...p, valores: { ...p.valores, [clave]: valor } } : p));
    };

    const enviar = async () => {
        if (!editando) return;
        const { item, errores: encontrados } = validarYConvertir(editando.valores, campos);
        setErrores(encontrados);
        if (Object.values(encontrados).some(Boolean)) return;
        setGuardando(true);
        setErrorGuardar(null);
        try {
            await guardar(item as T, editando.esNuevo);
            setEditando(null);
            mensaje(editando.esNuevo ? `Se agregó ${nombre}.` : `Se guardaron los cambios.`);
            await obtener();
        } catch (error) {
            setErrorGuardar(mensajeDeError(error, "No se pudo guardar. Revisa los datos e inténtalo nuevamente."));
        } finally {
            setGuardando(false);
        }
    };

    const borrar = async (item: T) => {
        const id = idDe(item);
        if (!eliminar || id == null) return;
        if (!(await confirmar(`Eliminar ${nombre}`, `¿Eliminar "${tituloDe(item)}"? Esta acción no se puede deshacer.`))) return;
        try {
            await eliminar(id);
            mensaje("Registro eliminado.");
            await obtener();
        } catch (error) {
            mensaje(mensajeDeError(error, "No se pudo eliminar. Puede que esté en uso en otras pautas o cotizaciones."));
        }
    };

    const texto = (item: T) => (props.textoBusqueda?.(item) ?? `${tituloDe(item)} ${descripcionDe?.(item) ?? ""}`).toLowerCase();
    const visibles = (items ?? []).filter((i) => texto(i).includes(busqueda.trim().toLowerCase()));

    const renderCampo = (campo: CampoMantenedor) => {
        const valores = editando?.valores ?? {};
        const error = errores[campo.clave] || undefined;
        switch (campo.tipo) {
            case "texto":
                return <Campo key={campo.clave} label={campo.etiqueta} value={valores[campo.clave] ?? ""} onChangeText={(t) => cambiar(campo.clave, t)}
                    multiline={campo.multilinea} numberOfLines={campo.multilinea ? 3 : 1} error={error} />;
            case "entero":
            case "decimal":
                return <Campo key={campo.clave} label={campo.etiqueta} value={valores[campo.clave] ?? ""} onChangeText={(t) => cambiar(campo.clave, t)}
                    unidad={campo.unidad} error={error} {...(campo.tipo === "entero" ? NUMERICO : DECIMAL)} />;
            case "opciones":
                return (
                    <View key={campo.clave} style={{ gap: 6 }}>
                        <Text variant="titleSmall">{campo.etiqueta}</Text>
                        <SegmentedButtons value={valores[campo.clave] ?? ""} onValueChange={(v) => cambiar(campo.clave, v)}
                            buttons={campo.opciones.map((o) => ({ value: o.valor, label: o.etiqueta }))} />
                    </View>
                );
            case "interruptor":
                return (
                    <View key={campo.clave} style={estilos.interruptor}>
                        <Text style={{ flex: 1 }}>{campo.etiqueta}</Text>
                        <Switch value={Boolean(valores[campo.clave])} onValueChange={(v) => cambiar(campo.clave, v)} />
                    </View>
                );
            case "seleccion":
                return (
                    <Selector key={campo.clave} etiqueta={campo.etiqueta} opciones={opciones[campo.clave] ?? []} valor={valores[campo.clave] ?? null}
                        onCambiar={(v) => cambiar(campo.clave, v)} textoDe={campo.textoDe} claveDe={campo.claveDe} error={error}
                        vacio={opciones[campo.clave] ? "No hay opciones disponibles." : "Cargando…"} />
                );
            case "imagen":
                return <SelectorImagen key={campo.clave} etiqueta={campo.etiqueta} valor={valores[campo.clave] ?? null} onCambiar={(v) => cambiar(campo.clave, v)} />;
        }
    };

    return (
        <View style={estilos.fondo}>
            <FlatList
                data={items === null ? [] : visibles}
                keyExtractor={(item, i) => String(idDe(item) ?? `n${i}`)}
                contentContainerStyle={estilos.lista}
                refreshControl={<RefreshControl refreshing={refrescando} colors={[COLORES.primario]} onRefresh={async () => {
                    setRefrescando(true);
                    await obtener();
                    setRefrescando(false);
                }} />}
                ListHeaderComponent={
                    <View style={{ gap: 12, marginBottom: 12 }}>
                        {ayuda && <Aviso texto={ayuda} />}
                        <Searchbar placeholder="Buscar" value={busqueda} onChangeText={setBusqueda} />
                        {errorCarga && <ErrorCarga mensaje={errorCarga} onReintentar={obtener} />}
                        {items === null && !errorCarga && <Cargando />}
                        {items !== null && <Text variant="bodySmall" style={{ color: COLORES.textoSecundario }}>{visibles.length} de {items.length} registro(s)</Text>}
                    </View>
                }
                ListEmptyComponent={items !== null ? <Vacio titulo={busqueda ? "Sin resultados" : `Aún no hay registros de ${nombre}`} /> : null}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }) => (
                    <Card mode="outlined" style={estilos.tarjeta} onPress={() => abrir(item)}>
                        <Card.Title
                            title={tituloDe(item)}
                            titleNumberOfLines={2}
                            subtitle={descripcionDe?.(item)}
                            subtitleNumberOfLines={3}
                            left={izquierdaDe ? () => izquierdaDe(item) : undefined}
                            leftStyle={izquierdaDe ? { marginRight: 24 } : undefined}
                            right={() => (
                                <View style={{ flexDirection: "row" }}>
                                    <IconButton icon="pencil-outline" onPress={() => abrir(item)} accessibilityLabel={`Editar ${tituloDe(item)}`} />
                                    {eliminar && <IconButton icon="delete-outline" iconColor={COLORES.error} onPress={() => borrar(item)} accessibilityLabel={`Eliminar ${tituloDe(item)}`} />}
                                </View>
                            )}
                        />
                    </Card>
                )}
            />
            <FAB icon="plus" label="Agregar" style={estilos.fab} onPress={() => abrir(null)} color="#fff" />

            <HojaFormulario
                visible={editando !== null}
                titulo={editando?.esNuevo ? `Agregar ${nombre}` : `Editar ${nombre}`}
                onCerrar={() => setEditando(null)}
                onGuardar={enviar}
                guardando={guardando}
            >
                {campos.map(renderCampo)}
                {errorGuardar && <Aviso tipo="error" texto={errorGuardar} />}
                <Divider />
            </HojaFormulario>
        </View>
    );
};

const estilos = StyleSheet.create({
    fondo: { flex: 1, backgroundColor: COLORES.fondo },
    lista: { padding: 16, paddingBottom: 96 },
    tarjeta: { backgroundColor: "#fff" },
    fab: { position: "absolute", right: 16, bottom: 24, backgroundColor: COLORES.primario },
    interruptor: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
});
