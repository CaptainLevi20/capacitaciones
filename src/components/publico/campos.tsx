import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export const claseControl =
  'mt-1.5 block w-full min-h-12 rounded-lg border border-linea bg-white px-3.5 py-2.5 text-base text-tinta placeholder:text-apagado/70 focus:border-[var(--color-primario)] focus:outline-none focus:ring-3 focus:ring-[var(--color-primario)]/25 aria-invalid:border-peligro aria-invalid:bg-peligro-suave/40';

export function Campo({
  etiqueta,
  error,
  aviso,
  children,
}: {
  etiqueta: string;
  error?: string;
  aviso?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[0.9375rem] font-medium text-tinta">{etiqueta}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1.5 block text-sm font-medium text-peligro">
          {error}
        </span>
      )}
      {!error && aviso && <span className="mt-1.5 block text-sm text-aviso">{aviso}</span>}
    </label>
  );
}

// Agrupa campos relacionados para que un formulario largo se lea por partes.
export function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 font-serif text-lg font-semibold text-tinta">{titulo}</legend>
      {children}
    </fieldset>
  );
}

export function Texto({ error, ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <input {...props} aria-invalid={error ? true : undefined} className={claseControl} />;
}

export function Selector(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={claseControl} />;
}

export function Boton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="min-h-14 w-full rounded-xl bg-[var(--color-primario)] px-4 py-3 text-[1.0625rem] font-semibold text-[var(--color-sobre-primario)] transition-[filter] hover:brightness-110 active:brightness-95 disabled:cursor-wait disabled:opacity-70"
    >
      {children}
    </button>
  );
}
