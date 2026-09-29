import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerEvento } from '@/lib/repo/eventos';
import { listarSesiones } from '@/lib/repo/sesiones';
import { ETIQUETA_ESTADO_SESION } from '@/lib/domain/constantes';
import { formatearFechaHora } from '@/lib/domain/fechas';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { CampoAdmin } from '@/components/admin/CampoAdmin';
import { EncabezadoEvento } from '@/components/admin/EncabezadoEvento';
import { claseBoton, claseInput, claseTarjeta } from '@/components/admin/estilos';
import {
  abrirSesionAccion,
  automaticoSesionAccion,
  cerrarSesionAccion,
  crearSesionesAccion,
  regenerarTokensAccion,
} from './actions';

export default async function PaginaSesiones({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requerirAdmin();
  const evento = await obtenerEvento(db, id);
  if (!evento) notFound();
  const sesiones = await listarSesiones(db, id);

  return (
    <div className="space-y-6">
      <EncabezadoEvento evento={evento} actual="sesiones" />
      {evento.estado !== 'activo' && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          El evento no está activo: los QR mostrarán “Enlace no válido” hasta que lo active.
        </p>
      )}

      <section className={claseTarjeta}>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Sesiones</h2>
        {sesiones.length === 0 ? (
          <p className="text-slate-600">Aún no hay sesiones.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-3">Nº</th>
                  <th className="pr-3">Fecha</th>
                  <th className="pr-3">Título</th>
                  <th className="pr-3">Estado</th>
                  <th className="pr-3">Entradas</th>
                  <th className="pr-3">Salidas</th>
                  <th className="pr-3">Sin entrada</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sesiones.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-3 font-semibold">{s.numero}</td>
                    <td className="py-2 pr-3">{formatearFechaHora(s.inicio)}</td>
                    <td className="py-2 pr-3">{s.titulo ?? '—'}</td>
                    <td className="py-2 pr-3">
                      {ETIQUETA_ESTADO_SESION[s.estado]}
                      {s.modo_apertura === 'manual' ? ' (manual)' : ''}
                    </td>
                    <td className="py-2 pr-3">{s.conteo.entradas}</td>
                    <td className="py-2 pr-3">{s.conteo.salidas}</td>
                    <td className="py-2 pr-3">{s.conteo.sinEntrada}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <FormularioAccion
                          accion={abrirSesionAccion.bind(null, id, s.id)}
                          textoBoton="Abrir"
                          variante="secundario"
                          className=""
                        />
                        <FormularioAccion
                          accion={cerrarSesionAccion.bind(null, id, s.id)}
                          textoBoton="Cerrar"
                          variante="secundario"
                          className=""
                        />
                        {s.modo_apertura === 'manual' && (
                          <FormularioAccion
                            accion={automaticoSesionAccion.bind(null, id, s.id)}
                            textoBoton="Automático"
                            variante="secundario"
                            className=""
                          />
                        )}
                        <Link href={`/admin/eventos/${id}/sesiones/${s.id}`} className={claseBoton.secundario}>
                          Editar
                        </Link>
                        <FormularioAccion
                          accion={regenerarTokensAccion.bind(null, id, s.id)}
                          textoBoton="Regenerar QR"
                          variante="peligro"
                          confirmar="Los QR ya impresos de esta sesión dejarán de funcionar. ¿Continuar?"
                          className=""
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={claseTarjeta}>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Crear sesiones</h2>
        <p className="mb-3 text-sm text-slate-600">
          Una sesión por línea: número; fecha; hora de inicio; hora de fin; título (opcional); lugar (opcional). Puede
          pegar filas copiadas de Excel. Las horas son de Bogotá.
        </p>
        <FormularioAccion accion={crearSesionesAccion.bind(null, id)} textoBoton="Crear sesiones">
          <CampoAdmin etiqueta="Filas de sesiones">
            <textarea
              name="filas"
              rows={6}
              placeholder={'1; 2026-10-14; 08:00; 12:00; Régimen disciplinario; Auditorio principal\n2; 21/10/2026; 08:00; 12:00'}
              className={`${claseInput} font-mono`}
            />
          </CampoAdmin>
        </FormularioAccion>
      </section>
    </div>
  );
}
