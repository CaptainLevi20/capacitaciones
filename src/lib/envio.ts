export type ResultadoEnvio =
  | { ok: true; nombres: string }
  | { ok: false; errores: Record<string, string>; mensaje?: string };

export const MENSAJE_HABEAS_CAMBIO =
  'La autorización de tratamiento de datos cambió. Recargue la página, léala y vuelva a aceptarla.';

export type ResultadoAccion = { ok: true; mensaje?: string } | { ok: false; error: string };
