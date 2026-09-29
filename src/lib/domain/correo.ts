export function correoFueraDeDominio(correo: string, dominio: string | null): boolean {
  if (!dominio) return false;
  const esperado = dominio.trim().toLowerCase().replace(/^@/, '');
  const c = correo.trim().toLowerCase();
  if (!c.includes('@')) return false;
  const real = c.split('@').pop()!;
  return real !== esperado && !real.endsWith(`.${esperado}`);
}
