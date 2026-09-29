import { z } from 'zod';
import { TIPOS_DOCUMENTO } from './constantes';
import { normalizarDocumento } from './documento';
import type { Pregunta } from './encuesta';

const texto = (mensaje: string, max = 150) =>
  z.string({ required_error: mensaje }).trim().min(2, mensaje).max(max, `Máximo ${max} caracteres`);

export const documentoSchema = z.object({
  tipo_documento: z.enum(TIPOS_DOCUMENTO, {
    errorMap: () => ({ message: 'Seleccione el tipo de documento' }),
  }),
  numero_documento: z
    .string({ required_error: 'Ingrese su número de documento' })
    .transform(normalizarDocumento)
    .pipe(z.string().regex(/^[A-Z0-9]{3,20}$/, 'Número de documento no válido')),
});

export const datosPersonalesSchema = documentoSchema.extend({
  nombres: texto('Ingrese sus nombres', 100),
  apellidos: texto('Ingrese sus apellidos', 100),
  correo: z
    .string({ required_error: 'Ingrese su correo' })
    .trim()
    .toLowerCase()
    .email('Correo no válido')
    .max(150, 'Máximo 150 caracteres'),
  dependencia: texto('Ingrese su dependencia'),
  cargo: texto('Ingrese su cargo'),
});

export const entradaSchema = datosPersonalesSchema.extend({
  acepta_habeas: z.literal('on', {
    errorMap: () => ({ message: 'Debe autorizar el tratamiento de datos personales para continuar' }),
  }),
});

export type DatosPersonales = z.infer<typeof datosPersonalesSchema>;

const numeroEnRango = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? undefined : Number(v)),
    z
      .number({ required_error: 'Seleccione una opción', invalid_type_error: 'Seleccione una opción' })
      .int('Seleccione una opción')
      .min(min, 'Seleccione una opción')
      .max(max, 'Seleccione una opción'),
  );

export function encuestaSchema(preguntas: Pregunta[]) {
  const forma: Record<string, z.ZodTypeAny> = {};
  for (const p of preguntas.filter((x) => x.activa)) {
    const clave = `p_${p.clave}`;
    if (p.tipo === 'escala_1_5') forma[clave] = numeroEnRango(1, 5);
    else if (p.tipo === 'nps_0_10') forma[clave] = numeroEnRango(0, 10);
    else forma[clave] = z.string().trim().max(1000, 'Máximo 1000 caracteres').optional();
  }
  return z.object(forma);
}

export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? '_');
    if (!errores[campo]) errores[campo] = issue.message;
  }
  return errores;
}
