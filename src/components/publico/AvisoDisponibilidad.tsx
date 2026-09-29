import type { SesionPublica } from '@/lib/repo/publico';
import { formatearFechaHora } from '@/lib/domain/fechas';
import { MensajeEstado } from './MensajeEstado';

export function AvisoDisponibilidad({ sesion }: { sesion: SesionPublica }) {
  if (sesion.estado === 'cerrada') {
    return <MensajeEstado titulo="Registro cerrado" texto="El registro para esta sesión ya cerró." />;
  }
  const texto =
    sesion.modoApertura === 'automatico'
      ? `El registro para esta sesión abre el ${formatearFechaHora(sesion.abre)}.`
      : 'El registro para esta sesión aún no está abierto.';
  return <MensajeEstado titulo="Registro aún no disponible" texto={texto} />;
}
