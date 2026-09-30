'use client';

export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-tinta px-4 py-2 text-sm font-semibold text-white hover:bg-tinta/85"
    >
      Imprimir / Guardar como PDF
    </button>
  );
}
