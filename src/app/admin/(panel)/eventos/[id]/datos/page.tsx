import { notFound } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerEvento } from '@/lib/repo/eventos';
import { listarSesiones } from '@/lib/repo/sesiones';
import { listarConsolidado } from '@/lib/repo/consolidado';
import { ETIQUETA_ESTADO_ASISTENCIA, resumir, type EstadoAsistencia } from '@/lib/domain/resumen';
import { formatearFechaHora } from '@/lib/domain/fechas';
import { EncabezadoEvento } from '@/components/admin/EncabezadoEvento';
import { CampoAdmin } from '@/components/admin/CampoAdmin';
import { claseBoton, claseInput, claseTarjeta } from '@/components/admin/estilos';

const ESTADOS = Object.keys(ETIQUETA_ESTADO_ASISTENCIA) as EstadoAsistencia[];
const MAX_FILAS_EN_PANTALLA = 500;

export default async function PaginaDatos({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sesion?: string; estado?: string; q?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { db } = await requerirAdmin();
  const evento = await obtenerEvento(db, id);
  if (!evento) notFound();
  const sesiones = await listarSesiones(db, id);
  const sesionId = sesiones.find((s) => s.id === sp.sesion)?.id ?? null;
  const estado = ESTADOS.find((e) => e === sp.estado) ?? null;
  const busqueda = sp.q?.trim() || null;

  const todas = await listarConsolidado(db, { eventoId: id });
  const filas =
    sesionId || estado || busqueda ? await listarConsolidado(db, { eventoId: id, sesionId, estado, busqueda }) : todas;
  const escala = evento.preguntas.filter((p) => p.tipo === 'escala_1_5');
  const exportar = new URLSearchParams({ evento: id, ...(sesionId ? { sesion: sesionId } : {}) });

  return (
    <div className="space-y-6">
      <EncabezadoEvento evento={evento} actual="datos" />

      <section className={claseTarjeta}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-semibold text-tinta">Resumen por sesión</h2>
          <a href={`/api/admin/exportar?${exportar}`} className={claseBoton.primario}>
            Descargar Excel {sesionId ? '(sesión filtrada)' : '(evento completo)'}
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-linea text-apagado">
                <th className="py-2 pr-3">Sesión</th>
                <th className="pr-3">Entradas</th>
                <th className="pr-3">Salidas</th>
                <th className="pr-3">Completas</th>
                <th className="pr-3">Solo entrada</th>
                <th className="pr-3">Sin entrada</th>
                {escala.map((p) => (
                  <th key={p.clave} className="pr-3" title={p.texto}>
                    {p.clave}
                  </th>
                ))}
                <th>NPS</th>
              </tr>
            </thead>
            <tbody>
              {sesiones.map((s) => {
                const r = resumir(evento.preguntas, todas.filter((f) => f.sesion_id === s.id));
                return (
                  <tr
                    key={s.id}
                    className="border-b border-linea align-top"
                    data-testid={`resumen-sesion-${s.numero}`}
                  >
                    <td className="py-2 pr-3">
                      <span className="font-semibold">Sesión {s.numero}</span>
                      <br />
                      <span className="text-xs text-apagado">{formatearFechaHora(s.inicio)}</span>
                      {r.comentarios.length > 0 && (
                        <details className="mt-1 text-xs text-apagado">
                          <summary>{r.comentarios.length} comentarios</summary>
                          <ul className="mt-1 list-inside list-disc">
                            {r.comentarios.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                    <td className="py-2 pr-3">{r.entradas}</td>
                    <td className="py-2 pr-3">{r.salidas}</td>
                    <td className="py-2 pr-3">{r.completas}</td>
                    <td className="py-2 pr-3">{r.soloEntrada}</td>
                    <td className="py-2 pr-3">{r.sinEntrada}</td>
                    {escala.map((p) => (
                      <td key={p.clave} className="py-2 pr-3">
                        {r.promedios[p.clave] ?? '—'}
                      </td>
                    ))}
                    <td className="py-2">{r.nps ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={claseTarjeta}>
        <h2 className="mb-3 font-serif text-xl font-semibold text-tinta">Registros</h2>
        <form className="mb-4 flex flex-wrap items-end gap-3">
          <CampoAdmin etiqueta="Sesión">
            <select name="sesion" defaultValue={sesionId ?? ''} className={claseInput}>
              <option value="">Todas</option>
              {sesiones.map((s) => (
                <option key={s.id} value={s.id}>
                  Sesión {s.numero}
                </option>
              ))}
            </select>
          </CampoAdmin>
          <CampoAdmin etiqueta="Estado">
            <select name="estado" defaultValue={estado ?? ''} className={claseInput}>
              <option value="">Todos</option>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO_ASISTENCIA[e]}
                </option>
              ))}
            </select>
          </CampoAdmin>
          <CampoAdmin etiqueta="Buscar (nombre o documento)">
            <input name="q" defaultValue={busqueda ?? ''} className={claseInput} />
          </CampoAdmin>
          <button type="submit" className={claseBoton.secundario}>
            Filtrar
          </button>
        </form>
        {filas.length === 0 ? (
          <p className="text-apagado">No hay registros con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-linea text-apagado">
                  <th className="py-2 pr-3">Sesión</th>
                  <th className="pr-3">Documento</th>
                  <th className="pr-3">Nombre</th>
                  <th className="pr-3">Dependencia / cargo</th>
                  <th className="pr-3">Entrada</th>
                  <th className="pr-3">Salida</th>
                  <th className="pr-3">Estado</th>
                  <th className="pr-3">Promedio</th>
                  <th>NPS</th>
                </tr>
              </thead>
              <tbody>
                {filas.slice(0, MAX_FILAS_EN_PANTALLA).map((f) => (
                  <tr key={`${f.sesion_id}-${f.asistente_id}`} className="border-b border-linea">
                    <td className="py-2 pr-3">{f.sesion_numero}</td>
                    <td className="pr-3">
                      {f.tipo_documento} {f.numero_documento}
                    </td>
                    <td className="pr-3">
                      {f.nombres} {f.apellidos}
                    </td>
                    <td className="pr-3">
                      {f.dependencia} · {f.cargo}
                    </td>
                    <td className="pr-3">{f.entrada_at ? formatearFechaHora(f.entrada_at) : '—'}</td>
                    <td className="pr-3">{f.salida_at ? formatearFechaHora(f.salida_at) : '—'}</td>
                    <td className="pr-3">{ETIQUETA_ESTADO_ASISTENCIA[f.estado_asistencia]}</td>
                    <td className="pr-3">{f.promedio_escala ?? '—'}</td>
                    <td>{f.nps ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filas.length > MAX_FILAS_EN_PANTALLA && (
              <p className="mt-2 text-sm text-apagado">
                Se muestran {MAX_FILAS_EN_PANTALLA} de {filas.length} registros. Descargue el Excel para verlos todos.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
