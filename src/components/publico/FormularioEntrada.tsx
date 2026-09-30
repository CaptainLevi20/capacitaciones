'use client';
import type { ResultadoEnvio } from '@/lib/envio';
import { useEnvio } from '@/components/useEnvio';
import { useFocoError } from '@/components/useFocoError';
import { Boton, Grupo } from './campos';
import { CajaHabeas } from './CajaHabeas';
import { CampoTrampa } from './CampoTrampa';
import { CamposDocumento } from './CamposDocumento';
import { CamposPersonales } from './CamposPersonales';
import { Constancia } from './Constancia';
import { MensajeEstado } from './MensajeEstado';

export const SIN_CONEXION =
  'No se pudo enviar el formulario. Revise su conexión y presione de nuevo; sus datos se conservan.';

export function FormularioEntrada({
  accion,
  habeas,
  dominioCorreo,
  sesion,
}: {
  accion: (fd: FormData) => Promise<ResultadoEnvio>;
  habeas: { id: string; texto: string; urlPolitica: string | null };
  dominioCorreo: string | null;
  sesion: string;
}) {
  const { onSubmit, pendiente, resultado, errorRed } = useEnvio(accion);
  const ref = useFocoError(resultado, errorRed);

  if (resultado?.ok) {
    return (
      <Constancia
        titulo="Entrada registrada"
        nombre={resultado.nombres}
        sesion={sesion}
        registradoEn={resultado.registradoEn}
        nota="Muestre esta pantalla si se la solicitan. Al terminar la sesión, escanee el código de salida."
      />
    );
  }
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  return (
    <form ref={ref} onSubmit={onSubmit} className="relative space-y-8">
      <CampoTrampa />
      <Grupo titulo="Su documento">
        <CamposDocumento errores={errores} />
      </Grupo>
      <Grupo titulo="Sus datos">
        <CamposPersonales errores={errores} dominioCorreo={dominioCorreo} />
      </Grupo>
      <CajaHabeas habeas={habeas} error={errores.acepta_habeas} />
      <div className="space-y-4">
        {resultado && !resultado.ok && resultado.mensaje && (
          <MensajeEstado tono="error" titulo="No se pudo registrar" texto={resultado.mensaje} />
        )}
        {errorRed && <MensajeEstado tono="error" titulo="Sin conexión" texto={SIN_CONEXION} />}
        <Boton type="submit" disabled={pendiente}>
          {pendiente ? 'Registrando…' : 'Registrar entrada'}
        </Boton>
      </div>
    </form>
  );
}
