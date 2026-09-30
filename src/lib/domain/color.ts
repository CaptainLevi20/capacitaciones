export const TINTA = '#1A2433';
const BLANCO = '#FFFFFF';
const HEX = /^#([0-9A-Fa-f]{6})$/;

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const canal = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

function contraste(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Color del texto que va encima del color de un evento o marca (botones, sellos): el que más contrasta.
export function colorTextoSobre(fondo: string): string {
  if (!HEX.test(fondo)) return BLANCO;
  const l = luminancia(fondo);
  return contraste(l, 1) >= contraste(l, luminancia(TINTA)) ? BLANCO : TINTA;
}
