import type { Pregunta } from '@/lib/domain/encuesta';
import { Campo, claseControl } from './campos';

function OpcionesNumericas({
  nombre,
  pregunta,
  min,
  max,
  extremos,
  error,
}: {
  nombre: string;
  pregunta: string;
  min: number;
  max: number;
  extremos: [string, string];
  error?: string;
}) {
  const valores = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-800">{pregunta}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {valores.map((v) => (
          <label key={v} className="relative">
            <input type="radio" name={nombre} value={v} required className="peer sr-only" />
            <span className="flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-400 px-2 text-base text-slate-900 peer-checked:border-[var(--color-primario)] peer-checked:bg-[var(--color-primario)] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-primario)]">
              {v}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-600">
        <span>{extremos[0]}</span>
        <span>{extremos[1]}</span>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function PreguntasEncuesta({
  preguntas,
  errores,
}: {
  preguntas: Pregunta[];
  errores: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      {preguntas.map((p) => {
        const nombre = `p_${p.clave}`;
        if (p.tipo === 'texto') {
          return (
            <Campo key={p.clave} etiqueta={`${p.texto} (opcional)`} error={errores[nombre]}>
              <textarea name={nombre} rows={3} maxLength={1000} className={claseControl} />
            </Campo>
          );
        }
        const esEscala = p.tipo === 'escala_1_5';
        return (
          <OpcionesNumericas
            key={p.clave}
            nombre={nombre}
            pregunta={p.texto}
            min={esEscala ? 1 : 0}
            max={esEscala ? 5 : 10}
            extremos={esEscala ? ['Muy en desacuerdo', 'Muy de acuerdo'] : ['Nada probable', 'Muy probable']}
            error={errores[nombre]}
          />
        );
      })}
    </div>
  );
}
