import { describe, expect, it } from 'vitest';
import {
  motivoNoActivar,
  pasosFaltantes,
  revisarPreparacion,
  type EntradaPreparacion,
} from '@/lib/domain/preparacion';

const completo: EntradaPreparacion = {
  textoHabeas: 'Autorizo el tratamiento de datos personales.',
  marcasVisibles: [{ nombre: 'PGN', tieneLogo: true }],
  sesiones: 12,
  preguntasActivas: 6,
  cliente: 'PGN',
  capacitadores: 'Ana Pérez',
  dominioCorreo: 'procuraduria.gov.co',
};

const item = (e: EntradaPreparacion, clave: string) => revisarPreparacion(e).find((i) => i.clave === clave)!;

describe('revisarPreparacion', () => {
  it('marca todo listo en un evento completo', () => {
    const items = revisarPreparacion(completo);
    expect(items.map((i) => i.clave)).toEqual(['habeas', 'cobranding', 'sesiones', 'encuesta', 'datos']);
    expect(items.every((i) => i.estado === 'listo')).toBe(true);
    expect(pasosFaltantes(items)).toBe(0);
    expect(motivoNoActivar(items)).toBeNull();
  });

  it('exige una marca visible con logo', () => {
    expect(item({ ...completo, marcasVisibles: [] }, 'cobranding')).toMatchObject({
      estado: 'falta',
      obligatorio: true,
      detalle: 'Ninguna marca visible en el formulario',
    });
    expect(item({ ...completo, marcasVisibles: [{ nombre: 'PGN', tieneLogo: false }] }, 'cobranding')).toMatchObject({
      estado: 'falta',
      detalle: 'Ninguna marca visible tiene logo',
    });
  });

  it('avisa sin bloquear si una marca visible no tiene logo pero otra sí', () => {
    const marcas = [
      { nombre: 'PGN', tieneLogo: true },
      { nombre: 'Avance Jurídico', tieneLogo: false },
    ];
    expect(item({ ...completo, marcasVisibles: marcas }, 'cobranding')).toMatchObject({
      estado: 'aviso',
      detalle: 'Avance Jurídico no tiene logo: se mostrará solo el nombre',
    });
  });

  it('exige autorización definitiva, sesiones y preguntas activas', () => {
    expect(item({ ...completo, textoHabeas: '[PENDIENTE: cláusula oficial de Avance Jurídico]' }, 'habeas').estado).toBe('falta');
    expect(item({ ...completo, sesiones: 0 }, 'sesiones')).toMatchObject({ estado: 'falta', detalle: 'Aún no hay sesiones' });
    expect(item(completo, 'sesiones').detalle).toBe('12 sesiones');
    expect(item({ ...completo, sesiones: 1 }, 'sesiones').detalle).toBe('1 sesión');
    expect(item({ ...completo, preguntasActivas: 0 }, 'encuesta').estado).toBe('falta');
  });

  it('los datos generales solo avisan y dicen qué falta', () => {
    const d = item({ ...completo, capacitadores: null, dominioCorreo: null }, 'datos');
    expect(d).toMatchObject({ estado: 'aviso', obligatorio: false, detalle: 'Falta: capacitador(es), dominio de correo' });
  });

  it('cuenta solo los obligatorios y arma el motivo para no activar', () => {
    const items = revisarPreparacion({ ...completo, marcasVisibles: [], sesiones: 0, cliente: null });
    expect(pasosFaltantes(items)).toBe(2);
    expect(motivoNoActivar(items)).toBe(
      'No se puede activar todavía. Falta: co-branding (ninguna marca visible en el formulario), sesiones (aún no hay sesiones).',
    );
  });
});
