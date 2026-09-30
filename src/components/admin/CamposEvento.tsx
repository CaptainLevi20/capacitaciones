import type { DatosEvento } from '@/lib/domain/schemas-admin';
import { CampoAdmin } from './CampoAdmin';
import { SelectorColor } from './SelectorColor';
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
      <SelectorColor
        nombre="color_primario"
        etiqueta="Color principal"
        valorInicial={evento?.color_primario ?? null}
        textoVacio="Sin color: se usa el de la primera marca visible del co-branding."
      />
    </div>
  );
}
