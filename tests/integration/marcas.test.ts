import { beforeEach, describe, expect, it } from 'vitest';
import { guardarMarca, listarMarcas, subirLogo } from '@/lib/repo/marcas';
import { guardarConfiguracion, obtenerConfiguracion } from '@/lib/repo/configuracion';
import { ErrorNegocio } from '@/lib/errores';
import { PNG_1x1, clienteServicioPrueba, limpiarDatos } from './helpers';

const db = clienteServicioPrueba();
beforeEach(limpiarDatos);

describe('marcas', () => {
  it('crea, actualiza y lista marcas ordenadas por nombre', async () => {
    const id = await guardarMarca(db, null, { nombre: 'PGN', color_primario: '#003366', activa: true });
    await guardarMarca(db, id, { nombre: 'Procuraduría', color_primario: null, activa: false });
    const marcas = await listarMarcas(db);
    expect(marcas.map((m) => m.nombre)).toEqual(['Avance Jurídico', 'Procuraduría']);
    expect(marcas[1]).toMatchObject({ id, color_primario: null, activa: false });
  });

  it('sube el logo y guarda su ruta', async () => {
    const id = await guardarMarca(db, null, { nombre: 'PGN', color_primario: null, activa: true });
    await subirLogo(db, id, new File([PNG_1x1], 'pgn.png', { type: 'image/png' }));
    const marca = (await listarMarcas(db)).find((m) => m.id === id)!;
    expect(marca.logo_path).toMatch(new RegExp(`^${id}/\\d+\\.png$`));
    const { data } = await db.storage.from('logos').download(marca.logo_path!);
    expect(data!.size).toBe(PNG_1x1.length);
  });

  it('rechaza un logo inválido', async () => {
    const id = await guardarMarca(db, null, { nombre: 'PGN', color_primario: null, activa: true });
    await expect(
      subirLogo(db, id, new File(['%PDF'], 'x.pdf', { type: 'application/pdf' })),
    ).rejects.toBeInstanceOf(ErrorNegocio);
  });
});

describe('configuracion', () => {
  it('lee y guarda el texto de Habeas Data por defecto', async () => {
    expect((await obtenerConfiguracion(db)).habeasTexto).toBe('[PENDIENTE: cláusula oficial de Avance Jurídico]');
    await guardarConfiguracion(db, {
      habeasTexto: 'Cláusula oficial de prueba',
      habeasUrl: 'https://ejemplo.co/politica',
    });
    expect(await obtenerConfiguracion(db)).toEqual({
      habeasTexto: 'Cláusula oficial de prueba',
      habeasUrl: 'https://ejemplo.co/politica',
    });
  });
});
