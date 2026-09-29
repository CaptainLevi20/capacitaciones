import type { Db } from './db';
import type { EstadoAsistencia } from '@/lib/domain/resumen';

export interface FilaConsolidada {
  evento_id: string;
  evento_nombre: string;
  sesion_id: string;
  sesion_numero: number;
  sesion_inicio: string;
  asistente_id: string;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  dependencia: string;
  cargo: string;
  entrada_at: string | null;
  salida_at: string | null;
  estado_asistencia: EstadoAsistencia;
  respuestas: Record<string, number> | null;
  comentario: string | null;
  promedio_escala: number | null;
  nps: number | null;
}

export interface FiltroConsolidado {
  eventoId: string;
  sesionId?: string | null;
  estado?: EstadoAsistencia | null;
  busqueda?: string | null;
}

export function sanitizarBusqueda(q: string): string {
  return q
    .replace(/[%,()*\\:."']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

const PAGINA = 1000; // máximo de filas por respuesta de PostgREST en Supabase

export async function listarConsolidado(db: Db, f: FiltroConsolidado): Promise<FilaConsolidada[]> {
  const busqueda = f.busqueda ? sanitizarBusqueda(f.busqueda) : '';
  const construir = () => {
    let q = db.from('asistencia_consolidada').select('*').eq('evento_id', f.eventoId);
    if (f.sesionId) q = q.eq('sesion_id', f.sesionId);
    if (f.estado) q = q.eq('estado_asistencia', f.estado);
    if (busqueda) {
      q = q.or(`nombres.ilike.*${busqueda}*,apellidos.ilike.*${busqueda}*,numero_documento.ilike.*${busqueda}*`);
    }
    return q.order('sesion_numero').order('apellidos').order('asistente_id');
  };
  const filas: FilaConsolidada[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await construir().range(desde, desde + PAGINA - 1);
    if (error) throw error;
    filas.push(
      ...(data as FilaConsolidada[]).map((r) => ({
        ...r,
        promedio_escala: r.promedio_escala === null ? null : Number(r.promedio_escala),
      })),
    );
    if (data.length < PAGINA) break;
  }
  return filas;
}
