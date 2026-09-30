import Link from 'next/link';
import { requerirAdmin } from '@/lib/auth/admin';
import { listarEventos } from '@/lib/repo/eventos';
import { formatearFechaCorta, formatearHora } from '@/lib/domain/fechas';
import { InsigniaEvento } from '@/components/admin/Insignia';
import { claseBoton, claseTarjeta } from '@/components/admin/estilos';

export default async function PaginaEventos() {
  const { db } = await requerirAdmin();
  const eventos = await listarEventos(db);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-[1.75rem] font-semibold text-tinta">Eventos</h1>
        <Link href="/admin/eventos/nuevo" className={claseBoton.primario}>
          Nuevo evento
        </Link>
      </div>
      {eventos.length === 0 ? (
        <section className={`${claseTarjeta} py-12 text-center`}>
          <p className="font-serif text-xl font-semibold text-tinta">Aún no hay eventos</p>
          <p className="mx-auto mt-2 max-w-md text-apagado">
            Cree el primero para configurar sus sesiones, el co-branding y los códigos QR de entrada y salida.
          </p>
        </section>
      ) : (
        <section className="overflow-x-auto rounded-xl border border-linea bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-linea text-apagado">
                <th className="px-5 py-3 font-medium">Evento</th>
                <th className="px-3 py-3 font-medium">Próxima sesión</th>
                <th className="px-3 py-3 text-right font-medium">Sesiones</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id} className="border-b border-linea last:border-0 hover:bg-papel/50">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/eventos/${e.id}`} className="font-semibold text-tinta hover:underline">
                      {e.nombre}
                    </Link>
                    {e.cliente && <p className="text-apagado">{e.cliente}</p>}
                  </td>
                  <td className="px-3 py-3.5 whitespace-nowrap">
                    {e.proxima ? (
                      <>
                        <span className="text-tinta">{formatearFechaCorta(e.proxima)}</span>{' '}
                        <span className="text-apagado">{formatearHora(e.proxima)}</span>
                      </>
                    ) : (
                      <span className="text-apagado">Sin sesiones pendientes</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums">{e.sesiones}</td>
                  <td className="px-5 py-3.5">
                    <InsigniaEvento estado={e.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
