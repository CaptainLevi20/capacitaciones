export const LOGO_MAX_BYTES = 1_048_576;
export const LOGO_TIPOS = { 'image/png': 'png', 'image/svg+xml': 'svg', 'image/jpeg': 'jpg' } as const;

export function validarLogo(archivo: { type: string; size: number }): string | null {
  if (!(archivo.type in LOGO_TIPOS)) return 'El logo debe ser PNG, SVG o JPG';
  if (archivo.size === 0) return 'El archivo está vacío';
  if (archivo.size > LOGO_MAX_BYTES) return 'El logo no puede superar 1 MB';
  return null;
}
