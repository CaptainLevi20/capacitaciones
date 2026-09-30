import { expect, test, type Page } from '@playwright/test';
import { clienteServicioPrueba, crearEventoPrueba, limpiarDatos } from '../tests/integration/helpers';

test.beforeEach(async () => {
  await limpiarDatos();
});

async function llenarEntrada(page: Page, documento = '1.020.345.678') {
  await page.getByLabel('Tipo de documento').selectOption('CC');
  await page.getByLabel('Número de documento').fill(documento);
  await page.getByLabel('Nombres').fill('Ana María');
  await page.getByLabel('Apellidos').fill('Pérez Gómez');
  await page.getByLabel('Correo institucional').fill('aperez@procuraduria.gov.co');
  await page.getByLabel('Dependencia').fill('Delegada para Asuntos Civiles');
  await page.getByLabel('Cargo').fill('Profesional');
}

async function expectConstancia(page: Page) {
  const constancia = page.getByTestId('constancia');
  await expect(constancia.getByRole('heading', { name: 'Entrada registrada' })).toBeVisible();
  await expect(constancia).toContainText('Ana María');
  await expect(constancia).toContainText('Sesión 1');
}

const casillaHabeas = (page: Page) => page.getByLabel(/He leído y autorizo/);
const botonRegistrar = (page: Page) => page.getByRole('button', { name: 'Registrar entrada' });

async function contarEntradas(sesionId: string) {
  const { data } = await clienteServicioPrueba().from('entradas').select('id').eq('sesion_id', sesionId);
  return data!.length;
}

test('registra la entrada y guarda el consentimiento', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await page.goto(`/r/${ev.tokenEntrada}`);
  await expect(page.getByRole('heading', { name: 'Evento de prueba' })).toBeVisible();
  await expect(page.getByTestId('texto-habeas')).toContainText('Autorizo el tratamiento');
  await expect(casillaHabeas(page)).not.toBeChecked();
  await llenarEntrada(page);
  await casillaHabeas(page).check();
  await botonRegistrar(page).click();
  await expectConstancia(page);

  const { data } = await clienteServicioPrueba()
    .from('entradas')
    .select('habeas_version_id, consentimiento_at, asistente:asistentes(numero_documento)')
    .eq('sesion_id', ev.sesionId);
  expect(data).toHaveLength(1);
  expect(data![0].habeas_version_id).toBe(ev.habeasId);
  expect(data![0].consentimiento_at).not.toBeNull();
  expect((data![0].asistente as unknown as { numero_documento: string }).numero_documento).toBe('1020345678');
});

test('el servidor rechaza el envío sin autorización de Habeas Data', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await page.goto(`/r/${ev.tokenEntrada}`);
  await llenarEntrada(page);
  await casillaHabeas(page).evaluate((el) => el.removeAttribute('required'));
  await botonRegistrar(page).click();
  await expect(page.getByText('Debe autorizar el tratamiento de datos personales para continuar')).toBeVisible();
  expect(await contarEntradas(ev.sesionId)).toBe(0);
});

test('registrarse dos veces no duplica la entrada', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  for (let i = 0; i < 2; i++) {
    await page.goto(`/r/${ev.tokenEntrada}`);
    await llenarEntrada(page);
    await casillaHabeas(page).check();
    await botonRegistrar(page).click();
    await expectConstancia(page);
  }
  expect(await contarEntradas(ev.sesionId)).toBe(1);
});

test('si la sesión se cierra mientras se diligencia, no registra y lo informa', async ({ page }) => {
  const db = clienteServicioPrueba();
  const ev = await crearEventoPrueba(db);
  await page.goto(`/r/${ev.tokenEntrada}`);
  await llenarEntrada(page);
  await casillaHabeas(page).check();
  await db.from('sesiones').update({ estado_manual: 'cerrada' }).eq('id', ev.sesionId);
  await botonRegistrar(page).click();
  await expect(page.getByText('El registro para esta sesión no está disponible.')).toBeVisible();
  expect(await contarEntradas(ev.sesionId)).toBe(0);
});

test('si se cae la conexión conserva los datos y permite reintentar', async ({ page, context }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await page.goto(`/r/${ev.tokenEntrada}`);
  await llenarEntrada(page);
  await casillaHabeas(page).check();
  await context.setOffline(true);
  await botonRegistrar(page).click();
  await expect(page.getByText(/No se pudo enviar el formulario/)).toBeVisible();
  await expect(page.getByLabel('Nombres')).toHaveValue('Ana María');
  await expect(casillaHabeas(page)).toBeChecked();
  await context.setOffline(false);
  await botonRegistrar(page).click();
  await expectConstancia(page);
});

test('abre el teclado numérico para la cédula y el de texto para el pasaporte', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await page.goto(`/r/${ev.tokenEntrada}`);
  await expect(page.getByLabel('Número de documento')).toHaveAttribute('inputmode', 'numeric');
  await page.getByLabel('Tipo de documento').selectOption('PA');
  await expect(page.getByLabel('Número de documento')).toHaveAttribute('inputmode', 'text');
});

test('advierte si el correo no es del dominio institucional', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await page.goto(`/r/${ev.tokenEntrada}`);
  await page.getByLabel('Correo institucional').fill('ana@gmail.com');
  await expect(page.getByText('Verifique: se esperaba un correo @procuraduria.gov.co')).toBeVisible();
});

test('muestra avisos para sesión cerrada y enlace inválido', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba(), { estadoManual: 'cerrada' });
  await page.goto(`/r/${ev.tokenEntrada}`);
  await expect(page.getByText('El registro para esta sesión ya cerró.')).toBeVisible();
  await expect(botonRegistrar(page)).toHaveCount(0);
  await page.goto('/r/token-que-no-existe-000000');
  await expect(page.getByRole('heading', { name: 'Enlace no válido' })).toBeVisible();
});

test('si cambia la autorización de datos mientras se diligencia, pide recargar y no registra', async ({ page }) => {
  const db = clienteServicioPrueba();
  const ev = await crearEventoPrueba(db);
  await page.goto(`/r/${ev.tokenEntrada}`);
  await llenarEntrada(page);
  await casillaHabeas(page).check();
  await db.from('evento_habeas_versiones').insert({ evento_id: ev.eventoId, version: 2, texto: 'Texto nuevo de autorización.' });
  await botonRegistrar(page).click();
  await expect(page.getByText(/La autorización de tratamiento de datos cambió/)).toBeVisible();
  expect(await contarEntradas(ev.sesionId)).toBe(0);
});
