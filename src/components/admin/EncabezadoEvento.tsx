import Link from 'next/link';
import { ETIQUETA_EVENTO, type EstadoEvento } from '@/lib/domain/constantes';

type Pestana = 'configuracion' | 'sesiones' | 'datos';

export function EncabezadoEvento({
  evento,
  actual,
}: {
  evento: { id: string; nombre: string; estado: EstadoEvento };
  actual: Pestana;
}) {
  const pestanas: [Pestana, string, string][] = [
    ['configuracion', 'Configuración', `/admin/eventos/${evento.id}`],
    ['sesiones', 'Sesiones', `/admin/eventos/${evento.id}/sesiones`],
    ['datos', 'Datos', `/admin/eventos/${evento.id}/datos`],
  ];
  return (
    <div>
      <Link href="/admin" className="text-sm text-slate-500 hover:underline">
        ← Eventos
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">{evento.nombre}</h1>
      <p className="text-sm text-slate-600">{ETIQUETA_EVENTO[evento.estado]}</p>
      <nav className="mt-4 flex gap-5 border-b border-slate-200 text-sm">
        {pestanas.map(([clave, texto, href]) => (
          <Link
            key={clave}
            href={href}
            aria-current={clave === actual ? 'page' : undefined}
            className={
              clave === actual ? 'border-b-2 border-slate-900 pb-2 font-semibold text-slate-900' : 'pb-2 text-slate-600'
            }
          >
            {texto}
          </Link>
        ))}
      </nav>
    </div>
  );
}
