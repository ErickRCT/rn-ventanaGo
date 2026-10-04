import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Checkbox, IconButton, ProgressBar, Text } from "react-native-paper";
import { getPerfilesDeSerie, getQuincalleriaDeSerie, getSeries, getTiposPauta, postPauta, putPauta } from "@/api/catalogo";
import { mensajeDeError } from "@/api/http";
import { aNumero, formatoNumero } from "@/lib/formato";
import type { Pauta, PautaPerfil, PautaQuincalleria, PautaVidrio, Perfil, Quincalleria, Serie, TipoPauta } from "@/lib/tipos";
import { Campo, DECIMAL, NUMERICO } from "@/ui/Campo";
import { Aviso } from "@/ui/Estados";
import { HojaFormulario } from "@/ui/HojaFormulario";
import { ImagenCatalogo } from "@/ui/Imagen";
import { Selector } from "@/ui/Selector";
import { COLORES } from "@/ui/tema";

const PAUTA_VACIA: Pauta = {
    serie: null, nombre: "", descripcion: "",
    pesoTeoricoHorizontal: 0, pesoTeoricoVertical: 0, pesoTeoricoReforzadoHorizontal: 0, pesoTeoricoReforzadoVertical: 0,
    verticalReforzada: 0, horizontalReforzada: 0, quincallerias: [], tipoPauta: null, perfiles: [], vidrios: [], isReforzada: false,
};

const PASOS = [
    { titulo: "Serie", descripcion: "Elige la línea de aluminio; de ella salen los perfiles y la quincallería disponibles." },
    { titulo: "Datos básicos", descripcion: "Nombre, descripción y desde qué medida la ventana lleva refuerzo." },
    { titulo: "Tipo y perfiles", descripcion: "La imagen de la ventana y las barras de aluminio que la forman." },
    { titulo: "Quincallería y vidrios", descripcion: "Accesorios por pieza o por metro, y los paños de vidrio." },
];

/** Texto editable de un número (vacío si es 0, para poder escribir encima). */
const texto = (n: number | null | undefined) => (n ? String(n).replace(".", ",") : "");
const numero = (t: string) => {
    const n = aNumero(t);
    return Number.isFinite(n) ? n : 0;
};

const pasoValido = (paso: number, p: Pauta): string | null => {
    switch (paso) {
        case 0:
            return p.serie ? null : "Elige una serie.";
        case 1:
            if (!p.nombre.trim()) return "Ingresa el nombre de la pauta.";
            if (p.isReforzada && (p.verticalReforzada <= 0 || p.horizontalReforzada <= 0)) return "Indica desde qué medidas se refuerza.";
            return null;
        case 2:
            if (!p.tipoPauta) return "Elige el tipo de pauta.";
            if (!p.perfiles?.length) return "Agrega al menos un perfil.";
            if (p.perfiles.some((x) => !x.perfil || x.cantidad <= 0)) return "Cada perfil debe tener una cantidad mayor a 0.";
            return null;
        case 3: {
            const qs = p.quincallerias ?? [];
            if (!qs.length) return "Agrega al menos una quincallería.";
            const qValidas = qs.every((q) => (q.quincalleria?.unidad === "Pz"
                ? q.cantidad > 0
                : (q.variacionH ?? 0) > 0 && (q.variacionV ?? 0) > 0));
            if (!qValidas) return "Las quincallerías por pieza necesitan cantidad, y las por metro, variación horizontal y vertical.";
            const vs = p.vidrios ?? [];
            if (!vs.length) return "Agrega al menos un vidrio.";
            if (!vs.every((v) => v.cantidad > 0 && v.variacionH !== 0 && v.variacionV !== 0)) {
                return "Cada vidrio necesita cantidad y descuentos horizontal y vertical.";
            }
            return null;
        }
        default:
            return null;
    }
};

interface FormularioPautaProps {
    /** null: nueva pauta. */
    pauta: Pauta | null;
    onCerrar: () => void;
    onGuardada: () => void;
}

export const FormularioPauta = ({ pauta, onCerrar, onGuardada }: FormularioPautaProps) => {
    const [datos, setDatos] = useState<Pauta>(pauta ?? PAUTA_VACIA);
    const [paso, setPaso] = useState(0);
    const [series, setSeries] = useState<Serie[]>([]);
    const [tipos, setTipos] = useState<TipoPauta[]>([]);
    const [perfiles, setPerfiles] = useState<Perfil[]>([]);
    const [quincallerias, setQuincallerias] = useState<Quincalleria[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        getSeries().then(setSeries).catch(() => setError("No se pudieron cargar las series."));
        getTiposPauta().then(setTipos).catch(() => undefined);
    }, []);

    useEffect(() => {
        const serieId = datos.serie?.serieId;
        if (serieId == null) return;
        getPerfilesDeSerie(serieId).then(setPerfiles).catch(() => setError("No se pudieron cargar los perfiles de la serie."));
        getQuincalleriaDeSerie(serieId).then(setQuincallerias).catch(() => setError("No se pudo cargar la quincallería de la serie."));
    }, [datos.serie?.serieId]);

    const actualizar = (cambios: Partial<Pauta>) => {
        setError(null);
        setDatos((p) => ({ ...p, ...cambios }));
    };

    const cambiarPerfil = (i: number, cambios: Partial<PautaPerfil>) =>
        actualizar({ perfiles: (datos.perfiles ?? []).map((p, j) => (j === i ? { ...p, ...cambios } : p)) });
    const cambiarQuincalleria = (i: number, cambios: Partial<PautaQuincalleria>) =>
        actualizar({ quincallerias: (datos.quincallerias ?? []).map((q, j) => (j === i ? { ...q, ...cambios } : q)) });
    const cambiarVidrio = (i: number, cambios: Partial<PautaVidrio>) =>
        actualizar({ vidrios: (datos.vidrios ?? []).map((v, j) => (j === i ? { ...v, ...cambios } : v)) });

    const siguiente = async () => {
        const problema = pasoValido(paso, datos);
        if (problema) return setError(problema);
        if (paso < PASOS.length - 1) return setPaso(paso + 1);
        setGuardando(true);
        try {
            if (pauta?.pautaId) await putPauta(datos);
            else await postPauta(datos);
            onGuardada();
        } catch (e) {
            setError(mensajeDeError(e, "No se pudo guardar la pauta. Revisa los datos e inténtalo nuevamente."));
        } finally {
            setGuardando(false);
        }
    };

    const quincalleriasDisponibles = quincallerias.filter(
        (q) => !(datos.quincallerias ?? []).some((x) => x.quincalleria?.quincalleriaId === q.quincalleriaId),
    );

    return (
        <HojaFormulario visible titulo={pauta ? "Editar pauta" : "Nueva pauta"} onCerrar={onCerrar}>
            <View style={{ gap: 4 }}>
                <Text variant="labelLarge" style={{ color: COLORES.primario }}>Paso {paso + 1} de {PASOS.length}: {PASOS[paso].titulo}</Text>
                <ProgressBar progress={(paso + 1) / PASOS.length} />
                <Text variant="bodySmall" style={estilos.secundario}>{PASOS[paso].descripcion}</Text>
            </View>

            {paso === 0 && (
                <Selector
                    etiqueta="Serie"
                    opciones={series}
                    valor={datos.serie}
                    onCambiar={(serie) => actualizar({
                        serie,
                        // Los perfiles y la quincallería dependen de la serie: si cambia, se empieza de nuevo.
                        ...(serie.serieId !== datos.serie?.serieId ? { perfiles: [], quincallerias: [] } : {}),
                    })}
                    textoDe={(s) => s.nombre.trim()}
                    claveDe={(s) => s.serieId ?? 0}
                />
            )}

            {paso === 1 && (
                <>
                    <Campo label="Nombre" value={datos.nombre} onChangeText={(t) => actualizar({ nombre: t })} />
                    <Campo label="Descripción (opcional)" value={datos.descripcion ?? ""} onChangeText={(t) => actualizar({ descripcion: t })} multiline />
                    <Checkbox.Item
                        label="Reforzada (usa perfiles más pesados desde cierta medida)"
                        status={datos.isReforzada ? "checked" : "unchecked"}
                        onPress={() => actualizar({
                            isReforzada: !datos.isReforzada,
                            verticalReforzada: datos.isReforzada ? 0 : datos.verticalReforzada,
                            horizontalReforzada: datos.isReforzada ? 0 : datos.horizontalReforzada,
                        })}
                        position="leading"
                        labelStyle={{ textAlign: "left" }}
                    />
                    {datos.isReforzada && (
                        <View style={estilos.fila}>
                            <Campo style={{ flex: 1 }} label="Desde alto" unidad="mm" value={texto(datos.verticalReforzada)}
                                onChangeText={(t) => actualizar({ verticalReforzada: numero(t) })} {...NUMERICO} />
                            <Campo style={{ flex: 1 }} label="Desde ancho" unidad="mm" value={texto(datos.horizontalReforzada)}
                                onChangeText={(t) => actualizar({ horizontalReforzada: numero(t) })} {...NUMERICO} />
                        </View>
                    )}
                </>
            )}

            {paso === 2 && (
                <>
                    <Selector
                        etiqueta="Tipo de pauta"
                        opciones={tipos}
                        valor={datos.tipoPauta}
                        onCambiar={(tipoPauta) => actualizar({ tipoPauta })}
                        textoDe={(t) => t.nombre.trim()}
                        claveDe={(t) => t.tipoPautaId ?? 0}
                        izquierdaDe={(t) => <ImagenCatalogo ruta={t.rutaImagen} tamano={32} />}
                        buscador
                    />
                    <Selector<Perfil>
                        etiqueta="Agregar perfil"
                        opciones={perfiles}
                        valor={null}
                        onCambiar={(perfil) => actualizar({
                            perfiles: [...(datos.perfiles ?? []), {
                                pautaPerfilId: null, pautaId: null, perfil, corte: null,
                                orientacion: perfil.orientacion || "H", cantidad: 1, variacion: 0, dividir: false,
                            }],
                        })}
                        textoDe={(p) => `${p.codigo} · ${p.orientacion === "H" ? "Horizontal" : "Vertical"}`}
                        descripcionDe={(p) => [p.tipoPerfil?.nombre.trim(), p.peso != null ? `${formatoNumero(Number(p.peso), 3)} kg/m` : null].filter(Boolean).join(" · ")}
                        claveDe={(p) => p.perfilId ?? p.codigo}
                        vacio="La serie no tiene perfiles."
                        buscador
                    />
                    {(datos.perfiles ?? []).map((p, i) => (
                        <Card key={`${p.perfil?.perfilId}-${i}`} mode="outlined" style={estilos.tarjeta}>
                            <Card.Title
                                title={`${p.perfil?.codigo ?? ""} · ${p.perfil?.tipoPerfil?.nombre.trim() ?? ""}`}
                                subtitle={p.orientacion === "H" ? "Horizontal: se mide con el ancho" : "Vertical: se mide con el alto"}
                                right={() => <IconButton icon="delete-outline" iconColor={COLORES.error} onPress={() => actualizar({ perfiles: (datos.perfiles ?? []).filter((_, j) => j !== i) })} accessibilityLabel="Quitar perfil" />}
                            />
                            <Card.Content style={{ gap: 8 }}>
                                <View style={estilos.fila}>
                                    <Campo style={{ flex: 1 }} label="Cantidad" value={texto(p.cantidad)} onChangeText={(t) => cambiarPerfil(i, { cantidad: numero(t) })} {...NUMERICO} />
                                    <Campo style={{ flex: 1 }} label="Variación de corte" unidad="mm" value={p.variacion ? String(p.variacion) : ""}
                                        onChangeText={(t) => cambiarPerfil(i, { variacion: numero(t) })} keyboardType="numbers-and-punctuation" />
                                </View>
                                <Checkbox.Item label="Dividir" status={p.dividir ? "checked" : "unchecked"} onPress={() => cambiarPerfil(i, { dividir: !p.dividir })} position="leading" labelStyle={{ textAlign: "left" }} />
                            </Card.Content>
                        </Card>
                    ))}
                </>
            )}

            {paso === 3 && (
                <>
                    <Text variant="titleSmall">Quincallería</Text>
                    <Selector<Quincalleria>
                        etiqueta="Agregar quincallería"
                        opciones={quincalleriasDisponibles}
                        valor={null}
                        onCambiar={(q) => actualizar({
                            quincallerias: [...(datos.quincallerias ?? []), {
                                pautaQuincalleriaId: null, pautaId: null, quincalleria: q,
                                cantidad: q.unidad === "Pz" ? 1 : 0,
                                variacionH: q.unidad === "Mt" ? 0 : null,
                                variacionV: q.unidad === "Mt" ? 0 : null,
                            }],
                        })}
                        textoDe={(q) => q.nombre.trim()}
                        descripcionDe={(q) => (q.unidad === "Pz" ? "Por pieza" : "Por metro")}
                        claveDe={(q) => q.quincalleriaId ?? q.nombre}
                        vacio="No quedan quincallerías de esta serie por agregar."
                        buscador
                    />
                    {(datos.quincallerias ?? []).map((q, i) => (
                        <Card key={`${q.quincalleria?.quincalleriaId}-${i}`} mode="outlined" style={estilos.tarjeta}>
                            <Card.Title
                                title={q.quincalleria?.nombre.trim()}
                                subtitle={q.quincalleria?.unidad === "Pz" ? "Por pieza: cantidad fija" : "Por metro: metros por cada metro de ancho y de alto"}
                                right={() => <IconButton icon="delete-outline" iconColor={COLORES.error} onPress={() => actualizar({ quincallerias: (datos.quincallerias ?? []).filter((_, j) => j !== i) })} accessibilityLabel="Quitar quincallería" />}
                            />
                            <Card.Content>
                                {q.quincalleria?.unidad === "Pz" ? (
                                    <Campo label="Cantidad" value={texto(q.cantidad)} onChangeText={(t) => cambiarQuincalleria(i, { cantidad: numero(t) })} {...NUMERICO} />
                                ) : (
                                    <View style={estilos.fila}>
                                        <Campo style={{ flex: 1 }} label="Variación horizontal" value={texto(q.variacionH)} onChangeText={(t) => cambiarQuincalleria(i, { variacionH: numero(t) })} {...DECIMAL} />
                                        <Campo style={{ flex: 1 }} label="Variación vertical" value={texto(q.variacionV)} onChangeText={(t) => cambiarQuincalleria(i, { variacionV: numero(t) })} {...DECIMAL} />
                                    </View>
                                )}
                            </Card.Content>
                        </Card>
                    ))}

                    <Text variant="titleSmall" style={{ marginTop: 8 }}>Vidrios</Text>
                    <Button mode="outlined" icon="plus" onPress={() => actualizar({
                        vidrios: [...(datos.vidrios ?? []), { pautaId: null, cantidad: 1, variacionH: 0, variacionV: 0, formula: "", vidrioId: null, nombre: "", valor: 0 }],
                    })}>
                        Agregar vidrio
                    </Button>
                    {(datos.vidrios ?? []).map((v, i) => (
                        <Card key={i} mode="outlined" style={estilos.tarjeta}>
                            <Card.Title
                                title={`Vidrio ${i + 1}`}
                                subtitle="Paño por hoja, con descuentos en mm"
                                right={() => <IconButton icon="delete-outline" iconColor={COLORES.error} onPress={() => actualizar({ vidrios: (datos.vidrios ?? []).filter((_, j) => j !== i) })} accessibilityLabel="Quitar vidrio" />}
                            />
                            <Card.Content style={{ gap: 8 }}>
                                <Campo label="Cantidad" value={texto(v.cantidad)} onChangeText={(t) => cambiarVidrio(i, { cantidad: numero(t) })} {...NUMERICO} />
                                <View style={estilos.fila}>
                                    <Campo style={{ flex: 1 }} label="Desc. horizontal" unidad="mm" value={v.variacionH ? String(v.variacionH) : ""}
                                        onChangeText={(t) => cambiarVidrio(i, { variacionH: numero(t) })} keyboardType="numbers-and-punctuation" />
                                    <Campo style={{ flex: 1 }} label="Desc. vertical" unidad="mm" value={v.variacionV ? String(v.variacionV) : ""}
                                        onChangeText={(t) => cambiarVidrio(i, { variacionV: numero(t) })} keyboardType="numbers-and-punctuation" />
                                </View>
                                <Campo label="Fórmula (opcional)" value={v.formula ?? ""} onChangeText={(t) => cambiarVidrio(i, { formula: t })} />
                            </Card.Content>
                        </Card>
                    ))}
                </>
            )}

            {error && <Aviso tipo="error" texto={error} />}

            <View style={estilos.fila}>
                <Button style={{ flex: 1 }} mode="outlined" icon="chevron-left" onPress={() => (paso === 0 ? onCerrar() : setPaso(paso - 1))}>
                    {paso === 0 ? "Cancelar" : "Atrás"}
                </Button>
                <Button
                    style={{ flex: 1 }}
                    mode="contained"
                    icon={paso === PASOS.length - 1 ? "content-save" : "chevron-right"}
                    contentStyle={{ flexDirection: paso === PASOS.length - 1 ? "row" : "row-reverse" }}
                    onPress={siguiente}
                    loading={guardando}
                    disabled={guardando}
                >
                    {paso === PASOS.length - 1 ? "Guardar" : "Siguiente"}
                </Button>
            </View>
        </HojaFormulario>
    );
};

const estilos = StyleSheet.create({
    fila: { flexDirection: "row", gap: 12 },
    tarjeta: { backgroundColor: "#fff" },
    secundario: { color: COLORES.textoSecundario },
});
