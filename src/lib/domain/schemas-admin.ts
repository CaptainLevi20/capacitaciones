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

export const eventoSchema = z.object({
  nombre: z.string().trim().min(3, 'Ingrese el nombre del evento').max(150, 'Máximo 150 caracteres'),
  cliente: opcional(150),
  capacitadores: opcional(300),
  dominio_correo: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v.replace(/^@/, ''))
    .pipe(z.string().regex(/^(([a-z0-9-]+\.)+[a-z]{2,})?$/, 'Dominio no válido (ej. procuraduria.gov.co)'))
    .transform((v) => v || null),
  color_primario: colorSchema,
});
export type DatosEvento = z.infer<typeof eventoSchema>;
export const CAMPOS_EVENTO = ['nombre', 'cliente', 'capacitadores', 'dominio_correo', 'color_primario'];

export const habeasSchema = z.object({
  texto: z.string().trim().min(20, 'El texto de autorización es demasiado corto'),
  url_politica: z
    .string()
    .trim()
    .url('Enlace no válido')
    .or(z.literal(''))
    .transform((v) => v || null),
});

export const marcasEventoSchema = z.array(
  z.object({ marcaId: z.string().uuid(), orden: z.number().int().min(0), visible: z.boolean() }),
);
