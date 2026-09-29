import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }));
const valores = {
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  SUPABASE_DB_URL: status.DB_URL,
  NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
};
const faltantes = Object.entries(valores).filter(([, v]) => !v).map(([k]) => k);
if (faltantes.length) {
  console.error('No se encontraron en `supabase status`:', faltantes, 'Claves disponibles:', Object.keys(status));
  process.exit(1);
}
writeFileSync('.env.local', Object.entries(valores).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
console.log('.env.local actualizado');
