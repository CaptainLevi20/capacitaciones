'use client';
import type { ResultadoEnvio } from '@/lib/envio';
import { useEnvio } from '@/components/useEnvio';
import { Boton } from './campos';
import { CajaHabeas } from './CajaHabeas';
import { CampoTrampa } from './CampoTrampa';
import { CamposDocumento } from './CamposDocumento';
import { CamposPersonales } from './CamposPersonales';
import { MensajeEstado } from './MensajeEstado';

export function FormularioEntrada({
  accion,
  habeas,
  dominioCorreo,
}: {
  accion: (fd: FormData) => Promise<ResultadoEnvio>;
  habeas: { id: string; texto: string; urlPolitica: string | null };
  dominioCorreo: string | null;
}) {
  const { onSubmit, pendiente, resultado, errorRed } = useEnvio(accion);

  if (resultado?.ok) {
    return (
      <MensajeEstado
        tono="exito"
        titulo={`Registro exitoso${resultado.nombres ? `, ${resultado.nombres}` : ''}`}
        texto="Su asistencia a esta sesión quedó registrada. Puede cerrar esta página."
      />
    );
  }
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  return (
    <form onSubmit={onSubmit} className="relative space-y-4">
      <CampoTrampa />
      <CamposDocumento errores={errores} />
      <CamposPersonales errores={errores} dominioCorreo={dominioCorreo} />
      <CajaHabeas habeas={habeas} error={errores.acepta_habeas} />
      {resultado && !resultado.ok && resultado.mensaje && (
        <MensajeEstado tono="error" titulo="No se pudo registrar" texto={resultado.mensaje} />
      )}
      {errorRed && (
        <MensajeEstado
          tono="error"
          titulo="Sin conexión"
          texto="No se pudo enviar el formulario. Revise su conexión y presione de nuevo; sus datos se conservan."
        />
      )}
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? 'Enviando…' : 'Registrar entrada'}
      </Boton>
    </form>
  );
}
