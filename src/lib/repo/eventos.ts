import type { Db } from './db';
import type { DatosEvento } from '@/lib/domain/schemas-admin';
import type { Pregunta } from '@/lib/domain/encuesta';
import { HABEAS_PENDIENTE, type EstadoEvento } from '@/lib/domain/constantes';
import { ErrorNegocio } from '@/lib/errores';
import { proximaSesion } from '@/lib/domain/sesion-estado';
import {
  motivoNoActivar,
  pasosFaltantes,
  revisarPreparacion,
  type EntradaPreparacion,
  type ItemPreparacion,
} from '@/lib/domain/preparacion';
import { obtenerConfiguracion } from './configuracion';

export interface MarcaEvento {
  marcaId: string;
  orden: number;
  visible: boolean;
}

export interface VersionHabeas {
  id: string;
  version: number;
  texto: string;
  url_politica: string | null;
  created_at: string;
}

export interface EventoDetalle extends DatosEvento {
  id: string;
  estado: EstadoEvento;
  marcas: { marca_id: string; orden: number; visible: boolean }[];
  preguntas: Pregunta[];
  habeas: VersionHabeas[];
}

export interface EventoResumen {
  id: string;
  nombre: string;
  cliente: string | null;
  estado: EstadoEvento;
  sesiones: number;
  proxima: Date | null;
  // Pasos obligatorios de la lista de preparación que faltan.
  faltantes: number;
}

// Lo que necesita la lista de preparación, en una sola consulta con relaciones anidadas.
const SELECT_PREPARACION =
  'cliente, capacitadores, dominio_correo, sesiones(inicio, fin), evento_preguntas(activa), ' +
  'evento_habeas_versiones(texto, version), evento_marcas(visible, marca:marcas(nombre, activa, logo_path))';

interface FilaPreparacion {
  cliente: string | null;
  capacitadores: string | null;
  dominio_correo: string | null;
  sesiones: { inicio: string; fin: string }[];
  evento_preguntas: { activa: boolean }[];
  evento_habeas_versiones: { texto: string; version: number }[];
  evento_marcas: { visible: boolean; marca: { nombre: string; activa: boolean; logo_path: string | null } | null }[];
}

function aEntradaPreparacion(f: FilaPreparacion): EntradaPreparacion {
  const vigente = [...f.evento_habeas_versiones].sort((a, b) => b.version - a.version)[0];
  return {
    textoHabeas: vigente?.texto ?? HABEAS_PENDIENTE,
    marcasVisibles: f.evento_marcas
      .filter((m) => m.visible && m.marca?.activa)
      .map((m) => ({ nombre: m.marca!.nombre, tieneLogo: !!m.marca!.logo_path })),
    sesiones: f.sesiones.length,
    preguntasActivas: f.evento_preguntas.filter((p) => p.activa).length,
    cliente: f.cliente,
    capacitadores: f.capacitadores,
    dominioCorreo: f.dominio_correo,
  };
}

export async function obtenerPreparacion(db: Db, eventoId: string): Promise<ItemPreparacion[]> {
  const { data, error } = await db.from('eventos').select(SELECT_PREPARACION).eq('id', eventoId).single();
  if (error) throw error;
  return revisarPreparacion(aEntradaPreparacion(data as unknown as FilaPreparacion));
}

export async function listarEventos(db: Db): Promise<EventoResumen[]> {
  const { data, error } = await db
    .from('eventos')
    .select(`id, nombre, estado, ${SELECT_PREPARACION}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const ahora = new Date();
  type Fila = FilaPreparacion & Pick<EventoResumen, 'id' | 'nombre' | 'estado'>;
  return (data as unknown as Fila[]).map((e) => {
    const sesiones = e.sesiones.map((s) => ({ inicio: new Date(s.inicio), fin: new Date(s.fin) }));
    return {
      id: e.id,
      nombre: e.nombre,
      cliente: e.cliente,
      estado: e.estado,
      sesiones: sesiones.length,
      proxima: proximaSesion(sesiones, ahora)?.inicio ?? null,
      faltantes: pasosFaltantes(revisarPreparacion(aEntradaPreparacion(e))),
    };
  });
}

export async function obtenerEvento(db: Db, id: string): Promise<EventoDetalle | null> {
  const { data: ev, error } = await db
    .from('eventos')
    .select('id, nombre, cliente, capacitadores, dominio_correo, color_primario, estado')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!ev) return null;
  const [m, p, h] = await Promise.all([
    db.from('evento_marcas').select('marca_id, orden, visible').eq('evento_id', id).order('orden'),
    db.from('evento_preguntas').select('clave, tipo, texto, orden, activa').eq('evento_id', id).order('orden'),
    db
      .from('evento_habeas_versiones')
      .select('id, version, texto, url_politica, created_at')
      .eq('evento_id', id)
      .order('version', { ascending: false }),
  ]);
  if (m.error) throw m.error;
  if (p.error) throw p.error;
  if (h.error) throw h.error;
  return {
    ...(ev as Omit<EventoDetalle, 'marcas' | 'preguntas' | 'habeas'>),
    marcas: m.data,
    preguntas: p.data as Pregunta[],
    habeas: h.data as VersionHabeas[],
  };
}

async function insertarHabeas(db: Db, eventoId: string, version: number, texto: string, url: string | null) {
  const { error } = await db
    .from('evento_habeas_versiones')
    .insert({ evento_id: eventoId, version, texto, url_politica: url });
  if (error) throw error;
}

export async function crearEvento(db: Db, datos: DatosEvento): Promise<string> {
  const { data: ev, error } = await db.from('eventos').insert(datos).select('id').single();
  if (error) throw error;
  const { data: plantilla, error: e1 } = await db.from('plantilla_preguntas').select('clave, tipo, texto, orden');
  if (e1) throw e1;
  const { error: e2 } = await db.from('evento_preguntas').insert(plantilla.map((p) => ({ ...p, evento_id: ev.id })));
  if (e2) throw e2;
  const config = await obtenerConfiguracion(db);
  await insertarHabeas(db, ev.id, 1, config.habeasTexto, config.habeasUrl || null);
  return ev.id;
}

export async function actualizarEvento(db: Db, id: string, datos: DatosEvento): Promise<void> {
  const { error } = await db.from('eventos').update(datos).eq('id', id);
  if (error) throw error;
}

export async function guardarMarcasEvento(db: Db, eventoId: string, items: MarcaEvento[]): Promise<void> {
  const { error } = await db.from('evento_marcas').delete().eq('evento_id', eventoId);
  if (error) throw error;
  if (!items.length) return;
  const { error: e2 } = await db
    .from('evento_marcas')
    .insert(items.map((i) => ({ evento_id: eventoId, marca_id: i.marcaId, orden: i.orden, visible: i.visible })));
  if (e2) throw e2;
}

export async function nuevaVersionHabeas(
  db: Db,
  eventoId: string,
  texto: string,
  urlPolitica: string | null,
): Promise<number> {
  const limpio = texto.trim();
  const { data: actual, error } = await db
    .from('evento_habeas_versiones')
    .select('version, texto, url_politica')
    .eq('evento_id', eventoId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (actual && actual.texto === limpio && (actual.url_politica ?? null) === urlPolitica) return actual.version;
  const version = (actual?.version ?? 0) + 1;
  await insertarHabeas(db, eventoId, version, limpio, urlPolitica);
  return version;
}

export async function guardarPreguntas(
  db: Db,
  eventoId: string,
  items: { clave: string; texto: string; activa: boolean }[],
): Promise<void> {
  if (items.some((i) => i.activa && i.texto.trim().length < 3)) {
    throw new ErrorNegocio('Cada pregunta activa necesita un texto');
  }
  for (const i of items) {
    const { error } = await db
      .from('evento_preguntas')
      .update({ texto: i.texto.trim(), activa: i.activa })
      .eq('evento_id', eventoId)
      .eq('clave', i.clave);
    if (error) throw error;
  }
}

export async function cambiarEstadoEvento(db: Db, eventoId: string, estado: EstadoEvento): Promise<void> {
  if (estado === 'activo') {
    const motivo = motivoNoActivar(await obtenerPreparacion(db, eventoId));
    if (motivo) throw new ErrorNegocio(motivo);
  }
  const { error } = await db.from('eventos').update({ estado }).eq('id', eventoId);
  if (error) throw error;
}

export async function duplicarEvento(db: Db, eventoId: string): Promise<string> {
  const ev = await obtenerEvento(db, eventoId);
  if (!ev) throw new ErrorNegocio('El evento no existe');
  const { data: nuevo, error } = await db
    .from('eventos')
    .insert({
      nombre: `${ev.nombre} (copia)`,
      cliente: ev.cliente,
      capacitadores: ev.capacitadores,
      dominio_correo: ev.dominio_correo,
      color_primario: ev.color_primario,
    })
    .select('id')
    .single();
  if (error) throw error;
  const { error: e1 } = await db.from('evento_preguntas').insert(
    ev.preguntas.map((p) => ({
      evento_id: nuevo.id,
      clave: p.clave,
      tipo: p.tipo,
      texto: p.texto,
      orden: p.orden,
      activa: p.activa,
    })),
  );
  if (e1) throw e1;
  await guardarMarcasEvento(
    db,
    nuevo.id,
    ev.marcas.map((m) => ({ marcaId: m.marca_id, orden: m.orden, visible: m.visible })),
  );
  const vigente = ev.habeas[0];
  await insertarHabeas(db, nuevo.id, 1, vigente.texto, vigente.url_politica);
  return nuevo.id;
}
