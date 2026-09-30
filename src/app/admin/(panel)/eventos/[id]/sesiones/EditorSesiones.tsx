'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  filaInicial,
  siguienteFila,
  validarFilasSesion,
  type FilaSesionEntrada,
} from '@/lib/domain/sesiones-masivas';
import { useEnvio } from '@/components/useEnvio';
import type { ResultadoAccion } from '@/lib/envio';
import { claseBoton, claseInput } from '@/components/admin/estilos';

type Fila = FilaSesionEntrada & { clave: number };

const claseCelda = `${claseInput} mt-0`;

export function EditorSesiones({
  accion,
  siguienteNumero,
}: {
  accion: (fd: FormData) => Promise<ResultadoAccion>;
  siguienteNumero: number;
}) {
  const claves = useRef(1);
  const nueva = (f: FilaSesionEntrada): Fila => ({ ...f, clave: claves.current++ });
  const [filas, setFilas] = useState<Fila[]>(() => [nueva(filaInicial(siguienteNumero))]);
  const [erroresFila, setErroresFila] = useState<Record<number, string>>({});
  const { onSubmit, pendiente, resultado, errorRed } = useEnvio(accion);

  // Tras crear las sesiones, deja una sola fila lista para la siguiente.
  useEffect(() => {
    if (!resultado?.ok) return;
    setFilas((prev) => {
      const mayor = Math.max(...prev.map((f) => Number(f.numero) || 0));
      return [nueva({ ...siguienteFila(prev[prev.length - 1]), numero: String(mayor + 1) })];
    });
    setErroresFila({});
  }, [resultado]);

  function actualizar(indice: number, campo: keyof FilaSesionEntrada, valor: string) {
    setFilas((prev) => prev.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)));
  }
  function agregar() {
    setFilas((prev) => [...prev, nueva(siguienteFila(prev[prev.length - 1]))]);
  }
  function quitar(indice: number) {
    setFilas((prev) => prev.filter((_, i) => i !== indice));
    setErroresFila({});
  }
  function enviar(e: FormEvent<HTMLFormElement>) {
    const { errores } = validarFilasSesion(filas);
    setErroresFila(Object.fromEntries(errores.map((x) => [x.indice, x.mensaje])));
    if (errores.length) {
      e.preventDefault();
      return;
    }
    onSubmit(e);
  }

  const json = JSON.stringify(
    filas.map((f) => ({
      numero: f.numero,
      fecha: f.fecha,
      horaInicio: f.horaInicio,
      horaFin: f.horaFin,
      titulo: f.titulo,
      lugar: f.lugar,
    })),
  );
  const listaErrores = Object.entries(erroresFila);

  return (
    <form onSubmit={enviar} className="space-y-3">
      <input type="hidden" name="filas_json" value={json} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-apagado">
              <th className="pb-1 pr-2">Nº</th>
              <th className="pb-1 pr-2">Fecha</th>
              <th className="pb-1 pr-2">Inicio</th>
              <th className="pb-1 pr-2">Fin</th>
              <th className="pb-1 pr-2">Título (opcional)</th>
              <th className="pb-1 pr-2">Lugar (opcional)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => {
              const n = i + 1;
              return (
                <tr key={f.clave} className={erroresFila[i] ? 'bg-peligro-suave' : ''}>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={1}
                      aria-label={`Número de la sesión (fila ${n})`}
                      value={f.numero}
                      onChange={(e) => actualizar(i, 'numero', e.target.value)}
                      className={`${claseCelda} w-20`}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="date"
                      aria-label={`Fecha (fila ${n})`}
                      value={f.fecha}
                      onChange={(e) => actualizar(i, 'fecha', e.target.value)}
                      className={claseCelda}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="time"
                      aria-label={`Hora de inicio (fila ${n})`}
                      value={f.horaInicio}
                      onChange={(e) => actualizar(i, 'horaInicio', e.target.value)}
                      className={claseCelda}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="time"
                      aria-label={`Hora de fin (fila ${n})`}
                      value={f.horaFin}
                      onChange={(e) => actualizar(i, 'horaFin', e.target.value)}
                      className={claseCelda}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      aria-label={`Título (fila ${n})`}
                      value={f.titulo}
                      maxLength={200}
                      onChange={(e) => actualizar(i, 'titulo', e.target.value)}
                      className={claseCelda}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      aria-label={`Lugar (fila ${n})`}
                      value={f.lugar}
                      maxLength={200}
                      onChange={(e) => actualizar(i, 'lugar', e.target.value)}
                      className={claseCelda}
                    />
                  </td>
                  <td className="py-1">
                    <button
                      type="button"
                      onClick={() => quitar(i)}
                      disabled={filas.length === 1}
                      aria-label={`Quitar fila ${n}`}
                      title="Quitar fila"
                      className="px-2 text-apagado hover:text-peligro disabled:opacity-30"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {listaErrores.length > 0 && (
        <ul role="alert" className="space-y-1 text-sm text-peligro">
          {listaErrores.map(([indice, mensaje]) => (
            <li key={indice}>
              Fila {Number(indice) + 1}: {mensaje}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={agregar} className={claseBoton.secundario}>
          + Agregar sesión
        </button>
        <button type="submit" disabled={pendiente} className={claseBoton.primario}>
          {pendiente ? 'Procesando…' : 'Crear sesiones'}
        </button>
        {resultado?.ok && resultado.mensaje && (
          <span role="status" className="text-sm text-exito">
            {resultado.mensaje}
          </span>
        )}
        {resultado && !resultado.ok && (
          <span role="alert" className="text-sm text-peligro">
            {resultado.error}
          </span>
        )}
        {errorRed && (
          <span role="alert" className="text-sm text-peligro">
            No se pudo conectar. Intente de nuevo.
          </span>
        )}
      </div>
    </form>
  );
}
