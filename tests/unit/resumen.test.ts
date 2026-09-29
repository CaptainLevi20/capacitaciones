import { describe, expect, it } from 'vitest';
import { resumir } from '@/lib/domain/resumen';
import { slug } from '@/lib/domain/texto';
import { sanitizarBusqueda } from '@/lib/repo/consolidado';
import type { Pregunta } from '@/lib/domain/encuesta';

const preguntas: Pregunta[] = [
  { clave: 'contenido', tipo: 'escala_1_5', texto: 'C', orden: 1, activa: true },
  { clave: 'expositor', tipo: 'escala_1_5', texto: 'E', orden: 2, activa: true },
  { clave: 'nps', tipo: 'nps_0_10', texto: 'N', orden: 3, activa: true },
  { clave: 'comentario', tipo: 'texto', texto: 'T', orden: 4, activa: true },
];
const t = '2026-10-14T13:00:00Z';

describe('resumir', () => {
  it('cuenta estados y calcula promedios, NPS y comentarios', () => {
    const r = resumir(preguntas, [
      { estado_asistencia: 'completa', entrada_at: t, salida_at: t, respuestas: { contenido: 5, expositor: 4, nps: 10 }, comentario: 'Bien' },
      { estado_asistencia: 'completa', entrada_at: t, salida_at: t, respuestas: { contenido: 4, expositor: 4, nps: 6 }, comentario: ' ' },
      { estado_asistencia: 'solo_entrada', entrada_at: t, salida_at: null, respuestas: null, comentario: null },
      { estado_asistencia: 'sin_entrada', entrada_at: null, salida_at: t, respuestas: { contenido: 3, expositor: 5, nps: 9 }, comentario: null },
    ]);
    expect(r).toEqual({
      entradas: 3,
      salidas: 3,
      completas: 2,
      soloEntrada: 1,
      sinEntrada: 1,
      promedios: { contenido: 4, expositor: 4.33 },
      nps: 33,
      comentarios: ['Bien'],
    });
  });
  it('sin datos devuelve ceros y nulos', () => {
    expect(resumir(preguntas, [])).toMatchObject({ entradas: 0, promedios: { contenido: null, expositor: null }, nps: null });
  });
});

describe('slug', () => {
  it('quita tildes y espacios', () => {
    expect(slug('Capacitación PGN 2026 (copia)')).toBe('capacitacion-pgn-2026-copia');
  });
});

describe('sanitizarBusqueda', () => {
  it('elimina caracteres con significado en los filtros de PostgREST', () => {
    expect(sanitizarBusqueda(' Pérez,(x)*%.  ')).toBe('Pérez x');
  });
});
