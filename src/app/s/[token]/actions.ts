'use server';
import { clienteServicio } from '@/lib/supabase/servicio';
import { metaSolicitud } from '@/lib/request-meta';
import { obtenerSesionPorToken } from '@/lib/repo/publico';
import { consumirRateLimit } from '@/lib/repo/rate-limit';
import { buscarEntrada, registrarSalida } from '@/lib/repo/registro';
import {
  documentoSchema,
  encuestaSchema,
  entradaSchema,
  erroresPorCampo,
  type DatosPersonales,
} from '@/lib/domain/schemas';
import { separarRespuestas } from '@/lib/domain/encuesta';
import { MENSAJE_HABEAS_CAMBIO, type ResultadoEnvio } from '@/lib/envio';

export type ResultadoConsulta =
  | {
      ok: true;
      encontrado: boolean;
      nombres: string | null;
      documento: { tipo_documento: string; numero_documento: string };
    }
  | { ok: false; errores: Record<string, string>; mensaje?: string };

const NO_DISPONIBLE = 'El registro de salida para esta sesión no está disponible.';
const DEMASIADOS = 'Demasiados intentos. Espere unos minutos e intente de nuevo.';

// Cada paso tiene su propia clave: una persona consume a lo sumo un envío por paso.
async function prepararSolicitud(token: string, paso: 'consulta' | 'envio') {
  const db = clienteServicio();
  const res = await obtenerSesionPorToken(db, token, 'salida');
  if (res.tipo !== 'abierta') return { error: NO_DISPONIBLE } as const;
  const meta = await metaSolicitud();
  if (!(await consumirRateLimit(db, `salida-${paso}:${token}:${meta.ip ?? 'sin-ip'}`))) return { error: DEMASIADOS } as const;
  return { db, sesion: res.sesion, meta } as const;
}

export async function consultarDocumento(token: string, fd: FormData): Promise<ResultadoConsulta> {
  const s = await prepararSolicitud(token, 'consulta');
  if ('error' in s) return { ok: false, errores: {}, mensaje: s.error };
  const p = documentoSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, errores: erroresPorCampo(p.error) };
  const entrada = await buscarEntrada(s.db, s.sesion.id, p.data);
  return { ok: true, encontrado: !!entrada, nombres: entrada?.nombres ?? null, documento: p.data };
}

export async function enviarSalida(token: string, fd: FormData): Promise<ResultadoEnvio> {
  if (fd.get('sitio_web')) return { ok: true, nombres: '' };
  const s = await prepararSolicitud(token, 'envio');
  if ('error' in s) return { ok: false, errores: {}, mensaje: s.error };
  const valores = Object.fromEntries(fd);
  const doc = documentoSchema.safeParse(valores);
  if (!doc.success) return { ok: false, errores: erroresPorCampo(doc.error) };

  const entrada = await buscarEntrada(s.db, s.sesion.id, doc.data);
  const errores: Record<string, string> = {};
  let personales: DatosPersonales | null = null;
  if (!entrada) {
    if (valores.habeas_version_id !== s.sesion.habeas.id) {
      return { ok: false, errores: {}, mensaje: MENSAJE_HABEAS_CAMBIO };
    }
    const p = entradaSchema.safeParse(valores);
    if (p.success) personales = p.data;
    else Object.assign(errores, erroresPorCampo(p.error));
  }
  const encuesta = encuestaSchema(s.sesion.preguntas).safeParse(valores);
  if (!encuesta.success) Object.assign(errores, erroresPorCampo(encuesta.error));
  if (!encuesta.success || Object.keys(errores).length) return { ok: false, errores };

  const { respuestas, comentario } = separarRespuestas(s.sesion.preguntas, encuesta.data);
  await registrarSalida(
    s.db,
    { id: s.sesion.id, habeasId: s.sesion.habeas.id },
    { documento: doc.data, personales, respuestas, comentario },
    s.meta,
  );
  return { ok: true, nombres: entrada?.nombres ?? personales?.nombres ?? '' };
}
