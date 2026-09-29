import type { MarcaVisible } from '@/lib/repo/publico';

export function EncabezadoMarcas({ marcas }: { marcas: MarcaVisible[] }) {
  if (!marcas.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-6" data-testid="encabezado-marcas">
      {marcas.map((m) =>
        m.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={m.nombre} src={m.logoUrl} alt={m.nombre} className="h-14 w-auto max-w-[45%] object-contain" />
        ) : (
          <span key={m.nombre} className="text-lg font-semibold text-slate-800">
            {m.nombre}
          </span>
        ),
      )}
    </div>
  );
}
