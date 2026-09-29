'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { camposTexto, ejecutar } from '@/lib/acciones';
import {
  actualizarEvento,
  cambiarEstadoEvento,
  duplicarEvento,
  guardarMarcasEvento,
  guardarPreguntas,
  nuevaVersionHabeas,
} from '@/lib/repo/eventos';
import {
  CAMPOS_EVENTO,
  eventoSchema,
  habeasSchema,
  marcasEventoSchema,
  validar,
} from '@/lib/domain/schemas-admin';
import type { EstadoEvento } from '@/lib/domain/constantes';
import { ErrorNegocio } from '@/lib/errores';

function refrescar(id: string) {
  revalidatePath(`/admin/eventos/${id}`);
  revalidatePath('/admin');
}

export async function guardarDatosAccion(id: string, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    await actualizarEvento(db, id, validar(eventoSchema, camposTexto(fd, CAMPOS_EVENTO)));
    refrescar(id);
    return 'Datos guardados';
  });
}

export async function guardarCoBrandingAccion(id: string, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    let crudo: unknown;
    try {
      crudo = JSON.parse(String(fd.get('marcas_json') ?? '[]'));
    } catch {
      throw new ErrorNegocio('Datos de co-branding no válidos');
    }
    await guardarMarcasEvento(db, id, validar(marcasEventoSchema, crudo));
    refrescar(id);
    return 'Co-branding guardado';
  });
}

export async function guardarHabeasAccion(id: string, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    const d = validar(habeasSchema, camposTexto(fd, ['texto', 'url_politica']));
    const version = await nuevaVersionHabeas(db, id, d.texto, d.url_politica);
    refrescar(id);
    return `Versión ${version} vigente`;
  });
}

export async function guardarPreguntasAccion(id: string, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    const items = [...fd.keys()]
      .filter((k) => k.startsWith('texto_'))
      .map((k) => {
        const clave = k.slice('texto_'.length);
        return { clave, texto: String(fd.get(k) ?? ''), activa: fd.get(`activa_${clave}`) === 'on' };
      });
    await guardarPreguntas(db, id, items);
    refrescar(id);
    return 'Encuesta guardada';
  });
}

export async function cambiarEstadoAccion(id: string, estado: EstadoEvento) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    await cambiarEstadoEvento(db, id, estado);
    refrescar(id);
    return 'Estado actualizado';
  });
}

export async function duplicarAccion(id: string) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    const nuevo = await duplicarEvento(db, id);
    revalidatePath('/admin');
    redirect(`/admin/eventos/${nuevo}`);
  });
}
