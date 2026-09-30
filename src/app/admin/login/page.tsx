import { MensajeEstado } from '@/components/publico/MensajeEstado';
import { FormularioLogin } from './FormularioLogin';

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="grid min-h-dvh md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="flex flex-col justify-between bg-tinta px-8 py-10 text-white md:px-12 md:py-14">
        <p className="font-serif text-xl font-semibold">Avance Jurídico</p>
        <div className="mt-10 md:mt-0">
          <p className="max-w-sm font-serif text-3xl leading-tight font-semibold text-balance md:text-4xl">
            Asistencia y evaluación de cada sesión, en un solo lugar.
          </p>
          <p className="mt-4 max-w-sm text-white/70">
            Configure eventos, imprima los códigos QR y descargue los registros para el informe al cliente.
          </p>
        </div>
      </aside>
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <h1 className="font-serif text-[1.75rem] font-semibold text-tinta">Ingresar al panel</h1>
          {error === 'no-autorizado' && (
            <MensajeEstado tono="error" titulo="Acceso no autorizado" texto="Su usuario no tiene permisos de administrador." />
          )}
          <FormularioLogin />
        </div>
      </main>
    </div>
  );
}
