export function CajaHabeas({
  habeas,
  error,
}: {
  habeas: { id: string; texto: string; urlPolitica: string | null };
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-3 font-serif text-lg font-semibold text-tinta">
        Autorización de tratamiento de datos personales
      </legend>
      <div
        className="max-h-44 overflow-y-auto rounded-lg bg-papel/70 p-3.5 text-sm leading-relaxed whitespace-pre-line text-apagado"
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
          className="mt-2 inline-block text-sm font-medium text-[var(--color-primario)] underline underline-offset-2"
        >
          Consultar la política de tratamiento de datos
        </a>
      )}
      <input type="hidden" name="habeas_version_id" value={habeas.id} />
      <label
        className={`mt-3 flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-3.5 ${error ? 'border-peligro bg-peligro-suave/40' : 'border-linea'}`}
      >
        <input
          type="checkbox"
          name="acepta_habeas"
          required
          aria-invalid={error ? true : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primario)]"
        />
        <span className="text-[0.9375rem] text-tinta">
          He leído y autorizo el tratamiento de mis datos personales en los términos anteriores.
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-peligro">
          {error}
        </p>
      )}
    </fieldset>
  );
}
