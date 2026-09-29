'use client';
import type { FormEvent, ReactNode } from 'react';
import { useEnvio } from '@/components/useEnvio';
import type { ResultadoAccion } from '@/lib/envio';
import { claseBoton } from './estilos';

export function FormularioAccion({
  accion,
  textoBoton,
  children,
  variante = 'primario',
  confirmar,
  className = 'space-y-3',
}: {
  accion: (fd: FormData) => Promise<ResultadoAccion>;
  textoBoton: string;
  children?: ReactNode;
  variante?: keyof typeof claseBoton;
  confirmar?: string;
  className?: string;
}) {
  const { onSubmit, pendiente, resultado, errorRed } = useEnvio(accion);
  function enviar(e: FormEvent<HTMLFormElement>) {
    if (confirmar && !window.confirm(confirmar)) {
      e.preventDefault();
      return;
    }
    onSubmit(e);
  }
  return (
    <form onSubmit={enviar} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pendiente} className={claseBoton[variante]}>
          {pendiente ? 'Procesando…' : textoBoton}
        </button>
        {resultado?.ok && resultado.mensaje && (
          <span role="status" className="text-sm text-green-700">
            {resultado.mensaje}
          </span>
        )}
        {resultado && !resultado.ok && (
          <span role="alert" className="text-sm text-red-700">
            {resultado.error}
          </span>
        )}
        {errorRed && (
          <span role="alert" className="text-sm text-red-700">
            No se pudo conectar. Intente de nuevo.
          </span>
        )}
      </div>
    </form>
  );
}
