import type { CSSProperties, ReactNode } from 'react';
import type { SesionPublica } from '@/lib/repo/publico';
import { formatearFechaHora } from '@/lib/domain/fechas';
import { EncabezadoMarcas } from './EncabezadoMarcas';

export function MarcoPublico({
  sesion,
  subtitulo,
  children,
}: {
  sesion: SesionPublica;
  subtitulo: string;
  children: ReactNode;
}) {
  return (
    <main
      className="mx-auto min-h-dvh max-w-xl bg-white px-4 py-6"
      style={{ '--color-primario': sesion.evento.colorPrimario } as CSSProperties}
    >
      <header className="mb-6 space-y-4 border-b-4 border-[var(--color-primario)] pb-4 text-center">
        <EncabezadoMarcas marcas={sesion.marcas} />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-primario)]">{subtitulo}</p>
          <h1 className="text-xl font-bold text-slate-900">{sesion.evento.nombre}</h1>
          <p className="text-slate-700">
            Sesión {sesion.numero}
            {sesion.titulo ? ` · ${sesion.titulo}` : ''}
          </p>
          <p className="text-sm text-slate-600">
            {formatearFechaHora(sesion.inicio)}
            {sesion.lugar ? ` · ${sesion.lugar}` : ''}
          </p>
        </div>
      </header>
      {children}
    </main>
  );
}
