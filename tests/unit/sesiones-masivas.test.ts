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

import { filaInicial, siguienteFila, validarFilasSesion } from '@/lib/domain/sesiones-masivas';

describe('validarFilasSesion', () => {
  it('valida las filas del formulario y atribuye cada error a su fila', () => {
    const r = validarFilasSesion([
      { numero: '1', fecha: '2026-10-14', horaInicio: '08:00', horaFin: '12:00', titulo: ' Uno; con punto y coma ', lugar: '' },
      { numero: '2', fecha: '', horaInicio: '08:00', horaFin: '12:00', titulo: '', lugar: '' },
      { numero: '1', fecha: '2026-10-21', horaInicio: '08:00', horaFin: '12:00', titulo: '', lugar: '' },
      { numero: '4', fecha: '2026-10-28', horaInicio: '12:00', horaFin: '08:00', titulo: '', lugar: '' },
      { numero: '', fecha: '2026-11-04', horaInicio: '08:00', horaFin: '12:00', titulo: '', lugar: '' },
    ]);
    expect(r.filas).toEqual([
      {
        numero: 1,
        inicio: new Date('2026-10-14T13:00:00Z'),
        fin: new Date('2026-10-14T17:00:00Z'),
        titulo: 'Uno; con punto y coma',
        lugar: null,
      },
    ]);
    expect(r.errores).toEqual([
      { indice: 1, mensaje: 'complete la fecha y las horas' },
      { indice: 2, mensaje: 'número de sesión repetido (1)' },
      { indice: 3, mensaje: 'la hora de fin debe ser posterior a la de inicio' },
      { indice: 4, mensaje: 'número de sesión no válido' },
    ]);
  });
});

describe('filas prellenadas', () => {
  it('filaInicial usa el número dado y un horario de mañana', () => {
    expect(filaInicial(5)).toEqual({ numero: '5', fecha: '', horaInicio: '08:00', horaFin: '12:00', titulo: '', lugar: '' });
  });
  it('siguienteFila suma 1 al número y 7 días a la fecha, y conserva horario y lugar', () => {
    expect(
      siguienteFila({ numero: '3', fecha: '2026-12-30', horaInicio: '14:00', horaFin: '18:00', titulo: 'x', lugar: 'Auditorio' }),
    ).toEqual({ numero: '4', fecha: '2027-01-06', horaInicio: '14:00', horaFin: '18:00', titulo: '', lugar: 'Auditorio' });
  });
  it('siguienteFila deja la fecha vacía si la anterior no tiene', () => {
    expect(siguienteFila(filaInicial(1)).fecha).toBe('');
  });
});
