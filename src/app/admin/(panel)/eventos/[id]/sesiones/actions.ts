'use server';
import { revalidatePath } from 'next/cache';
import { requerirAdmin } from '@/lib/auth/admin';
import { camposTexto, ejecutar } from '@/lib/acciones';
import {
  actualizarSesion,
  cambiarEstadoManual,
  crearSesiones,
  regenerarTokens,
  usarModoAutomatico,
} from '@/lib/repo/sesiones';
import { parsearSesionesMasivas, validarFilasSesion } from '@/lib/domain/sesiones-masivas';
import { CAMPOS_SESION, filasSesionSchema, sesionSchema, validar } from '@/lib/domain/schemas-admin';
import { ErrorNegocio } from '@/lib/errores';

const ruta = (eventoId: string) => `/admin/eventos/${eventoId}/sesiones`;

export async function crearSesionesAccion(eventoId: string, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    const { filas, errores } = parsearSesionesMasivas(String(fd.get('filas') ?? ''));
    if (errores.length) throw new ErrorNegocio(errores.join(' · '));
    const n = await crearSesiones(db, eventoId, filas);
    revalidatePath(ruta(eventoId));
    return n === 1 ? '1 sesión creada' : `${n} sesiones creadas`;
  });
}

export async function crearSesionesFormularioAccion(eventoId: string, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    let crudo: unknown;
    try {
      crudo = JSON.parse(String(fd.get('filas_json') ?? '[]'));
    } catch {
      throw new ErrorNegocio('Datos de sesiones no válidos');
    }
    const { filas, errores } = validarFilasSesion(validar(filasSesionSchema, crudo));
    if (errores.length) throw new ErrorNegocio(errores.map((e) => `Fila ${e.indice + 1}: ${e.mensaje}`).join(' · '));
    const n = await crearSesiones(db, eventoId, filas);
    revalidatePath(ruta(eventoId));
    return n === 1 ? '1 sesión creada' : `${n} sesiones creadas`;
  });
}

export async function abrirSesionAccion(eventoId: string, sesionId: string) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    await cambiarEstadoManual(db, sesionId, 'abierta');
    revalidatePath(ruta(eventoId));
    return 'Sesión abierta';
  });
}

export async function cerrarSesionAccion(eventoId: string, sesionId: string) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    await cambiarEstadoManual(db, sesionId, 'cerrada');
    revalidatePath(ruta(eventoId));
    return 'Sesión cerrada';
  });
}

export async function automaticoSesionAccion(eventoId: string, sesionId: string) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    await usarModoAutomatico(db, sesionId);
    revalidatePath(ruta(eventoId));
    return 'Apertura automática';
  });
}

export async function regenerarTokensAccion(eventoId: string, sesionId: string) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    await regenerarTokens(db, sesionId);
    revalidatePath(ruta(eventoId));
    return 'QR regenerados: vuelva a imprimirlos';
  });
}

export async function actualizarSesionAccion(eventoId: string, sesionId: string, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    await actualizarSesion(db, sesionId, validar(sesionSchema, camposTexto(fd, CAMPOS_SESION)));
    revalidatePath(ruta(eventoId));
    revalidatePath(`${ruta(eventoId)}/${sesionId}`);
    return 'Sesión guardada';
  });
}
