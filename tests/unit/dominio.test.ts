import { describe, expect, it } from 'vitest';
import { normalizarDocumento } from '@/lib/domain/documento';
import { correoFueraDeDominio } from '@/lib/domain/correo';
import { ipDesdeCabeceras } from '@/lib/domain/ip';
import { generarToken } from '@/lib/domain/tokens';
import { RATE_LIMIT } from '@/lib/domain/constantes';
import { calcularNps, promedio, separarRespuestas, type Pregunta } from '@/lib/domain/encuesta';

describe('normalizarDocumento', () => {
  it('quita puntos, espacios y guiones, y pasa a mayúsculas', () => {
    expect(normalizarDocumento(' 1.020.345.678 ')).toBe('1020345678');
    expect(normalizarDocumento('ab-123 45')).toBe('AB12345');
  });
});

describe('correoFueraDeDominio', () => {
  it('no advierte si no hay dominio configurado', () => {
    expect(correoFueraDeDominio('a@gmail.com', null)).toBe(false);
  });
  it('acepta el dominio exacto y sus subdominios, sin importar mayúsculas ni @ inicial', () => {
    expect(correoFueraDeDominio('A@Procuraduria.gov.co', '@procuraduria.gov.co')).toBe(false);
    expect(correoFueraDeDominio('a@sub.procuraduria.gov.co', 'procuraduria.gov.co')).toBe(false);
  });
  it('advierte con otro dominio', () => {
    expect(correoFueraDeDominio('a@gmail.com', 'procuraduria.gov.co')).toBe(true);
    expect(correoFueraDeDominio('a@falsoprocuraduria.gov.co', 'procuraduria.gov.co')).toBe(true);
  });
});

describe('ipDesdeCabeceras', () => {
  it('toma la primera IP de x-forwarded-for', () => {
    expect(ipDesdeCabeceras('181.49.1.2, 10.0.0.1', null)).toBe('181.49.1.2');
  });
  it('usa x-real-ip si no hay x-forwarded-for', () => {
    expect(ipDesdeCabeceras(null, '::1')).toBe('::1');
  });
  it('devuelve null si el valor no es una IP', () => {
    expect(ipDesdeCabeceras('basura', null)).toBeNull();
    expect(ipDesdeCabeceras(null, null)).toBeNull();
  });
});

describe('generarToken', () => {
  it('produce 22 caracteres base64url distintos cada vez', () => {
    const tokens = new Set(Array.from({ length: 200 }, generarToken));
    expect(tokens.size).toBe(200);
    for (const t of tokens) expect(t).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });
});

describe('RATE_LIMIT', () => {
  it('permite un salón completo detrás de la misma IP (wifi institucional)', () => {
    expect(RATE_LIMIT.max).toBeGreaterThanOrEqual(200);
    expect(RATE_LIMIT.ventanaSegundos).toBe(600);
  });
});

describe('encuesta', () => {
  it('promedio redondea a 2 decimales y devuelve null sin datos', () => {
    expect(promedio([5, 4, 4])).toBe(4.33);
    expect(promedio([])).toBeNull();
  });
  it('calcularNps = % promotores (9-10) − % detractores (0-6)', () => {
    expect(calcularNps([10, 9, 8, 6])).toBe(25);
    expect(calcularNps([])).toBeNull();
  });
  it('separarRespuestas separa números y comentario, e ignora preguntas inactivas', () => {
    const preguntas: Pregunta[] = [
      { clave: 'contenido', tipo: 'escala_1_5', texto: 'C', orden: 1, activa: true },
      { clave: 'logistica', tipo: 'escala_1_5', texto: 'L', orden: 2, activa: false },
      { clave: 'nps', tipo: 'nps_0_10', texto: 'N', orden: 3, activa: true },
      { clave: 'comentario', tipo: 'texto', texto: 'T', orden: 4, activa: true },
    ];
    expect(
      separarRespuestas(preguntas, { p_contenido: 5, p_logistica: 1, p_nps: 9, p_comentario: '  Bien ' }),
    ).toEqual({ respuestas: { contenido: 5, nps: 9 }, comentario: 'Bien' });
    expect(separarRespuestas(preguntas, { p_contenido: 5, p_nps: 9, p_comentario: '' }).comentario).toBeNull();
  });
});
