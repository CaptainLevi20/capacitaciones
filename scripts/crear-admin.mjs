import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: process.env.ENV_FILE ?? '.env.local' });
const [correo, clave] = process.argv.slice(2);
if (!correo || !clave || clave.length < 10) {
  console.error('Uso: node scripts/crear-admin.mjs <correo> <contraseña de al menos 10 caracteres>');
  process.exit(1);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { data, error } = await db.auth.admin.createUser({ email: correo, password: clave, email_confirm: true });
if (error) {
  console.error(error.message);
  process.exit(1);
}
const { error: e2 } = await db.from('administradores').insert({ user_id: data.user.id });
if (e2) {
  console.error(e2.message);
  process.exit(1);
}
console.log(`Administrador creado: ${correo}`);
