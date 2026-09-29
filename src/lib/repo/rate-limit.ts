import type { Db } from './db';
import { RATE_LIMIT } from '@/lib/domain/constantes';

export async function consumirRateLimit(db: Db, clave: string): Promise<boolean> {
  const { data, error } = await db.rpc('consumir_rate_limit', {
    p_clave: clave,
    p_max: RATE_LIMIT.max,
    p_ventana_segundos: RATE_LIMIT.ventanaSegundos,
  });
  if (error) throw error;
  return data === true;
}
