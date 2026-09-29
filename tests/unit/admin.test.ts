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
