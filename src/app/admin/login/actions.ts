'use server';
import { redirect } from 'next/navigation';
import { clienteSesion } from '@/lib/supabase/servidor';

export async function iniciarSesion(_previo: { error: string } | null, fd: FormData) {
  const db = await clienteSesion();
  const { error } = await db.auth.signInWithPassword({
    email: String(fd.get('correo') ?? ''),
    password: String(fd.get('clave') ?? ''),
  });
  if (error) return { error: 'Correo o contraseña incorrectos' };
  redirect('/admin');
}

export async function cerrarSesion() {
  const db = await clienteSesion();
  await db.auth.signOut();
  redirect('/admin/login');
}
