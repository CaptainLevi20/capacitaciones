import { beforeEach, describe, expect, it } from 'vitest';
import {
  actualizarSesion,
  cambiarEstadoManual,
  crearSesiones,
  listarSesiones,
  obtenerSesion,
  regenerarTokens,
  usarModoAutomatico,
} from '@/lib/repo/sesiones';
import { obtenerSesionPorToken } from '@/lib/repo/publico';
import { registrarEntrada, registrarSalida } from '@/lib/repo/registro';
import { parsearSesionesMasivas } from '@/lib/domain/sesiones-masivas';
import { ErrorNegocio } from '@/lib/errores';
import { clienteServicioPrueba, crearEventoPrueba, datosPersona, limpiarDatos } from './helpers';

const db = clienteServicioPrueba();
const sinMeta = { ip: null, userAgent: null };
beforeEach(limpiarDatos);

describe('crearSesiones', () => {
  it('crea las 12 sesiones con tokens únicos', async () => {
    const ev = await crearEventoPrueba(db); // ya trae la sesión 1
    const texto = Array.from({ length: 11 }, (_, i) => `${i + 2};2026-10-${String(i + 10).padStart(2, '0')};08:00;12:00`).join('\n');
    const { filas, errores } = parsearSesionesMasivas(texto);
    expect(errores).toEqual([]);
    expect(await crearSesiones(db, ev.eventoId, filas)).toBe(11);
    const sesiones = await listarSesiones(db, ev.eventoId);
    expect(sesiones.map((s) => s.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const tokens = sesiones.flatMap((s) => [s.token_entrada, s.token_salida]);
    expect(new Set(tokens).size).toBe(24);
    tokens.forEach((t) => expect(t).toMatch(/^[A-Za-z0-9_-]{22}$/));
  });

  it('rechaza números que ya existen', async () => {
    const ev = await crearEventoPrueba(db);
    const { filas } = parsearSesionesMasivas('1;2026-10-14;08:00;12:00');
    await expect(crearSesiones(db, ev.eventoId, filas)).rejects.toBeInstanceOf(ErrorNegocio);
  });
});

describe('estado y conteos', () => {
  it('cuenta entradas, salidas y salidas sin entrada', async () => {
    const ev = await crearEventoPrueba(db);
    const s = { id: ev.sesionId, habeasId: ev.habeasId };
    await registrarEntrada(db, s, datosPersona('111111'), sinMeta);
    await registrarEntrada(db, s, datosPersona('222222'), sinMeta);
    await registrarSalida(db, s, { documento: { tipo_documento: 'CC', numero_documento: '111111' }, personales: null, respuestas: {}, comentario: null }, sinMeta);
    await registrarSalida(db, s, { documento: { tipo_documento: 'CC', numero_documento: '333333' }, personales: datosPersona('333333'), respuestas: {}, comentario: null }, sinMeta);
    const [sesion] = await listarSesiones(db, ev.eventoId);
    expect(sesion.conteo).toEqual({ entradas: 2, salidas: 2, sinEntrada: 1 });
  });

  it('abrir, cerrar y volver al modo automático cambia lo que ve el público', async () => {
    const ev = await crearEventoPrueba(db, { estadoManual: 'cerrada' });
    await cambiarEstadoManual(db, ev.sesionId, 'abierta');
    expect((await obtenerSesionPorToken(db, ev.tokenEntrada, 'entrada')).tipo).toBe('abierta');
    await cambiarEstadoManual(db, ev.sesionId, 'cerrada');
    expect((await obtenerSesionPorToken(db, ev.tokenEntrada, 'entrada')).tipo).toBe('no_disponible');
    await usarModoAutomatico(db, ev.sesionId); // la sesión de prueba está en curso: queda abierta
    const s = (await obtenerSesion(db, ev.sesionId))!;
    expect(s).toMatchObject({ modo_apertura: 'automatico', estado_manual: null, estado: 'abierta' });
  });

  it('regenerar tokens invalida los QR anteriores', async () => {
    const ev = await crearEventoPrueba(db);
    await regenerarTokens(db, ev.sesionId);
    expect((await obtenerSesionPorToken(db, ev.tokenEntrada, 'entrada')).tipo).toBe('no_encontrada');
    const s = (await obtenerSesion(db, ev.sesionId))!;
    expect((await obtenerSesionPorToken(db, s.token_entrada, 'entrada')).tipo).toBe('abierta');
  });

  it('actualiza los datos de la sesión', async () => {
    const ev = await crearEventoPrueba(db);
    await actualizarSesion(db, ev.sesionId, {
      numero: 5,
      titulo: 'Nuevo título',
      lugar: null,
      inicio: new Date('2026-10-14T13:00:00Z'),
      fin: new Date('2026-10-14T17:00:00Z'),
      modo_apertura: 'automatico',
      abre_min_antes: 15,
      cierra_min_despues: 60,
    });
    expect((await obtenerSesion(db, ev.sesionId))!).toMatchObject({
      numero: 5,
      titulo: 'Nuevo título',
      abre_min_antes: 15,
      estado_manual: null,
    });
  });
});
