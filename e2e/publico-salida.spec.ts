import { expect, test, type Page } from '@playwright/test';
import { registrarEntrada } from '@/lib/repo/registro';
import { clienteServicioPrueba, crearEventoPrueba, datosPersona, limpiarDatos } from '../tests/integration/helpers';

test.beforeEach(async () => {
  await limpiarDatos();
});

const ESCALA = [
  'El contenido de la sesión fue pertinente y claro',
  'El expositor demostró dominio del tema',
  'La metodología facilitó el aprendizaje',
  'Lo aprendido es útil para mis funciones',
  'La logística (lugar, horario, recursos) fue adecuada',
];
const sinMeta = { ip: null, userAgent: null };

async function ingresarDocumento(page: Page, documento: string) {
  await page.getByLabel('Tipo de documento').selectOption('CC');
  await page.getByLabel('Número de documento').fill(documento);
  await page.getByRole('button', { name: 'Continuar' }).click();
}

async function responderEncuesta(page: Page) {
  for (const texto of ESCALA) {
    await page.getByRole('group', { name: texto }).getByText('5', { exact: true }).click();
  }
  await page
    .getByRole('group', { name: '¿Qué tan probable es que recomiende esta capacitación?' })
    .getByText('10', { exact: true })
    .click();
  await page.getByLabel('Comentarios o sugerencias (opcional)').fill('Muy buena sesión');
}

async function consolidado(sesionId: string) {
  const { data } = await clienteServicioPrueba()
    .from('asistencia_consolidada')
    .select('estado_asistencia, promedio_escala, nps, comentario')
    .eq('sesion_id', sesionId);
  return data!;
}

test('con entrada previa reconoce a la persona aunque escriba el documento con puntos', async ({ page }) => {
  const db = clienteServicioPrueba();
  const ev = await crearEventoPrueba(db);
  await registrarEntrada(db, { id: ev.sesionId, habeasId: ev.habeasId }, datosPersona('1020345678'), sinMeta);
  await page.goto(`/s/${ev.tokenSalida}`);
  await ingresarDocumento(page, '1.020.345.678');
  await expect(page.getByText('Hola, Ana María')).toBeVisible();
  await expect(page.getByTestId('texto-habeas')).toHaveCount(0);
  await responderEncuesta(page);
  await page.getByRole('button', { name: 'Enviar evaluación y registrar salida' }).click();
  await expect(page.getByRole('heading', { name: 'Salida registrada' })).toBeVisible();
  expect(await consolidado(ev.sesionId)).toEqual([
    { estado_asistencia: 'completa', promedio_escala: 5, nps: 10, comentario: 'Muy buena sesión' },
  ]);
});

test('sin entrada pide datos y Habeas Data, y marca sin_entrada', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await page.goto(`/s/${ev.tokenSalida}`);
  await ingresarDocumento(page, '52123456');
  await expect(page.getByText('No encontramos su registro de entrada')).toBeVisible();
  await page.getByLabel('Nombres').fill('Luis');
  await page.getByLabel('Apellidos').fill('Rojas');
  await page.getByLabel('Correo institucional').fill('lrojas@procuraduria.gov.co');
  await page.getByLabel('Dependencia').fill('Secretaría General');
  await page.getByLabel('Cargo').fill('Técnico');
  await page.getByLabel(/Autorizo el tratamiento/).check();
  await responderEncuesta(page);
  await page.getByRole('button', { name: 'Enviar evaluación y registrar salida' }).click();
  await expect(page.getByRole('heading', { name: 'Salida registrada' })).toBeVisible();
  expect((await consolidado(ev.sesionId))[0].estado_asistencia).toBe('sin_entrada');
});

test('el servidor exige las preguntas de la encuesta', async ({ page }) => {
  const db = clienteServicioPrueba();
  const ev = await crearEventoPrueba(db);
  await registrarEntrada(db, { id: ev.sesionId, habeasId: ev.habeasId }, datosPersona(), sinMeta);
  await page.goto(`/s/${ev.tokenSalida}`);
  await ingresarDocumento(page, '1020345678');
  await expect(page.getByText('Hola, Ana María')).toBeVisible();
  await page.locator('input[type=radio]').evaluateAll((els) => els.forEach((el) => el.removeAttribute('required')));
  await page.getByRole('button', { name: 'Enviar evaluación y registrar salida' }).click();
  await expect(page.getByText('Seleccione una opción').first()).toBeVisible();
  expect(await consolidado(ev.sesionId)).toEqual([
    { estado_asistencia: 'solo_entrada', promedio_escala: null, nps: null, comentario: null },
  ]);
});

test('varias personas salen desde la misma red sin quedar bloqueadas', async ({ page }) => {
  // El servidor E2E corre con RATE_LIMIT_MAX=3: cada persona debe gastar como máximo 1 envío por paso.
  const db = clienteServicioPrueba();
  const ev = await crearEventoPrueba(db);
  const s = { id: ev.sesionId, habeasId: ev.habeasId };
  await registrarEntrada(db, s, datosPersona('111111'), sinMeta);
  await registrarEntrada(db, s, datosPersona('222222'), sinMeta);
  for (const doc of ['111111', '222222']) {
    await page.goto(`/s/${ev.tokenSalida}`);
    await ingresarDocumento(page, doc);
    await expect(page.getByText('Hola, Ana María')).toBeVisible();
    await responderEncuesta(page);
    await page.getByRole('button', { name: 'Enviar evaluación y registrar salida' }).click();
    await expect(page.getByRole('heading', { name: 'Salida registrada' })).toBeVisible();
  }
});

test('si cambia la autorización de datos mientras se diligencia, pide recargar y no registra', async ({ page }) => {
  const db = clienteServicioPrueba();
  const ev = await crearEventoPrueba(db);
  await page.goto(`/s/${ev.tokenSalida}`);
  await ingresarDocumento(page, '52123456');
  await expect(page.getByText('No encontramos su registro de entrada')).toBeVisible();
  await page.getByLabel('Nombres').fill('Luis');
  await page.getByLabel('Apellidos').fill('Rojas');
  await page.getByLabel('Correo institucional').fill('lrojas@procuraduria.gov.co');
  await page.getByLabel('Dependencia').fill('Secretaría General');
  await page.getByLabel('Cargo').fill('Técnico');
  await page.getByLabel(/Autorizo el tratamiento/).check();
  await responderEncuesta(page);
  await db.from('evento_habeas_versiones').insert({ evento_id: ev.eventoId, version: 2, texto: 'Texto nuevo de autorización.' });
  await page.getByRole('button', { name: 'Enviar evaluación y registrar salida' }).click();
  await expect(page.getByText(/La autorización de tratamiento de datos cambió/)).toBeVisible();
  expect(await consolidado(ev.sesionId)).toEqual([]);
});
