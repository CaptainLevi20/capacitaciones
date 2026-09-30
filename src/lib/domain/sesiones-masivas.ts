import { fechaHoraBogota } from './fechas';

export interface FilaSesion {
  numero: number;
  inicio: Date;
  fin: Date;
  titulo: string | null;
  lugar: string | null;
}

// Una fila tal como la escribe el administrador (formulario o texto pegado).
export interface FilaSesionEntrada {
  numero: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  titulo: string;
  lugar: string;
}

const MAX_TEXTO = 200;

export function validarFilasSesion(entradas: FilaSesionEntrada[]): {
  filas: FilaSesion[];
  errores: { indice: number; mensaje: string }[];
} {
  const filas: FilaSesion[] = [];
  const errores: { indice: number; mensaje: string }[] = [];
  entradas.forEach((e, indice) => {
    const error = (mensaje: string) => errores.push({ indice, mensaje });
    const numeroTexto = e.numero.trim();
    const numero = Number(numeroTexto);
    if (!numeroTexto || !Number.isInteger(numero) || numero < 1) return error('número de sesión no válido');
    if (!e.fecha.trim() || !e.horaInicio.trim() || !e.horaFin.trim()) return error('complete la fecha y las horas');
    const inicio = fechaHoraBogota(e.fecha, e.horaInicio);
    const fin = fechaHoraBogota(e.fecha, e.horaFin);
    if (!inicio || !fin) return error('fecha u hora no válida');
    if (fin <= inicio) return error('la hora de fin debe ser posterior a la de inicio');
    if (filas.some((f) => f.numero === numero)) return error(`número de sesión repetido (${numero})`);
    const titulo = e.titulo.trim();
    const lugar = e.lugar.trim();
    if (titulo.length > MAX_TEXTO || lugar.length > MAX_TEXTO) {
      return error(`el título y el lugar admiten máximo ${MAX_TEXTO} caracteres`);
    }
    filas.push({ numero, inicio, fin, titulo: titulo || null, lugar: lugar || null });
  });
  return { filas, errores };
}

export function parsearSesionesMasivas(texto: string): { filas: FilaSesion[]; errores: string[] } {
  const entradas: { linea: number; fila: FilaSesionEntrada }[] = [];
  const errores: { linea: number; mensaje: string }[] = [];
  texto.split(/\r?\n/).forEach((contenido, i) => {
    if (!contenido.trim()) return;
    const linea = i + 1;
    const partes = contenido.split(/;|\t/).map((p) => p.trim());
    if (partes.length < 4) {
      errores.push({ linea, mensaje: 'se esperan al menos 4 columnas (número; fecha; hora inicio; hora fin)' });
      return;
    }
    const [numero, fecha, horaInicio, horaFin, titulo = '', lugar = ''] = partes;
    entradas.push({ linea, fila: { numero, fecha, horaInicio, horaFin, titulo, lugar } });
  });
  const r = validarFilasSesion(entradas.map((e) => e.fila));
  errores.push(...r.errores.map((e) => ({ linea: entradas[e.indice].linea, mensaje: e.mensaje })));
  errores.sort((a, b) => a.linea - b.linea);
  return { filas: r.filas, errores: errores.map((e) => `Línea ${e.linea}: ${e.mensaje}`) };
}

export function filaInicial(numero: number): FilaSesionEntrada {
  return { numero: String(numero), fecha: '', horaInicio: '08:00', horaFin: '12:00', titulo: '', lugar: '' };
}

function sumarDias(fechaIso: string, dias: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaIso)) return '';
  const d = new Date(`${fechaIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Prellena la fila siguiente: número + 1, una semana después, mismo horario y lugar.
export function siguienteFila(anterior: FilaSesionEntrada): FilaSesionEntrada {
  const n = Number(anterior.numero);
  return {
    numero: Number.isInteger(n) && n > 0 ? String(n + 1) : '',
    fecha: sumarDias(anterior.fecha, 7),
    horaInicio: anterior.horaInicio,
    horaFin: anterior.horaFin,
    titulo: '',
    lugar: anterior.lugar,
  };
}
