import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerSesion } from '@/lib/repo/sesiones';
import { obtenerEvento } from '@/lib/repo/eventos';
import { cargarContextoEvento } from '@/lib/repo/publico';
import { formatearFechaHora } from '@/lib/domain/fechas';
import { baseUrl, qrSvg, urlPublica } from '@/lib/qr';
import { EncabezadoMarcas } from '@/components/publico/EncabezadoMarcas';
import { BotonImprimir } from './BotonImprimir';

type Tipo = 'entrada' | 'salida';

const TEXTOS: Record<Tipo, { titulo: string; ayuda: string }> = {
  entrada: { titulo: 'ENTRADA', ayuda: 'Escanee al llegar' },
  salida: { titulo: 'SALIDA', ayuda: 'Escanee al finalizar para evaluar la sesión' },
};

function BloqueQr({ tipo, svg, url, grande }: { tipo: Tipo; svg: string; url: string; grande: boolean }) {
  return (
    <div className="text-center">
      <p className={`font-extrabold tracking-wide text-tinta ${grande ? 'text-5xl' : 'text-3xl'}`}>{TEXTOS[tipo].titulo}</p>
      <div
        className={`mx-auto mt-3 w-full ${grande ? 'max-w-[4.5in]' : 'max-w-[3in]'}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className={`mt-2 text-tinta ${grande ? 'text-xl' : 'text-base'}`}>{TEXTOS[tipo].ayuda}</p>
      <p className="mt-1 break-all text-xs text-apagado">{url}</p>
    </div>
  );
}

// ?solo=entrada o ?solo=salida imprime una hoja con un único código, más grande.
export default async function HojaImprimible({
  params,
  searchParams,
}: {
  params: Promise<{ sesionId: string }>;
  searchParams: Promise<{ solo?: string }>;
}) {
  const { sesionId } = await params;
  const { solo } = await searchParams;
  const tipos: Tipo[] = solo === 'entrada' || solo === 'salida' ? [solo] : ['entrada', 'salida'];
  const { db } = await requerirAdmin();
  const s = await obtenerSesion(db, sesionId);
  if (!s) notFound();
  const [evento, ctx] = await Promise.all([obtenerEvento(db, s.evento_id), cargarContextoEvento(db, s.evento_id)]);
  if (!evento) notFound();
  const base = baseUrl();
  const codigos = await Promise.all(
    tipos.map(async (tipo) => {
      const url = urlPublica(base, tipo, tipo === 'entrada' ? s.token_entrada : s.token_salida);
      return { tipo, url, svg: await qrSvg(url) };
    }),
  );

  return (
    <main className="mx-auto max-w-[8.5in] bg-white p-8 print:p-0">
      <style>{'@page { size: letter; margin: 1.5cm; }'}</style>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/admin/eventos/${s.evento_id}/sesiones`} className="text-sm text-apagado hover:text-tinta hover:underline">
          ← Volver a sesiones
        </Link>
        <BotonImprimir />
      </div>
      <EncabezadoMarcas marcas={ctx.marcas} />
      <h1 className="mt-6 text-center font-serif text-[1.75rem] font-semibold text-tinta">{evento.nombre}</h1>
      <p className="text-center text-lg text-tinta">
        Sesión {s.numero}
        {s.titulo ? ` · ${s.titulo}` : ''}
      </p>
      <p className="text-center text-apagado">
        {formatearFechaHora(s.inicio)}
        {s.lugar ? ` · ${s.lugar}` : ''}
      </p>
      <div className={`mt-10 grid gap-10 ${codigos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {codigos.map((c) => (
          <BloqueQr key={c.tipo} tipo={c.tipo} svg={c.svg} url={c.url} grande={codigos.length === 1} />
        ))}
      </div>
    </main>
  );
}
