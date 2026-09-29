import Link from 'next/link';
import { requerirAdmin } from '@/lib/auth/admin';
import { listarEventos } from '@/lib/repo/eventos';
import { ETIQUETA_EVENTO } from '@/lib/domain/constantes';
import { claseBoton, claseTarjeta } from '@/components/admin/estilos';

export default async function PaginaEventos() {
  const { db } = await requerirAdmin();
  const eventos = await listarEventos(db);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Eventos</h1>
        <Link href="/admin/eventos/nuevo" className={claseBoton.primario}>
          Nuevo evento
        </Link>
      </div>
      <section className={claseTarjeta}>
        {eventos.length === 0 ? (
          <p className="text-slate-600">Aún no hay eventos.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 pr-3">Nombre</th>
                <th className="pr-3">Cliente</th>
                <th className="pr-3">Sesiones</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3">
                    <Link href={`/admin/eventos/${e.id}`} className="font-medium text-slate-900 underline">
                      {e.nombre}
                    </Link>
                  </td>
                  <td className="pr-3">{e.cliente ?? '—'}</td>
                  <td className="pr-3">{e.sesiones}</td>
                  <td>{ETIQUETA_EVENTO[e.estado]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
