'use client';
import type { Pregunta } from '@/lib/domain/encuesta';
import type { ResultadoEnvio } from '@/lib/envio';
import type { ResultadoConsulta } from '@/app/s/[token]/actions';
import { useEnvio } from '@/components/useEnvio';
import { Boton } from './campos';
import { CajaHabeas } from './CajaHabeas';
import { CampoTrampa } from './CampoTrampa';
import { CamposDocumento } from './CamposDocumento';
import { CamposPersonales } from './CamposPersonales';
import { MensajeEstado } from './MensajeEstado';
import { PreguntasEncuesta } from './PreguntasEncuesta';

const SIN_CONEXION = 'No se pudo enviar el formulario. Revise su conexión y presione de nuevo; sus datos se conservan.';

export function FormularioSalida({
  consultar,
  enviar,
  habeas,
  dominioCorreo,
  preguntas,
}: {
  consultar: (fd: FormData) => Promise<ResultadoConsulta>;
  enviar: (fd: FormData) => Promise<ResultadoEnvio>;
  habeas: { id: string; texto: string; urlPolitica: string | null };
  dominioCorreo: string | null;
  preguntas: Pregunta[];
}) {
  const paso1 = useEnvio(consultar);
  const paso2 = useEnvio(enviar);

  if (paso2.resultado?.ok) {
    return <MensajeEstado tono="exito" titulo="¡Gracias!" texto="Su salida y su evaluación quedaron registradas." />;
  }

  const consulta = paso1.resultado?.ok ? paso1.resultado : null;
  if (!consulta) {
    const r = paso1.resultado;
    const errores = r && !r.ok ? r.errores : {};
    return (
      <form onSubmit={paso1.onSubmit} className="space-y-4">
        <p className="text-slate-700">Ingrese su documento para registrar la salida.</p>
        <CamposDocumento errores={errores} />
        {r && !r.ok && r.mensaje && <MensajeEstado tono="error" titulo="No disponible" texto={r.mensaje} />}
        {paso1.errorRed && <MensajeEstado tono="error" titulo="Sin conexión" texto={SIN_CONEXION} />}
        <Boton type="submit" disabled={paso1.pendiente}>
          {paso1.pendiente ? 'Buscando…' : 'Continuar'}
        </Boton>
      </form>
    );
  }

  const r2 = paso2.resultado;
  const errores = r2 && !r2.ok ? r2.errores : {};
  return (
    <form onSubmit={paso2.onSubmit} className="relative space-y-5">
      <CampoTrampa />
      <input type="hidden" name="tipo_documento" value={consulta.documento.tipo_documento} />
      <input type="hidden" name="numero_documento" value={consulta.documento.numero_documento} />
      {consulta.encontrado ? (
        <p className="text-lg font-semibold text-slate-900">Hola, {consulta.nombres}</p>
      ) : (
        <>
          <MensajeEstado
            titulo="No encontramos su registro de entrada"
            texto="Complete sus datos para registrar la salida."
          />
          <CamposPersonales errores={errores} dominioCorreo={dominioCorreo} />
          <CajaHabeas habeas={habeas} error={errores.acepta_habeas} />
        </>
      )}
      <PreguntasEncuesta preguntas={preguntas} errores={errores} />
      {r2 && !r2.ok && r2.mensaje && <MensajeEstado tono="error" titulo="No se pudo registrar" texto={r2.mensaje} />}
      {paso2.errorRed && <MensajeEstado tono="error" titulo="Sin conexión" texto={SIN_CONEXION} />}
      <Boton type="submit" disabled={paso2.pendiente}>
        {paso2.pendiente ? 'Enviando…' : 'Enviar evaluación y registrar salida'}
      </Boton>
      <button type="button" onClick={paso1.reiniciar} className="min-h-11 w-full text-sm text-slate-700 underline">
        Cambiar documento
      </button>
    </form>
  );
}
