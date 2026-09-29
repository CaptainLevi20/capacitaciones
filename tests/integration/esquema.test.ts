import { beforeEach, describe, expect, it } from 'vitest';
import {
  clienteAnonimoPrueba,
  clienteAutenticadoPrueba,
  clienteServicioPrueba,
  crearEventoPrueba,
  crearUsuarioPrueba,
  datosPersona,
  limpiarDatos,
  type EventoPrueba,
} from './helpers';

const db = clienteServicioPrueba();
beforeEach(limpiarDatos);

async function crearAsistente(doc = '1020345678'): Promise<string> {
  const { data, error } = await db.from('asistentes').insert(datosPersona(doc)).select('id').single();
  if (error) throw error;
  return data.id;
}

function crearEntrada(ev: EventoPrueba, asistenteId: string) {
  return db.from('entradas').insert({
    sesion_id: ev.sesionId,
    asistente_id: asistenteId,
    nombres: 'Ana María',
    apellidos: 'Pérez Gómez',
    correo: 'aperez@procuraduria.gov.co',
    dependencia: 'Delegada',
    cargo: 'Profesional',
    habeas_version_id: ev.habeasId,
    consentimiento_at: new Date().toISOString(),
  });
}

describe('datos base', () => {
  it('trae las 7 preguntas estándar y el marcador de Habeas Data', async () => {
    const { data: preguntas } = await db.from('plantilla_preguntas').select('clave').order('orden');
    expect(preguntas!.map((p) => p.clave)).toEqual([
      'contenido', 'expositor', 'metodologia', 'utilidad', 'logistica', 'nps', 'comentario',
    ]);
    const { data: cfg } = await db.from('configuracion').select('valor').eq('clave', 'habeas_texto_defecto').single();
    expect(cfg!.valor).toBe('[PENDIENTE: cláusula oficial de Avance Jurídico]');
  });
});

describe('restricciones', () => {
  it('no permite dos entradas de la misma persona en la misma sesión', async () => {
    const ev = await crearEventoPrueba(db);
    const a = await crearAsistente();
    expect((await crearEntrada(ev, a)).error).toBeNull();
    expect((await crearEntrada(ev, a)).error?.code).toBe('23505');
  });

  it('exige consentimiento en una salida sin entrada', async () => {
    const ev = await crearEventoPrueba(db);
    const a = await crearAsistente();
    const { error } = await db.from('salidas').insert({ sesion_id: ev.sesionId, asistente_id: a, sin_entrada: true });
    expect(error?.code).toBe('23514');
  });

  it('rechaza números de documento sin normalizar', async () => {
    const { error } = await db.from('asistentes').insert(datosPersona('1.020.345.678'));
    expect(error?.code).toBe('23514');
  });
});

describe('RLS', () => {
  it('el rol anónimo no lee ni escribe datos', async () => {
    const ev = await crearEventoPrueba(db);
    await crearEntrada(ev, await crearAsistente());
    const anon = clienteAnonimoPrueba();
    expect((await anon.from('entradas').select('id')).data).toEqual([]);
    expect((await anon.from('asistencia_consolidada').select('asistente_id')).data).toEqual([]);
    expect((await anon.from('eventos').insert({ nombre: 'Intruso' })).error).not.toBeNull();
  });

  it('un usuario autenticado que no es administrador no ve datos', async () => {
    const ev = await crearEventoPrueba(db);
    await crearEntrada(ev, await crearAsistente());
    const u = await crearUsuarioPrueba(false);
    const c = await clienteAutenticadoPrueba(u.email, u.password);
    expect((await c.from('entradas').select('id')).data).toEqual([]);
  });

  it('un administrador ve los datos', async () => {
    const ev = await crearEventoPrueba(db);
    await crearEntrada(ev, await crearAsistente());
    const u = await crearUsuarioPrueba(true);
    const c = await clienteAutenticadoPrueba(u.email, u.password);
    expect((await c.from('entradas').select('id')).data).toHaveLength(1);
  });
});

describe('vista asistencia_consolidada', () => {
  it('clasifica completa, solo entrada y sin entrada, con promedio y NPS', async () => {
    const ev = await crearEventoPrueba(db);
    const a1 = await crearAsistente('111111');
    const a2 = await crearAsistente('222222');
    const a3 = await crearAsistente('333333');
    await crearEntrada(ev, a1);
    await crearEntrada(ev, a2);
    await db.from('salidas').insert({
      sesion_id: ev.sesionId, asistente_id: a1, sin_entrada: false,
      respuestas: { contenido: 5, expositor: 4, metodologia: 5, utilidad: 4, logistica: 5, nps: 9 },
    });
    await db.from('salidas').insert({
      sesion_id: ev.sesionId, asistente_id: a3, sin_entrada: true,
      habeas_version_id: ev.habeasId, consentimiento_at: new Date().toISOString(),
      respuestas: { contenido: 3, expositor: 3, metodologia: 3, utilidad: 3, logistica: 3, nps: 6 },
    });
    const { data } = await db
      .from('asistencia_consolidada')
      .select('numero_documento, estado_asistencia, promedio_escala, nps')
      .eq('sesion_id', ev.sesionId)
      .order('numero_documento');
    expect(data).toEqual([
      { numero_documento: '111111', estado_asistencia: 'completa', promedio_escala: 4.6, nps: 9 },
      { numero_documento: '222222', estado_asistencia: 'solo_entrada', promedio_escala: null, nps: null },
      { numero_documento: '333333', estado_asistencia: 'sin_entrada', promedio_escala: 3, nps: 6 },
    ]);
  });
});

describe('consumir_rate_limit', () => {
  it('permite hasta el máximo y luego bloquea', async () => {
    const llamar = async () =>
      (await db.rpc('consumir_rate_limit', { p_clave: 'prueba', p_max: 3, p_ventana_segundos: 600 })).data;
    expect(await llamar()).toBe(true);
    expect(await llamar()).toBe(true);
    expect(await llamar()).toBe(true);
    expect(await llamar()).toBe(false);
  });

  it('no puede invocarla el rol anónimo', async () => {
    const { error } = await clienteAnonimoPrueba().rpc('consumir_rate_limit', {
      p_clave: 'x', p_max: 1, p_ventana_segundos: 1,
    });
    expect(error).not.toBeNull();
  });
});
