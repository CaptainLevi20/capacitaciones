import type { Db } from './db';
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
