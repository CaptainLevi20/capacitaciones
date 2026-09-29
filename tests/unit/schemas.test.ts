import { describe, expect, it } from 'vitest';
import { encuestaSchema, entradaSchema, erroresPorCampo } from '@/lib/domain/schemas';
import type { Pregunta } from '@/lib/domain/encuesta';

const valida = {
  tipo_documento: 'CC',
  numero_documento: '1.020.345.678',
  nombres: ' Ana María ',
  apellidos: 'Pérez Gómez',
  correo: 'APerez@Procuraduria.gov.co',
  dependencia: 'Delegada para Asuntos Civiles',
  cargo: 'Profesional',
  acepta_habeas: 'on',
};

describe('entradaSchema', () => {
  it('normaliza documento, nombres y correo', () => {
    const r = entradaSchema.parse(valida);
    expect(r.numero_documento).toBe('1020345678');
    expect(r.nombres).toBe('Ana María');
    expect(r.correo).toBe('aperez@procuraduria.gov.co');
  });
  it('exige la autorización de Habeas Data', () => {
    const { acepta_habeas: _omitida, ...sinHabeas } = valida;
    const r = entradaSchema.safeParse(sinHabeas);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(erroresPorCampo(r.error).acepta_habeas).toBe(
        'Debe autorizar el tratamiento de datos personales para continuar',
      );
    }
  });
  it('reporta un mensaje en español por campo', () => {
    const r = entradaSchema.safeParse({ ...valida, correo: 'no-es-correo', numero_documento: '1', tipo_documento: 'XX' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = erroresPorCampo(r.error);
      expect(e.correo).toBe('Correo no válido');
      expect(e.numero_documento).toBe('Número de documento no válido');
      expect(e.tipo_documento).toBe('Seleccione el tipo de documento');
    }
  });
});

describe('encuestaSchema', () => {
  const preguntas: Pregunta[] = [
    { clave: 'contenido', tipo: 'escala_1_5', texto: 'C', orden: 1, activa: true },
    { clave: 'logistica', tipo: 'escala_1_5', texto: 'L', orden: 2, activa: false },
    { clave: 'nps', tipo: 'nps_0_10', texto: 'N', orden: 3, activa: true },
    { clave: 'comentario', tipo: 'texto', texto: 'T', orden: 4, activa: true },
  ];
  it('convierte valores de formulario a números', () => {
    expect(encuestaSchema(preguntas).parse({ p_contenido: '5', p_nps: '0' })).toEqual({
      p_contenido: 5,
      p_nps: 0,
      p_comentario: undefined,
    });
  });
  it('exige las preguntas numéricas activas (un NPS vacío no cuenta como 0)', () => {
    const r = encuestaSchema(preguntas).safeParse({ p_contenido: '5', p_nps: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(erroresPorCampo(r.error).p_nps).toBe('Seleccione una opción');
  });
  it('rechaza valores fuera de rango', () => {
    expect(encuestaSchema(preguntas).safeParse({ p_contenido: '6', p_nps: '5' }).success).toBe(false);
  });
});
