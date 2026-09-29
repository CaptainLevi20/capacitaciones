import { describe, expect, it } from 'vitest';
import { aInputLocal, desdeInputLocal, fechaHoraBogota, formatearFechaHora } from '@/lib/domain/fechas';

describe('fechaHoraBogota', () => {
  it('interpreta la hora como hora de Bogotá (UTC−5)', () => {
    expect(fechaHoraBogota('2026-10-14', '08:00')!.toISOString()).toBe('2026-10-14T13:00:00.000Z');
  });
  it('acepta DD/MM/AAAA (formato de Excel en Colombia)', () => {
    expect(fechaHoraBogota('14/10/2026', '8:00')!.toISOString()).toBe('2026-10-14T13:00:00.000Z');
  });
  it('rechaza fechas y horas inválidas', () => {
    expect(fechaHoraBogota('2026-02-31', '08:00')).toBeNull();
    expect(fechaHoraBogota('2026-10-14', '25:00')).toBeNull();
    expect(fechaHoraBogota('mañana', '08:00')).toBeNull();
  });
});

describe('inputs datetime-local', () => {
  it('convierte ida y vuelta en hora de Bogotá', () => {
    const d = new Date('2026-10-14T13:00:00Z');
    expect(aInputLocal(d)).toBe('2026-10-14T08:00');
    expect(desdeInputLocal('2026-10-14T08:00')!.toISOString()).toBe(d.toISOString());
    expect(desdeInputLocal('')).toBeNull();
  });
});

describe('formatearFechaHora', () => {
  it('formatea en español en hora de Bogotá', () => {
    const texto = formatearFechaHora(new Date('2026-10-14T13:00:00Z'));
    expect(texto).toContain('octubre');
    expect(texto).toContain('2026');
    expect(texto).toMatch(/8:00/);
  });
});
