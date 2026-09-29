import QRCode from 'qrcode';

export function urlPublica(base: string, tipo: 'entrada' | 'salida', token: string): string {
  return `${base.replace(/\/+$/, '')}/${tipo === 'entrada' ? 'r' : 's'}/${token}`;
}

export function baseUrl(): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (!base) throw new Error('Falta NEXT_PUBLIC_BASE_URL');
  return base;
}

export function qrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { type: 'png', width: 800, margin: 2, errorCorrectionLevel: 'M' });
}

export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
}
