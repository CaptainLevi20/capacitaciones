'use client';
import { useState } from 'react';
import { COLOR_DEFECTO } from '@/lib/domain/constantes';
import { claseBoton, claseEtiqueta, claseInput } from './estilos';

const HEX = /^#[0-9A-Fa-f]{6}$/;

// El campo de texto (con `name`) es el que se envía; el selector nativo solo lo alimenta.
export function SelectorColor({
  nombre,
  etiqueta,
  valorInicial,
  textoVacio,
}: {
  nombre: string;
  etiqueta: string;
  valorInicial: string | null;
  textoVacio: string;
}) {
  const [valor, setValor] = useState(valorInicial ?? '');
  const valido = HEX.test(valor);
  return (
    <div>
      <span className={claseEtiqueta}>{etiqueta}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          aria-label={`${etiqueta}: selector`}
          value={(valido ? valor : COLOR_DEFECTO).toLowerCase()}
          onChange={(e) => setValor(e.target.value.toUpperCase())}
          className={`h-9 w-12 shrink-0 cursor-pointer rounded border border-linea bg-white p-0.5 ${valido ? '' : 'opacity-30'}`}
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
        <button type="button" onClick={() => setValor('')} className={`${claseBoton.secundario} shrink-0 whitespace-nowrap`}>
          Sin color
        </button>
      </div>
      {!valor && <p className="mt-1 text-xs text-apagado">{textoVacio}</p>}
      {valor && !valido && <p className="mt-1 text-xs text-peligro">Use el formato #RRGGBB, por ejemplo #003366.</p>}
    </div>
  );
}
