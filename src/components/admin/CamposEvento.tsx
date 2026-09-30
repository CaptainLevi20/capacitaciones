import type { DatosEvento } from '@/lib/domain/schemas-admin';
import { CampoAdmin } from './CampoAdmin';
import { SelectorColor, type Sugerencia } from './SelectorColor';
import type { OrigenColor } from '@/lib/domain/color';
import { claseInput } from './estilos';

type MarcaConColor = { id: string; nombre: string; color_primario: string | null; activa: boolean };

// Atajos del selector: las marcas activas que tienen color, sin repetir colores.
export function sugerenciasDeColor(marcas: MarcaConColor[]): Sugerencia[] {
  const vistas = new Set<string>();
  return marcas.flatMap((m) => {
    if (!m.activa || !m.color_primario || vistas.has(m.color_primario)) return [];
    vistas.add(m.color_primario);
    return [{ nombre: m.nombre, color: m.color_primario }];
  });
}

// Marcas visibles del co-branding del evento, en su orden, con su color.
export function marcasVisiblesConColor(
  eventoMarcas: { marca_id: string; orden: number; visible: boolean }[],
  marcas: MarcaConColor[],
): { nombre: string; color: string | null }[] {
  return [...eventoMarcas]
    .sort((a, b) => a.orden - b.orden)
    .flatMap((em) => {
      const m = marcas.find((x) => x.id === em.marca_id);
      return em.visible && m?.activa ? [{ nombre: m.nombre, color: m.color_primario }] : [];
    });
}

function textoSinColor(r: OrigenColor): string {
  return r.origen === 'marca'
    ? `Sin color propio: se usará el de ${r.marca} (${r.color}), la primera marca del co-branding que tiene color.`
    : `Sin color propio: se usará el azul por defecto (${r.color}) mientras ninguna marca del co-branding tenga color.`;
}

export function CamposEvento({
  evento,
  respaldo,
  sugerencias,
}: {
  evento?: DatosEvento;
  // Lo que se usaría si el evento no tiene color propio.
  respaldo: OrigenColor;
  sugerencias: Sugerencia[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CampoAdmin etiqueta="Nombre del evento">
        <input name="nombre" required defaultValue={evento?.nombre ?? ''} className={claseInput} />
      </CampoAdmin>
      <CampoAdmin etiqueta="Cliente">
        <input name="cliente" defaultValue={evento?.cliente ?? ''} className={claseInput} />
      </CampoAdmin>
      <CampoAdmin etiqueta="Capacitador(es)">
        <input name="capacitadores" defaultValue={evento?.capacitadores ?? ''} className={claseInput} />
      </CampoAdmin>
      <CampoAdmin etiqueta="Dominio de correo esperado (opcional)">
        <input
          name="dominio_correo"
          defaultValue={evento?.dominio_correo ?? ''}
          placeholder="procuraduria.gov.co"
          className={claseInput}
        />
      </CampoAdmin>
      <SelectorColor
        nombre="color_primario"
        etiqueta="Color de los formularios"
        explicacion="Es el color que ven los asistentes al escanear el QR: franja superior, botones, casillas y sello de confirmación."
        valorInicial={evento?.color_primario ?? null}
        textoVacio={textoSinColor(respaldo)}
        respaldo={respaldo.color}
        sugerencias={sugerencias}
      />
    </div>
  );
}
