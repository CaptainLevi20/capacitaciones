'use client';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useEnvio } from '@/components/useEnvio';
import type { ResultadoAccion } from '@/lib/envio';
import { claseBoton } from './estilos';
import { useAvisoSalida } from './useAvisoSalida';

export function FormularioAccion({
  accion,
  textoBoton,
  children,
  variante = 'primario',
  confirmar,
  className = 'space-y-3',
  deshabilitado = false,
  sucio,
  alGuardar,
}: {
  accion: (fd: FormData) => Promise<ResultadoAccion>;
  textoBoton: string;
  children?: ReactNode;
  variante?: keyof typeof claseBoton;
  confirmar?: string;
  className?: string;
  deshabilitado?: boolean;
  // Para editores cuyos cambios no pasan por campos del formulario (p. ej. reordenar con botones).
  sucio?: boolean;
  alGuardar?: () => void;
}) {
  const { onSubmit, pendiente, resultado, errorRed } = useEnvio(accion);
  const [editado, setEditado] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const hayCambios = sucio ?? editado;
  useAvisoSalida(hayCambios);

  useEffect(() => {
    if (!resultado?.ok) return;
    setEditado(false);
    alGuardar?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  // Marca la sección que contiene el formulario para mostrar «Cambios sin guardar» junto a su título.
  useEffect(() => {
    const seccion = ref.current?.closest('section');
    if (!seccion) return;
    seccion.toggleAttribute('data-sucio', hayCambios);
    return () => seccion.removeAttribute('data-sucio');
  }, [hayCambios]);

  function enviar(e: FormEvent<HTMLFormElement>) {
    if (confirmar && !window.confirm(confirmar)) {
      e.preventDefault();
      return;
    }
    onSubmit(e);
  }
  return (
    <form ref={ref} onSubmit={enviar} onInput={() => setEditado(true)} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pendiente || deshabilitado}
          className={`${claseBoton[variante]} ${hayCambios ? 'ring-2 ring-aviso ring-offset-2' : ''} disabled:cursor-not-allowed`}
        >
          {pendiente ? 'Procesando…' : textoBoton}
        </button>
        {hayCambios && !pendiente && <span className="text-sm font-medium text-aviso">Cambios sin guardar</span>}
        {!hayCambios && resultado?.ok && resultado.mensaje && (
          <span role="status" className="text-sm text-exito">
            {resultado.mensaje}
          </span>
        )}
        {resultado && !resultado.ok && (
          <span role="alert" className="text-sm text-peligro">
            {resultado.error}
          </span>
        )}
        {errorRed && (
          <span role="alert" className="text-sm text-peligro">
            No se pudo conectar. Intente de nuevo.
          </span>
        )}
      </div>
    </form>
  );
}
