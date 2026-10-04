// Hermes no siempre trae los datos de idioma es-CL, así que el formato de miles se arma a mano.
const miles = (entero: number) => String(Math.abs(Math.trunc(entero))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** $1.234.567 (pesos chilenos, sin decimales). */
export const formatoPesos = (valor: number | null | undefined) => {
    const redondeado = Math.round(valor ?? 0);
    return `${redondeado < 0 ? "-" : ""}$${miles(redondeado)}`;
};

/** 1.234,5 (hasta los decimales indicados). */
export const formatoNumero = (valor: number, decimales = 2) => {
    const fijo = Math.abs(valor).toFixed(decimales).replace(/\.?0+$/, "");
    const [entero, fraccion] = fijo.split(".");
    return `${valor < 0 ? "-" : ""}${miles(Number(entero))}${fraccion ? `,${fraccion}` : ""}`;
};

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** dd-mm-aaaa. Las fechas "aaaa-mm-dd" del backend se leen sin zona horaria para no correr el día. */
export const formatoFecha = (iso: string | null | undefined) => {
    if (!iso) return "";
    const soloFecha = /^\d{4}-\d{2}-\d{2}$/.exec(iso);
    const fecha = soloFecha ? new Date(`${iso}T12:00:00`) : new Date(iso);
    if (Number.isNaN(fecha.getTime())) return iso;
    return `${dosDigitos(fecha.getDate())}-${dosDigitos(fecha.getMonth() + 1)}-${fecha.getFullYear()}`;
};

export const formatoFechaHora = (iso: string | null | undefined) => {
    if (!iso) return "";
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return iso;
    return `${formatoFecha(iso)} ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
};

/** Convierte lo escrito en un campo numérico; acepta coma decimal. */
export const aNumero = (texto: string): number => {
    const limpio = texto.replace(",", ".").trim();
    return limpio === "" ? NaN : Number(limpio);
};
