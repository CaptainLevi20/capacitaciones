import { expect, type Page } from '@playwright/test';
import { crearUsuarioPrueba } from '../tests/integration/helpers';

export async function iniciarSesion(page: Page, email: string, password: string) {
  await page.goto('/admin/login');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

export async function iniciarSesionAdmin(page: Page) {
  const u = await crearUsuarioPrueba(true);
  await iniciarSesion(page, u.email, u.password);
  await expect(page.getByRole('heading', { name: 'Eventos' })).toBeVisible();
}
