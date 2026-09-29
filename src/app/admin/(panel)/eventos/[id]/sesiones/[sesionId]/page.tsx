import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerEvento } from '@/lib/repo/eventos';
import { obtenerSesion } from '@/lib/repo/sesiones';
import { aInputLocal } from '@/lib/domain/fechas';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { CampoAdmin } from '@/components/admin/CampoAdmin';
import { EncabezadoEvento } from '@/components/admin/EncabezadoEvento';
import { claseInput, claseTarjeta } from '@/components/admin/estilos';
import { actualizarSesionAccion } from '../actions';

export default async function PaginaEditarSesion({
  params,
}: {
  params: Promise<{ id: string; sesionId: string }>;
}) {
  const { id, sesionId } = await params;
  const { db } = await requerirAdmin();
  const [evento, s] = await Promise.all([obtenerEvento(db, id), obtenerSesion(db, sesionId)]);
  if (!evento || !s || s.evento_id !== id) notFound();

  return (
    <div className="space-y-6">
      <EncabezadoEvento evento={evento} actual="sesiones" />
      <section className={claseTarjeta}>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Editar sesión {s.numero}</h2>
        <FormularioAccion accion={actualizarSesionAccion.bind(null, id, sesionId)} textoBoton="Guardar sesión">
          <div className="grid gap-3 sm:grid-cols-2">
            <CampoAdmin etiqueta="Número">
              <input name="numero" type="number" min={1} defaultValue={s.numero} className={claseInput} />
            </CampoAdmin>
            <CampoAdmin etiqueta="Título">
              <input name="titulo" defaultValue={s.titulo ?? ''} className={claseInput} />
            </CampoAdmin>
            <CampoAdmin etiqueta="Lugar">
              <input name="lugar" defaultValue={s.lugar ?? ''} className={claseInput} />
            </CampoAdmin>
            <CampoAdmin etiqueta="Apertura">
              <select name="modo_apertura" defaultValue={s.modo_apertura} className={claseInput}>
                <option value="automatico">Automática por horario</option>
                <option value="manual">Manual</option>
              </select>
            </CampoAdmin>
            <CampoAdmin etiqueta="Inicio (hora de Bogotá)">
              <input name="inicio" type="datetime-local" defaultValue={aInputLocal(s.inicio)} className={claseInput} />
            </CampoAdmin>
            <CampoAdmin etiqueta="Fin (hora de Bogotá)">
              <input name="fin" type="datetime-local" defaultValue={aInputLocal(s.fin)} className={claseInput} />
            </CampoAdmin>
            <CampoAdmin etiqueta="Abrir minutos antes del inicio">
              <input
                name="abre_min_antes"
                type="number"
                min={0}
                defaultValue={s.abre_min_antes}
                className={claseInput}
              />
            </CampoAdmin>
            <CampoAdmin etiqueta="Cerrar minutos después del fin">
              <input
                name="cierra_min_despues"
                type="number"
                min={0}
                defaultValue={s.cierra_min_despues}
                className={claseInput}
              />
            </CampoAdmin>
          </div>
        </FormularioAccion>
        <Link href={`/admin/eventos/${id}/sesiones`} className="mt-4 inline-block text-sm text-slate-600 underline">
          ← Volver a sesiones
        </Link>
      </section>
    </div>
  );
}
