import { calcularNps, promedio, type Pregunta } from './encuesta';

export type EstadoAsistencia = 'completa' | 'solo_entrada' | 'sin_entrada';

export const ETIQUETA_ESTADO_ASISTENCIA: Record<EstadoAsistencia, string> = {
  completa: 'Completa',
  solo_entrada: 'Solo entrada',
  sin_entrada: 'Sin entrada',
};

export interface FilaParaResumen {
  estado_asistencia: EstadoAsistencia;
  entrada_at: string | null;
  salida_at: string | null;
  respuestas: Record<string, number> | null;
  comentario: string | null;
}

export interface Resumen {
  entradas: number;
  salidas: number;
  completas: number;
  soloEntrada: number;
  sinEntrada: number;
  promedios: Record<string, number | null>;
  nps: number | null;
  comentarios: string[];
}

export function resumir(preguntas: Pregunta[], filas: FilaParaResumen[]): Resumen {
  const conSalida = filas.filter((f) => f.salida_at);
  const valores = (clave: string) =>
    conSalida.map((f) => f.respuestas?.[clave]).filter((v): v is number => typeof v === 'number');
  const promedios: Record<string, number | null> = {};
  for (const p of preguntas.filter((x) => x.tipo === 'escala_1_5')) promedios[p.clave] = promedio(valores(p.clave));
  const preguntaNps = preguntas.find((p) => p.tipo === 'nps_0_10');
  return {
    entradas: filas.filter((f) => f.entrada_at).length,
    salidas: conSalida.length,
    completas: filas.filter((f) => f.estado_asistencia === 'completa').length,
    soloEntrada: filas.filter((f) => f.estado_asistencia === 'solo_entrada').length,
    sinEntrada: filas.filter((f) => f.estado_asistencia === 'sin_entrada').length,
    promedios,
    nps: preguntaNps ? calcularNps(valores(preguntaNps.clave)) : null,
    comentarios: conSalida.map((f) => f.comentario?.trim()).filter((c): c is string => !!c),
  };
}
