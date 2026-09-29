import { requerirAdmin } from '@/lib/auth/admin';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { CamposEvento } from '@/components/admin/CamposEvento';
import { claseTarjeta } from '@/components/admin/estilos';
import { crearEventoAccion } from './actions';

export default async function PaginaNuevoEvento() {
  await requerirAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Nuevo evento</h1>
      <section className={claseTarjeta}>
        <FormularioAccion accion={crearEventoAccion} textoBoton="Crear evento">
          <CamposEvento />
        </FormularioAccion>
      </section>
    </div>
  );
}
