import type { MarcaVisible } from '@/lib/repo/publico';

export function EncabezadoMarcas({ marcas }: { marcas: MarcaVisible[] }) {
  if (!marcas.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4" data-testid="encabezado-marcas">
      {marcas.map((m) =>
        m.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={m.nombre} src={m.logoUrl} alt={m.nombre} className="h-12 w-auto max-w-[42%] object-contain" />
        ) : (
          <span key={m.nombre} className="font-serif text-lg font-semibold text-tinta">
            {m.nombre}
          </span>
        ),
      )}
    </div>
  );
}
