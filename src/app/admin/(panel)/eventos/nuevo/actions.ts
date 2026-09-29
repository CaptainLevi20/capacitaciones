'use server';
import { redirect } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { camposTexto, ejecutar } from '@/lib/acciones';
import { crearEvento } from '@/lib/repo/eventos';
import { CAMPOS_EVENTO, eventoSchema, validar } from '@/lib/domain/schemas-admin';

export async function crearEventoAccion(fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    const id = await crearEvento(db, validar(eventoSchema, camposTexto(fd, CAMPOS_EVENTO)));
    redirect(`/admin/eventos/${id}`);
  });
}
