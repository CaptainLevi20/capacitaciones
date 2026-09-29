import { MensajeEstado } from '@/components/publico/MensajeEstado';
import { FormularioLogin } from './FormularioLogin';

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-bold text-slate-900">Administración de capacitaciones</h1>
      {error === 'no-autorizado' && (
        <MensajeEstado tono="error" titulo="Acceso no autorizado" texto="Su usuario no tiene permisos de administrador." />
      )}
      <FormularioLogin />
    </main>
  );
}
