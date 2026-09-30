import { HABEAS_PENDIENTE } from './constantes';

export interface EntradaPreparacion {
  textoHabeas: string;
  // Solo las marcas activas y marcadas como visibles en el co-branding del evento.
  marcasVisibles: { nombre: string; tieneLogo: boolean }[];
  sesiones: number;
  preguntasActivas: number;
  cliente: string | null;
  capacitadores: string | null;
  dominioCorreo: string | null;
}

export type ClavePreparacion = 'habeas' | 'cobranding' | 'sesiones' | 'encuesta' | 'datos';

export interface ItemPreparacion {
  clave: ClavePreparacion;
  titulo: string;
  // «aviso» nunca bloquea; «falta» bloquea la activación si el ítem es obligatorio.
  estado: 'listo' | 'falta' | 'aviso';
  detalle: string;
  obligatorio: boolean;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function cobranding(marcas: EntradaPreparacion['marcasVisibles']): Omit<ItemPreparacion, 'clave' | 'titulo' | 'obligatorio'> {
  if (!marcas.length) return { estado: 'falta', detalle: 'Ninguna marca visible en el formulario' };
  const sinLogo = marcas.filter((m) => !m.tieneLogo);
  if (sinLogo.length === marcas.length) return { estado: 'falta', detalle: 'Ninguna marca visible tiene logo' };
  if (sinLogo.length) {
    const nombres = sinLogo.map((m) => m.nombre).join(', ');
    return {
      estado: 'aviso',
      detalle: `${nombres} ${sinLogo.length === 1 ? 'no tiene' : 'no tienen'} logo: se mostrará solo el nombre`,
    };
  }
  return { estado: 'listo', detalle: plural(marcas.length, 'marca visible', 'marcas visibles') };
}

export function revisarPreparacion(e: EntradaPreparacion): ItemPreparacion[] {
  const faltanDatos = [
    !e.cliente && 'cliente',
    !e.capacitadores && 'capacitador(es)',
    !e.dominioCorreo && 'dominio de correo',
  ].filter(Boolean);
  return [
    {
      clave: 'habeas',
      titulo: 'Autorización de datos',
      obligatorio: true,
      ...(e.textoHabeas.includes(HABEAS_PENDIENTE)
        ? { estado: 'falta', detalle: 'Sigue el texto provisional' }
        : { estado: 'listo', detalle: 'Texto definido' }),
    },
    { clave: 'cobranding', titulo: 'Co-branding', obligatorio: true, ...cobranding(e.marcasVisibles) },
    {
      clave: 'sesiones',
      titulo: 'Sesiones',
      obligatorio: true,
      ...(e.sesiones
        ? { estado: 'listo', detalle: plural(e.sesiones, 'sesión', 'sesiones') }
        : { estado: 'falta', detalle: 'Aún no hay sesiones' }),
    },
    {
      clave: 'encuesta',
      titulo: 'Encuesta de salida',
      obligatorio: true,
      ...(e.preguntasActivas
        ? { estado: 'listo', detalle: plural(e.preguntasActivas, 'pregunta activa', 'preguntas activas') }
        : { estado: 'falta', detalle: 'Ninguna pregunta activa' }),
    },
    {
      clave: 'datos',
      titulo: 'Datos generales',
      obligatorio: false,
      ...(faltanDatos.length
        ? { estado: 'aviso', detalle: `Falta: ${faltanDatos.join(', ')}` }
        : { estado: 'listo', detalle: 'Completos' }),
    },
  ];
}

const bloqueantes = (items: ItemPreparacion[]) => items.filter((i) => i.obligatorio && i.estado === 'falta');

export function pasosFaltantes(items: ItemPreparacion[]): number {
  return bloqueantes(items).length;
}

export function motivoNoActivar(items: ItemPreparacion[]): string | null {
  const faltan = bloqueantes(items);
  if (!faltan.length) return null;
  const lista = faltan.map((i) => `${i.titulo.toLowerCase()} (${i.detalle.charAt(0).toLowerCase()}${i.detalle.slice(1)})`);
  return `No se puede activar todavía. Falta: ${lista.join(', ')}.`;
}
