import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export const claseControl =
  'mt-1 block w-full min-h-11 rounded-lg border border-slate-400 bg-white px-3 py-2 text-base text-slate-900 focus:border-[var(--color-primario)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/30';

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
      <span className="text-sm font-medium text-slate-800">{etiqueta}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-sm text-red-700">
          {error}
        </span>
      )}
      {!error && aviso && <span className="mt-1 block text-sm text-amber-800">{aviso}</span>}
    </label>
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
      className="min-h-12 w-full rounded-lg bg-[var(--color-primario)] px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
    >
      {children}
    </button>
  );
}
