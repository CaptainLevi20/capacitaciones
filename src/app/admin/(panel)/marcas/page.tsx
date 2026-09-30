import { requerirAdmin } from '@/lib/auth/admin';
import { listarMarcas, type Marca } from '@/lib/repo/marcas';
import { urlLogo } from '@/lib/storage';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { CampoAdmin } from '@/components/admin/CampoAdmin';
import { SelectorColor } from '@/components/admin/SelectorColor';
import { claseInput, claseTarjeta } from '@/components/admin/estilos';
import { guardarMarcaAccion } from './actions';

function CamposMarca({ marca }: { marca?: Marca }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <CampoAdmin etiqueta="Nombre">
          <input name="nombre" defaultValue={marca?.nombre ?? ''} required className={claseInput} />
        </CampoAdmin>
        <SelectorColor
          nombre="color_primario"
          etiqueta="Color principal"
          valorInicial={marca?.color_primario ?? null}
          textoVacio="Sin color: esta marca no define el color de los formularios."
        />
        <CampoAdmin etiqueta="Logo">
          <input type="file" name="logo" accept="image/png,image/svg+xml,image/jpeg" className={claseInput} />
        </CampoAdmin>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="activa" defaultChecked={marca?.activa ?? true} /> Activa
      </label>
    </>
  );
}

export default async function PaginaMarcas() {
  const { db } = await requerirAdmin();
  const marcas = await listarMarcas(db);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Marcas</h1>
      <p className="text-sm text-slate-600">
        Logos institucionales disponibles para el co-branding de los eventos. PNG, SVG o JPG, máximo 1 MB.
      </p>
      {marcas.map((m) => (
        <section key={m.id} className={claseTarjeta}>
          <div className="mb-3 flex h-12 items-center">
            {m.logo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlLogo(m.logo_path)} alt={m.nombre} className="h-12 w-auto" />
            ) : (
              <span className="text-sm text-slate-500">Sin logo</span>
            )}
          </div>
          <FormularioAccion accion={guardarMarcaAccion.bind(null, m.id)} textoBoton="Guardar">
            <CamposMarca marca={m} />
          </FormularioAccion>
        </section>
      ))}
      <section className={claseTarjeta} data-testid="nueva-marca">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Nueva marca</h2>
        <FormularioAccion accion={guardarMarcaAccion.bind(null, null)} textoBoton="Crear marca">
          <CamposMarca />
        </FormularioAccion>
      </section>
    </div>
  );
}
