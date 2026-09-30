import type { ReactNode } from 'react';
import { ETIQUETA_ESTADO_SESION, ETIQUETA_EVENTO, type EstadoEvento } from '@/lib/domain/constantes';
import type { EstadoSesion } from '@/lib/domain/sesion-estado';

const TONOS = {
  vivo: 'bg-exito-suave text-exito',
  neutro: 'bg-papel text-tinta',
  apagado: 'border border-linea bg-white text-apagado',
} as const;

const PUNTO = { vivo: 'bg-exito', neutro: 'bg-apagado', apagado: 'bg-linea' } as const;

export function Insignia({ tono, children }: { tono: keyof typeof TONOS; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.8125rem] font-medium whitespace-nowrap ${TONOS[tono]}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${PUNTO[tono]}`} />
      {children}
    </span>
  );
}

const TONO_EVENTO = { activo: 'vivo', borrador: 'neutro', archivado: 'apagado' } as const;
const TONO_SESION = { abierta: 'vivo', programada: 'neutro', cerrada: 'apagado' } as const;

export function InsigniaEvento({ estado }: { estado: EstadoEvento }) {
  return <Insignia tono={TONO_EVENTO[estado]}>{ETIQUETA_EVENTO[estado]}</Insignia>;
}

export function InsigniaSesion({ estado, manual }: { estado: EstadoSesion; manual: boolean }) {
  return (
    <Insignia tono={TONO_SESION[estado]}>
      {ETIQUETA_ESTADO_SESION[estado]}
      {manual ? ' (manual)' : ''}
    </Insignia>
  );
}
