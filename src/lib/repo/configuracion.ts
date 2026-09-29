import type { Db } from './db';

export interface Configuracion {
  habeasTexto: string;
  habeasUrl: string;
}

export async function obtenerConfiguracion(db: Db): Promise<Configuracion> {
  const { data, error } = await db.from('configuracion').select('clave, valor');
  if (error) throw error;
  const valor = (clave: string) => data.find((r) => r.clave === clave)?.valor ?? '';
  return { habeasTexto: valor('habeas_texto_defecto'), habeasUrl: valor('habeas_url_politica') };
}

export async function guardarConfiguracion(db: Db, c: Configuracion): Promise<void> {
  const { error } = await db.from('configuracion').upsert([
    { clave: 'habeas_texto_defecto', valor: c.habeasTexto },
    { clave: 'habeas_url_politica', valor: c.habeasUrl },
  ]);
  if (error) throw error;
}
