import Link from 'next/link';
import type { EstadoEvento } from '@/lib/domain/constantes';
import { InsigniaEvento } from './Insignia';

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
      <Link href="/admin" className="text-sm text-apagado hover:text-tinta hover:underline">
        ← Eventos
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="font-serif text-[1.75rem] leading-tight font-semibold text-tinta">{evento.nombre}</h1>
        <InsigniaEvento estado={evento.estado} />
      </div>
      <nav className="mt-5 flex gap-6 border-b border-linea text-sm">
        {pestanas.map(([clave, texto, href]) => (
          <Link
            key={clave}
            href={href}
            aria-current={clave === actual ? 'page' : undefined}
            className={
              clave === actual
                ? '-mb-px border-b-2 border-tinta pb-2.5 font-semibold text-tinta'
                : '-mb-px border-b-2 border-transparent pb-2.5 text-apagado hover:text-tinta'
            }
          >
            {texto}
          </Link>
        ))}
      </nav>
    </div>
  );
}
