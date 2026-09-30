import { expect, test } from '@playwright/test';
import { PNG_1x1, clienteServicioPrueba, limpiarDatos } from '../tests/integration/helpers';
import { generarToken } from '@/lib/domain/tokens';
import { iniciarSesionAdmin } from './utilidades';

test.beforeEach(async () => {
  await limpiarDatos();
});

async function darLogoAvance() {
  const db = clienteServicioPrueba();
  await db.storage.from('logos').upload('avance/logo.png', PNG_1x1, { contentType: 'image/png', upsert: true });
  await db.from('marcas').update({ logo_path: 'avance/logo.png' }).eq('nombre', 'Avance Jurídico');
}

test('crea, configura, activa y duplica un evento', async ({ page }) => {
  await darLogoAvance();
  await iniciarSesionAdmin(page);
  await page.getByRole('link', { name: 'Nuevo evento' }).click();
  await page.getByLabel('Nombre del evento').fill('Capacitación PGN 2026');
  await page.getByLabel('Cliente').fill('Procuraduría General de la Nación');
  await page.getByLabel('Dominio de correo esperado').fill('procuraduria.gov.co');
  await page.getByRole('button', { name: 'Crear evento' }).click();
  await expect(page.getByRole('heading', { name: 'Capacitación PGN 2026' })).toBeVisible();
  const eventoId = page.url().split('/').pop()!;

  // Recién creado: faltan autorización, co-branding y sesiones, y no se puede activar.
  const estado = page.getByTestId('seccion-estado');
  const lista = page.getByTestId('lista-preparacion');
  await expect(estado.getByText('1 de 5 listos')).toBeVisible();
  await expect(lista).toContainText('Sigue el texto provisional');
  await expect(lista).toContainText('Ninguna marca visible en el formulario');
  await expect(lista).toContainText('Aún no hay sesiones');
  await expect(lista).toContainText('Falta: capacitador(es)');
  await expect(estado.getByRole('button', { name: 'Activar evento' })).toBeDisabled();
  await expect(estado.getByText('Complete los 3 pasos obligatorios que faltan para activar el evento.')).toBeVisible();

  const co = page.getByTestId('seccion-cobranding');
  await co.getByLabel('Avance Jurídico', { exact: true }).check();
  await expect(co.getByText('Cambios sin guardar').first()).toBeVisible();
  await expect(co.getByTestId('encabezado-marcas')).toBeVisible();
  await co.getByRole('button', { name: 'Guardar co-branding' }).click();
  await expect(co.getByText('Co-branding guardado')).toBeVisible();
  await expect(co.getByText('Cambios sin guardar')).toHaveCount(0);

  const habeas = page.getByTestId('seccion-habeas');
  await habeas
    .getByLabel('Texto de la casilla de autorización')
    .fill('Autorizo a Avance Jurídico el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.');
  await habeas.getByRole('button', { name: 'Guardar nueva versión' }).click();
  await expect(habeas.getByText('Versión 2 vigente')).toBeVisible();

  await clienteServicioPrueba().from('sesiones').insert({
    evento_id: eventoId,
    numero: 1,
    inicio: '2099-10-14T13:00:00Z',
    fin: '2099-10-14T17:00:00Z',
    token_entrada: generarToken(),
    token_salida: generarToken(),
  });
  await page.reload();
  await expect(page.getByTestId('seccion-estado').getByText('4 de 5 listos')).toBeVisible();
  await page.getByTestId('seccion-estado').getByRole('button', { name: 'Activar evento' }).click();
  await expect(page.getByTestId('seccion-estado').getByText('Estado actual: Activo')).toBeVisible();

  await page.getByRole('button', { name: 'Duplicar evento' }).click();
  await expect(page.getByRole('heading', { name: 'Capacitación PGN 2026 (copia)' })).toBeVisible();
});

test('la lista de eventos señala los pasos que faltan', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.getByRole('link', { name: 'Nuevo evento' }).click();
  await page.getByLabel('Nombre del evento').fill('Evento incompleto');
  await page.getByRole('button', { name: 'Crear evento' }).click();
  await expect(page.getByRole('heading', { name: 'Evento incompleto' })).toBeVisible();
  await page.getByRole('link', { name: 'Eventos', exact: true }).first().click();
  await expect(page.getByRole('row', { name: /Evento incompleto/ })).toContainText('Faltan 3 pasos');
});

test('avisa antes de salir con cambios sin guardar', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.getByRole('link', { name: 'Nuevo evento' }).click();
  await page.getByLabel('Nombre del evento').fill('Evento con cambios');
  await page.getByRole('button', { name: 'Crear evento' }).click();
  const datos = page.getByTestId('seccion-datos');
  await datos.getByLabel('Capacitador(es)').fill('Ana Pérez');
  await expect(datos.getByRole('heading', { name: 'Datos generales' })).toBeVisible();
  await expect(datos.getByText('Cambios sin guardar')).toBeVisible();

  let mensaje = '';
  page.once('dialog', (d) => {
    mensaje = d.message();
    void d.dismiss();
  });
  await page.getByRole('link', { name: 'Sesiones', exact: true }).click();
  expect(mensaje).toContain('cambios sin guardar');
  await expect(page.getByRole('heading', { name: 'Evento con cambios' })).toBeVisible();
  await expect(datos.getByLabel('Capacitador(es)')).toHaveValue('Ana Pérez');

  await datos.getByRole('button', { name: 'Guardar datos' }).click();
  await expect(datos.getByText('Datos guardados')).toBeVisible();
  await page.getByRole('link', { name: 'Sesiones', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Crear sesiones' })).toBeVisible();
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
