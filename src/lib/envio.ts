export type ResultadoEnvio =
  | { ok: true; nombres: string }
  | { ok: false; errores: Record<string, string>; mensaje?: string };

export type ResultadoAccion = { ok: true; mensaje?: string } | { ok: false; error: string };
