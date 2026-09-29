import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { mensajeDeError } from './errores';
import type { ResultadoAccion } from './envio';

export async function ejecutar(fn: () => Promise<string | void>): Promise<ResultadoAccion> {
  try {
    const mensaje = await fn();
    return { ok: true, mensaje: mensaje || 'Cambios guardados' };
  } catch (e) {
    unstable_rethrow(e); // deja pasar redirect() y notFound()
    return { ok: false, error: mensajeDeError(e) };
  }
}

export function camposTexto(fd: FormData, claves: string[]): Record<string, string> {
  return Object.fromEntries(claves.map((k) => [k, String(fd.get(k) ?? '')]));
}
