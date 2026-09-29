import { z } from 'zod';
import { ErrorNegocio } from '@/lib/errores';

export function validar<T extends z.ZodTypeAny>(schema: T, valores: unknown): z.infer<T> {
  const r = schema.safeParse(valores);
  if (!r.success) throw new ErrorNegocio(r.error.issues[0].message);
  return r.data;
}

export const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => v || null);

export const colorSchema = z
  .string()
  .trim()
  .regex(/^(#[0-9A-Fa-f]{6})?$/, 'Color no válido (use #RRGGBB)')
  .transform((v) => v || null);

export const casillaSchema = z.preprocess((v) => v === 'on' || v === true, z.boolean());

export const marcaSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingrese el nombre de la marca').max(100, 'Máximo 100 caracteres'),
  color_primario: colorSchema,
  activa: casillaSchema,
});
export type DatosMarca = z.infer<typeof marcaSchema>;
