import type { DatosEvento } from '@/lib/domain/schemas-admin';
import { CampoAdmin } from './CampoAdmin';
import { claseInput } from './estilos';

export function CamposEvento({ evento }: { evento?: DatosEvento }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CampoAdmin etiqueta="Nombre del evento">
        <input name="nombre" required defaultValue={evento?.nombre ?? ''} className={claseInput} />
      </CampoAdmin>
      <CampoAdmin etiqueta="Cliente">
        <input name="cliente" defaultValue={evento?.cliente ?? ''} className={claseInput} />
      </CampoAdmin>
      <CampoAdmin etiqueta="Capacitador(es)">
        <input name="capacitadores" defaultValue={evento?.capacitadores ?? ''} className={claseInput} />
      </CampoAdmin>
      <CampoAdmin etiqueta="Dominio de correo esperado (opcional)">
        <input
          name="dominio_correo"
          defaultValue={evento?.dominio_correo ?? ''}
          placeholder="procuraduria.gov.co"
          className={claseInput}
        />
      </CampoAdmin>
      <CampoAdmin etiqueta="Color principal (opcional, #RRGGBB)">
        <input
          name="color_primario"
          defaultValue={evento?.color_primario ?? ''}
          placeholder="Si se deja vacío, se usa el de la primera marca"
          className={claseInput}
        />
      </CampoAdmin>
    </div>
  );
}
