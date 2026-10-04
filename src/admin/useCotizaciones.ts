import { useCallback, useState } from "react";
import { getCotizaciones } from "@/api/cotizaciones";
import { mensajeDeError } from "@/api/http";
import type { Cotizacion } from "@/lib/tipos";

/** Cotizaciones del administrador, de la más nueva a la más antigua. Las pantallas las cargan al enfocarse. */
export const useCotizaciones = () => {
    const [cotizaciones, setCotizaciones] = useState<Cotizacion[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refrescando, setRefrescando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            setCotizaciones((await getCotizaciones()).sort((a, b) => (b.cotizacionId ?? 0) - (a.cotizacionId ?? 0)));
            setError(null);
        } catch (e) {
            setError(mensajeDeError(e, "Error al obtener cotizaciones."));
        }
    }, []);

    const refrescar = async () => {
        setRefrescando(true);
        await cargar();
        setRefrescando(false);
    };

    return { cotizaciones, error, cargar, refrescar, refrescando };
};
