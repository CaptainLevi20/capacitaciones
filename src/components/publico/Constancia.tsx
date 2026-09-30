import { formatearFecha, formatearHora } from '@/lib/domain/fechas';

// Pantalla final del registro: se diseña para que quien controla la puerta la verifique de un vistazo.
export function Constancia({
  titulo,
  nombre,
  sesion,
  registradoEn,
  nota,
}: {
  titulo: string;
  nombre: string;
  sesion: string;
  registradoEn: string;
  nota: string;
}) {
  return (
    <section role="status" aria-labelledby="titulo-constancia" className="text-center" data-testid="constancia">
      <div className="aparece-sello mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-primario)] text-[var(--color-sobre-primario)] ring-8 ring-[var(--color-primario)]/15">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth={2.6}>
          <path d="M5 12.5l4.2 4.2L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 id="titulo-constancia" className="mt-6 font-serif text-[1.75rem] leading-tight font-semibold text-tinta">
        {titulo}
      </h2>
      {nombre && <p className="mt-2 text-xl font-semibold text-tinta">{nombre}</p>}
      <p className="mt-1 text-apagado">{sesion}</p>

      <div className="relative mt-7 border-t-2 border-dashed border-linea pt-6">
        <span aria-hidden="true" className="absolute -top-3 -left-9 h-6 w-6 rounded-full bg-papel" />
        <span aria-hidden="true" className="absolute -top-3 -right-9 h-6 w-6 rounded-full bg-papel" />
        <p className="text-sm text-apagado">Hora de registro</p>
        <p className="font-serif text-4xl font-semibold text-tinta tabular-nums">{formatearHora(registradoEn)}</p>
        <p className="mt-1 text-sm text-apagado">{formatearFecha(registradoEn)}</p>
        <p className="mx-auto mt-4 max-w-xs text-[0.9375rem] text-apagado">{nota}</p>
      </div>
    </section>
  );
}
