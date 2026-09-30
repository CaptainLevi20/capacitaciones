'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ENLACES = [
  { href: '/admin', texto: 'Eventos', activo: (p: string) => p === '/admin' || p.startsWith('/admin/eventos') },
  { href: '/admin/marcas', texto: 'Marcas', activo: (p: string) => p.startsWith('/admin/marcas') },
  { href: '/admin/configuracion', texto: 'Configuración', activo: (p: string) => p.startsWith('/admin/configuracion') },
];

export function NavPanel() {
  const ruta = usePathname();
  return (
    <nav className="flex gap-1 text-sm">
      {ENLACES.map((e) => {
        const activo = e.activo(ruta);
        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={activo ? 'page' : undefined}
            className={`rounded-md px-3 py-1.5 ${activo ? 'bg-white/12 font-semibold text-white' : 'text-white/70 hover:text-white'}`}
          >
            {e.texto}
          </Link>
        );
      })}
    </nav>
  );
}
