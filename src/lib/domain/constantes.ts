export const ZONA_HORARIA = 'America/Bogota';
export const HABEAS_PENDIENTE = '[PENDIENTE: cláusula oficial de Avance Jurídico]';
export const TIPOS_DOCUMENTO = ['CC', 'CE', 'PA', 'TI'] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];
export const NOMBRE_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  PA: 'Pasaporte',
  TI: 'Tarjeta de identidad',
};
// 300 por (formulario, token, IP) en 10 min: los asistentes comparten la IP pública de la wifi institucional.
export const RATE_LIMIT = { max: 300, ventanaSegundos: 600 };
export type EstadoEvento = 'borrador' | 'activo' | 'archivado';
export const ETIQUETA_EVENTO: Record<EstadoEvento, string> = {
  borrador: 'Borrador',
  activo: 'Activo',
  archivado: 'Archivado',
};
export const ETIQUETA_ESTADO_SESION = { programada: 'Programada', abierta: 'Abierta', cerrada: 'Cerrada' } as const;
export const COLOR_DEFECTO = '#1F3A5F';
