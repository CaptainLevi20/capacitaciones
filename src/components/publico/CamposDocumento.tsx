import { NOMBRE_TIPO_DOCUMENTO, TIPOS_DOCUMENTO } from '@/lib/domain/constantes';
import { Campo, Selector, Texto } from './campos';

export function CamposDocumento({ errores }: { errores: Record<string, string> }) {
  return (
    <>
      <Campo etiqueta="Tipo de documento" error={errores.tipo_documento}>
        <Selector name="tipo_documento" required defaultValue="CC">
          {TIPOS_DOCUMENTO.map((t) => (
            <option key={t} value={t}>
              {NOMBRE_TIPO_DOCUMENTO[t]}
            </option>
          ))}
        </Selector>
      </Campo>
      <Campo etiqueta="Número de documento" error={errores.numero_documento}>
        <Texto name="numero_documento" autoComplete="off" required error={errores.numero_documento} />
      </Campo>
    </>
  );
}
