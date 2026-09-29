import { expect, test } from '@playwright/test';
import { PNG_1x1, limpiarDatos } from '../tests/integration/helpers';
import { iniciarSesionAdmin } from './utilidades';

test.beforeEach(async () => {
  await limpiarDatos();
});

test('crea una marca con logo', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.getByRole('link', { name: 'Marcas' }).click();
  const nueva = page.getByTestId('nueva-marca');
  await nueva.getByLabel('Nombre').fill('Procuraduría General de la Nación');
  await nueva.getByLabel('Color principal').fill('#003366');
  await nueva.getByLabel('Logo').setInputFiles({ name: 'pgn.png', mimeType: 'image/png', buffer: PNG_1x1 });
  await nueva.getByRole('button', { name: 'Crear marca' }).click();
  await expect(nueva.getByText('Marca creada')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Procuraduría General de la Nación' })).toBeVisible();
});

test('rechaza un logo que no es imagen', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.goto('/admin/marcas');
  const nueva = page.getByTestId('nueva-marca');
  await nueva.getByLabel('Nombre').fill('Otra');
  await nueva
    .getByLabel('Logo')
    .setInputFiles({ name: 'x.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });
  await nueva.getByRole('button', { name: 'Crear marca' }).click();
  await expect(nueva.getByText('El logo debe ser PNG, SVG o JPG')).toBeVisible();
});

test('guarda el texto de Habeas Data por defecto', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.getByRole('link', { name: 'Configuración' }).click();
  await page.getByLabel('Texto de autorización por defecto').fill('Cláusula oficial de Avance Jurídico para pruebas.');
  await page.getByRole('button', { name: 'Guardar configuración' }).click();
  await expect(page.getByText('Configuración guardada')).toBeVisible();
});
