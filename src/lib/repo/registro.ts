import type { Db } from './db';
import type { TipoDocumento } from '@/lib/domain/constantes';
import type { DatosPersonales } from '@/lib/domain/schemas';

export interface MetaConsentimiento {
  ip: string | null;
  userAgent: string | null;
}

export async function upsertAsistente(db: Db, d: DatosPersonales): Promise<string> {
  const { data, error } = await db
    .from('asistentes')
    .upsert(
      {
        tipo_documento: d.tipo_documento,
        numero_documento: d.numero_documento,
        nombres: d.nombres,
        apellidos: d.apellidos,
        correo: d.correo,
        dependencia: d.dependencia,
        cargo: d.cargo,
      },
      { onConflict: 'tipo_documento,numero_documento' },
    )
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function registrarEntrada(
  db: Db,
  sesion: { id: string; habeasId: string },
  d: DatosPersonales,
  meta: MetaConsentimiento,
  ahora: Date = new Date(),
): Promise<void> {
  const asistenteId = await upsertAsistente(db, d);
  // registrado_at no se envía: en un reenvío se conserva la hora del primer registro.
  const { error } = await db.from('entradas').upsert(
    {
      sesion_id: sesion.id,
      asistente_id: asistenteId,
      nombres: d.nombres,
      apellidos: d.apellidos,
      correo: d.correo,
      dependencia: d.dependencia,
      cargo: d.cargo,
      habeas_version_id: sesion.habeasId,
      consentimiento_at: ahora.toISOString(),
      ip: meta.ip,
      user_agent: meta.userAgent,
    },
    { onConflict: 'sesion_id,asistente_id' },
  );
  if (error) throw error;
}

export class DatosPersonalesRequeridos extends Error {
  constructor() {
    super('Se requieren los datos personales para registrar una salida sin entrada');
    this.name = 'DatosPersonalesRequeridos';
  }
}

export async function buscarEntrada(
  db: Db,
  sesionId: string,
  doc: { tipo_documento: TipoDocumento; numero_documento: string },
): Promise<{ asistenteId: string; nombres: string } | null> {
  const { data: asistente, error } = await db
    .from('asistentes')
    .select('id')
    .eq('tipo_documento', doc.tipo_documento)
    .eq('numero_documento', doc.numero_documento)
    .maybeSingle();
  if (error) throw error;
  if (!asistente) return null;
  const { data: entrada, error: e2 } = await db
    .from('entradas')
    .select('nombres')
    .eq('sesion_id', sesionId)
    .eq('asistente_id', asistente.id)
    .maybeSingle();
  if (e2) throw e2;
  return entrada ? { asistenteId: asistente.id, nombres: entrada.nombres } : null;
}

export interface DatosSalida {
  documento: { tipo_documento: TipoDocumento; numero_documento: string };
  personales: DatosPersonales | null;
  respuestas: Record<string, number>;
  comentario: string | null;
}

export async function registrarSalida(
  db: Db,
  sesion: { id: string; habeasId: string },
  datos: DatosSalida,
  meta: MetaConsentimiento,
  ahora: Date = new Date(),
): Promise<{ sinEntrada: boolean }> {
  const entrada = await buscarEntrada(db, sesion.id, datos.documento);
  let asistenteId: string;
  if (entrada) {
    asistenteId = entrada.asistenteId;
  } else {
    if (!datos.personales) throw new DatosPersonalesRequeridos();
    asistenteId = await upsertAsistente(db, datos.personales);
  }
  const sinEntrada = !entrada;
  const { error } = await db.from('salidas').upsert(
    {
      sesion_id: sesion.id,
      asistente_id: asistenteId,
      respuestas: datos.respuestas,
      comentario: datos.comentario,
      sin_entrada: sinEntrada,
      habeas_version_id: sinEntrada ? sesion.habeasId : null,
      consentimiento_at: sinEntrada ? ahora.toISOString() : null,
      ip: sinEntrada ? meta.ip : null,
      user_agent: sinEntrada ? meta.userAgent : null,
    },
    { onConflict: 'sesion_id,asistente_id' },
  );
  if (error) throw error;
  return { sinEntrada };
}
