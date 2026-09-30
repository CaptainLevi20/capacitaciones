import { describe, expect, it } from 'vitest';
import { colorTextoSobre, TINTA } from '@/lib/domain/color';
import { formatearFechaCorta, formatearHora } from '@/lib/domain/fechas';
import { proximaSesion } from '@/lib/domain/sesion-estado';

describe('colorTextoSobre', () => {
  it('usa blanco sobre colores oscuros', () => {
    expect(colorTextoSobre('#1F3A5F')).toBe('#FFFFFF');
    expect(colorTextoSobre('#8B0000')).toBe('#FFFFFF');
  });
  it('usa tinta sobre colores claros', () => {
    expect(colorTextoSobre('#FFD400')).toBe(TINTA);
    expect(colorTextoSobre('#9AD0F5')).toBe(TINTA);
  });
  it('acepta minúsculas y valores inválidos caen en blanco', () => {
    expect(colorTextoSobre('#ffffff')).toBe(TINTA);
    expect(colorTextoSobre('rojo')).toBe('#FFFFFF');
  });
});

describe('formatos cortos de fecha', () => {
  const d = new Date('2026-10-14T13:04:00Z'); // 8:04 en Bogotá
  it('formatea la hora en Bogotá', () => {
    expect(formatearHora(d)).toMatch(/^8:04\s?a\.\s?m\.$/);
  });
  it('formatea la fecha corta con día de la semana', () => {
    expect(formatearFechaCorta(d)).toBe('mié 14 oct');
  });
});

describe('proximaSesion', () => {
  const ahora = new Date('2026-10-14T15:00:00Z');
  const s = (inicio: string, fin: string) => ({ inicio: new Date(inicio), fin: new Date(fin) });
  it('devuelve la sesión en curso o la siguiente por inicio', () => {
    const lista = [
      s('2026-10-21T13:00:00Z', '2026-10-21T17:00:00Z'),
      s('2026-10-14T13:00:00Z', '2026-10-14T17:00:00Z'),
      s('2026-10-07T13:00:00Z', '2026-10-07T17:00:00Z'),
    ];
    expect(proximaSesion(lista, ahora)).toEqual(lista[1]);
  });
  it('devuelve null si todas terminaron', () => {
    expect(proximaSesion([s('2026-10-07T13:00:00Z', '2026-10-07T17:00:00Z')], ahora)).toBeNull();
    expect(proximaSesion([], ahora)).toBeNull();
  });
});
