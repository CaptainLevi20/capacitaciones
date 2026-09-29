export function CajaHabeas({
  habeas,
  error,
}: {
  habeas: { texto: string; urlPolitica: string | null };
  error?: string;
}) {
  return (
    <fieldset className="rounded-lg border border-slate-400 p-3">
      <legend className="px-1 text-sm font-semibold text-slate-800">
        Autorización de tratamiento de datos personales
      </legend>
      <div
        className="max-h-48 overflow-y-auto whitespace-pre-line text-sm text-slate-700"
        tabIndex={0}
        data-testid="texto-habeas"
      >
        {habeas.texto}
      </div>
      {habeas.urlPolitica && (
        <a
          href={habeas.urlPolitica}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm text-[var(--color-primario)] underline"
        >
          Consultar la política de tratamiento de datos
        </a>
      )}
      <label className="mt-3 flex min-h-11 items-start gap-3">
        <input type="checkbox" name="acepta_habeas" required className="mt-1 h-5 w-5 shrink-0" />
        <span className="text-sm text-slate-900">
          He leído y autorizo el tratamiento de mis datos personales en los términos anteriores.
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
