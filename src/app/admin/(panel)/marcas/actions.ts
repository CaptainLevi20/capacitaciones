'use server';
import { revalidatePath } from 'next/cache';
import { requerirAdmin } from '@/lib/auth/admin';
import { ejecutar } from '@/lib/acciones';
import { guardarMarca, subirLogo } from '@/lib/repo/marcas';
import { marcaSchema, validar } from '@/lib/domain/schemas-admin';
import { validarLogo } from '@/lib/domain/logo';
import { ErrorNegocio } from '@/lib/errores';

export async function guardarMarcaAccion(id: string | null, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    const datos = validar(marcaSchema, {
      nombre: fd.get('nombre') ?? '',
      color_primario: fd.get('color_primario') ?? '',
      activa: fd.get('activa'),
    });
    const logo = fd.get('logo');
    const hayLogo = logo instanceof File && logo.size > 0;
    if (hayLogo) {
      const problema = validarLogo(logo);
      if (problema) throw new ErrorNegocio(problema);
    }
    const marcaId = await guardarMarca(db, id, datos);
    if (hayLogo) await subirLogo(db, marcaId, logo);
    revalidatePath('/admin/marcas');
    return id ? 'Marca actualizada' : 'Marca creada';
  });
}
