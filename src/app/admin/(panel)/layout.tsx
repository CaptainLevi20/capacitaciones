import Link from 'next/link';
import { requerirAdmin } from '@/lib/auth/admin';
import { cerrarSesion } from '@/app/admin/login/actions';
import { NavPanel } from '@/components/admin/NavPanel';

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const { user } = await requerirAdmin();
  return (
    <div className="min-h-dvh">
      <header className="bg-tinta text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
          <Link href="/admin" className="leading-tight">
            <span className="block font-serif text-lg font-semibold">Avance Jurídico</span>
            <span className="block text-xs text-white/60">Registro de capacitaciones</span>
          </Link>
          <NavPanel />
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="hidden text-white/60 sm:inline">{user.email}</span>
            <form action={cerrarSesion}>
              <button type="submit" className="rounded-md px-2 py-1 text-white/80 underline-offset-2 hover:text-white hover:underline">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
