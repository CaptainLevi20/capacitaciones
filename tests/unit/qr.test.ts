import { describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { qrPng, qrSvg, urlPublica } from '@/lib/qr';

describe('urlPublica', () => {
  it('arma rutas /r y /s sin dobles barras', () => {
    expect(urlPublica('https://x.co/', 'entrada', 'T')).toBe('https://x.co/r/T');
    expect(urlPublica('https://x.co', 'salida', 'T')).toBe('https://x.co/s/T');
  });
});

describe('qrPng', () => {
  it('codifica exactamente la URL', async () => {
    const url = 'https://capacitaciones.avancejuridico.com.co/r/AbCdEfGhIjKlMnOpQrStUv';
    const png = PNG.sync.read(await qrPng(url));
    const leido = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(leido?.data).toBe(url);
  });
});

describe('qrSvg', () => {
  it('devuelve un SVG', async () => {
    expect(await qrSvg('https://x.co/r/T')).toContain('<svg');
  });
});
