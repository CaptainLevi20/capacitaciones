import type { ReactNode } from 'react';
import { claseEtiqueta } from './estilos';

export function CampoAdmin({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={claseEtiqueta}>{etiqueta}</span>
      {children}
    </label>
  );
}
