import { requerirAdmin } from '@/lib/auth/admin';
import { listarMarcas } from '@/lib/repo/marcas';
import { colorFormulario } from '@/lib/domain/color';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { CamposEvento, sugerenciasDeColor } from '@/components/admin/CamposEvento';
import { claseTarjeta } from '@/components/admin/estilos';
import { crearEventoAccion } from './actions';

export default async function PaginaNuevoEvento() {
  const { db } = await requerirAdmin();
  const marcas = await listarMarcas(db);
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-[1.75rem] font-semibold text-tinta">Nuevo evento</h1>
      <section className={claseTarjeta}>
        <FormularioAccion accion={crearEventoAccion} textoBoton="Crear evento">
          <CamposEvento respaldo={colorFormulario(null, [])} sugerencias={sugerenciasDeColor(marcas)} />
        </FormularioAccion>
      </section>
    </div>
  );
}
