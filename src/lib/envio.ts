export type ResultadoEnvio =
  | { ok: true; nombres: string; registradoEn: string }
  | { ok: false; errores: Record<string, string>; mensaje?: string };

export const MENSAJE_HABEAS_CAMBIO =
  'La autorización de tratamiento de datos cambió. Recargue la página, léala y vuelva a aceptarla.';

export type ResultadoAccion = { ok: true; mensaje?: string } | { ok: false; error: string };

export const MENSAJE_ERROR_SISTEMA =
  'No se pudo guardar el registro por un problema del sistema. Espere unos segundos y presione de nuevo; sus datos se conservan.';
