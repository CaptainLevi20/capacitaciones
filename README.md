# Sistema de registro de capacitaciones — Avance Jurídico

Registro de entrada y salida (con evaluación) por QR, con co-branding configurable.

## Operación
1. **Marcas**: suba los logos (PNG, SVG o JPG, máx. 1 MB).
2. **Configuración**: texto de Habeas Data por defecto para eventos nuevos.
3. **Eventos → Nuevo evento**: datos, co-branding, Habeas Data (cláusula oficial) y encuesta. Actívelo.
4. **Sesiones**: pegue las filas (número; fecha; hora inicio; hora fin; título; lugar). Por defecto abren 30 min antes y cierran 2 h después; también puede abrirlas o cerrarlas a mano.
5. **Hoja imprimible**: imprima o guarde como PDF los QR de cada sesión. Si regenera los QR, vuelva a imprimirlos.
6. **Datos**: resumen, registros y exportación a Excel (una hoja por sesión).
7. Para otra capacitación: **Duplicar evento** y cambiar logos, textos y sesiones.

## Desarrollo
- Requisitos: Node 24, Docker.
- `npm install && npm run db:start && npm run db:reset && npm run env:local && npm run dev`
- Pruebas: `npm test` (unitarias), `npm run test:int` (Supabase local), `npm run e2e` (Playwright). No ejecute `test:int` y `e2e` al mismo tiempo.
- Administrador local: `node scripts/crear-admin.mjs correo@ejemplo.co "contraseña-larga"`.

## Despliegue
Vercel (push a `main`) + Supabase (`npx supabase db push` para las migraciones).
Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_BASE_URL`.
**Defina el dominio definitivo antes de imprimir QR**: la URL queda dentro del código.
