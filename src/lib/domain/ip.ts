import { isIP } from 'node:net';

export function ipDesdeCabeceras(xff: string | null, realIp: string | null): string | null {
  const candidata = xff?.split(',')[0]?.trim() || realIp?.trim() || '';
  return isIP(candidata) ? candidata : null;
}
