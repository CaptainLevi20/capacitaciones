export type TipoPregunta = 'escala_1_5' | 'nps_0_10' | 'texto';

export interface Pregunta {
  clave: string;
  tipo: TipoPregunta;
  texto: string;
  orden: number;
  activa: boolean;
}

export const ETIQUETA_TIPO_PREGUNTA: Record<TipoPregunta, string> = {
  escala_1_5: 'Escala 1 a 5',
  nps_0_10: 'Recomendación 0 a 10',
  texto: 'Texto libre',
};

export function promedio(valores: number[]): number | null {
  if (!valores.length) return null;
  return Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 100) / 100;
}

export function calcularNps(valores: number[]): number | null {
  if (!valores.length) return null;
  const promotores = valores.filter((v) => v >= 9).length;
  const detractores = valores.filter((v) => v <= 6).length;
  return Math.round(((promotores - detractores) / valores.length) * 100);
}

export function separarRespuestas(
  preguntas: Pregunta[],
  valores: Record<string, unknown>,
): { respuestas: Record<string, number>; comentario: string | null } {
  const respuestas: Record<string, number> = {};
  let comentario: string | null = null;
  for (const p of preguntas.filter((x) => x.activa)) {
    const v = valores[`p_${p.clave}`];
    if (p.tipo === 'texto') {
      if (typeof v === 'string' && v.trim()) comentario = v.trim();
    } else if (typeof v === 'number') {
      respuestas[p.clave] = v;
    }
  }
  return { respuestas, comentario };
}
