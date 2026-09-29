import { expect, test } from '@playwright/test';
import { registrarEntrada, registrarSalida } from '@/lib/repo/registro';
import { clienteServicioPrueba, crearEventoPrueba, datosPersona, limpiarDatos } from '../tests/integration/helpers';
import { iniciarSesionAdmin } from './utilidades';

test.beforeEach(async () => {
  await limpiarDatos();
});

test('muestra el consolidado, el resumen y exporta a Excel', async ({ page }) => {
  const db = clienteServicioPrueba();
  const ev = await crearEventoPrueba(db);
  const s = { id: ev.sesionId, habeasId: ev.habeasId };
  const sinMeta = { ip: null, userAgent: null };
  await registrarEntrada(db, s, datosPersona('1020345678'), sinMeta);
  await registrarSalida(
    db,
    s,
    {
      documento: { tipo_documento: 'CC', numero_documento: '1020345678' },
      personales: null,
      respuestas: { contenido: 5, expositor: 5, metodologia: 4, utilidad: 4, logistica: 5, nps: 10 },
      comentario: 'Excelente',
    },
    sinMeta,
  );
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/datos`);
  await expect(page.getByRole('row', { name: /Pérez Gómez/ })).toContainText('Completa');
  await expect(page.getByTestId('resumen-sesion-1')).toContainText('100');
  await expect(page.getByText('Excelente')).toBeAttached();

  await page.getByLabel('Estado').selectOption('solo_entrada');
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page.getByText('No hay registros con estos filtros.')).toBeVisible();

  const descarga = page.waitForEvent('download');
  await page.getByRole('link', { name: /Descargar Excel/ }).click();
  expect((await descarga).suggestedFilename()).toBe('evento-de-prueba.xlsx');
});
