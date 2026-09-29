import Link from 'next/link';
import { requerirAdmin } from '@/lib/auth/admin';
import { cerrarSesion } from '@/app/admin/login/actions';

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const { user } = await requerirAdmin();
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-5 px-4 py-3 text-sm">
          <span className="font-bold text-slate-900">Capacitaciones · Avance Jurídico</span>
          <Link href="/admin" className="text-slate-700 hover:underline">
            Eventos
          </Link>
          <Link href="/admin/marcas" className="text-slate-700 hover:underline">
            Marcas
          </Link>
          <Link href="/admin/configuracion" className="text-slate-700 hover:underline">
            Configuración
          </Link>
          <span className="ml-auto text-slate-500">{user.email}</span>
          <form action={cerrarSesion}>
            <button type="submit" className="text-slate-700 underline">
              Salir
            </button>
          </form>
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
