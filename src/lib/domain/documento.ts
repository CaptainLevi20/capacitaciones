export function normalizarDocumento(valor: string): string {
  return valor.toUpperCase().replace(/[\s.\-]/g, '');
}
