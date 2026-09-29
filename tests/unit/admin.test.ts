import { describe, expect, it } from 'vitest';
import { validarLogo } from '@/lib/domain/logo';
import { marcaSchema, validar } from '@/lib/domain/schemas-admin';
import { ErrorNegocio } from '@/lib/errores';

describe('validarLogo', () => {
  it('acepta PNG, SVG y JPG de hasta 1 MB', () => {
    expect(validarLogo({ type: 'image/png', size: 1_048_576 })).toBeNull();
    expect(validarLogo({ type: 'image/svg+xml', size: 10 })).toBeNull();
    expect(validarLogo({ type: 'image/jpeg', size: 10 })).toBeNull();
  });
  it('rechaza otros tipos, archivos grandes y vacíos', () => {
    expect(validarLogo({ type: 'application/pdf', size: 10 })).toBe('El logo debe ser PNG, SVG o JPG');
    expect(validarLogo({ type: 'image/png', size: 1_048_577 })).toBe('El logo no puede superar 1 MB');
    expect(validarLogo({ type: 'image/png', size: 0 })).toBe('El archivo está vacío');
  });
});

describe('marcaSchema', () => {
  it('convierte color vacío en null y la casilla "on" en true', () => {
    expect(validar(marcaSchema, { nombre: ' PGN ', color_primario: '', activa: 'on' })).toEqual({
      nombre: 'PGN',
      color_primario: null,
      activa: true,
    });
    expect(validar(marcaSchema, { nombre: 'PGN', color_primario: '#003366', activa: null }).activa).toBe(false);
  });
  it('lanza ErrorNegocio con un mensaje en español', () => {
    expect(() => validar(marcaSchema, { nombre: 'PGN', color_primario: 'azul', activa: 'on' })).toThrow(ErrorNegocio);
    expect(() => validar(marcaSchema, { nombre: 'PGN', color_primario: 'azul', activa: 'on' })).toThrow(
      'Color no válido (use #RRGGBB)',
    );
  });
});

import { eventoSchema, habeasSchema } from '@/lib/domain/schemas-admin';
import { puedeActivarse } from '@/lib/repo/eventos';

describe('eventoSchema', () => {
  it('normaliza dominio y convierte vacíos en null', () => {
    expect(
      validar(eventoSchema, {
        nombre: ' Capacitación PGN 2026 ',
        cliente: '',
        capacitadores: 'Juanita, Julia',
        dominio_correo: '@Procuraduria.gov.co',
        color_primario: '',
      }),
    ).toEqual({
      nombre: 'Capacitación PGN 2026',
      cliente: null,
      capacitadores: 'Juanita, Julia',
      dominio_correo: 'procuraduria.gov.co',
      color_primario: null,
    });
  });
  it('rechaza un dominio inválido', () => {
    expect(() =>
      validar(eventoSchema, { nombre: 'Evento', cliente: '', capacitadores: '', dominio_correo: 'no es dominio', color_primario: '' }),
    ).toThrow('Dominio no válido (ej. procuraduria.gov.co)');
  });
});

describe('habeasSchema', () => {
  it('exige un texto de al menos 20 caracteres y un enlace válido u omitido', () => {
    expect(validar(habeasSchema, { texto: 'x'.repeat(20), url_politica: '' })).toEqual({ texto: 'x'.repeat(20), url_politica: null });
    expect(() => validar(habeasSchema, { texto: 'corto', url_politica: '' })).toThrow('El texto de autorización es demasiado corto');
    expect(() => validar(habeasSchema, { texto: 'x'.repeat(20), url_politica: 'no-url' })).toThrow('Enlace no válido');
  });
});

describe('puedeActivarse', () => {
  it('bloquea mientras el texto sea el provisional', () => {
    expect(puedeActivarse('[PENDIENTE: cláusula oficial de Avance Jurídico]')).toMatch(/provisional/);
    expect(puedeActivarse('Autorizo a Avance Jurídico...')).toBeNull();
  });
});

import { sesionSchema } from '@/lib/domain/schemas-admin';

describe('sesionSchema', () => {
  const base = {
    numero: '3',
    titulo: '',
    lugar: 'Auditorio',
    inicio: '2026-10-14T08:00',
    fin: '2026-10-14T12:00',
    modo_apertura: 'automatico',
    abre_min_antes: '30',
    cierra_min_despues: '120',
  };
  it('interpreta las horas en Bogotá', () => {
    const d = validar(sesionSchema, base);
    expect(d.numero).toBe(3);
    expect(d.titulo).toBeNull();
    expect(d.inicio.toISOString()).toBe('2026-10-14T13:00:00.000Z');
  });
  it('rechaza fin anterior al inicio', () => {
    expect(() => validar(sesionSchema, { ...base, fin: '2026-10-14T07:00' })).toThrow(
      'La hora de fin debe ser posterior a la de inicio',
    );
  });
});
