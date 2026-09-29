import 'server-only';
import { redirect } from 'next/navigation';
import { clienteSesion } from '@/lib/supabase/servidor';

export async function requerirAdmin() {
  const db = await clienteSesion();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data } = await db.from('administradores').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!data) redirect('/admin/login?error=no-autorizado');
  return { db, user };
}
