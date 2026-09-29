import { beforeEach, describe, expect, it } from 'vitest';
import { DatosPersonalesRequeridos, registrarEntrada, registrarSalida } from '@/lib/repo/registro';
import { clienteServicioPrueba, crearEventoPrueba, datosPersona, limpiarDatos } from './helpers';

const db = clienteServicioPrueba();
const meta = { ip: '181.49.1.2', userAgent: 'Prueba' };
beforeEach(limpiarDatos);

describe('registrarEntrada', () => {
  it('crea el asistente y la entrada con prueba de consentimiento', async () => {
    const ev = await crearEventoPrueba(db);
    await registrarEntrada(db, { id: ev.sesionId, habeasId: ev.habeasId }, datosPersona(), meta);
    const { data } = await db
      .from('entradas')
      .select('nombres, habeas_version_id, consentimiento_at, ip, user_agent')
      .eq('sesion_id', ev.sesionId);
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({
      nombres: 'Ana María',
      habeas_version_id: ev.habeasId,
      ip: '181.49.1.2',
      user_agent: 'Prueba',
    });
    expect(data![0].consentimiento_at).not.toBeNull();
  });

  it('un segundo registro actualiza los datos, no duplica y conserva la hora original', async () => {
    const ev = await crearEventoPrueba(db);
    const sesion = { id: ev.sesionId, habeasId: ev.habeasId };
    await registrarEntrada(db, sesion, datosPersona(), meta);
    const { data: antes } = await db.from('entradas').select('registrado_at').eq('sesion_id', ev.sesionId).single();
    await new Promise((r) => setTimeout(r, 50));
    await registrarEntrada(db, sesion, { ...datosPersona(), correo: 'nuevo@procuraduria.gov.co', cargo: 'Asesora' }, meta);
    const { data } = await db.from('entradas').select('registrado_at, correo, cargo').eq('sesion_id', ev.sesionId);
    expect(data).toHaveLength(1);
    expect(data![0].registrado_at).toBe(antes!.registrado_at);
    expect(data![0]).toMatchObject({ correo: 'nuevo@procuraduria.gov.co', cargo: 'Asesora' });
    const { data: asistentes } = await db.from('asistentes').select('correo');
    expect(asistentes).toEqual([{ correo: 'nuevo@procuraduria.gov.co' }]);
  });

  it('la misma persona en otra sesión reutiliza el asistente', async () => {
    const ev1 = await crearEventoPrueba(db);
    const ev2 = await crearEventoPrueba(db);
    await registrarEntrada(db, { id: ev1.sesionId, habeasId: ev1.habeasId }, datosPersona(), meta);
    await registrarEntrada(db, { id: ev2.sesionId, habeasId: ev2.habeasId }, datosPersona(), meta);
    expect((await db.from('asistentes').select('id')).data).toHaveLength(1);
    expect((await db.from('entradas').select('id')).data).toHaveLength(2);
  });
});

describe('registrarSalida', () => {
  const respuestas = { contenido: 5, expositor: 4, metodologia: 5, utilidad: 4, logistica: 5, nps: 10 };
  const documento = { tipo_documento: 'CC' as const, numero_documento: '1020345678' };

  it('con entrada previa: no pide datos ni consentimiento y queda completa', async () => {
    const ev = await crearEventoPrueba(db);
    const sesion = { id: ev.sesionId, habeasId: ev.habeasId };
    await registrarEntrada(db, sesion, datosPersona(), meta);
    const r = await registrarSalida(db, sesion, { documento, personales: null, respuestas, comentario: 'Bien' }, meta);
    expect(r.sinEntrada).toBe(false);
    const { data } = await db
      .from('asistencia_consolidada')
      .select('estado_asistencia, promedio_escala, nps, comentario')
      .eq('sesion_id', ev.sesionId)
      .single();
    expect(data).toEqual({ estado_asistencia: 'completa', promedio_escala: 4.6, nps: 10, comentario: 'Bien' });
  });

  it('sin entrada: crea el asistente, guarda consentimiento y marca sin_entrada', async () => {
    const ev = await crearEventoPrueba(db);
    const r = await registrarSalida(
      db,
      { id: ev.sesionId, habeasId: ev.habeasId },
      { documento, personales: datosPersona(), respuestas, comentario: null },
      meta,
    );
    expect(r.sinEntrada).toBe(true);
    const { data } = await db
      .from('salidas')
      .select('sin_entrada, habeas_version_id, consentimiento_at, ip')
      .eq('sesion_id', ev.sesionId)
      .single();
    expect(data).toMatchObject({ sin_entrada: true, habeas_version_id: ev.habeasId, ip: '181.49.1.2' });
    expect(data!.consentimiento_at).not.toBeNull();
  });

  it('sin entrada y sin datos personales: lanza DatosPersonalesRequeridos', async () => {
    const ev = await crearEventoPrueba(db);
    await expect(
      registrarSalida(
        db,
        { id: ev.sesionId, habeasId: ev.habeasId },
        { documento, personales: null, respuestas, comentario: null },
        meta,
      ),
    ).rejects.toBeInstanceOf(DatosPersonalesRequeridos);
  });

  it('un reenvío actualiza la salida sin duplicarla', async () => {
    const ev = await crearEventoPrueba(db);
    const sesion = { id: ev.sesionId, habeasId: ev.habeasId };
    await registrarEntrada(db, sesion, datosPersona(), meta);
    await registrarSalida(db, sesion, { documento, personales: null, respuestas, comentario: null }, meta);
    await registrarSalida(
      db,
      sesion,
      { documento, personales: null, respuestas: { ...respuestas, nps: 3 }, comentario: null },
      meta,
    );
    const { data } = await db.from('salidas').select('respuestas').eq('sesion_id', ev.sesionId);
    expect(data).toHaveLength(1);
    expect((data![0].respuestas as Record<string, number>).nps).toBe(3);
  });
});
