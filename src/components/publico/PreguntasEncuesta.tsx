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
  // 1 a 5 cabe en una fila; 0 a 10 se reparte en dos filas parejas en el celular.
  const columnas = valores.length > 5 ? 'grid-cols-6 sm:grid-cols-11' : 'grid-cols-5';
  return (
    <fieldset>
      <legend className="text-[0.9375rem] font-medium text-tinta">{pregunta}</legend>
      <div className={`mt-2.5 grid gap-2 ${columnas}`}>
        {valores.map((v) => (
          <label key={v} className="relative">
            <input type="radio" name={nombre} value={v} required className="peer sr-only" />
            <span className="flex h-12 cursor-pointer items-center justify-center rounded-lg border border-linea bg-white text-base font-medium text-tinta tabular-nums peer-checked:border-[var(--color-primario)] peer-checked:bg-[var(--color-primario)] peer-checked:text-[var(--color-sobre-primario)] peer-focus-visible:ring-3 peer-focus-visible:ring-[var(--color-primario)]/40">
              {v}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[0.8125rem] text-apagado">
        <span>{extremos[0]}</span>
        <span>{extremos[1]}</span>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-peligro">
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
    <div className="space-y-7">
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
