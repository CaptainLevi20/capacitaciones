'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { claseBoton } from './estilos';

// Menú desplegable con la API nativa de popover: se dibuja por encima de todo, así que las tablas
// con desplazamiento horizontal no lo recortan, y cierra solo con Escape o al hacer clic afuera.
export function Menu({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  const id = useId();
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = panel.current;
    if (!p) return;
    const ubicar = () => {
      if (!boton.current) return;
      const r = boton.current.getBoundingClientRect();
      p.style.top = `${r.bottom + 4}px`;
      p.style.left = `${r.right}px`;
    };
    const alAbrir = (e: Event) => (e as ToggleEvent).newState === 'open' && ubicar();
    // Si la página o la tabla se desplazan con el menú abierto, el menú sigue al botón.
    const seguir = () => p.matches(':popover-open') && ubicar();
    p.addEventListener('beforetoggle', alAbrir);
    window.addEventListener('scroll', seguir, true);
    window.addEventListener('resize', seguir);
    return () => {
      p.removeEventListener('beforetoggle', alAbrir);
      window.removeEventListener('scroll', seguir, true);
      window.removeEventListener('resize', seguir);
    };
  }, []);

  return (
    <>
      <button ref={boton} type="button" popoverTarget={id} className={`${claseBoton.secundario} whitespace-nowrap`}>
        {etiqueta}
        <span aria-hidden="true" className="ml-1.5 text-apagado">
          ▾
        </span>
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        className="fixed inset-auto m-0 w-64 -translate-x-full rounded-lg border border-linea bg-white p-1.5 shadow-[0_12px_32px_-12px_rgb(26_36_51/0.35)]"
      >
        {children}
      </div>
    </>
  );
}

export function SeparadorMenu() {
  return <hr className="my-1.5 border-linea" />;
}
