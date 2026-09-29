import { expect, test } from '@playwright/test';
import { crearUsuarioPrueba, limpiarDatos } from '../tests/integration/helpers';
import { iniciarSesion, iniciarSesionAdmin } from './utilidades';

test.beforeEach(async () => {
  await limpiarDatos();
});

test('sin sesión, /admin redirige al login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('un administrador entra al panel y puede salir', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('contraseña incorrecta muestra un error', async ({ page }) => {
  const u = await crearUsuarioPrueba(true);
  await iniciarSesion(page, u.email, 'incorrecta-123');
  await expect(page.getByText('Correo o contraseña incorrectos')).toBeVisible();
});

test('un usuario que no es administrador no entra', async ({ page }) => {
  const u = await crearUsuarioPrueba(false);
  await iniciarSesion(page, u.email, u.password);
  await expect(page.getByText('Su usuario no tiene permisos de administrador.')).toBeVisible();
});
