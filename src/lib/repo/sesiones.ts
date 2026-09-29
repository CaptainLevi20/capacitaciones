import type { Db } from './db';
import type { DatosSesion } from '@/lib/domain/schemas-admin';
import type { FilaSesion } from '@/lib/domain/sesiones-masivas';
import { estadoSesion, type EstadoSesion } from '@/lib/domain/sesion-estado';
import { generarToken } from '@/lib/domain/tokens';
import { ErrorNegocio } from '@/lib/errores';

interface FilaSesionDb {
  id: string;
  evento_id: string;
  numero: number;
  titulo: string | null;
  lugar: string | null;
  inicio: string;
  fin: string;
  modo_apertura: 'manual' | 'automatico';
  estado_manual: 'abierta' | 'cerrada' | null;
  abre_min_antes: number;
  cierra_min_despues: number;
  token_entrada: string;
  token_salida: string;
}

export interface SesionDetalle extends Omit<FilaSesionDb, 'inicio' | 'fin'> {
  inicio: Date;
  fin: Date;
  estado: EstadoSesion;
}

export interface SesionConConteo extends SesionDetalle {
  conteo: { entradas: number; salidas: number; sinEntrada: number };
}

const COLUMNAS =
  'id, evento_id, numero, titulo, lugar, inicio, fin, modo_apertura, estado_manual, abre_min_antes, cierra_min_despues, token_entrada, token_salida';

function aSesion(r: FilaSesionDb, ahora: Date): SesionDetalle {
  const inicio = new Date(r.inicio);
  const fin = new Date(r.fin);
  return { ...r, inicio, fin, estado: estadoSesion({ ...r, inicio, fin }, ahora) };
}

function errorNumeroRepetido(error: { code?: string }): void {
  if (error.code === '23505') throw new ErrorNegocio('Ya existe una sesión con ese número en este evento');
}

export async function crearSesiones(db: Db, eventoId: string, filas: FilaSesion[]): Promise<number> {
  if (!filas.length) throw new ErrorNegocio('No hay sesiones para crear');
  const { error } = await db.from('sesiones').insert(
    filas.map((f) => ({
      evento_id: eventoId,
      numero: f.numero,
      titulo: f.titulo,
      lugar: f.lugar,
      inicio: f.inicio.toISOString(),
      fin: f.fin.toISOString(),
      token_entrada: generarToken(),
      token_salida: generarToken(),
    })),
  );
  if (error) {
    errorNumeroRepetido(error);
    throw error;
  }
  return filas.length;
}

export async function actualizarSesion(db: Db, id: string, d: DatosSesion): Promise<void> {
  const { error } = await db
    .from('sesiones')
    .update({
      numero: d.numero,
      titulo: d.titulo,
      lugar: d.lugar,
      inicio: d.inicio.toISOString(),
      fin: d.fin.toISOString(),
      modo_apertura: d.modo_apertura,
      ...(d.modo_apertura === 'automatico' ? { estado_manual: null } : {}),
      abre_min_antes: d.abre_min_antes,
      cierra_min_despues: d.cierra_min_despues,
    })
    .eq('id', id);
  if (error) {
    errorNumeroRepetido(error);
    throw error;
  }
}

export async function cambiarEstadoManual(db: Db, id: string, estado: 'abierta' | 'cerrada'): Promise<void> {
  const { error } = await db.from('sesiones').update({ modo_apertura: 'manual', estado_manual: estado }).eq('id', id);
  if (error) throw error;
}

export async function usarModoAutomatico(db: Db, id: string): Promise<void> {
  const { error } = await db.from('sesiones').update({ modo_apertura: 'automatico', estado_manual: null }).eq('id', id);
  if (error) throw error;
}

export async function regenerarTokens(db: Db, id: string): Promise<void> {
  const { error } = await db
    .from('sesiones')
    .update({ token_entrada: generarToken(), token_salida: generarToken() })
    .eq('id', id);
  if (error) throw error;
}

export async function obtenerSesion(db: Db, id: string, ahora: Date = new Date()): Promise<SesionDetalle | null> {
  const { data, error } = await db.from('sesiones').select(COLUMNAS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? aSesion(data as FilaSesionDb, ahora) : null;
}

type Conteo = { count: number }[];

export async function listarSesiones(db: Db, eventoId: string, ahora: Date = new Date()): Promise<SesionConConteo[]> {
  const { data, error } = await db
    .from('sesiones')
    .select(`${COLUMNAS}, entradas(count), salidas(count), sin:salidas(count)`)
    .eq('evento_id', eventoId)
    .eq('sin.sin_entrada', true)
    .order('numero');
  if (error) throw error;
  return (data as unknown as (FilaSesionDb & { entradas: Conteo; salidas: Conteo; sin: Conteo })[]).map((r) => {
    const { entradas, salidas, sin, ...fila } = r;
    return {
      ...aSesion(fila, ahora),
      conteo: { entradas: entradas[0]?.count ?? 0, salidas: salidas[0]?.count ?? 0, sinEntrada: sin[0]?.count ?? 0 },
    };
  });
}
