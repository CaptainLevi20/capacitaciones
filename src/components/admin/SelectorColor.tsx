'use client';
import { useRef, useState } from 'react';
import { colorMuyClaro, colorTextoSobre } from '@/lib/domain/color';
import { COLOR_DEFECTO } from '@/lib/domain/constantes';
import { claseBoton, claseEtiqueta, claseInput } from './estilos';

const HEX = /^#[0-9A-Fa-f]{6}$/;

export interface Sugerencia {
  nombre: string;
  color: string;
}

// Celular en miniatura con las partes del formulario que toman el color.
function VistaPrevia({ color }: { color: string }) {
  const texto = colorTextoSobre(color);
  return (
    <div
      aria-hidden="true"
      className="w-36 shrink-0 overflow-hidden rounded-2xl border-4 border-tinta bg-papel text-[0.5625rem] leading-tight"
    >
      <div className="h-1.5" style={{ background: color }} />
      <div className="px-2.5 pt-2.5 pb-3 text-center">
        <span
          className="inline-block rounded-full px-1.5 py-px font-semibold"
          style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          Registro de entrada
        </span>
        <p className="mt-1 font-serif text-[0.6875rem] font-semibold text-tinta">Nombre del evento</p>
        <div className="mt-2 space-y-1.5 rounded-lg bg-white p-2 text-left">
          <div className="h-3 rounded border border-linea" />
          <div className="flex items-center gap-1">
            <span className="flex h-2.5 w-2.5 items-center justify-center rounded-sm text-[0.4375rem]" style={{ background: color, color: texto }}>
              ✓
            </span>
            <span className="text-apagado">Autorizo…</span>
          </div>
          <div className="rounded py-1 text-center font-semibold" style={{ background: color, color: texto }}>
            Registrar entrada
          </div>
        </div>
        <div
          className="mx-auto mt-2 flex h-6 w-6 items-center justify-center rounded-full text-[0.625rem]"
          style={{ background: color, color: texto }}
        >
          ✓
        </div>
      </div>
    </div>
  );
}

// El campo de texto (con `name`) es el que se envía; el selector nativo y los atajos solo lo alimentan.
export function SelectorColor({
  nombre,
  etiqueta,
  explicacion,
  valorInicial,
  textoVacio,
  respaldo,
  sugerencias = [],
}: {
  nombre: string;
  etiqueta: string;
  explicacion: string;
  valorInicial: string | null;
  textoVacio: string;
  // El color que se usa realmente cuando este campo queda vacío.
  respaldo?: string;
  sugerencias?: Sugerencia[];
}) {
  const [valor, setValor] = useState(valorInicial ?? '');
  const raiz = useRef<HTMLDivElement>(null);
  const valido = HEX.test(valor);
  const efectivo = valido ? valor : (respaldo ?? COLOR_DEFECTO);

  // Los botones cambian el valor sin un evento «input»: se emite uno para que el formulario
  // registre que hay cambios sin guardar.
  function elegir(color: string) {
    setValor(color);
    raiz.current?.dispatchEvent(new Event('input', { bubbles: true }));
  }

  return (
    <div ref={raiz} className="col-span-full">
      <span className={claseEtiqueta}>{etiqueta}</span>
      <p className="mt-0.5 max-w-prose text-sm text-apagado">{explicacion}</p>
      <div className="mt-3 flex flex-wrap items-start gap-6">
        <div className="min-w-0 max-w-xl flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label={`${etiqueta}: selector`}
              value={efectivo.toLowerCase()}
              onChange={(e) => setValor(e.target.value.toUpperCase())}
              className={`h-9 w-12 shrink-0 cursor-pointer rounded border border-linea bg-white p-0.5 ${valido ? '' : 'opacity-40'}`}
            />
            <input
              name={nombre}
              aria-label={`${etiqueta}: código`}
              value={valor}
              onChange={(e) => setValor(e.target.value.trim())}
              placeholder="#RRGGBB"
              maxLength={7}
              className={`${claseInput} mt-0 max-w-32 font-mono`}
            />
            <button
              type="button"
              onClick={() => elegir('')}
              disabled={!valor}
              className={`${claseBoton.secundario} shrink-0 whitespace-nowrap`}
            >
              Sin color
            </button>
          </div>

          {sugerencias.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sugerencias.map((s) => (
                <button
                  key={`${s.nombre}-${s.color}`}
                  type="button"
                  onClick={() => elegir(s.color)}
                  aria-label={`Usar color de ${s.nombre} (${s.color})`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-linea bg-white py-1 pr-2.5 pl-1 text-xs text-tinta hover:bg-papel"
                >
                  <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: s.color }} />
                  Usar color de {s.nombre}
                </button>
              ))}
            </div>
          )}

          {!valor && <p className="text-sm text-tinta">{textoVacio}</p>}
          {valor && !valido && <p className="text-sm text-peligro">Use el formato #RRGGBB, por ejemplo #003366.</p>}
          {colorMuyClaro(efectivo) && (
            <p className="rounded-lg border-l-4 border-aviso bg-aviso-suave px-3 py-2 text-sm text-aviso">
              Este color es muy claro: algunos textos del formulario se leerán con dificultad. Elija un tono más oscuro.
            </p>
          )}
        </div>
        <VistaPrevia color={efectivo} />
      </div>
    </div>
  );
}
