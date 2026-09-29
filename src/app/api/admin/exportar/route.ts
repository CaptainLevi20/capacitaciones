import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerEvento } from '@/lib/repo/eventos';
import { listarSesiones } from '@/lib/repo/sesiones';
import { listarConsolidado } from '@/lib/repo/consolidado';
import { construirLibro } from '@/lib/export/excel';
import { slug } from '@/lib/domain/texto';

export async function GET(req: Request) {
  const { db } = await requerirAdmin();
  const u = new URL(req.url);
  const eventoId = u.searchParams.get('evento');
  const sesionId = u.searchParams.get('sesion');
  if (!eventoId) return new Response('Falta el evento', { status: 400 });
  const evento = await obtenerEvento(db, eventoId);
  if (!evento) return new Response('Evento no encontrado', { status: 404 });
  const todas = await listarSesiones(db, eventoId);
  const sesiones = sesionId ? todas.filter((s) => s.id === sesionId) : todas;
  if (sesionId && !sesiones.length) return new Response('Sesión no encontrada', { status: 404 });
  const filas = await listarConsolidado(db, { eventoId, sesionId });
  const libro = await construirLibro({ eventoNombre: evento.nombre, preguntas: evento.preguntas, sesiones, filas });
  const nombre = `${slug(evento.nombre)}${sesionId ? `-sesion-${sesiones[0].numero}` : ''}.xlsx`;
  return new Response(new Uint8Array(libro), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'no-store',
    },
  });
}
