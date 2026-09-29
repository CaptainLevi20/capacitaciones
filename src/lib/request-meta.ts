import 'server-only';
import { headers } from 'next/headers';
import { ipDesdeCabeceras } from '@/lib/domain/ip';

export async function metaSolicitud(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  return {
    ip: ipDesdeCabeceras(h.get('x-forwarded-for'), h.get('x-real-ip')),
    userAgent: h.get('user-agent')?.slice(0, 500) ?? null,
  };
}
