import { notFound } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerSesion } from '@/lib/repo/sesiones';
import { obtenerEvento } from '@/lib/repo/eventos';
import { cargarContextoEvento } from '@/lib/repo/publico';
import { formatearFechaHora } from '@/lib/domain/fechas';
import { baseUrl, qrSvg, urlPublica } from '@/lib/qr';
import { EncabezadoMarcas } from '@/components/publico/EncabezadoMarcas';
import { BotonImprimir } from './BotonImprimir';

function BloqueQr({ titulo, ayuda, svg, url }: { titulo: string; ayuda: string; svg: string; url: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-extrabold tracking-wide text-slate-900">{titulo}</p>
      <div className="mx-auto mt-3 w-full max-w-[3in]" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-2 text-base text-slate-800">{ayuda}</p>
      <p className="mt-1 break-all text-xs text-slate-500">{url}</p>
    </div>
  );
}

export default async function HojaImprimible({ params }: { params: Promise<{ sesionId: string }> }) {
  const { sesionId } = await params;
  const { db } = await requerirAdmin();
  const s = await obtenerSesion(db, sesionId);
  if (!s) notFound();
  const [evento, ctx] = await Promise.all([obtenerEvento(db, s.evento_id), cargarContextoEvento(db, s.evento_id)]);
  if (!evento) notFound();
  const base = baseUrl();
  const urlEntrada = urlPublica(base, 'entrada', s.token_entrada);
  const urlSalida = urlPublica(base, 'salida', s.token_salida);
  const [svgEntrada, svgSalida] = await Promise.all([qrSvg(urlEntrada), qrSvg(urlSalida)]);

  return (
    <main className="mx-auto max-w-[8.5in] bg-white p-8 print:p-0">
      <style>{'@page { size: letter; margin: 1.5cm; }'}</style>
      <div className="mb-6 flex justify-end print:hidden">
        <BotonImprimir />
      </div>
      <EncabezadoMarcas marcas={ctx.marcas} />
      <h1 className="mt-6 text-center text-2xl font-bold text-slate-900">{evento.nombre}</h1>
      <p className="text-center text-lg text-slate-800">
        Sesión {s.numero}
        {s.titulo ? ` · ${s.titulo}` : ''}
      </p>
      <p className="text-center text-slate-600">
        {formatearFechaHora(s.inicio)}
        {s.lugar ? ` · ${s.lugar}` : ''}
      </p>
      <div className="mt-10 grid grid-cols-2 gap-10">
        <BloqueQr titulo="ENTRADA" ayuda="Escanee al llegar" svg={svgEntrada} url={urlEntrada} />
        <BloqueQr titulo="SALIDA" ayuda="Escanee al finalizar para evaluar la sesión" svg={svgSalida} url={urlSalida} />
      </div>
    </main>
  );
}
