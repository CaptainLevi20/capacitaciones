import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerSesion } from '@/lib/repo/sesiones';
import { baseUrl, qrPng, urlPublica } from '@/lib/qr';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; tipo: string }> }) {
  const { id, tipo } = await params;
  if (tipo !== 'entrada' && tipo !== 'salida') return new Response('Tipo no válido', { status: 400 });
  const { db } = await requerirAdmin();
  const s = await obtenerSesion(db, id);
  if (!s) return new Response('Sesión no encontrada', { status: 404 });
  const png = await qrPng(urlPublica(baseUrl(), tipo, tipo === 'entrada' ? s.token_entrada : s.token_salida));
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="sesion-${s.numero}-${tipo}.png"`,
      'Cache-Control': 'no-store',
    },
  });
}
