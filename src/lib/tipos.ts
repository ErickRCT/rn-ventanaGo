// Tipos que intercambia la app con el backend (ms-ventanaGo). Son los mismos que usaba el front web.

export interface Region {
    regionId: number | null;
    nombre: string;
    codigo: string;
}

export interface Comuna {
    comunaId: number | null;
    nombre: string;
    region: Region;
}

export interface Cliente {
    clienteId: number | null;
    rut: string;
    nombre: string;
    telefono: string;
    email: string;
    direccion: string;
    comuna: Comuna | null;
}

export interface Serie {
    serieId: number | null;
    nombre: string;
    descripcion: string;
}

export interface Color {
    colorId: number | null;
    nombre: string;
    valor: number;
}

export interface Vidrio {
    vidrioId: number | null;
    nombre: string;
    valor: number;
}

export interface TipoPerfil {
    tipoPerfilId: number | null;
    nombre: string;
}

export interface Perfil {
    perfilId?: number | null;
    codigo: string;
    descripcion: string;
    peso: number | null;
    isBastidor: boolean | undefined;
    tipoPerfil: TipoPerfil | null;
    serie: Serie | null;
    reforzado: boolean;
    orientacion: "H" | "V";
}

export type UnidadQuincalleria = "Pz" | "Mt";

export interface Quincalleria {
    quincalleriaId: number | null;
    nombre: string;
    unidad: UnidadQuincalleria;
    valor: number;
    rutaImagen: string | null;
    serie: Serie | null;
}

export interface TipoProducto {
    tipoProductoId: number;
    nombre: string;
    descripcion: string | null;
}

export interface TipoPauta {
    tipoPautaId: number | null;
    nombre: string;
    rutaImagen: string | null;
    tipoProducto?: TipoProducto | null;
}

export interface PautaPerfil {
    pautaPerfilId: number | null;
    pautaId: number | null;
    perfil: Perfil | null;
    corte: string | null;
    orientacion: "H" | "V";
    cantidad: number;
    variacion: number;
    dividir: boolean;
}

export interface PautaQuincalleria {
    pautaQuincalleriaId: number | null;
    pautaId: number | null;
    quincalleria: Quincalleria;
    cantidad: number;
    variacionH: number | null;
    variacionV: number | null;
}

export interface PautaVidrio {
    pautaId: number | null;
    cantidad: number;
    variacionH: number;
    variacionV: number;
    formula: string;
    vidrioId: number | null;
    nombre: string | null;
    valor: number | null;
}

/** La pauta es el bosquejo de la ventana: perfiles, vidrios y quincallería para fabricarla a cualquier medida. */
export interface Pauta {
    pautaId?: number | null;
    nombre: string;
    descripcion: string;
    pesoTeoricoHorizontal: number | null;
    pesoTeoricoVertical: number | null;
    pesoTeoricoReforzadoHorizontal: number | null;
    pesoTeoricoReforzadoVertical: number | null;
    verticalReforzada: number;
    horizontalReforzada: number;
    isReforzada: boolean;
    tipoPauta: TipoPauta | null;
    vidrios: PautaVidrio[] | null;
    quincallerias: PautaQuincalleria[] | null;
    perfiles: PautaPerfil[] | null;
    serie: Serie | null;
}

export interface Ventana {
    ventanaId: number | null;
    descripcion: string | null;
    cantidad: number | null;
    ancho: number | null;
    alto: number | null;
    observaciones: string | null;
    precioNeto: number | null;
    cotizacionId: number | null;
    color: Color | null;
    vidrio: Vidrio | null;
    pauta: Pauta | null;
}

export interface Cotizacion {
    cotizacionId: number | null;
    cliente: Cliente | null;
    nombreCotizacion: string | null;
    estado: string;
    fecha: string;
    ganancia: number | null;
    descuento: number | null;
    condiciones: string | null;
    flete: string | null;
    valorFlete: number;
    instalacion: string | null;
    valorInstalacion: number;
    otrosGastos: string | null;
    valorOtrosGastos: number;
    valorManoDeObra: number;
    neto: number | null;
    valorFinal: number;
    totalm2: number | null;
    cantidadProductos: number | null;
    ventanas: Ventana[];
}

// ---------- Solicitudes entre clientes y proveedores ----------

export type Servicio = "FABRICACION" | "INSTALACION" | "FLETE";

export const SERVICIOS: { valor: Servicio; etiqueta: string }[] = [
    { valor: "FABRICACION", etiqueta: "Fabricación" },
    { valor: "INSTALACION", etiqueta: "Instalación" },
    { valor: "FLETE", etiqueta: "Flete" },
];

export const etiquetaServicio = (valor: string) => SERVICIOS.find((s) => s.valor === valor)?.etiqueta ?? valor;

/** Límites generales; cada forma de ventana tiene los suyos al diseñarla (ver limitesDeModelo). */
export const LIMITES = { minMm: 300, maxAnchoMm: 9000, maxAltoMm: 3000, maxCantidad: 99 };

export type EstadoSolicitud = "PENDIENTE" | "ACEPTADA" | "MODIFICADA" | "RECHAZADA";

/** Una ventana diseñada por el cliente. Las medidas van en milímetros, como en las cotizaciones. */
export interface ItemVentana {
    id: string;
    descripcion: string;
    pautaId?: number;
    serieNombre?: string;
    imagenPauta?: string;
    hojas: number;
    anchoMm: number;
    altoMm: number;
    cantidad: number;
    colorId: number | null;
    colorNombre: string;
    vidrioId: number | null;
    vidrioNombre: string;
    observaciones: string;
    /** Lo define la empresa al responder; el cliente no ve precios antes. */
    precioUnitario: number | null;
}

export interface DatosContacto {
    nombre: string;
    email: string;
    telefono: string;
    direccion: string;
}

export interface RespuestaEmpresa {
    fecha: string;
    mensaje: string;
    total: number | null;
    notificadoEnApp: boolean;
    notificadoPorCorreo: boolean;
}

export interface Solicitud {
    numero: number;
    fecha: string;
    usuario: string;
    contacto: DatosContacto;
    servicios: Servicio[];
    observaciones: string;
    items: ItemVentana[];
    itemsOriginales: ItemVentana[] | null;
    estado: EstadoSolicitud;
    respuesta: RespuestaEmpresa | null;
}

export interface Aviso {
    id: string;
    destinatario: string;
    fecha: string;
    solicitudNumero: number;
    titulo: string;
    mensaje: string;
    leido: boolean;
}

export const ETIQUETA_ESTADO: Record<EstadoSolicitud, string> = {
    PENDIENTE: "Pendiente",
    ACEPTADA: "Aceptada",
    MODIFICADA: "Modificada",
    RECHAZADA: "Rechazada",
};

export const totalItems = (items: ItemVentana[]): number | null => {
    if (items.some((item) => item.precioUnitario === null)) return null;
    return items.reduce((suma, item) => suma + (item.precioUnitario ?? 0) * item.cantidad, 0);
};

export const cantidadVentanas = (items: ItemVentana[]) => items.reduce((suma, item) => suma + item.cantidad, 0);
