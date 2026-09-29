import type { Db } from './db';
import { RATE_LIMIT } from '@/lib/domain/constantes';

// RATE_LIMIT_MAX solo se usa en pruebas E2E para ejercitar el límite con pocos envíos.
const maximo = () => Number(process.env.RATE_LIMIT_MAX) || RATE_LIMIT.max;

export async function consumirRateLimit(db: Db, clave: string): Promise<boolean> {
  const { data, error } = await db.rpc('consumir_rate_limit', {
    p_clave: clave,
    p_max: maximo(),
    p_ventana_segundos: RATE_LIMIT.ventanaSegundos,
  });
  if (error) throw error;
  return data === true;
}
