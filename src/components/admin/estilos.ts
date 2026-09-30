export const claseInput =
  'mt-1 block w-full rounded-md border border-linea bg-white px-3 py-2 text-sm text-tinta focus:border-tinta focus:outline-none focus:ring-2 focus:ring-tinta/15';
export const claseEtiqueta = 'block text-sm font-medium text-tinta';
export const claseTarjeta = 'rounded-xl border border-linea bg-white p-6';
export const claseTituloSeccion = 'font-serif text-xl font-semibold text-tinta';
export const claseBoton = {
  primario:
    'inline-block rounded-md bg-tinta px-4 py-2 text-sm font-semibold text-white hover:bg-tinta/85 disabled:opacity-60',
  secundario:
    'inline-block rounded-md border border-linea bg-white px-3 py-1.5 text-sm font-medium text-tinta hover:bg-papel disabled:opacity-60',
  peligro:
    'inline-block rounded-md border border-peligro/40 bg-white px-3 py-1.5 text-sm font-medium text-peligro hover:bg-peligro-suave disabled:opacity-60',
  // Opciones dentro de un Menu.
  item: 'block w-full rounded px-3 py-2 text-left text-sm text-tinta hover:bg-papel disabled:opacity-60',
  itemPeligro: 'block w-full rounded px-3 py-2 text-left text-sm text-peligro hover:bg-peligro-suave disabled:opacity-60',
} as const;
