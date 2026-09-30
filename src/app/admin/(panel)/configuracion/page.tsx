import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerConfiguracion } from '@/lib/repo/configuracion';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { CampoAdmin } from '@/components/admin/CampoAdmin';
import { claseInput, claseTarjeta } from '@/components/admin/estilos';
import { guardarConfiguracionAccion } from './actions';

export default async function PaginaConfiguracion() {
  const { db } = await requerirAdmin();
  const c = await obtenerConfiguracion(db);
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-[1.75rem] font-semibold text-tinta">Configuración</h1>
      <section className={claseTarjeta}>
        <p className="mb-3 text-sm text-apagado">
          Texto de la casilla de autorización que se copia a cada evento nuevo. Los eventos existentes conservan su
          propio texto.
        </p>
        <FormularioAccion accion={guardarConfiguracionAccion} textoBoton="Guardar configuración">
          <CampoAdmin etiqueta="Texto de la casilla de autorización por defecto">
            <input
              name="habeas_texto"
              required
              maxLength={300}
              defaultValue={c.habeasTexto}
              placeholder="Autorizo el tratamiento de datos personales."
              className={claseInput}
            />
          </CampoAdmin>
          <input type="hidden" name="habeas_url" value="" />
        </FormularioAccion>
      </section>
    </div>
  );
}
