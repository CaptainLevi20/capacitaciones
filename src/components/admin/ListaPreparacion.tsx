import Link from 'next/link';
import type { ClavePreparacion, ItemPreparacion } from '@/lib/domain/preparacion';

const ESTADO = {
  listo: { simbolo: '✓', clase: 'bg-exito text-white', texto: 'Listo' },
  falta: { simbolo: '✕', clase: 'bg-peligro text-white', texto: 'Falta' },
  aviso: { simbolo: '!', clase: 'bg-aviso-suave text-aviso ring-1 ring-aviso/40', texto: 'Revisar' },
} as const;

function destino(clave: ClavePreparacion, eventoId: string): { href: string; texto: string } {
  switch (clave) {
    case 'habeas':
      return { href: '#autorizacion', texto: 'Ir a la autorización' };
    case 'cobranding':
      return { href: '#cobranding', texto: 'Ir al co-branding' };
    case 'sesiones':
      return { href: `/admin/eventos/${eventoId}/sesiones`, texto: 'Ir a sesiones' };
    case 'encuesta':
      return { href: '#encuesta', texto: 'Ir a la encuesta' };
    case 'datos':
      return { href: '#datos-generales', texto: 'Ir a datos generales' };
  }
}

export function ListaPreparacion({ items, eventoId }: { items: ItemPreparacion[]; eventoId: string }) {
  const listos = items.filter((i) => i.estado === 'listo').length;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl font-semibold text-tinta">Preparación del evento</h2>
        <p className="text-sm text-apagado tabular-nums">
          {listos} de {items.length} listos
        </p>
      </div>
      <ul className="mt-3 divide-y divide-linea border-y border-linea" data-testid="lista-preparacion">
        {items.map((i) => {
          const e = ESTADO[i.estado];
          const ir = destino(i.clave, eventoId);
          return (
            <li key={i.clave} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${e.clase}`}
              >
                {e.simbolo}
              </span>
              <span className="w-48 font-medium text-tinta">
                <span className="sr-only">{e.texto}: </span>
                {i.titulo}
                {!i.obligatorio && <span className="font-normal text-apagado"> (recomendado)</span>}
              </span>
              <span className={`min-w-0 flex-1 ${i.estado === 'falta' ? 'text-peligro' : 'text-apagado'}`}>
                {i.detalle}
              </span>
              {i.estado !== 'listo' &&
                (ir.href.startsWith('#') ? (
                  <a href={ir.href} className="font-medium text-tinta underline underline-offset-2">
                    {ir.texto}
                  </a>
                ) : (
                  <Link href={ir.href} className="font-medium text-tinta underline underline-offset-2">
                    {ir.texto}
                  </Link>
                ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
