import { fechaHoraBogota } from './fechas';

export interface FilaSesion {
  numero: number;
  inicio: Date;
  fin: Date;
  titulo: string | null;
  lugar: string | null;
}

export function parsearSesionesMasivas(texto: string): { filas: FilaSesion[]; errores: string[] } {
  const filas: FilaSesion[] = [];
  const errores: string[] = [];
  texto.split(/\r?\n/).forEach((linea, i) => {
    if (!linea.trim()) return;
    const n = i + 1;
    const partes = linea.split(/;|\t/).map((p) => p.trim());
    if (partes.length < 4) {
      errores.push(`Línea ${n}: se esperan al menos 4 columnas (número; fecha; hora inicio; hora fin)`);
      return;
    }
    const [num, fecha, horaInicio, horaFin, titulo, lugar] = partes;
    const numero = Number(num);
    if (!Number.isInteger(numero) || numero < 1) {
      errores.push(`Línea ${n}: número de sesión no válido`);
      return;
    }
    const inicio = fechaHoraBogota(fecha, horaInicio);
    const fin = fechaHoraBogota(fecha, horaFin);
    if (!inicio || !fin) {
      errores.push(`Línea ${n}: fecha u hora no válida`);
      return;
    }
    if (fin <= inicio) {
      errores.push(`Línea ${n}: la hora de fin debe ser posterior a la de inicio`);
      return;
    }
    if (filas.some((f) => f.numero === numero)) {
      errores.push(`Línea ${n}: número de sesión repetido (${numero})`);
      return;
    }
    filas.push({ numero, inicio, fin, titulo: titulo || null, lugar: lugar || null });
  });
  return { filas, errores };
}
