import { beforeEach, describe, expect, it } from 'vitest';
import {
  actualizarEvento,
  cambiarEstadoEvento,
  crearEvento,
  duplicarEvento,
  guardarMarcasEvento,
  guardarPreguntas,
  listarEventos,
  nuevaVersionHabeas,
  obtenerEvento,
} from '@/lib/repo/eventos';
import { guardarConfiguracion } from '@/lib/repo/configuracion';
import { ErrorNegocio } from '@/lib/errores';
import { clienteServicioPrueba, crearEventoPrueba, limpiarDatos } from './helpers';

const db = clienteServicioPrueba();
const datos = {
  nombre: 'Capacitación PGN 2026',
  cliente: 'PGN',
  capacitadores: null,
  dominio_correo: 'procuraduria.gov.co',
  color_primario: null,
};
const CLAUSULA = 'Autorizo a Avance Jurídico el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.';
beforeEach(limpiarDatos);

async function idAvance() {
  const { data } = await db.from('marcas').select('id').eq('nombre', 'Avance Jurídico').single();
  return data!.id as string;
}

describe('crearEvento', () => {
  it('queda en borrador con las 7 preguntas y el Habeas Data por defecto como versión 1', async () => {
    const id = await crearEvento(db, datos);
    const ev = (await obtenerEvento(db, id))!;
    expect(ev.estado).toBe('borrador');
    expect(ev.preguntas).toHaveLength(7);
    expect(ev.habeas).toHaveLength(1);
    expect(ev.habeas[0]).toMatchObject({ version: 1, texto: '[PENDIENTE: cláusula oficial de Avance Jurídico]' });
  });

  it('usa la configuración vigente al momento de crearlo', async () => {
    await guardarConfiguracion(db, { habeasTexto: CLAUSULA, habeasUrl: 'https://avance.co/politica' });
    const ev = (await obtenerEvento(db, await crearEvento(db, datos)))!;
    expect(ev.habeas[0]).toMatchObject({ texto: CLAUSULA, url_politica: 'https://avance.co/politica' });
  });
});

describe('Habeas Data y activación', () => {
  it('versiona el texto y conserva el historial', async () => {
    const id = await crearEvento(db, datos);
    expect(await nuevaVersionHabeas(db, id, CLAUSULA, null)).toBe(2);
    expect(await nuevaVersionHabeas(db, id, CLAUSULA, null)).toBe(2); // sin cambios: no crea versión
    const ev = (await obtenerEvento(db, id))!;
    expect(ev.habeas.map((h) => h.version)).toEqual([2, 1]);
  });

  it('no activa con el texto provisional y sí con la cláusula oficial', async () => {
    const id = await crearEvento(db, datos);
    await expect(cambiarEstadoEvento(db, id, 'activo')).rejects.toBeInstanceOf(ErrorNegocio);
    await nuevaVersionHabeas(db, id, CLAUSULA, null);
    await cambiarEstadoEvento(db, id, 'activo');
    expect((await obtenerEvento(db, id))!.estado).toBe('activo');
  });
});

describe('configuración del evento', () => {
  it('actualiza datos, marcas y preguntas', async () => {
    const id = await crearEvento(db, datos);
    await actualizarEvento(db, id, { ...datos, nombre: 'Nuevo nombre' });
    await guardarMarcasEvento(db, id, [{ marcaId: await idAvance(), orden: 1, visible: true }]);
    await guardarPreguntas(db, id, [
      { clave: 'logistica', texto: 'Logística', activa: false },
      { clave: 'contenido', texto: 'Contenido claro', activa: true },
    ]);
    const ev = (await obtenerEvento(db, id))!;
    expect(ev.nombre).toBe('Nuevo nombre');
    expect(ev.marcas).toHaveLength(1);
    expect(ev.preguntas.find((p) => p.clave === 'logistica')!.activa).toBe(false);
    expect(ev.preguntas.find((p) => p.clave === 'contenido')!.texto).toBe('Contenido claro');
  });

  it('rechaza una pregunta activa sin texto', async () => {
    const id = await crearEvento(db, datos);
    await expect(guardarPreguntas(db, id, [{ clave: 'contenido', texto: ' ', activa: true }])).rejects.toBeInstanceOf(
      ErrorNegocio,
    );
  });
});

describe('duplicarEvento', () => {
  it('copia configuración, marcas, preguntas y Habeas Data vigente, sin sesiones', async () => {
    const id = await crearEvento(db, datos);
    await guardarMarcasEvento(db, id, [{ marcaId: await idAvance(), orden: 1, visible: true }]);
    await guardarPreguntas(db, id, [{ clave: 'logistica', texto: 'Logística', activa: false }]);
    await nuevaVersionHabeas(db, id, CLAUSULA, null);
    const copiaId = await duplicarEvento(db, id);
    const copia = (await obtenerEvento(db, copiaId))!;
    expect(copia).toMatchObject({ nombre: 'Capacitación PGN 2026 (copia)', estado: 'borrador', dominio_correo: 'procuraduria.gov.co' });
    expect(copia.marcas).toHaveLength(1);
    expect(copia.preguntas.find((p) => p.clave === 'logistica')!.activa).toBe(false);
    expect(copia.habeas).toEqual([expect.objectContaining({ version: 1, texto: CLAUSULA })]);
    const lista = await listarEventos(db);
    expect(lista.find((e) => e.id === copiaId)!.sesiones).toBe(0);
  });
});

describe('listarEventos', () => {
  it('incluye el número de sesiones', async () => {
    const ev = await crearEventoPrueba(db);
    expect((await listarEventos(db)).find((e) => e.id === ev.eventoId)!.sesiones).toBe(1);
  });
});
