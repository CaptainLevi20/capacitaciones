import { beforeEach, describe, expect, it } from 'vitest';
import { listarConsolidado } from '@/lib/repo/consolidado';
import { registrarEntrada, registrarSalida } from '@/lib/repo/registro';
import { clienteServicioPrueba, crearEventoPrueba, datosPersona, limpiarDatos } from './helpers';

const db = clienteServicioPrueba();
const sinMeta = { ip: null, userAgent: null };
beforeEach(limpiarDatos);

describe('listarConsolidado', () => {
  it('filtra por estado y por búsqueda', async () => {
    const ev = await crearEventoPrueba(db);
    const s = { id: ev.sesionId, habeasId: ev.habeasId };
    await registrarEntrada(db, s, datosPersona('111111'), sinMeta);
    await registrarEntrada(db, s, { ...datosPersona('222222'), apellidos: 'Rojas' }, sinMeta);
    await registrarSalida(db, s, { documento: { tipo_documento: 'CC', numero_documento: '111111' }, personales: null, respuestas: { contenido: 5 }, comentario: null }, sinMeta);
    expect((await listarConsolidado(db, { eventoId: ev.eventoId, estado: 'completa' })).map((f) => f.numero_documento)).toEqual(['111111']);
    expect((await listarConsolidado(db, { eventoId: ev.eventoId, busqueda: 'rojas' })).map((f) => f.numero_documento)).toEqual(['222222']);
    expect(await listarConsolidado(db, { eventoId: ev.eventoId, busqueda: '222' })).toHaveLength(1);
  });

  it('devuelve todas las filas aunque sean más de 1000', async () => {
    const ev = await crearEventoPrueba(db);
    const personas = Array.from({ length: 1005 }, (_, i) => ({ ...datosPersona(`D${String(i).padStart(6, '0')}`) }));
    const { data: asistentes, error } = await db.from('asistentes').insert(personas).select('id');
    if (error) throw error;
    const ahora = new Date().toISOString();
    const { error: e2 } = await db.from('entradas').insert(
      asistentes.map((a) => ({
        sesion_id: ev.sesionId, asistente_id: a.id, nombres: 'Ana', apellidos: 'Pérez', correo: 'a@x.co',
        dependencia: 'D', cargo: 'C', habeas_version_id: ev.habeasId, consentimiento_at: ahora,
      })),
    );
    if (e2) throw e2;
    expect(await listarConsolidado(db, { eventoId: ev.eventoId })).toHaveLength(1005);
  });
});
