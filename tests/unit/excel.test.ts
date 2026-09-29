import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { construirLibro } from '@/lib/export/excel';
import type { FilaConsolidada } from '@/lib/repo/consolidado';
import type { Pregunta } from '@/lib/domain/encuesta';

const preguntas: Pregunta[] = [
  { clave: 'contenido', tipo: 'escala_1_5', texto: 'Contenido', orden: 1, activa: true },
  { clave: 'nps', tipo: 'nps_0_10', texto: 'Recomendación', orden: 2, activa: true },
  { clave: 'comentario', tipo: 'texto', texto: 'Comentarios', orden: 3, activa: true },
];

function fila(p: Partial<FilaConsolidada>): FilaConsolidada {
  return {
    evento_id: 'e', evento_nombre: 'Evento', sesion_id: 's1', sesion_numero: 1, sesion_inicio: '2026-10-14T13:00:00Z',
    asistente_id: 'a', tipo_documento: 'CC', numero_documento: '1020345678', nombres: 'Ana', apellidos: 'Pérez',
    correo: 'a@x.co', dependencia: 'Delegada', cargo: 'Profesional', entrada_at: '2026-10-14T12:50:00Z',
    salida_at: '2026-10-14T17:05:00Z', estado_asistencia: 'completa', respuestas: { contenido: 5, nps: 10 },
    comentario: 'Bien', promedio_escala: 5, nps: 10, ...p,
  };
}

describe('construirLibro', () => {
  it('crea la hoja Resumen y una hoja por sesión, y guarda el texto sin interpretarlo como fórmula', async () => {
    const buf = await construirLibro({
      eventoNombre: 'Capacitación PGN 2026',
      preguntas,
      sesiones: [
        { numero: 1, inicio: new Date('2026-10-14T13:00:00Z'), titulo: null },
        { numero: 2, inicio: new Date('2026-10-21T13:00:00Z'), titulo: 'Segunda' },
      ],
      filas: [fila({ nombres: '=HYPERLINK("http://x")' })],
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Resumen', 'Sesión 1', 'Sesión 2']);
    const h1 = wb.getWorksheet('Sesión 1')!;
    expect(h1.getRow(1).getCell(1).value).toBe('Tipo doc.');
    expect(h1.getRow(2).getCell(3).value).toBe('=HYPERLINK("http://x")');
    expect(h1.getRow(2).getCell(10).value).toBe('Completa');
    expect(h1.getRow(2).getCell(11).value).toBe(5);
    expect(h1.getRow(2).getCell(12).value).toBe(10);
    expect(h1.getRow(2).getCell(13).value).toBe('Bien');
    const res = wb.getWorksheet('Resumen')!;
    expect(res.getRow(1).getCell(1).value).toBe('Capacitación PGN 2026');
    expect(res.getRow(4).getCell(1).value).toBe('Sesión 1');
    expect(res.getRow(4).getCell(3).value).toBe(1);
    expect(res.getRow(5).getCell(3).value).toBe(0);
    expect(res.getRow(6).getCell(1).value).toBe('Total');
  });
});
