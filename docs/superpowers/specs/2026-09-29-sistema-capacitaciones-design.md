# Sistema de Registro para Capacitaciones — Diseño

**Fecha:** 2026-09-29
**Estado:** Aprobado en conversación; pendiente de revisión escrita
**Insumo:** `requerimientosIniciales.md`

## 1. Objetivo y alcance

Herramienta web de Avance Jurídico para registrar la asistencia (entrada y salida) y la evaluación de satisfacción de capacitaciones mediante códigos QR, con identidad visual parametrizable (co-branding).

- **Primer uso:** 12 sesiones de capacitación en la Procuraduría General de la Nación (PGN), en fechas distintas.
- **Reutilización:** cualquier capacitación futura de la firma (Juanita, Julia, etc.), activando, desactivando o reemplazando logos institucionales sin tocar código.

### Criterios de éxito

1. Cada registro de entrada y salida queda asociado de forma unívoca a su sesión, sin reprocesos manuales.
2. Toda entrada guarda prueba verificable de la autorización de tratamiento de datos (Ley 1581 de 2012).
3. Un administrador no técnico puede crear un evento nuevo con sus sesiones, logos y QR, y exportar los datos consolidados a Excel.
4. Los formularios funcionan cómodamente desde un celular.

### Decisiones tomadas

| Tema | Decisión |
|---|---|
| Infraestructura | Vercel + Supabase (Postgres, Auth, Storage) |
| Stack | Next.js (App Router) en un solo proyecto; escrituras vía Server Actions |
| Administración | Panel web con login (Supabase Auth), rol único "administrador" |
| QR | Un QR de entrada y uno de salida por sesión (token único); solo acepta registros si la sesión está abierta |
| Encuesta | Preguntas estándar de Avance Jurídico, activables y con texto editable por evento; sin tipos de pregunta nuevos |
| Salida sin entrada | Se registra igualmente, marcada `sin_entrada`, pidiendo datos completos y Habeas Data |
| Habeas Data | Cláusula de Avance Jurídico como texto por defecto, editable y versionada por evento |

## 2. Modelo de datos (Postgres / Supabase)

Todas las tablas usan `id uuid` como clave primaria (`gen_random_uuid()`) y `created_at`/`updated_at timestamptz`.

### `marcas`
- `nombre text not null`
- `logo_path text not null`: ruta en el bucket `logos` de Supabase Storage
- `color_primario text`: hex, p. ej. `#1F3A5F`
- `activa boolean default true`

### `eventos`
- `nombre text not null`, p. ej. "Capacitación PGN 2026"
- `cliente text`
- `capacitadores text`
- `dominio_correo text null`: p. ej. `procuraduria.gov.co`; si existe, el formulario advierte (sin bloquear) cuando el correo no coincide
- `color_primario text null`: si es nulo, se usa el de la primera marca visible
- `estado text check (estado in ('borrador','activo','archivado')) default 'borrador'`

### `evento_habeas_versiones`
- `evento_id uuid references eventos`
- `version int not null`: incremental por evento
- `texto text not null`
- `url_politica text null`
- `unique (evento_id, version)`
- La versión vigente de un evento es la de mayor `version`. Editar el texto crea una versión nueva; las versiones anteriores nunca se modifican.

### `evento_marcas`
- `evento_id`, `marca_id`, `orden int`, `visible boolean default true`
- `primary key (evento_id, marca_id)`

### `evento_preguntas`
- `evento_id`
- `clave text`: identificador estable, p. ej. `contenido`, `expositor`
- `tipo text check (tipo in ('escala_1_5','nps_0_10','texto'))`
- `texto text not null`
- `orden int`
- `activa boolean default true`
- `unique (evento_id, clave)`
- Al crear un evento se copian desde la plantilla estándar (sección 2.1).

### `sesiones`
- `evento_id`
- `numero int not null`
- `titulo text`
- `lugar text`
- `inicio timestamptz not null`, `fin timestamptz not null`
- `modo_apertura text check (modo_apertura in ('manual','automatico')) default 'automatico'`
- `estado_manual text check (estado_manual in ('abierta','cerrada')) null`: usado en modo manual
- `abre_min_antes int default 30`, `cierra_min_despues int default 120`
- `token_entrada text unique not null`, `token_salida text unique not null`: aleatorios, al menos 128 bits, codificación URL-safe
- `unique (evento_id, numero)`

**Estado efectivo de una sesión** (función pura, compartida entre servidor y panel):
- Modo `manual`: `abierta` si `estado_manual = 'abierta'`; si no, `cerrada` o `programada`.
- Modo `automatico`: `abierta` si `inicio - abre_min_antes ≤ ahora ≤ fin + cierra_min_despues`; `programada` si antes; `cerrada` si después.

### `asistentes`
- `tipo_documento text check (tipo_documento in ('CC','CE','PA','TI'))`
- `numero_documento text not null`: normalizado (sin puntos, espacios ni guiones)
- `nombres text`, `apellidos text`, `correo text`, `dependencia text`, `cargo text`: últimos valores conocidos
- `unique (tipo_documento, numero_documento)`

### `entradas`
- `sesion_id`, `asistente_id`
- `registrado_at timestamptz`
- `nombres`, `apellidos`, `correo`, `dependencia`, `cargo`: copia tal como se diligenció
- Consentimiento: `habeas_version_id uuid references evento_habeas_versiones`, `consentimiento_at timestamptz`, `ip inet`, `user_agent text`
- `unique (sesion_id, asistente_id)`: si la persona se registra de nuevo, se actualizan los datos (upsert) y se conserva el `registrado_at` original

### `salidas`
- `sesion_id`, `asistente_id`
- `registrado_at timestamptz`
- `respuestas jsonb`: `{ "<clave_pregunta>": valor }`
- `comentario text null`
- `sin_entrada boolean not null`
- Si `sin_entrada`, los mismos campos de consentimiento que `entradas`
- `unique (sesion_id, asistente_id)`: los reenvíos actualizan

### Vista `asistencia_consolidada`
Una fila por (sesión, asistente) presente en `entradas` o en `salidas`, con:
- evento, número y fecha de sesión
- datos del asistente
- `entrada_at`, `salida_at`
- `estado_asistencia`: `completa` | `solo_entrada` | `sin_entrada`
- promedio de las preguntas en escala, NPS y comentario

### 2.1 Plantilla estándar de encuesta (seed)

| clave | tipo | texto por defecto |
|---|---|---|
| `contenido` | escala_1_5 | El contenido de la sesión fue pertinente y claro |
| `expositor` | escala_1_5 | El expositor demostró dominio del tema |
| `metodologia` | escala_1_5 | La metodología facilitó el aprendizaje |
| `utilidad` | escala_1_5 | Lo aprendido es útil para mis funciones |
| `logistica` | escala_1_5 | La logística (lugar, horario, recursos) fue adecuada |
| `nps` | nps_0_10 | ¿Qué tan probable es que recomiende esta capacitación? |
| `comentario` | texto | Comentarios o sugerencias |

Seed adicional: la marca "Avance Jurídico" (el logo se carga desde el panel) y un texto de Habeas Data **marcador** claramente identificado como `[PENDIENTE: cláusula oficial de Avance Jurídico]`. El panel impide pasar un evento a `activo` mientras su texto vigente contenga ese marcador.

## 3. Flujos públicos (celular)

### Entrada: `/r/[token]`
1. El servidor resuelve la sesión por `token_entrada`. Si no existe, muestra "Enlace no válido". Si no está `abierta`, muestra un mensaje con la fecha de apertura o de cierre.
2. El encabezado lleva los logos visibles del evento en orden, el nombre del evento, el número y título de la sesión y la fecha.
3. Campos: tipo y número de documento, nombres, apellidos, correo, dependencia y cargo, todos obligatorios.
4. Habeas Data: texto vigente completo en un recuadro con scroll, enlace a la política si existe y una casilla obligatoria **sin marcar por defecto**.
5. Al enviar, una Server Action:
   - valida con zod;
   - vuelve a verificar que la sesión esté abierta;
   - revisa el honeypot y el rate limit;
   - hace upsert del asistente y upsert de la entrada con la prueba de consentimiento (IP desde `x-forwarded-for`).
6. Muestra la confirmación "Registro exitoso, {nombres}".

### Salida: `/s/[token]`
1. Hace la misma validación de token y estado que la entrada.
2. **Paso 1:** tipo y número de documento. Si hay entrada en la sesión, muestra el saludo "Hola, {nombres}". Si no, muestra el formulario completo más el Habeas Data, igual que la entrada.
3. **Paso 2:** preguntas activas del evento: escala 1–5 y NPS 0–10 con botones grandes, y el comentario opcional. Las preguntas de escala y el NPS son obligatorios.
4. Al enviar, hace upsert de la salida con `sin_entrada` calculado en el servidor. Muestra "¡Gracias!".

### Requisitos transversales
- *Mobile-first*, con contraste AA y controles de al menos 44 px de alto.
- Mensajes de error en español junto a cada campo.
- Si el envío falla por red, el formulario conserva los datos y ofrece reintentar.
- Honeypot en todos los formularios públicos.
- Rate limit por IP de 20 envíos cada 10 minutos por token, implementado con una tabla `rate_limits` en Postgres.
- Tema visual: `color_primario` del evento aplicado como variable CSS.

## 4. Panel de administración: `/admin`

- **Login:** Supabase Auth con correo y contraseña. Registro público deshabilitado; los usuarios se invitan desde el dashboard de Supabase o desde el panel (`auth.admin.inviteUserByEmail`). Hay una tabla `administradores (user_id)`, y cualquier ruta `/admin` exige pertenecer a ella.
- **Marcas:** CRUD con subida de logo (PNG o SVG, máximo 1 MB) al bucket `logos`.
- **Eventos:**
  - lista y creación;
  - edición de los datos generales;
  - co-branding: seleccionar, ordenar y alternar la visibilidad de las marcas, con vista previa en vivo del encabezado;
  - Habeas Data: editar el texto, lo que crea una versión nueva, y consultar el historial;
  - encuesta: activar o desactivar y editar el texto de cada pregunta;
  - **Duplicar evento**, que copia la configuración, las marcas, las preguntas y el Habeas Data vigente, pero no las sesiones ni los registros.
- **Sesiones:**
  - tabla con número, fecha, estado efectivo y contadores (entradas, salidas, sin entrada);
  - creación individual y creación múltiple (filas con número, fecha, hora de inicio y fin, y título);
  - edición;
  - abrir o cerrar en modo manual, o cambiar de modo;
  - **regenerar tokens**, con confirmación;
  - descarga de los QR en PNG y un **PDF imprimible por sesión** (logos, evento, sesión y fecha, más los QR de ENTRADA y SALIDA rotulados con su URL corta).
- **Datos:**
  - tabla de `asistencia_consolidada` con filtros por evento, sesión y estado, y búsqueda por nombre o documento;
  - **exportar a Excel (.xlsx)**, por sesión o por evento, con una hoja por sesión más una hoja "Resumen";
  - resumen de la encuesta por sesión: promedio por pregunta, NPS (% promotores − % detractores) y lista de comentarios.

Librerías: `qrcode` para los QR, `@react-pdf/renderer` para el PDF y `exceljs` para el Excel.

## 5. Seguridad y datos personales

- **Escrituras públicas:** solo por Server Actions, que usan la `SUPABASE_SERVICE_ROLE_KEY`. Esa clave vive solo en el servidor; nunca se expone al cliente ni en variables `NEXT_PUBLIC_*`.
- **RLS habilitado en todas las tablas:**
  - `anon` no tiene ninguna política, es decir, sin acceso;
  - `authenticated` tiene acceso completo solo si `auth.uid()` está en `administradores`.
- **Storage:** el bucket `logos` es público de lectura y solo los administradores pueden escribir. No se guardan datos personales en Storage.
- **Minimización:** solo se recogen los campos listados, más la IP y el user agent como prueba del consentimiento.
- **Respaldo:** backups diarios de Supabase. Además, se recomienda operativamente exportar a Excel al cierre de cada sesión.
- **Tokens de QR:** impredecibles, sin datos embebidos y regenerables.

## 6. Despliegue

- Repositorio git en GitHub conectado a Vercel: `main` despliega a producción y las ramas generan previews.
- Supabase:
  - migraciones SQL versionadas en `supabase/migrations/`;
  - `supabase/seed.sql` con la plantilla de encuesta, la marca Avance Jurídico y el marcador de Habeas Data;
  - desarrollo local con Supabase CLI.
- Variables de entorno en Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `NEXT_PUBLIC_BASE_URL` (base de las URL de los QR).
- **Dominio:** inicialmente `*.vercel.app`. Hay que definir el dominio definitivo (p. ej. `capacitaciones.avancejuridico.com.co`) **antes de imprimir QR**, porque la URL queda codificada en ellos.

## 7. Pruebas

- **Unitarias (Vitest):**
  - estado efectivo de la sesión (bordes de la ventana);
  - normalización de documento;
  - esquemas zod;
  - cálculo de NPS y promedios;
  - construcción del Excel.
- **Integración (Supabase local):**
  - unicidad y upsert de entradas y salidas;
  - `sin_entrada`;
  - versionado de Habeas Data;
  - RLS: `anon` sin acceso y el usuario no administrador sin acceso.
- **E2E (Playwright, viewport móvil):**
  - entrada → salida → fila `completa` en el consolidado;
  - salida sin entrada → `sin_entrada`;
  - sesión cerrada, con mensaje y sin registro;
  - admin: crear evento → crear sesiones → descargar PDF de QR → exportar Excel.
- **Antes de la primera sesión en la PGN:** un simulacro con una sesión de prueba desde varios celulares.

## 8. Fuera de alcance (por ahora)

Certificados de asistencia, envío de correos a asistentes, roles múltiples, tipos de pregunta nuevos, modo sin conexión y multi-idioma.

## 9. Insumos pendientes del cliente

1. Texto de la cláusula de Habeas Data y enlace a la política de tratamiento de datos de Avance Jurídico.
2. Logos de la PGN y de Avance Jurídico en alta resolución (idealmente SVG o PNG con transparencia).
3. Cuentas de GitHub, Vercel y Supabase, o acceso a ellas.
4. Decisión sobre el dominio definitivo.
5. Fechas y horas de las 12 sesiones de la PGN.

## 10. Ajustes decididos al planear (prevalecen sobre las secciones anteriores)

1. **Rate limit:** 300 envíos por IP y token cada 10 min, no 20. Los asistentes de la PGN comparten la IP pública de la wifi institucional.
2. **Hoja imprimible en HTML** con "Imprimir / Guardar como PDF", en lugar de un PDF generado en el servidor. Así se soportan logos SVG y no hace falta `@react-pdf/renderer`.
3. **`marcas.logo_path` admite nulos.** Mientras una marca no tenga logo, el encabezado muestra su nombre.
4. **Tablas nuevas `configuracion` y `plantilla_preguntas`,** más una página "Configuración" para el texto de Habeas Data por defecto. Los datos base se cargan en una migración para que también lleguen a producción.
5. **Administradores:** se crean desde el dashboard o el SQL de Supabase, o con `scripts/crear-admin.mjs`. No hay invitación desde el panel.
6. **Sin borrado** de eventos ni sesiones desde el panel. Los eventos se archivan.
