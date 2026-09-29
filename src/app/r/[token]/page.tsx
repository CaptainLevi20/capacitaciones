import { clienteServicio } from '@/lib/supabase/servicio';
import { obtenerSesionPorToken } from '@/lib/repo/publico';
import { MarcoPublico } from '@/components/publico/MarcoPublico';
import { AvisoDisponibilidad } from '@/components/publico/AvisoDisponibilidad';
import { EnlaceNoValido } from '@/components/publico/EnlaceNoValido';
import { FormularioEntrada } from '@/components/publico/FormularioEntrada';
import { enviarEntrada } from './actions';

export const dynamic = 'force-dynamic';

export default async function PaginaEntrada({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await obtenerSesionPorToken(clienteServicio(), token, 'entrada');
  if (res.tipo === 'no_encontrada') return <EnlaceNoValido />;
  const { sesion } = res;
  return (
    <MarcoPublico sesion={sesion} subtitulo="Registro de entrada">
      {res.tipo === 'abierta' ? (
        <FormularioEntrada
          accion={enviarEntrada.bind(null, token)}
          habeas={sesion.habeas}
          dominioCorreo={sesion.evento.dominioCorreo}
        />
      ) : (
        <AvisoDisponibilidad sesion={sesion} />
      )}
    </MarcoPublico>
  );
}
