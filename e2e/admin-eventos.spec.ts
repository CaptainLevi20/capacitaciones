import { expect, test } from '@playwright/test';
import { clienteServicioPrueba, limpiarDatos } from '../tests/integration/helpers';
import { iniciarSesionAdmin } from './utilidades';

test.beforeEach(async () => {
  await limpiarDatos();
});

test('crea, configura, activa y duplica un evento', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.getByRole('link', { name: 'Nuevo evento' }).click();
  await page.getByLabel('Nombre del evento').fill('Capacitación PGN 2026');
  await page.getByLabel('Cliente').fill('Procuraduría General de la Nación');
  await page.getByLabel('Dominio de correo esperado').fill('procuraduria.gov.co');
  await page.getByRole('button', { name: 'Crear evento' }).click();
  await expect(page.getByRole('heading', { name: 'Capacitación PGN 2026' })).toBeVisible();

  const co = page.getByTestId('seccion-cobranding');
  await co.getByLabel('Avance Jurídico', { exact: true }).check();
  await expect(co.getByTestId('encabezado-marcas')).toContainText('Avance Jurídico');
  await co.getByRole('button', { name: 'Guardar co-branding' }).click();
  await expect(co.getByText('Co-branding guardado')).toBeVisible();

  const estado = page.getByTestId('seccion-estado');
  await estado.getByRole('button', { name: 'Activar evento' }).click();
  await expect(estado.getByText(/el texto de Habeas Data sigue siendo el provisional/)).toBeVisible();

  const habeas = page.getByTestId('seccion-habeas');
  await habeas
    .getByLabel('Texto de la autorización')
    .fill('Autorizo a Avance Jurídico el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.');
  await habeas.getByRole('button', { name: 'Guardar nueva versión' }).click();
  await expect(habeas.getByText('Versión 2 vigente')).toBeVisible();

  await page.reload();
  await page.getByTestId('seccion-estado').getByRole('button', { name: 'Activar evento' }).click();
  await expect(page.getByTestId('seccion-estado').getByText('Estado actual: Activo')).toBeVisible();

  await page.getByRole('button', { name: 'Duplicar evento' }).click();
  await expect(page.getByRole('heading', { name: 'Capacitación PGN 2026 (copia)' })).toBeVisible();
});

test('edita las preguntas de la encuesta', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.getByRole('link', { name: 'Nuevo evento' }).click();
  await page.getByLabel('Nombre del evento').fill('Evento encuesta');
  await page.getByRole('button', { name: 'Crear evento' }).click();
  const enc = page.getByTestId('seccion-encuesta');
  await enc.getByLabel('Activar pregunta logistica').uncheck();
  await enc.getByLabel('Texto de la pregunta contenido').fill('¿El contenido fue claro?');
  await enc.getByRole('button', { name: 'Guardar encuesta' }).click();
  await expect(enc.getByText('Encuesta guardada')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('seccion-encuesta').getByLabel('Activar pregunta logistica')).not.toBeChecked();
});

test('elige el color del evento con el selector', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.getByRole('link', { name: 'Nuevo evento' }).click();
  await page.getByLabel('Nombre del evento').fill('Evento con color');
  await page.getByLabel('Color principal: selector').fill('#8b0000');
  await expect(page.getByLabel('Color principal: código')).toHaveValue('#8B0000');
  await page.getByRole('button', { name: 'Crear evento' }).click();
  await expect(page.getByRole('heading', { name: 'Evento con color' })).toBeVisible();
  const { data } = await clienteServicioPrueba().from('eventos').select('color_primario').eq('nombre', 'Evento con color').single();
  expect(data!.color_primario).toBe('#8B0000');
});
