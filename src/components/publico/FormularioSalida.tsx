'use client';
import type { Pregunta } from '@/lib/domain/encuesta';
import type { ResultadoEnvio } from '@/lib/envio';
import type { ResultadoConsulta } from '@/app/s/[token]/actions';
import { useEnvio } from '@/components/useEnvio';
import { useFocoError } from '@/components/useFocoError';
import { Boton, Grupo } from './campos';
import { CajaHabeas } from './CajaHabeas';
import { CampoTrampa } from './CampoTrampa';
import { CamposDocumento } from './CamposDocumento';
import { CamposPersonales } from './CamposPersonales';
import { Constancia } from './Constancia';
import { SIN_CONEXION } from './FormularioEntrada';
import { MensajeEstado } from './MensajeEstado';
import { PreguntasEncuesta } from './PreguntasEncuesta';

function Pasos({ actual, titulo }: { actual: 1 | 2; titulo: string }) {
  return (
    <div className="mb-6">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2].map((n) => (
          <span
            key={n}
            className={`h-1.5 flex-1 rounded-full ${n <= actual ? 'bg-[var(--color-primario)]' : 'bg-linea'}`}
          />
        ))}
      </div>
      <p className="mt-3 text-sm text-apagado">Paso {actual} de 2</p>
      <h2 className="font-serif text-xl font-semibold text-tinta">{titulo}</h2>
    </div>
  );
}

export function FormularioSalida({
  consultar,
  enviar,
  habeas,
  dominioCorreo,
  preguntas,
  sesion,
}: {
  consultar: (fd: FormData) => Promise<ResultadoConsulta>;
  enviar: (fd: FormData) => Promise<ResultadoEnvio>;
  habeas: { id: string; texto: string; urlPolitica: string | null };
  dominioCorreo: string | null;
  preguntas: Pregunta[];
  sesion: string;
}) {
  const paso1 = useEnvio(consultar);
  const paso2 = useEnvio(enviar);
  const ref1 = useFocoError(paso1.resultado, paso1.errorRed);
  const ref2 = useFocoError(paso2.resultado, paso2.errorRed);

  if (paso2.resultado?.ok) {
    return (
      <Constancia
        titulo="Salida registrada"
        nombre={paso2.resultado.nombres}
        sesion={sesion}
        registradoEn={paso2.resultado.registradoEn}
        nota="Gracias por evaluar la sesión. Ya puede cerrar esta página."
      />
    );
  }

  const consulta = paso1.resultado?.ok ? paso1.resultado : null;
  if (!consulta) {
    const r = paso1.resultado;
    const errores = r && !r.ok ? r.errores : {};
    return (
      <form ref={ref1} onSubmit={paso1.onSubmit} className="space-y-4">
        <Pasos actual={1} titulo="Su documento" />
        <CamposDocumento errores={errores} />
        {r && !r.ok && r.mensaje && <MensajeEstado tono="error" titulo="No disponible" texto={r.mensaje} />}
        {paso1.errorRed && <MensajeEstado tono="error" titulo="Sin conexión" texto={SIN_CONEXION} />}
        <div className="pt-2">
          <Boton type="submit" disabled={paso1.pendiente}>
            {paso1.pendiente ? 'Buscando…' : 'Continuar'}
          </Boton>
        </div>
      </form>
    );
  }

  const r2 = paso2.resultado;
  const errores = r2 && !r2.ok ? r2.errores : {};
  return (
    <form ref={ref2} onSubmit={paso2.onSubmit} className="relative space-y-8">
      <CampoTrampa />
      <input type="hidden" name="tipo_documento" value={consulta.documento.tipo_documento} />
      <input type="hidden" name="numero_documento" value={consulta.documento.numero_documento} />
      <div>
        <Pasos actual={2} titulo="Evaluación de la sesión" />
        {consulta.encontrado ? (
          <p className="text-lg text-tinta">
            Hola, <span className="font-semibold">{consulta.nombres}</span>
          </p>
        ) : (
          <MensajeEstado
            titulo="No encontramos su registro de entrada"
            texto="Complete sus datos para registrar la salida."
          />
        )}
      </div>
      {!consulta.encontrado && (
        <>
          <Grupo titulo="Sus datos">
            <CamposPersonales errores={errores} dominioCorreo={dominioCorreo} />
          </Grupo>
          <CajaHabeas habeas={habeas} error={errores.acepta_habeas} />
        </>
      )}
      <PreguntasEncuesta preguntas={preguntas} errores={errores} />
      <div className="space-y-4">
        {r2 && !r2.ok && r2.mensaje && <MensajeEstado tono="error" titulo="No se pudo registrar" texto={r2.mensaje} />}
        {paso2.errorRed && <MensajeEstado tono="error" titulo="Sin conexión" texto={SIN_CONEXION} />}
        <Boton type="submit" disabled={paso2.pendiente}>
          {paso2.pendiente ? 'Enviando…' : 'Enviar evaluación y registrar salida'}
        </Boton>
        <button
          type="button"
          onClick={() => {
            paso1.reiniciar();
            paso2.reiniciar();
          }}
          className="min-h-11 w-full text-[0.9375rem] font-medium text-apagado underline underline-offset-2"
        >
          Cambiar documento
        </button>
      </div>
    </form>
  );
}
