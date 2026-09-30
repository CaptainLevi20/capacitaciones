'use client';
import { useEffect, useRef } from 'react';

// Tras un envío con errores lleva a la persona al primero: en un formulario largo en el celular,
// el error puede quedar fuera de la pantalla y parecer que el botón no hizo nada.
export function useFocoError<T>(resultado: T | null, errorRed: boolean) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const alerta = ref.current?.querySelector<HTMLElement>('[role="alert"]');
    if (!alerta) return;
    const control = alerta.closest('label, fieldset')?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea');
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    (control ?? alerta).scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'center' });
    control?.focus({ preventScroll: true });
  }, [resultado, errorRed]);
  return ref;
}
