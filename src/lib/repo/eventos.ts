import type { Db } from './db';
import type { DatosEvento } from '@/lib/domain/schemas-admin';
import type { Pregunta } from '@/lib/domain/encuesta';
import { HABEAS_PENDIENTE, type EstadoEvento } from '@/lib/domain/constantes';
import { ErrorNegocio } from '@/lib/errores';
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
}

export function puedeActivarse(textoHabeas: string): string | null {
  return textoHabeas.includes(HABEAS_PENDIENTE)
    ? 'No se puede activar: el texto de Habeas Data sigue siendo el provisional. Reemplácelo por la cláusula oficial.'
    : null;
}

export async function listarEventos(db: Db): Promise<EventoResumen[]> {
  const { data, error } = await db
    .from('eventos')
    .select('id, nombre, cliente, estado, sesiones(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as (Omit<EventoResumen, 'sesiones'> & { sesiones: { count: number }[] })[]).map((e) => ({
    id: e.id,
    nombre: e.nombre,
    cliente: e.cliente,
    estado: e.estado,
    sesiones: e.sesiones[0]?.count ?? 0,
  }));
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
    const { data, error } = await db
      .from('evento_habeas_versiones')
      .select('texto')
      .eq('evento_id', eventoId)
      .order('version', { ascending: false })
      .limit(1)
      .single();
    if (error) throw error;
    const motivo = puedeActivarse(data.texto);
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
