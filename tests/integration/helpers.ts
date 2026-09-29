import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { generarToken } from '@/lib/domain/tokens';

const opciones = { auth: { persistSession: false, autoRefreshToken: false } };

export function clienteServicioPrueba(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, opciones);
}

export function clienteAnonimoPrueba(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, opciones);
}

export async function clienteAutenticadoPrueba(email: string, password: string): Promise<SupabaseClient> {
  const c = clienteAnonimoPrueba();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

export async function limpiarDatos(): Promise<void> {
  const pg = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await pg.connect();
  try {
    await pg.query(`truncate public.rate_limit_hits, public.salidas, public.entradas, public.asistentes,
      public.sesiones, public.evento_preguntas, public.evento_marcas, public.evento_habeas_versiones,
      public.eventos, public.administradores restart identity cascade`);
    await pg.query(`delete from public.marcas where nombre <> 'Avance Jurídico'`);
    await pg.query(`update public.marcas set logo_path = null, activa = true, color_primario = '#1F3A5F'`);
    await pg.query(`delete from auth.users where email like '%@prueba.test'`);
    await pg.query(`update public.configuracion set valor = case clave
      when 'habeas_texto_defecto' then '[PENDIENTE: cláusula oficial de Avance Jurídico]' else '' end`);
  } finally {
    await pg.end();
  }
}

export interface EventoPrueba {
  eventoId: string;
  sesionId: string;
  tokenEntrada: string;
  tokenSalida: string;
  habeasId: string;
}

export async function crearEventoPrueba(
  db: SupabaseClient,
  opcionesEvento: { estadoEvento?: 'borrador' | 'activo'; estadoManual?: 'abierta' | 'cerrada' } = {},
): Promise<EventoPrueba> {
  const { data: ev, error: e1 } = await db
    .from('eventos')
    .insert({
      nombre: 'Evento de prueba',
      estado: opcionesEvento.estadoEvento ?? 'activo',
      dominio_correo: 'procuraduria.gov.co',
    })
    .select('id')
    .single();
  if (e1) throw e1;
  const { data: hv, error: e2 } = await db
    .from('evento_habeas_versiones')
    .insert({ evento_id: ev.id, version: 1, texto: 'Autorizo el tratamiento de mis datos personales.' })
    .select('id')
    .single();
  if (e2) throw e2;
  const { data: plantilla, error: e3 } = await db.from('plantilla_preguntas').select('clave, tipo, texto, orden');
  if (e3) throw e3;
  const { error: e4 } = await db.from('evento_preguntas').insert(plantilla.map((p) => ({ ...p, evento_id: ev.id })));
  if (e4) throw e4;
  const tokenEntrada = generarToken();
  const tokenSalida = generarToken();
  const ahora = Date.now();
  const { data: s, error: e5 } = await db
    .from('sesiones')
    .insert({
      evento_id: ev.id,
      numero: 1,
      titulo: 'Sesión de prueba',
      inicio: new Date(ahora - 3600_000).toISOString(),
      fin: new Date(ahora + 3600_000).toISOString(),
      modo_apertura: 'manual',
      estado_manual: opcionesEvento.estadoManual ?? 'abierta',
      token_entrada: tokenEntrada,
      token_salida: tokenSalida,
    })
    .select('id')
    .single();
  if (e5) throw e5;
  return { eventoId: ev.id, sesionId: s.id, tokenEntrada, tokenSalida, habeasId: hv.id };
}

export async function crearUsuarioPrueba(
  esAdmin: boolean,
): Promise<{ email: string; password: string; userId: string }> {
  const db = clienteServicioPrueba();
  const email = `u${Date.now()}${Math.random().toString(36).slice(2, 6)}@prueba.test`;
  const password = 'Clave-prueba-123';
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  if (esAdmin) {
    const { error: e } = await db.from('administradores').insert({ user_id: data.user.id });
    if (e) throw e;
  }
  return { email, password, userId: data.user.id };
}

export const datosPersona = (numero_documento = '1020345678') => ({
  tipo_documento: 'CC' as const,
  numero_documento,
  nombres: 'Ana María',
  apellidos: 'Pérez Gómez',
  correo: 'aperez@procuraduria.gov.co',
  dependencia: 'Delegada para Asuntos Civiles',
  cargo: 'Profesional',
});

export const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
