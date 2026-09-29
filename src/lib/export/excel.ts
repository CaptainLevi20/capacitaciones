import ExcelJS from 'exceljs';
import type { Pregunta } from '@/lib/domain/encuesta';
import { ETIQUETA_ESTADO_ASISTENCIA, resumir } from '@/lib/domain/resumen';
import { formatearFechaHora } from '@/lib/domain/fechas';
import type { FilaConsolidada } from '@/lib/repo/consolidado';

export interface DatosLibro {
  eventoNombre: string;
  preguntas: Pregunta[];
  sesiones: { numero: number; inicio: Date; titulo: string | null }[];
  filas: FilaConsolidada[];
}

export async function construirLibro(d: DatosLibro): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Avance Jurídico';
  const escala = d.preguntas.filter((p) => p.tipo === 'escala_1_5');
  const preguntaNps = d.preguntas.find((p) => p.tipo === 'nps_0_10');

  const hojaResumen = wb.addWorksheet('Resumen');
  hojaResumen.addRow([d.eventoNombre]).font = { bold: true, size: 14 };
  hojaResumen.addRow([]);
  hojaResumen.addRow([
    'Sesión', 'Fecha', 'Entradas', 'Salidas', 'Completas', 'Solo entrada', 'Sin entrada',
    ...escala.map((p) => p.texto), 'NPS',
  ]).font = { bold: true };
  const agregarResumen = (etiqueta: string, fecha: string, filas: FilaConsolidada[]) => {
    const r = resumir(d.preguntas, filas);
    hojaResumen.addRow([
      etiqueta, fecha, r.entradas, r.salidas, r.completas, r.soloEntrada, r.sinEntrada,
      ...escala.map((p) => r.promedios[p.clave]), r.nps,
    ]);
  };
  for (const s of d.sesiones) {
    agregarResumen(`Sesión ${s.numero}`, formatearFechaHora(s.inicio), d.filas.filter((f) => f.sesion_numero === s.numero));
  }
  agregarResumen('Total', '', d.filas);
  hojaResumen.columns.forEach((c) => (c.width = 16));

  for (const s of d.sesiones) {
    const hoja = wb.addWorksheet(`Sesión ${s.numero}`);
    hoja.addRow([
      'Tipo doc.', 'Documento', 'Nombres', 'Apellidos', 'Correo', 'Dependencia', 'Cargo', 'Entrada', 'Salida', 'Estado',
      ...escala.map((p) => p.texto), ...(preguntaNps ? [preguntaNps.texto] : []), 'Comentario',
    ]).font = { bold: true };
    for (const f of d.filas.filter((x) => x.sesion_numero === s.numero)) {
      hoja.addRow([
        f.tipo_documento, f.numero_documento, f.nombres, f.apellidos, f.correo, f.dependencia, f.cargo,
        f.entrada_at ? formatearFechaHora(f.entrada_at) : '',
        f.salida_at ? formatearFechaHora(f.salida_at) : '',
        ETIQUETA_ESTADO_ASISTENCIA[f.estado_asistencia],
        ...escala.map((p) => f.respuestas?.[p.clave] ?? ''),
        ...(preguntaNps ? [f.respuestas?.[preguntaNps.clave] ?? ''] : []),
        f.comentario ?? '',
      ]);
    }
    hoja.columns.forEach((c) => (c.width = 18));
  }
  return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}
