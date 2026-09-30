'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requerirAdmin } from '@/lib/auth/admin';
import { camposTexto, ejecutar } from '@/lib/acciones';
import { guardarConfiguracion } from '@/lib/repo/configuracion';
import { validar } from '@/lib/domain/schemas-admin';

const configuracionSchema = z.object({
  habeas_texto: z.string().trim().min(20, 'El texto de autorización es demasiado corto').max(300, 'El texto de la casilla debe ser breve (máximo 300 caracteres)'),
  habeas_url: z.string().trim().url('Enlace no válido').or(z.literal('')),
});

export async function guardarConfiguracionAccion(fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    const d = validar(configuracionSchema, camposTexto(fd, ['habeas_texto', 'habeas_url']));
    await guardarConfiguracion(db, { habeasTexto: d.habeas_texto, habeasUrl: d.habeas_url });
    revalidatePath('/admin/configuracion');
    return 'Configuración guardada';
  });
}
