export const validarRUT = (rut: string): boolean => {
    const rutLimpio = rut.replace(/[^0-9kK]/g, "");
    if (rutLimpio.length < 2) return false;

    const dv = rutLimpio.slice(-1).toLowerCase();
    let numero = parseInt(rutLimpio.slice(0, -1), 10);
    let suma = 0;
    let multiplicador = 2;
    while (numero > 0) {
        suma += (numero % 10) * multiplicador;
        numero = Math.floor(numero / 10);
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? "0" : dvEsperado === 10 ? "k" : dvEsperado.toString();
    return dv === dvCalculado;
};

export const normalizarRut = (rut: string) => rut.replace(/[^0-9kK]/g, "").toUpperCase();

export const validarEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validarTelefono = (telefono: string): boolean => /^(\+?56)?(\s?)(0?9)(\s?)[98765432]\d{7}$/.test(telefono);
