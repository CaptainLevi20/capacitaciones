import type { CSSProperties, ReactNode } from 'react';
import type { SesionPublica } from '@/lib/repo/publico';
import { colorTextoSobre } from '@/lib/domain/color';
import { formatearFechaHora } from '@/lib/domain/fechas';
import { EncabezadoMarcas } from './EncabezadoMarcas';

export function etiquetaSesion(sesion: Pick<SesionPublica, 'numero' | 'titulo'>): string {
  return sesion.titulo ? `Sesión ${sesion.numero}: ${sesion.titulo}` : `Sesión ${sesion.numero}`;
}

export function MarcoPublico({
  sesion,
  modo,
  children,
}: {
  sesion: SesionPublica;
  modo: string;
  children: ReactNode;
}) {
  const color = sesion.evento.colorPrimario;
  return (
    <div
      className="min-h-dvh border-t-[6px] border-[var(--color-primario)] pb-10"
      style={{ '--color-primario': color, '--color-sobre-primario': colorTextoSobre(color) } as CSSProperties}
    >
      <main className="mx-auto max-w-xl px-4">
        <header className="pt-7 pb-6 text-center">
          <EncabezadoMarcas marcas={sesion.marcas} />
          <p className="mt-6 inline-block rounded-full bg-[var(--color-primario)]/10 px-3.5 py-1 text-sm font-semibold text-[var(--color-primario)]">
            {modo}
          </p>
          <h1 className="mt-3 font-serif text-[1.625rem] leading-snug font-semibold text-balance text-tinta">
            {sesion.evento.nombre}
          </h1>
          <p className="mt-2 font-medium text-tinta">{etiquetaSesion(sesion)}</p>
          <p className="mt-0.5 text-[0.9375rem] text-apagado">{formatearFechaHora(sesion.inicio)}</p>
          {sesion.lugar && <p className="text-[0.9375rem] text-apagado">{sesion.lugar}</p>}
        </header>
        <div className="rounded-2xl bg-white px-5 py-6 shadow-[0_1px_2px_rgb(26_36_51/0.06),0_8px_24px_-12px_rgb(26_36_51/0.18)] sm:px-7">
          {children}
        </div>
      </main>
    </div>
  );
}
