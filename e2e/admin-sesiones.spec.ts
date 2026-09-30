import { expect, test } from '@playwright/test';
import { clienteServicioPrueba, crearEventoPrueba, limpiarDatos } from '../tests/integration/helpers';
import { iniciarSesionAdmin } from './utilidades';

test.beforeEach(async () => {
  await limpiarDatos();
});

test('crea sesiones con los selectores y las abre y cierra', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba()); // ya trae la sesión 1
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/sesiones`);
  await expect(page.getByLabel('Número de la sesión (fila 1)')).toHaveValue('2');
  await page.getByLabel('Fecha (fila 1)').fill('2099-10-21');
  await page.getByLabel('Hora de inicio (fila 1)').fill('08:00');
  await page.getByLabel('Hora de fin (fila 1)').fill('12:00');
  await page.getByLabel('Título (fila 1)').fill('Régimen disciplinario');
  await page.getByLabel('Lugar (fila 1)').fill('Auditorio');
  await page.getByRole('button', { name: '+ Agregar sesión' }).click();
  await expect(page.getByLabel('Número de la sesión (fila 2)')).toHaveValue('3');
  await expect(page.getByLabel('Fecha (fila 2)')).toHaveValue('2099-10-28');
  await expect(page.getByLabel('Lugar (fila 2)')).toHaveValue('Auditorio');
  await page.getByLabel('Título (fila 2)').fill('Sesión tres');
  await page.getByRole('button', { name: 'Crear sesiones' }).click();
  await expect(page.getByText('2 sesiones creadas')).toBeVisible();

  const tabla = page.getByTestId('tabla-sesiones');
  await expect(tabla.getByRole('row')).toHaveCount(4); // encabezado + 3 sesiones
  const fila = tabla.getByRole('row', { name: /Régimen disciplinario/ });
  await expect(fila).toContainText('Programada');
  await fila.getByRole('button', { name: 'Abrir', exact: true }).click();
  await expect(fila).toContainText('Abierta (manual)');
  await fila.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(fila).toContainText('Cerrada (manual)');
  await fila.getByRole('button', { name: 'QR y más' }).click();
  await fila.getByRole('button', { name: 'Volver a apertura automática' }).click();
  await expect(fila).toContainText('Programada');
});

test('marca la fila con error y no crea ninguna sesión', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/sesiones`);
  await page.getByLabel('Fecha (fila 1)').fill('2099-10-21');
  await page.getByRole('button', { name: '+ Agregar sesión' }).click();
  await page.getByLabel('Hora de fin (fila 2)').fill('07:00');
  await page.getByRole('button', { name: 'Crear sesiones' }).click();
  await expect(page.getByText('Fila 2: la hora de fin debe ser posterior a la de inicio')).toBeVisible();
  await expect(page.getByTestId('tabla-sesiones').getByRole('row')).toHaveCount(2); // encabezado + sesión 1
});

test('pegar desde Excel sigue funcionando y reporta errores por línea', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/sesiones`);
  await page.getByText('Pegar desde Excel').click();
  await page.getByLabel('Filas de sesiones').fill('5;2026-02-31;08:00;12:00');
  await page.getByRole('button', { name: 'Crear desde texto' }).click();
  await expect(page.getByText('Línea 1: fecha u hora no válida')).toBeVisible();
  await page.getByLabel('Filas de sesiones').fill('5	04/11/2099	08:00	12:00	Sesión cinco');
  await page.getByRole('button', { name: 'Crear desde texto' }).click();
  await expect(page.getByText('1 sesión creada')).toBeVisible();
  await expect(page.getByTestId('tabla-sesiones').getByRole('row', { name: /Sesión cinco/ })).toBeVisible();
});

test('edita una sesión', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/sesiones`);
  await page.getByTestId('tabla-sesiones').getByRole('row', { name: /Sesión de prueba/ }).getByRole('link', { name: 'Editar' }).click();
  await page.getByLabel('Título').fill('Sesión inaugural');
  await page.getByRole('button', { name: 'Guardar sesión' }).click();
  await expect(page.getByText('Sesión guardada')).toBeVisible();
});

test('descarga el QR y muestra la hoja imprimible', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/sesiones`);
  const fila = page.getByTestId('tabla-sesiones').getByRole('row', { name: /Sesión de prueba/ });
  await fila.getByRole('button', { name: 'QR y más' }).click();
  const descarga = page.waitForEvent('download');
  await fila.getByRole('link', { name: 'QR entrada' }).click();
  expect((await descarga).suggestedFilename()).toBe('sesion-1-entrada.png');
  await fila.getByRole('link', { name: 'Hoja imprimible' }).click();
  await expect(page.getByText('ENTRADA', { exact: true })).toBeVisible();
  await expect(page.getByText('SALIDA', { exact: true })).toBeVisible();
  await expect(page.getByText(`/r/${ev.tokenEntrada}`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Imprimir / Guardar como PDF' })).toBeVisible();
});
