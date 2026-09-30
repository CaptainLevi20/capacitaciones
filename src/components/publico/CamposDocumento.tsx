'use client';
import { useState } from 'react';
import { NOMBRE_TIPO_DOCUMENTO, TIPOS_DOCUMENTO } from '@/lib/domain/constantes';
import { Campo, Selector, Texto } from './campos';

export function CamposDocumento({ errores }: { errores: Record<string, string> }) {
  const [tipo, setTipo] = useState('CC');
  return (
    <>
      <Campo etiqueta="Tipo de documento" error={errores.tipo_documento}>
        <Selector name="tipo_documento" required value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS_DOCUMENTO.map((t) => (
            <option key={t} value={t}>
              {NOMBRE_TIPO_DOCUMENTO[t]}
            </option>
          ))}
        </Selector>
      </Campo>
      <Campo etiqueta="Número de documento" error={errores.numero_documento}>
        {/* El pasaporte lleva letras; los demás documentos, solo números. */}
        <Texto
          name="numero_documento"
          inputMode={tipo === 'PA' ? 'text' : 'numeric'}
          autoComplete="off"
          required
          error={errores.numero_documento}
        />
      </Campo>
    </>
  );
}
