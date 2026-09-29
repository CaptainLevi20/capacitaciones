import { beforeEach, expect, it } from 'vitest';
import { obtenerSesionPorToken } from '@/lib/repo/publico';
import { generarToken } from '@/lib/domain/tokens';
import { clienteServicioPrueba, crearEventoPrueba, limpiarDatos } from './helpers';

const db = clienteServicioPrueba();
beforeEach(limpiarDatos);

it('token con formato inválido: no_encontrada', async () => {
  expect((await obtenerSesionPorToken(db, 'abc', 'entrada')).tipo).toBe('no_encontrada');
});

it('token inexistente: no_encontrada', async () => {
  expect((await obtenerSesionPorToken(db, generarToken(), 'entrada')).tipo).toBe('no_encontrada');
});

it('token de entrada usado en la URL de salida: no_encontrada', async () => {
  const ev = await crearEventoPrueba(db);
  expect((await obtenerSesionPorToken(db, ev.tokenEntrada, 'salida')).tipo).toBe('no_encontrada');
});

it('evento en borrador: no_encontrada', async () => {
  const ev = await crearEventoPrueba(db, { estadoEvento: 'borrador' });
  expect((await obtenerSesionPorToken(db, ev.tokenEntrada, 'entrada')).tipo).toBe('no_encontrada');
});

it('sesión cerrada manualmente: no_disponible', async () => {
  const ev = await crearEventoPrueba(db, { estadoManual: 'cerrada' });
  const r = await obtenerSesionPorToken(db, ev.tokenEntrada, 'entrada');
  expect(r.tipo).toBe('no_disponible');
  if (r.tipo === 'no_disponible') expect(r.sesion.estado).toBe('cerrada');
});

it('sesión abierta: devuelve el contexto del evento', async () => {
  const ev = await crearEventoPrueba(db);
  const r = await obtenerSesionPorToken(db, ev.tokenSalida, 'salida');
  expect(r.tipo).toBe('abierta');
  if (r.tipo !== 'abierta') return;
  expect(r.sesion.id).toBe(ev.sesionId);
  expect(r.sesion.numero).toBe(1);
  expect(r.sesion.habeas.id).toBe(ev.habeasId);
  expect(r.sesion.preguntas).toHaveLength(7);
  expect(r.sesion.evento.dominioCorreo).toBe('procuraduria.gov.co');
});

it('usa la última versión de Habeas Data y solo las preguntas activas', async () => {
  const ev = await crearEventoPrueba(db);
  await db.from('evento_habeas_versiones').insert({ evento_id: ev.eventoId, version: 2, texto: 'Versión dos' });
  await db.from('evento_preguntas').update({ activa: false }).eq('evento_id', ev.eventoId).eq('clave', 'logistica');
  const r = await obtenerSesionPorToken(db, ev.tokenEntrada, 'entrada');
  if (r.tipo !== 'abierta') throw new Error('se esperaba abierta');
  expect(r.sesion.habeas.texto).toBe('Versión dos');
  expect(r.sesion.preguntas.map((p) => p.clave)).not.toContain('logistica');
});

it('muestra solo marcas visibles y activas, en orden, y toma el color de la primera', async () => {
  const ev = await crearEventoPrueba(db);
  const { data: marcas } = await db
    .from('marcas')
    .insert([
      { nombre: 'PGN', color_primario: '#003366', logo_path: 'pgn/logo.png', activa: true },
      { nombre: 'Oculta', color_primario: null, logo_path: null, activa: true },
      { nombre: 'Inactiva', color_primario: null, logo_path: null, activa: false },
    ])
    .select('id, nombre');
  const id = (n: string) => marcas!.find((m) => m.nombre === n)!.id;
  const { data: avance } = await db.from('marcas').select('id').eq('nombre', 'Avance Jurídico').single();
  await db.from('evento_marcas').insert([
    { evento_id: ev.eventoId, marca_id: avance!.id, orden: 2, visible: true },
    { evento_id: ev.eventoId, marca_id: id('PGN'), orden: 1, visible: true },
    { evento_id: ev.eventoId, marca_id: id('Oculta'), orden: 3, visible: false },
    { evento_id: ev.eventoId, marca_id: id('Inactiva'), orden: 4, visible: true },
  ]);
  const r = await obtenerSesionPorToken(db, ev.tokenEntrada, 'entrada');
  if (r.tipo !== 'abierta') throw new Error('se esperaba abierta');
  expect(r.sesion.marcas.map((m) => m.nombre)).toEqual(['PGN', 'Avance Jurídico']);
  expect(r.sesion.marcas[0].logoUrl).toMatch(/\/storage\/v1\/object\/public\/logos\/pgn\/logo\.png$/);
  expect(r.sesion.marcas[1].logoUrl).toBeNull();
  expect(r.sesion.evento.colorPrimario).toBe('#003366');
});
