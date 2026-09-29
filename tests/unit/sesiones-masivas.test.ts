import { describe, expect, it } from 'vitest';
import { parsearSesionesMasivas } from '@/lib/domain/sesiones-masivas';

describe('parsearSesionesMasivas', () => {
  it('acepta punto y coma o tabulador (pegado desde Excel) e ignora líneas vacías', () => {
    const r = parsearSesionesMasivas(
      '1; 2026-10-14; 08:00; 12:00; Régimen disciplinario; Auditorio\n\n2\t21/10/2026\t8:00\t12:00',
    );
    expect(r.errores).toEqual([]);
    expect(r.filas).toHaveLength(2);
    expect(r.filas[0]).toEqual({
      numero: 1,
      inicio: new Date('2026-10-14T13:00:00Z'),
      fin: new Date('2026-10-14T17:00:00Z'),
      titulo: 'Régimen disciplinario',
      lugar: 'Auditorio',
    });
    expect(r.filas[1].titulo).toBeNull();
  });
  it('reporta errores por línea', () => {
    const r = parsearSesionesMasivas('x;2026-10-14;08:00;12:00\n2;2026-02-31;08:00;12:00\n3;2026-10-14;12:00;08:00\n4;2026-10-14');
    expect(r.errores).toEqual([
      'Línea 1: número de sesión no válido',
      'Línea 2: fecha u hora no válida',
      'Línea 3: la hora de fin debe ser posterior a la de inicio',
      'Línea 4: se esperan al menos 4 columnas (número; fecha; hora inicio; hora fin)',
    ]);
  });
  it('detecta números repetidos', () => {
    const r = parsearSesionesMasivas('1;2026-10-14;08:00;12:00\n1;2026-10-21;08:00;12:00');
    expect(r.errores).toEqual(['Línea 2: número de sesión repetido (1)']);
  });
});
