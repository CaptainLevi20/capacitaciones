export type EstadoSesion = 'programada' | 'abierta' | 'cerrada';

export interface VentanaSesion {
  inicio: Date;
  fin: Date;
  modo_apertura: 'manual' | 'automatico';
  estado_manual: 'abierta' | 'cerrada' | null;
  abre_min_antes: number;
  cierra_min_despues: number;
}

export function ventanaApertura(s: VentanaSesion): { abre: Date; cierra: Date } {
  return {
    abre: new Date(s.inicio.getTime() - s.abre_min_antes * 60_000),
    cierra: new Date(s.fin.getTime() + s.cierra_min_despues * 60_000),
  };
}

export function estadoSesion(s: VentanaSesion, ahora: Date): EstadoSesion {
  if (s.modo_apertura === 'manual') {
    if (s.estado_manual === 'abierta') return 'abierta';
    if (s.estado_manual === 'cerrada') return 'cerrada';
    return 'programada';
  }
  const { abre, cierra } = ventanaApertura(s);
  if (ahora < abre) return 'programada';
  if (ahora > cierra) return 'cerrada';
  return 'abierta';
}

// La sesión en curso o, si no hay, la siguiente en empezar.
export function proximaSesion<T extends { inicio: Date; fin: Date }>(sesiones: T[], ahora: Date): T | null {
  const pendientes = sesiones.filter((s) => s.fin > ahora).sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  return pendientes[0] ?? null;
}
