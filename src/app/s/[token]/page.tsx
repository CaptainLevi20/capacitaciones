import { clienteServicio } from '@/lib/supabase/servicio';
import { obtenerSesionPorToken } from '@/lib/repo/publico';
import { MarcoPublico, etiquetaSesion } from '@/components/publico/MarcoPublico';
import { AvisoDisponibilidad } from '@/components/publico/AvisoDisponibilidad';
import { EnlaceNoValido } from '@/components/publico/EnlaceNoValido';
import { FormularioSalida } from '@/components/publico/FormularioSalida';
import { consultarDocumento, enviarSalida } from './actions';

export const dynamic = 'force-dynamic';

export default async function PaginaSalida({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await obtenerSesionPorToken(clienteServicio(), token, 'salida');
  if (res.tipo === 'no_encontrada') return <EnlaceNoValido />;
  const { sesion } = res;
  return (
    <MarcoPublico sesion={sesion} modo="Registro de salida y evaluación">
      {res.tipo === 'abierta' ? (
        <FormularioSalida
          consultar={consultarDocumento.bind(null, token)}
          enviar={enviarSalida.bind(null, token)}
          habeas={sesion.habeas}
          dominioCorreo={sesion.evento.dominioCorreo}
          sesion={etiquetaSesion(sesion)}
          preguntas={sesion.preguntas}
        />
      ) : (
        <AvisoDisponibilidad sesion={sesion} />
      )}
    </MarcoPublico>
  );
}
