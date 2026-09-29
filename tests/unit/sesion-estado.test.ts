import { describe, expect, it } from 'vitest';
import { estadoSesion, ventanaApertura, type VentanaSesion } from '@/lib/domain/sesion-estado';

// Sesión de 8:00 a 12:00 hora de Bogotá
const base: VentanaSesion = {
  inicio: new Date('2026-10-14T13:00:00Z'),
  fin: new Date('2026-10-14T17:00:00Z'),
  modo_apertura: 'automatico',
  estado_manual: null,
  abre_min_antes: 30,
  cierra_min_despues: 120,
};

describe('ventanaApertura', () => {
  it('abre 30 min antes y cierra 120 min después', () => {
    const v = ventanaApertura(base);
    expect(v.abre.toISOString()).toBe('2026-10-14T12:30:00.000Z');
    expect(v.cierra.toISOString()).toBe('2026-10-14T19:00:00.000Z');
  });
});

describe('estadoSesion automático', () => {
  it('programada un minuto antes de abrir', () => {
    expect(estadoSesion(base, new Date('2026-10-14T12:29:00Z'))).toBe('programada');
  });
  it('abierta justo al abrir (7:30 Bogotá)', () => {
    expect(estadoSesion(base, new Date('2026-10-14T12:30:00Z'))).toBe('abierta');
  });
  it('abierta justo al cerrar (14:00 Bogotá)', () => {
    expect(estadoSesion(base, new Date('2026-10-14T19:00:00Z'))).toBe('abierta');
  });
  it('cerrada un segundo después', () => {
    expect(estadoSesion(base, new Date('2026-10-14T19:00:01Z'))).toBe('cerrada');
  });
});

describe('estadoSesion manual', () => {
  const antes = new Date('2026-10-01T00:00:00Z');
  const durante = new Date('2026-10-14T14:00:00Z');
  it('abierta si el administrador la abrió, aunque sea antes de la ventana', () => {
    expect(estadoSesion({ ...base, modo_apertura: 'manual', estado_manual: 'abierta' }, antes)).toBe('abierta');
  });
  it('cerrada si el administrador la cerró, aunque esté dentro de la ventana', () => {
    expect(estadoSesion({ ...base, modo_apertura: 'manual', estado_manual: 'cerrada' }, durante)).toBe('cerrada');
  });
  it('programada si está en modo manual sin estado', () => {
    expect(estadoSesion({ ...base, modo_apertura: 'manual', estado_manual: null }, durante)).toBe('programada');
  });
});
