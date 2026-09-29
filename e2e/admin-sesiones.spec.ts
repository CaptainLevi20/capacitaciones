import { expect, test } from '@playwright/test';
import { clienteServicioPrueba, crearEventoPrueba, limpiarDatos } from '../tests/integration/helpers';
import { iniciarSesionAdmin } from './utilidades';

test.beforeEach(async () => {
  await limpiarDatos();
});

test('crea sesiones pegando filas y las abre y cierra', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/sesiones`);
  await page
    .getByLabel('Filas de sesiones')
    .fill('2;2099-10-21;08:00;12:00;Régimen disciplinario;Auditorio\n3\t28/10/2099\t08:00\t12:00\tSesión tres');
  await page.getByRole('button', { name: 'Crear sesiones' }).click();
  await expect(page.getByText('2 sesiones creadas')).toBeVisible();

  const fila = page.getByRole('row', { name: /Régimen disciplinario/ });
  await expect(fila).toContainText('Programada');
  await fila.getByRole('button', { name: 'Abrir', exact: true }).click();
  await expect(fila).toContainText('Abierta (manual)');
  await fila.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(fila).toContainText('Cerrada (manual)');
  await fila.getByRole('button', { name: 'Automático', exact: true }).click();
  await expect(fila).toContainText('Programada');
});

test('rechaza filas con errores sin crear nada', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/sesiones`);
  await page.getByLabel('Filas de sesiones').fill('5;2026-02-31;08:00;12:00');
  await page.getByRole('button', { name: 'Crear sesiones' }).click();
  await expect(page.getByText('Línea 1: fecha u hora no válida')).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(2); // encabezado + sesión 1
});

test('edita una sesión', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/sesiones`);
  await page.getByRole('row', { name: /Sesión de prueba/ }).getByRole('link', { name: 'Editar' }).click();
  await page.getByLabel('Título').fill('Sesión inaugural');
  await page.getByRole('button', { name: 'Guardar sesión' }).click();
  await expect(page.getByText('Sesión guardada')).toBeVisible();
});

test('descarga el QR y muestra la hoja imprimible', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/sesiones`);
  const fila = page.getByRole('row', { name: /Sesión de prueba/ });
  const descarga = page.waitForEvent('download');
  await fila.getByRole('link', { name: 'QR entrada' }).click();
  expect((await descarga).suggestedFilename()).toBe('sesion-1-entrada.png');
  await fila.getByRole('link', { name: 'Hoja imprimible' }).click();
  await expect(page.getByText('ENTRADA', { exact: true })).toBeVisible();
  await expect(page.getByText('SALIDA', { exact: true })).toBeVisible();
  await expect(page.getByText(`/r/${ev.tokenEntrada}`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Imprimir / Guardar como PDF' })).toBeVisible();
});
