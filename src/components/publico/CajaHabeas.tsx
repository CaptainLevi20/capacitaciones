// Casilla obligatoria de autorización: su texto es la versión vigente del evento, que queda ligada al registro.
export function CajaHabeas({
  habeas,
  error,
}: {
  habeas: { id: string; texto: string; urlPolitica: string | null };
  error?: string;
}) {
  return (
    <fieldset>
      <input type="hidden" name="habeas_version_id" value={habeas.id} />
      <label
        className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-3.5 ${error ? 'border-peligro bg-peligro-suave/40' : 'border-linea'}`}
      >
        <input
          type="checkbox"
          name="acepta_habeas"
          required
          aria-invalid={error ? true : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primario)]"
        />
        <span className="text-[0.9375rem] text-tinta" data-testid="texto-habeas">
          {habeas.texto}
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
