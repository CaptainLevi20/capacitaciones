'use server';
import { clienteServicio } from '@/lib/supabase/servicio';
import { metaSolicitud } from '@/lib/request-meta';
import { obtenerSesionPorToken } from '@/lib/repo/publico';
import { consumirRateLimit } from '@/lib/repo/rate-limit';
import { registrarEntrada } from '@/lib/repo/registro';
import { entradaSchema, erroresPorCampo } from '@/lib/domain/schemas';
import type { ResultadoEnvio } from '@/lib/envio';

export async function enviarEntrada(token: string, fd: FormData): Promise<ResultadoEnvio> {
  if (fd.get('sitio_web')) return { ok: true, nombres: '' }; // honeypot: se finge éxito
  const db = clienteServicio();
  const res = await obtenerSesionPorToken(db, token, 'entrada');
  if (res.tipo !== 'abierta') {
    return { ok: false, errores: {}, mensaje: 'El registro para esta sesión no está disponible.' };
  }
  const meta = await metaSolicitud();
  if (!(await consumirRateLimit(db, `entrada:${token}:${meta.ip ?? 'sin-ip'}`))) {
    return { ok: false, errores: {}, mensaje: 'Demasiados intentos. Espere unos minutos e intente de nuevo.' };
  }
  const parsed = entradaSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errores: erroresPorCampo(parsed.error) };
  await registrarEntrada(db, { id: res.sesion.id, habeasId: res.sesion.habeas.id }, parsed.data, meta);
  return { ok: true, nombres: parsed.data.nombres };
}
