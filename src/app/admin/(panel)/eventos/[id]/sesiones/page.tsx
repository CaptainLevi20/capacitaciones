import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerEvento } from '@/lib/repo/eventos';
import { listarSesiones } from '@/lib/repo/sesiones';
import { formatearFechaCorta, formatearHora } from '@/lib/domain/fechas';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { CampoAdmin } from '@/components/admin/CampoAdmin';
import { EncabezadoEvento } from '@/components/admin/EncabezadoEvento';
import { InsigniaSesion } from '@/components/admin/Insignia';
import { Menu, SeparadorMenu } from '@/components/admin/Menu';
import { claseBoton, claseInput, claseTarjeta, claseTituloSeccion } from '@/components/admin/estilos';
import {
  abrirSesionAccion,
  automaticoSesionAccion,
  cerrarSesionAccion,
  crearSesionesAccion,
  crearSesionesFormularioAccion,
  regenerarTokensAccion,
} from './actions';
import { EditorSesiones } from './EditorSesiones';

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
        <p className="rounded-lg border-l-4 border-aviso bg-aviso-suave px-4 py-3 text-sm text-aviso">
          El evento no está activo: los QR mostrarán “Enlace no válido” hasta que lo active.
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-linea bg-white">
        <h2 className={`${claseTituloSeccion} px-6 pt-5 pb-3`}>Sesiones</h2>
        {sesiones.length === 0 ? (
          <p className="px-6 pb-6 text-apagado">Aún no hay sesiones. Créelas en la tabla de abajo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="tabla-sesiones">
              <thead>
                <tr className="border-y border-linea whitespace-nowrap text-apagado">
                  <th className="py-2.5 pr-3 pl-6 font-medium">Nº</th>
                  <th className="px-3 py-2.5 font-medium">Fecha</th>
                  <th className="px-3 py-2.5 font-medium">Sesión</th>
                  <th className="px-3 py-2.5 font-medium">Estado</th>
                  <th className="px-3 py-2.5 text-right font-medium">Entradas</th>
                  <th className="px-3 py-2.5 text-right font-medium">Salidas</th>
                  <th className="px-3 py-2.5 text-right font-medium" title="Personas que registraron salida sin entrada">
                    Sin entrada
                  </th>
                  <th className="py-2.5 pr-6 pl-3 font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sesiones.map((s) => (
                  <tr
                    key={s.id}
                    className={`border-b border-linea last:border-0 ${s.estado === 'abierta' ? 'bg-exito-suave/50' : ''}`}
                  >
                    <td className="py-3 pr-3 pl-6 font-serif text-lg font-semibold tabular-nums">{s.numero}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-tinta">{formatearFechaCorta(s.inicio)}</span>
                      <span className="block text-apagado">
                        {formatearHora(s.inicio)} a {formatearHora(s.fin)}
                      </span>
                    </td>
                    <td className="min-w-44 px-3 py-3">
                      <span className="text-tinta">{s.titulo ?? 'Sin título'}</span>
                      {s.lugar && <span className="block text-apagado">{s.lugar}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <InsigniaSesion estado={s.estado} manual={s.modo_apertura === 'manual'} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{s.conteo.entradas}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{s.conteo.salidas}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{s.conteo.sinEntrada}</td>
                    <td className="py-3 pr-6 pl-3">
                      <div className="flex items-center justify-end gap-2">
                        {s.estado === 'abierta' ? (
                          <FormularioAccion
                            accion={cerrarSesionAccion.bind(null, id, s.id)}
                            textoBoton="Cerrar"
                            variante="secundario"
                            className=""
                          />
                        ) : (
                          <FormularioAccion
                            accion={abrirSesionAccion.bind(null, id, s.id)}
                            textoBoton="Abrir"
                            variante="secundario"
                            className=""
                          />
                        )}
                        <Link href={`/admin/eventos/${id}/sesiones/${s.id}`} className={claseBoton.secundario}>
                          Editar
                        </Link>
                        <Menu etiqueta="QR y más">
                          <a href={`/api/admin/sesiones/${s.id}/qr/entrada`} className={claseBoton.item}>
                            QR entrada
                          </a>
                          <a href={`/api/admin/sesiones/${s.id}/qr/salida`} className={claseBoton.item}>
                            QR salida
                          </a>
                          <Link href={`/admin/imprimir/${s.id}`} className={claseBoton.item}>
                            Hoja imprimible
                          </Link>
                          {s.modo_apertura === 'manual' && (
                            <>
                              <SeparadorMenu />
                              <FormularioAccion
                                accion={automaticoSesionAccion.bind(null, id, s.id)}
                                textoBoton="Volver a apertura automática"
                                variante="item"
                                className=""
                              />
                            </>
                          )}
                          <SeparadorMenu />
                          <FormularioAccion
                            accion={regenerarTokensAccion.bind(null, id, s.id)}
                            textoBoton="Regenerar QR"
                            variante="itemPeligro"
                            confirmar="Los QR ya impresos de esta sesión dejarán de funcionar. ¿Continuar?"
                            className=""
                          />
                        </Menu>
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
        <h2 className={`${claseTituloSeccion} mb-1`}>Crear sesiones</h2>
        <p className="mb-3 text-sm text-apagado">
          Una fila por sesión. Las horas son de Bogotá. “+ Agregar sesión” propone la siguiente una semana después,
          con el mismo horario y lugar.
        </p>
        <EditorSesiones
          accion={crearSesionesFormularioAccion.bind(null, id)}
          siguienteNumero={Math.max(0, ...sesiones.map((s) => s.numero)) + 1}
        />
        <details className="mt-6 border-t border-linea pt-4">
          <summary className="cursor-pointer text-sm font-medium text-tinta">Pegar desde Excel</summary>
          <p className="my-3 text-sm text-apagado">
            Una sesión por línea: número; fecha; hora de inicio; hora de fin; título (opcional); lugar (opcional).
            Puede pegar filas copiadas de Excel.
          </p>
          <FormularioAccion accion={crearSesionesAccion.bind(null, id)} textoBoton="Crear desde texto">
            <CampoAdmin etiqueta="Filas de sesiones">
              <textarea
                name="filas"
                rows={6}
                placeholder={'1; 2026-10-14; 08:00; 12:00; Régimen disciplinario; Auditorio principal\n2; 21/10/2026; 08:00; 12:00'}
                className={`${claseInput} font-mono`}
              />
            </CampoAdmin>
          </FormularioAccion>
        </details>
      </section>
    </div>
  );
}
