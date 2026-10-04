import { useEffect, useState } from "react";
import { getComunas, getRegiones, postCliente } from "@/api/cotizaciones";
import { mensajeDeError } from "@/api/http";
import type { Cliente, Comuna, Region } from "@/lib/tipos";
import { normalizarRut, validarEmail, validarRUT, validarTelefono } from "@/lib/validacion";
import { Campo } from "@/ui/Campo";
import { Aviso } from "@/ui/Estados";
import { HojaFormulario } from "@/ui/HojaFormulario";
import { Selector } from "@/ui/Selector";

const VACIO: Cliente = { clienteId: null, rut: "", nombre: "", telefono: "", email: "", direccion: "", comuna: null };

type Errores = Partial<Record<keyof Cliente | "region", string>>;

const validar = (c: Cliente): Errores => {
    const e: Errores = {};
    if (!validarRUT(c.rut)) e.rut = "RUT inválido.";
    if (!c.nombre.trim()) e.nombre = "Campo requerido.";
    if (!validarTelefono(c.telefono.trim())) e.telefono = "Teléfono inválido.";
    if (!validarEmail(c.email.trim())) e.email = "Correo inválido.";
    if (!c.direccion.trim()) e.direccion = "Campo requerido.";
    if (!c.comuna) e.comuna = "Elige una comuna.";
    return e;
};

interface FormularioClienteProps {
    onCerrar: () => void;
    /** Recibe el cliente creado por el backend. */
    onCreado: (cliente: Cliente) => void;
}

/** Alta de un cliente de las cotizaciones (mismos datos y validaciones que la web). Se monta al abrirlo. */
export const FormularioCliente = ({ onCerrar, onCreado }: FormularioClienteProps) => {
    const [cliente, setCliente] = useState<Cliente>(VACIO);
    const [regiones, setRegiones] = useState<Region[]>([]);
    const [region, setRegion] = useState<Region | null>(null);
    const [comunas, setComunas] = useState<Comuna[]>([]);
    const [errores, setErrores] = useState<Errores>({});
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        getRegiones().then(setRegiones).catch(() => setError("No se pudieron cargar las regiones."));
    }, []);

    const elegirRegion = (nueva: Region) => {
        setRegion(nueva);
        setComunas([]);
        setCliente((p) => ({ ...p, comuna: null }));
        if (nueva.regionId != null) getComunas(nueva.regionId).then(setComunas).catch(() => setError("No se pudieron cargar las comunas."));
    };

    const cambiar = (campo: keyof Cliente, valor: string) => {
        setCliente((p) => ({ ...p, [campo]: valor }));
        setErrores((p) => ({ ...p, [campo]: undefined }));
    };

    const guardar = async () => {
        const encontrados = validar(cliente);
        setErrores(encontrados);
        if (Object.values(encontrados).some(Boolean)) return;
        setGuardando(true);
        setError(null);
        try {
            const creado = await postCliente({
                ...cliente,
                rut: normalizarRut(cliente.rut),
                nombre: cliente.nombre.trim(),
                telefono: cliente.telefono.trim(),
                email: cliente.email.trim(),
                direccion: cliente.direccion.trim(),
            });
            onCreado(creado);
        } catch (e) {
            setError(mensajeDeError(e, "No se pudo crear el cliente."));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <HojaFormulario visible titulo="Nuevo cliente" onCerrar={onCerrar} onGuardar={guardar} guardando={guardando}>
            <Campo label="RUT" value={cliente.rut} onChangeText={(t) => cambiar("rut", t)} autoCapitalize="characters" error={errores.rut} ayuda="Ej.: 12.345.678-5" />
            <Campo label="Nombre" value={cliente.nombre} onChangeText={(t) => cambiar("nombre", t)} error={errores.nombre} />
            <Campo label="Teléfono" value={cliente.telefono} onChangeText={(t) => cambiar("telefono", t)} keyboardType="phone-pad" error={errores.telefono} ayuda="Ej.: +56 9 1234 5678" />
            <Campo label="Correo" value={cliente.email} onChangeText={(t) => cambiar("email", t)} keyboardType="email-address" autoCapitalize="none" error={errores.email} />
            <Campo label="Dirección" value={cliente.direccion} onChangeText={(t) => cambiar("direccion", t)} error={errores.direccion} />
            <Selector
                etiqueta="Región"
                opciones={regiones}
                valor={region}
                onCambiar={elegirRegion}
                textoDe={(r) => r.nombre}
                claveDe={(r) => r.regionId ?? r.nombre}
            />
            <Selector
                etiqueta="Comuna"
                opciones={comunas}
                valor={cliente.comuna}
                onCambiar={(c) => {
                    setCliente((p) => ({ ...p, comuna: c }));
                    setErrores((p) => ({ ...p, comuna: undefined }));
                }}
                textoDe={(c) => c.nombre}
                claveDe={(c) => c.comunaId ?? c.nombre}
                deshabilitado={!region}
                error={errores.comuna}
                buscador
            />
            {error && <Aviso tipo="error" texto={error} />}
        </HojaFormulario>
    );
};
