import type { Db } from './db';
import type { DatosMarca } from '@/lib/domain/schemas-admin';
import { LOGO_TIPOS, validarLogo } from '@/lib/domain/logo';
import { ErrorNegocio } from '@/lib/errores';

export interface Marca {
  id: string;
  nombre: string;
  logo_path: string | null;
  color_primario: string | null;
  activa: boolean;
}

export async function listarMarcas(db: Db): Promise<Marca[]> {
  const { data, error } = await db
    .from('marcas')
    .select('id, nombre, logo_path, color_primario, activa')
    .order('nombre');
  if (error) throw error;
  return data as Marca[];
}

export async function guardarMarca(db: Db, id: string | null, d: DatosMarca): Promise<string> {
  if (id) {
    const { error } = await db.from('marcas').update(d).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await db.from('marcas').insert(d).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function subirLogo(db: Db, marcaId: string, archivo: File): Promise<void> {
  const problema = validarLogo(archivo);
  if (problema) throw new ErrorNegocio(problema);
  const extension = LOGO_TIPOS[archivo.type as keyof typeof LOGO_TIPOS];
  const ruta = `${marcaId}/${Date.now()}.${extension}`;
  const { error } = await db.storage
    .from('logos')
    .upload(ruta, archivo, { contentType: archivo.type, upsert: false });
  if (error) throw error;
  const { error: e2 } = await db.from('marcas').update({ logo_path: ruta }).eq('id', marcaId);
  if (e2) throw e2;
}
