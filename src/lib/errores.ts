export class ErrorNegocio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorNegocio';
  }
}

export function mensajeDeError(e: unknown): string {
  if (e instanceof ErrorNegocio) return e.message;
  console.error(e);
  return 'Ocurrió un error inesperado. Intente de nuevo.';
}
