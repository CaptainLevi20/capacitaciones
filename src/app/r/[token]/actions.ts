'use server';
import { clienteServicio } from '@/lib/supabase/servicio';
import { metaSolicitud } from '@/lib/request-meta';
import { obtenerSesionPorToken } from '@/lib/repo/publico';
import { consumirRateLimit } from '@/lib/repo/rate-limit';
import { registrarEntrada } from '@/lib/repo/registro';
import { entradaSchema, erroresPorCampo } from '@/lib/domain/schemas';
import { MENSAJE_ERROR_SISTEMA, MENSAJE_HABEAS_CAMBIO, type ResultadoEnvio } from '@/lib/envio';

export async function enviarEntrada(token: string, fd: FormData): Promise<ResultadoEnvio> {
  if (fd.get('sitio_web')) return { ok: true, nombres: '', registradoEn: new Date().toISOString() }; // honeypot: se finge éxito
  const db = clienteServicio();
  const res = await obtenerSesionPorToken(db, token, 'entrada');
  if (res.tipo !== 'abierta') {
    return { ok: false, errores: {}, mensaje: 'El registro para esta sesión no está disponible.' };
  }
  const meta = await metaSolicitud();
  if (!(await consumirRateLimit(db, `entrada:${token}:${meta.ip ?? 'sin-ip'}`))) {
    return { ok: false, errores: {}, mensaje: 'Demasiados intentos. Espere unos minutos e intente de nuevo.' };
  }
  if (fd.get('habeas_version_id') !== res.sesion.habeas.id) {
    return { ok: false, errores: {}, mensaje: MENSAJE_HABEAS_CAMBIO };
  }
  const parsed = entradaSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errores: erroresPorCampo(parsed.error) };
  try {
    await registrarEntrada(db, { id: res.sesion.id, habeasId: res.sesion.habeas.id }, parsed.data, meta);
  } catch (e) {
    console.error(e);
    return { ok: false, errores: {}, mensaje: MENSAJE_ERROR_SISTEMA };
  }
  return { ok: true, nombres: parsed.data.nombres, registradoEn: new Date().toISOString() };
}
