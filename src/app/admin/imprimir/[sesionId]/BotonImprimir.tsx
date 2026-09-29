'use client';

export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
    >
      Imprimir / Guardar como PDF
    </button>
  );
}
