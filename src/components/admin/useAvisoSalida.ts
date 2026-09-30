'use client';
import { useEffect, useId } from 'react';

const MENSAJE = 'Hay cambios sin guardar en esta página. ¿Salir sin guardarlos?';
const sucios = new Set<string>();

function alSalir(e: BeforeUnloadEvent) {
  e.preventDefault();
}

// Los enlaces de Next navegan sin recargar, así que beforeunload no los detecta: se interceptan
// en captura, antes de que el Link procese el clic.
function alHacerClic(e: MouseEvent) {
  const enlace = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!enlace || enlace.target === '_blank' || enlace.hasAttribute('download')) return;
  if (enlace.pathname === window.location.pathname && enlace.hash) return; // saltos dentro de la página
  if (enlace.href.includes('/api/')) return; // descargas (QR, Excel)
  if (!window.confirm(MENSAJE)) {
    e.preventDefault();
    e.stopPropagation();
  }
}

function sincronizar() {
  if (sucios.size) {
    window.addEventListener('beforeunload', alSalir);
    document.addEventListener('click', alHacerClic, true);
  } else {
    window.removeEventListener('beforeunload', alSalir);
    document.removeEventListener('click', alHacerClic, true);
  }
}

// Pide confirmación al salir de la página mientras algún formulario tenga cambios sin guardar.
export function useAvisoSalida(sucio: boolean) {
  const id = useId();
  useEffect(() => {
    if (sucio) sucios.add(id);
    else sucios.delete(id);
    sincronizar();
    return () => {
      sucios.delete(id);
      sincronizar();
    };
  }, [id, sucio]);
}
