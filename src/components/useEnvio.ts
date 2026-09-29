'use client';
import { useState, useTransition, type FormEvent } from 'react';

// Envía con onSubmit (no con action=) para que React no reinicie el formulario:
// si hay error de validación o de red, la persona conserva lo que escribió.
export function useEnvio<T>(accion: (fd: FormData) => Promise<T>) {
  const [pendiente, startTransition] = useTransition();
  const [resultado, setResultado] = useState<T | null>(null);
  const [errorRed, setErrorRed] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErrorRed(false);
    startTransition(async () => {
      try {
        const r = await accion(fd);
        setResultado(r);
      } catch {
        setErrorRed(true);
      }
    });
  }

  function reiniciar() {
    setResultado(null);
    setErrorRed(false);
  }

  return { onSubmit, pendiente, resultado, errorRed, reiniciar };
}
