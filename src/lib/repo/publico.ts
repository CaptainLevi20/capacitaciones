import type { Db } from './db';
import { COLOR_DEFECTO } from '@/lib/domain/constantes';
import type { Pregunta } from '@/lib/domain/encuesta';
import { estadoSesion, ventanaApertura, type EstadoSesion } from '@/lib/domain/sesion-estado';
import { urlLogo } from '@/lib/storage';

export interface MarcaVisible {
  nombre: string;
  logoUrl: string | null;
}

export interface ContextoEvento {
  marcas: MarcaVisible[];
  colorMarca: string | null;
  habeas: { id: string; texto: string; urlPolitica: string | null };
  preguntas: Pregunta[];
}

export interface SesionPublica {
  id: string;
  numero: number;
  titulo: string | null;
  lugar: string | null;
  inicio: Date;
  fin: Date;
  estado: EstadoSesion;
  abre: Date;
  cierra: Date;
  modoApertura: 'manual' | 'automatico';
  evento: { id: string; nombre: string; colorPrimario: string; dominioCorreo: string | null };
  marcas: MarcaVisible[];
  habeas: ContextoEvento['habeas'];
  preguntas: Pregunta[];
}

export type TipoEnlace = 'entrada' | 'salida';

export type ResultadoSesion =
  | { tipo: 'no_encontrada' }
  | { tipo: 'no_disponible'; sesion: SesionPublica }
  | { tipo: 'abierta'; sesion: SesionPublica };

interface FilaMarcaEvento {
  marca: { nombre: string; logo_path: string | null; color_primario: string | null; activa: boolean } | null;
}

export async function cargarContextoEvento(db: Db, eventoId: string): Promise<ContextoEvento> {
  const [m, h, p] = await Promise.all([
    db
      .from('evento_marcas')
      .select('orden, marca:marcas(nombre, logo_path, color_primario, activa)')
      .eq('evento_id', eventoId)
      .eq('visible', true)
      .order('orden'),
    db
      .from('evento_habeas_versiones')
      .select('id, texto, url_politica')
      .eq('evento_id', eventoId)
      .order('version', { ascending: false })
      .limit(1)
      .single(),
    db
      .from('evento_preguntas')
      .select('clave, tipo, texto, orden, activa')
      .eq('evento_id', eventoId)
      .eq('activa', true)
      .order('orden'),
  ]);
  if (m.error) throw m.error;
  if (h.error) throw h.error;
  if (p.error) throw p.error;
  const marcas = (m.data as unknown as FilaMarcaEvento[])
    .map((r) => r.marca)
    .filter((x): x is NonNullable<FilaMarcaEvento['marca']> => !!x && x.activa);
  return {
    marcas: marcas.map((x) => ({ nombre: x.nombre, logoUrl: x.logo_path ? urlLogo(x.logo_path) : null })),
    colorMarca: marcas.find((x) => x.color_primario)?.color_primario ?? null,
    habeas: { id: h.data.id, texto: h.data.texto, urlPolitica: h.data.url_politica || null },
    preguntas: p.data as Pregunta[],
  };
}

export async function obtenerSesionPorToken(
  db: Db,
  token: string,
  tipo: TipoEnlace,
  ahora: Date = new Date(),
): Promise<ResultadoSesion> {
  if (!/^[A-Za-z0-9_-]{22,64}$/.test(token)) return { tipo: 'no_encontrada' };
  const columna = tipo === 'entrada' ? 'token_entrada' : 'token_salida';
  const { data, error } = await db
    .from('sesiones')
    .select(
      'id, numero, titulo, lugar, inicio, fin, modo_apertura, estado_manual, abre_min_antes, cierra_min_despues, evento:eventos!inner(id, nombre, color_primario, dominio_correo, estado)',
    )
    .eq(columna, token)
    .maybeSingle();
  if (error) throw error;
  const evento = data?.evento as unknown as
    | { id: string; nombre: string; color_primario: string | null; dominio_correo: string | null; estado: string }
    | undefined;
  if (!data || !evento || evento.estado !== 'activo') return { tipo: 'no_encontrada' };

  const ventana = {
    inicio: new Date(data.inicio),
    fin: new Date(data.fin),
    modo_apertura: data.modo_apertura as 'manual' | 'automatico',
    estado_manual: data.estado_manual as 'abierta' | 'cerrada' | null,
    abre_min_antes: data.abre_min_antes,
    cierra_min_despues: data.cierra_min_despues,
  };
  const ctx = await cargarContextoEvento(db, evento.id);
  const { abre, cierra } = ventanaApertura(ventana);
  const estado = estadoSesion(ventana, ahora);
  const sesion: SesionPublica = {
    id: data.id,
    numero: data.numero,
    titulo: data.titulo,
    lugar: data.lugar,
    inicio: ventana.inicio,
    fin: ventana.fin,
    estado,
    abre,
    cierra,
    modoApertura: ventana.modo_apertura,
    evento: {
      id: evento.id,
      nombre: evento.nombre,
      colorPrimario: evento.color_primario ?? ctx.colorMarca ?? COLOR_DEFECTO,
      dominioCorreo: evento.dominio_correo,
    },
    marcas: ctx.marcas,
    habeas: ctx.habeas,
    preguntas: ctx.preguntas,
  };
  return estado === 'abierta' ? { tipo: 'abierta', sesion } : { tipo: 'no_disponible', sesion };
}
