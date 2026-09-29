import { randomBytes } from 'node:crypto';

export function generarToken(): string {
  return randomBytes(16).toString('base64url');
}
