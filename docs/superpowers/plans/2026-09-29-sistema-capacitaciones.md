# Sistema de Registro para Capacitaciones — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir y desplegar una herramienta web parametrizable de Avance Jurídico para registrar entrada y salida (con evaluación) de capacitaciones por QR, con co-branding configurable y datos consolidados por sesión, lista para las 12 sesiones de la PGN.

**Architecture:** Un solo proyecto Next.js 15 (App Router) desplegado en Vercel, con Supabase (Postgres + Auth + Storage). Los formularios públicos (`/r/[token]`, `/s/[token]`) escriben mediante Server Actions con la clave de servicio; el panel `/admin` usa la sesión del administrador y RLS. La lógica de negocio vive en funciones puras (`src/lib/domain`) y en funciones de acceso a datos que reciben el cliente Supabase como parámetro (`src/lib/repo`), para poder probarlas contra un Supabase local.

**Tech Stack:** Node 24, Next.js 15, React 19, TypeScript, Tailwind CSS v4, Supabase (`@supabase/supabase-js`, `@supabase/ssr`, Supabase CLI), zod 3, `qrcode`, `exceljs`, Vitest 3.2, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-29-sistema-capacitaciones-design.md`

## Ajustes respecto a la spec (decididos al planear)

1. **Rate limit: 300 envíos por IP y token cada 10 min, en lugar de 20.** En la PGN los asistentes comparten la wifi institucional y salen a internet con la misma IP pública. Con 20, un salón de 30 personas quedaría bloqueado.
2. **Hoja imprimible en HTML ("Imprimir / Guardar como PDF") en lugar de un PDF generado en el servidor.** Los generadores de PDF en servidor no soportan logos SVG. El navegador imprime la hoja con fidelidad, y se elimina una dependencia.
3. **`marcas.logo_path` admite nulos.** La marca Avance Jurídico se precarga sin logo y el logo se sube desde el panel. Mientras no haya logo, el encabezado muestra el nombre de la marca.
4. **Tablas nuevas `configuracion` y `plantilla_preguntas`**, y una página "Configuración" para el texto de Habeas Data por defecto. Los datos base se cargan en una migración, no en `seed.sql`, para que también lleguen a producción.
5. **Los administradores se crean desde el dashboard o el SQL de Supabase**, más un script local. No hay invitación desde el panel.
6. **No se eliminan sesiones ni eventos desde el panel**, para proteger los registros. Un evento se puede archivar.

## Global Constraints

- Toda la interfaz y todos los mensajes van en español.
- Zona horaria de negocio: `America/Bogota` (UTC−5 fijo, sin horario de verano). Las fechas se guardan como `timestamptz`.
- Versiones: Node 24, Next.js 15 (App Router, carpeta `src/`, alias `@/*`), React 19, TypeScript estricto, Tailwind v4, zod `^3.25`, Vitest `^3.2`.
- Tokens de QR: 16 bytes aleatorios en base64url (22 caracteres `[A-Za-z0-9_-]`).
- Texto marcador exacto de Habeas Data pendiente: `[PENDIENTE: cláusula oficial de Avance Jurídico]`. Un evento con ese texto vigente no puede pasar a `activo`.
- La casilla de Habeas Data aparece **sin marcar por defecto** y es obligatoria tanto en el navegador (`required`) como en el servidor (zod).
- Rate limit: 300 envíos por clave `(formulario, token, IP)` en 600 segundos.
- Logos: PNG, SVG o JPG, máximo 1 048 576 bytes.
- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en el servidor: nunca en variables `NEXT_PUBLIC_*` ni en componentes `'use client'`.
- Controles táctiles de al menos 44 px de alto (`min-h-11`) y contraste AA.
- Toda Server Action del panel y todo route handler bajo `/api/admin` llama primero a `requerirAdmin()`.
- Ventana automática por defecto: abre 30 min antes del inicio y cierra 120 min después del fin.
- Las pruebas de integración y las E2E comparten el Supabase local y lo limpian: nunca se ejecutan en paralelo entre sí.

## Review Focus

1. **Documento escrito distinto en entrada y salida** (`1.020.345.678` contra `1020345678`): debe reconocerse como la misma persona y quedar `completa`. Lo prueban la Tarea 1 (normalización) y la Tarea 5 (E2E de salida).
2. **Salón completo detrás de la misma IP pública:** nadie debe quedar bloqueado por el rate limit. Lo prueban la Tarea 1 (constante ≥ 200) y la Tarea 2 (función SQL).
3. **Conexión que se cae al enviar desde el celular:** los datos deben conservarse y el reintento debe funcionar. Lo prueba la Tarea 4 (E2E con `setOffline`).
4. **Sesión que se cierra mientras la persona diligencia el formulario:** debe mostrarse un mensaje claro y no guardarse nada. Lo prueba la Tarea 4 (E2E).
5. **Evento con más de 1000 registros** (12 sesiones × ~100 personas): el consolidado y el Excel deben estar completos, a pesar del límite de 1000 filas por consulta de PostgREST. Lo prueba la Tarea 11 (integración con paginación).

---

## Estructura de archivos

```
src/
  middleware.ts                          # refresca la sesión y protege /admin y /api/admin
  app/
    layout.tsx, globals.css, page.tsx    # page.tsx redirige a /admin
    r/[token]/page.tsx, actions.ts       # entrada pública
    s/[token]/page.tsx, actions.ts       # salida pública
    admin/login/page.tsx, FormularioLogin.tsx, actions.ts
    admin/imprimir/[sesionId]/page.tsx, BotonImprimir.tsx
    admin/(panel)/layout.tsx             # requiere admin; navegación
    admin/(panel)/page.tsx               # lista de eventos
    admin/(panel)/marcas/page.tsx, actions.ts
    admin/(panel)/configuracion/page.tsx, actions.ts
    admin/(panel)/eventos/nuevo/page.tsx, actions.ts
    admin/(panel)/eventos/[id]/page.tsx, actions.ts, EditorCoBranding.tsx
    admin/(panel)/eventos/[id]/sesiones/page.tsx, actions.ts
    admin/(panel)/eventos/[id]/sesiones/[sesionId]/page.tsx
    admin/(panel)/eventos/[id]/datos/page.tsx
    api/admin/sesiones/[id]/qr/[tipo]/route.ts
    api/admin/exportar/route.ts
  components/
    useEnvio.ts                          # envío sin reinicio del formulario y con detección de fallo de red
    publico/  EncabezadoMarcas, MarcoPublico, MensajeEstado, campos, CamposDocumento,
              CamposPersonales, CajaHabeas, CampoTrampa, FormularioEntrada,
              FormularioSalida, PreguntasEncuesta
    admin/    estilos.ts, CampoAdmin.tsx, FormularioAccion.tsx, CamposEvento.tsx, EncabezadoEvento.tsx
  lib/
    domain/   constantes, documento, correo, ip, tokens, fechas, sesion-estado,
              encuesta, schemas, schemas-admin, sesiones-masivas, logo, resumen, texto
    repo/     db.ts, publico.ts, registro.ts, rate-limit.ts, marcas.ts,
              configuracion.ts, eventos.ts, sesiones.ts, consolidado.ts
    supabase/ servicio.ts, servidor.ts
    auth/admin.ts
    export/excel.ts
    qr.ts, storage.ts, request-meta.ts, errores.ts, envio.ts, acciones.ts
supabase/
  config.toml
  migrations/20260929000100_esquema.sql
  migrations/20260929000200_rls.sql
  migrations/20260929000300_vista_consolidada.sql
  migrations/20260929000400_datos_base.sql
scripts/env-local.mjs, scripts/crear-admin.mjs
tests/unit/*.test.ts
tests/integration/setup.ts, helpers.ts, *.test.ts
e2e/utilidades.ts, publico-*.spec.ts, admin-*.spec.ts
```

---

### Task 1: Scaffolding y lógica de dominio pura

**Files:**
- Move: `requerimientosIniciales.md` → `docs/requerimientosIniciales.md`
- Create: proyecto Next.js (`package.json`, `tsconfig.json`, `next.config.ts`, `src/app/*`, etc.), `vitest.config.ts`
- Create: `src/lib/domain/constantes.ts`, `documento.ts`, `correo.ts`, `ip.ts`, `tokens.ts`, `fechas.ts`, `sesion-estado.ts`, `encuesta.ts`, `schemas.ts`, `sesiones-masivas.ts`
- Test: `tests/unit/dominio.test.ts`, `tests/unit/fechas.test.ts`, `tests/unit/sesion-estado.test.ts`, `tests/unit/schemas.test.ts`, `tests/unit/sesiones-masivas.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `ZONA_HORARIA`, `HABEAS_PENDIENTE`, `TIPOS_DOCUMENTO`, `type TipoDocumento`, `RATE_LIMIT: { max: number; ventanaSegundos: number }`, `ETIQUETA_EVENTO`, `ETIQUETA_ESTADO_SESION`, `type EstadoEvento`
  - `normalizarDocumento(v: string): string`
  - `correoFueraDeDominio(correo: string, dominio: string | null): boolean`
  - `ipDesdeCabeceras(xff: string | null, realIp: string | null): string | null`
  - `generarToken(): string`
  - `fechaHoraBogota(fecha: string, hora: string): Date | null`, `aInputLocal(d: Date): string`, `desdeInputLocal(v: string): Date | null`, `formatearFechaHora(d: Date | string): string`
  - `type EstadoSesion = 'programada' | 'abierta' | 'cerrada'`, `interface VentanaSesion`, `ventanaApertura(s): { abre: Date; cierra: Date }`, `estadoSesion(s, ahora: Date): EstadoSesion`
  - `type TipoPregunta`, `interface Pregunta { clave; tipo; texto; orden; activa }`, `promedio(v: number[]): number | null`, `calcularNps(v: number[]): number | null`, `separarRespuestas(preguntas, valores): { respuestas: Record<string, number>; comentario: string | null }`
  - `documentoSchema`, `datosPersonalesSchema`, `entradaSchema`, `type DatosPersonales`, `encuestaSchema(preguntas)`, `erroresPorCampo(error): Record<string, string>`
  - `interface FilaSesion { numero; inicio: Date; fin: Date; titulo: string | null; lugar: string | null }`, `parsearSesionesMasivas(texto): { filas: FilaSesion[]; errores: string[] }`

- [ ] **Step 1: Crear el proyecto Next.js**

`create-next-app` solo acepta directorios con ciertos archivos, así que primero se mueven los requerimientos a `docs/`:

```bash
git mv requerimientosIniciales.md docs/requerimientosIniciales.md
git commit -m "docs: mover requerimientos a docs/"
npx create-next-app@15 . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

Si pregunta algo, acepta los valores por defecto. Resultado esperado: `package.json`, `src/app/page.tsx` y `npm run dev` funcionando.

- [ ] **Step 2: Instalar dependencias y configurar scripts**

```bash
npm i @supabase/supabase-js @supabase/ssr zod@^3.25 qrcode exceljs server-only
npm i -D vitest@^3.2 @types/qrcode supabase @playwright/test dotenv pg @types/pg jsqr pngjs @types/pngjs
npm pkg set scripts.test="vitest run --project unit" scripts.test:int="vitest run --project integration" scripts.e2e="playwright test" scripts.db:start="supabase start" scripts.db:reset="supabase db reset" scripts.env:local="node scripts/env-local.mjs"
```

- [ ] **Step 3: Configurar Vitest**

Crear `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['tests/integration/setup.ts'],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
```

- [ ] **Step 4: Escribir las pruebas unitarias del dominio (fallan)**

Crear `tests/unit/dominio.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizarDocumento } from '@/lib/domain/documento';
import { correoFueraDeDominio } from '@/lib/domain/correo';
import { ipDesdeCabeceras } from '@/lib/domain/ip';
import { generarToken } from '@/lib/domain/tokens';
import { RATE_LIMIT } from '@/lib/domain/constantes';
import { calcularNps, promedio, separarRespuestas, type Pregunta } from '@/lib/domain/encuesta';

describe('normalizarDocumento', () => {
  it('quita puntos, espacios y guiones, y pasa a mayúsculas', () => {
    expect(normalizarDocumento(' 1.020.345.678 ')).toBe('1020345678');
    expect(normalizarDocumento('ab-123 45')).toBe('AB12345');
  });
});

describe('correoFueraDeDominio', () => {
  it('no advierte si no hay dominio configurado', () => {
    expect(correoFueraDeDominio('a@gmail.com', null)).toBe(false);
  });
  it('acepta el dominio exacto y sus subdominios, sin importar mayúsculas ni @ inicial', () => {
    expect(correoFueraDeDominio('A@Procuraduria.gov.co', '@procuraduria.gov.co')).toBe(false);
    expect(correoFueraDeDominio('a@sub.procuraduria.gov.co', 'procuraduria.gov.co')).toBe(false);
  });
  it('advierte con otro dominio', () => {
    expect(correoFueraDeDominio('a@gmail.com', 'procuraduria.gov.co')).toBe(true);
    expect(correoFueraDeDominio('a@falsoprocuraduria.gov.co', 'procuraduria.gov.co')).toBe(true);
  });
});

describe('ipDesdeCabeceras', () => {
  it('toma la primera IP de x-forwarded-for', () => {
    expect(ipDesdeCabeceras('181.49.1.2, 10.0.0.1', null)).toBe('181.49.1.2');
  });
  it('usa x-real-ip si no hay x-forwarded-for', () => {
    expect(ipDesdeCabeceras(null, '::1')).toBe('::1');
  });
  it('devuelve null si el valor no es una IP', () => {
    expect(ipDesdeCabeceras('basura', null)).toBeNull();
    expect(ipDesdeCabeceras(null, null)).toBeNull();
  });
});

describe('generarToken', () => {
  it('produce 22 caracteres base64url distintos cada vez', () => {
    const tokens = new Set(Array.from({ length: 200 }, generarToken));
    expect(tokens.size).toBe(200);
    for (const t of tokens) expect(t).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });
});

describe('RATE_LIMIT', () => {
  it('permite un salón completo detrás de la misma IP (wifi institucional)', () => {
    expect(RATE_LIMIT.max).toBeGreaterThanOrEqual(200);
    expect(RATE_LIMIT.ventanaSegundos).toBe(600);
  });
});

describe('encuesta', () => {
  it('promedio redondea a 2 decimales y devuelve null sin datos', () => {
    expect(promedio([5, 4, 4])).toBe(4.33);
    expect(promedio([])).toBeNull();
  });
  it('calcularNps = % promotores (9-10) − % detractores (0-6)', () => {
    expect(calcularNps([10, 9, 8, 6])).toBe(25);
    expect(calcularNps([])).toBeNull();
  });
  it('separarRespuestas separa números y comentario, e ignora preguntas inactivas', () => {
    const preguntas: Pregunta[] = [
      { clave: 'contenido', tipo: 'escala_1_5', texto: 'C', orden: 1, activa: true },
      { clave: 'logistica', tipo: 'escala_1_5', texto: 'L', orden: 2, activa: false },
      { clave: 'nps', tipo: 'nps_0_10', texto: 'N', orden: 3, activa: true },
      { clave: 'comentario', tipo: 'texto', texto: 'T', orden: 4, activa: true },
    ];
    expect(
      separarRespuestas(preguntas, { p_contenido: 5, p_logistica: 1, p_nps: 9, p_comentario: '  Bien ' }),
    ).toEqual({ respuestas: { contenido: 5, nps: 9 }, comentario: 'Bien' });
    expect(separarRespuestas(preguntas, { p_contenido: 5, p_nps: 9, p_comentario: '' }).comentario).toBeNull();
  });
});
```

Crear `tests/unit/fechas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { aInputLocal, desdeInputLocal, fechaHoraBogota, formatearFechaHora } from '@/lib/domain/fechas';

describe('fechaHoraBogota', () => {
  it('interpreta la hora como hora de Bogotá (UTC−5)', () => {
    expect(fechaHoraBogota('2026-10-14', '08:00')!.toISOString()).toBe('2026-10-14T13:00:00.000Z');
  });
  it('acepta DD/MM/AAAA (formato de Excel en Colombia)', () => {
    expect(fechaHoraBogota('14/10/2026', '8:00')!.toISOString()).toBe('2026-10-14T13:00:00.000Z');
  });
  it('rechaza fechas y horas inválidas', () => {
    expect(fechaHoraBogota('2026-02-31', '08:00')).toBeNull();
    expect(fechaHoraBogota('2026-10-14', '25:00')).toBeNull();
    expect(fechaHoraBogota('mañana', '08:00')).toBeNull();
  });
});

describe('inputs datetime-local', () => {
  it('convierte ida y vuelta en hora de Bogotá', () => {
    const d = new Date('2026-10-14T13:00:00Z');
    expect(aInputLocal(d)).toBe('2026-10-14T08:00');
    expect(desdeInputLocal('2026-10-14T08:00')!.toISOString()).toBe(d.toISOString());
    expect(desdeInputLocal('')).toBeNull();
  });
});

describe('formatearFechaHora', () => {
  it('formatea en español en hora de Bogotá', () => {
    const texto = formatearFechaHora(new Date('2026-10-14T13:00:00Z'));
    expect(texto).toContain('octubre');
    expect(texto).toContain('2026');
    expect(texto).toMatch(/8:00/);
  });
});
```

Crear `tests/unit/sesion-estado.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { estadoSesion, ventanaApertura, type VentanaSesion } from '@/lib/domain/sesion-estado';

// Sesión de 8:00 a 12:00 hora de Bogotá
const base: VentanaSesion = {
  inicio: new Date('2026-10-14T13:00:00Z'),
  fin: new Date('2026-10-14T17:00:00Z'),
  modo_apertura: 'automatico',
  estado_manual: null,
  abre_min_antes: 30,
  cierra_min_despues: 120,
};

describe('ventanaApertura', () => {
  it('abre 30 min antes y cierra 120 min después', () => {
    const v = ventanaApertura(base);
    expect(v.abre.toISOString()).toBe('2026-10-14T12:30:00.000Z');
    expect(v.cierra.toISOString()).toBe('2026-10-14T19:00:00.000Z');
  });
});

describe('estadoSesion automático', () => {
  it('programada un minuto antes de abrir', () => {
    expect(estadoSesion(base, new Date('2026-10-14T12:29:00Z'))).toBe('programada');
  });
  it('abierta justo al abrir (7:30 Bogotá)', () => {
    expect(estadoSesion(base, new Date('2026-10-14T12:30:00Z'))).toBe('abierta');
  });
  it('abierta justo al cerrar (14:00 Bogotá)', () => {
    expect(estadoSesion(base, new Date('2026-10-14T19:00:00Z'))).toBe('abierta');
  });
  it('cerrada un segundo después', () => {
    expect(estadoSesion(base, new Date('2026-10-14T19:00:01Z'))).toBe('cerrada');
  });
});

describe('estadoSesion manual', () => {
  const antes = new Date('2026-10-01T00:00:00Z');
  const durante = new Date('2026-10-14T14:00:00Z');
  it('abierta si el administrador la abrió, aunque sea antes de la ventana', () => {
    expect(estadoSesion({ ...base, modo_apertura: 'manual', estado_manual: 'abierta' }, antes)).toBe('abierta');
  });
  it('cerrada si el administrador la cerró, aunque esté dentro de la ventana', () => {
    expect(estadoSesion({ ...base, modo_apertura: 'manual', estado_manual: 'cerrada' }, durante)).toBe('cerrada');
  });
  it('programada si está en modo manual sin estado', () => {
    expect(estadoSesion({ ...base, modo_apertura: 'manual', estado_manual: null }, durante)).toBe('programada');
  });
});
```

Crear `tests/unit/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { encuestaSchema, entradaSchema, erroresPorCampo } from '@/lib/domain/schemas';
import type { Pregunta } from '@/lib/domain/encuesta';

const valida = {
  tipo_documento: 'CC',
  numero_documento: '1.020.345.678',
  nombres: ' Ana María ',
  apellidos: 'Pérez Gómez',
  correo: 'APerez@Procuraduria.gov.co',
  dependencia: 'Delegada para Asuntos Civiles',
  cargo: 'Profesional',
  acepta_habeas: 'on',
};

describe('entradaSchema', () => {
  it('normaliza documento, nombres y correo', () => {
    const r = entradaSchema.parse(valida);
    expect(r.numero_documento).toBe('1020345678');
    expect(r.nombres).toBe('Ana María');
    expect(r.correo).toBe('aperez@procuraduria.gov.co');
  });
  it('exige la autorización de Habeas Data', () => {
    const { acepta_habeas: _omitida, ...sinHabeas } = valida;
    const r = entradaSchema.safeParse(sinHabeas);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(erroresPorCampo(r.error).acepta_habeas).toBe(
        'Debe autorizar el tratamiento de datos personales para continuar',
      );
    }
  });
  it('reporta un mensaje en español por campo', () => {
    const r = entradaSchema.safeParse({ ...valida, correo: 'no-es-correo', numero_documento: '1', tipo_documento: 'XX' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = erroresPorCampo(r.error);
      expect(e.correo).toBe('Correo no válido');
      expect(e.numero_documento).toBe('Número de documento no válido');
      expect(e.tipo_documento).toBe('Seleccione el tipo de documento');
    }
  });
});

describe('encuestaSchema', () => {
  const preguntas: Pregunta[] = [
    { clave: 'contenido', tipo: 'escala_1_5', texto: 'C', orden: 1, activa: true },
    { clave: 'logistica', tipo: 'escala_1_5', texto: 'L', orden: 2, activa: false },
    { clave: 'nps', tipo: 'nps_0_10', texto: 'N', orden: 3, activa: true },
    { clave: 'comentario', tipo: 'texto', texto: 'T', orden: 4, activa: true },
  ];
  it('convierte valores de formulario a números', () => {
    expect(encuestaSchema(preguntas).parse({ p_contenido: '5', p_nps: '0' })).toEqual({
      p_contenido: 5,
      p_nps: 0,
      p_comentario: undefined,
    });
  });
  it('exige las preguntas numéricas activas (un NPS vacío no cuenta como 0)', () => {
    const r = encuestaSchema(preguntas).safeParse({ p_contenido: '5', p_nps: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(erroresPorCampo(r.error).p_nps).toBe('Seleccione una opción');
  });
  it('rechaza valores fuera de rango', () => {
    expect(encuestaSchema(preguntas).safeParse({ p_contenido: '6', p_nps: '5' }).success).toBe(false);
  });
});
```

Crear `tests/unit/sesiones-masivas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parsearSesionesMasivas } from '@/lib/domain/sesiones-masivas';

describe('parsearSesionesMasivas', () => {
  it('acepta punto y coma o tabulador (pegado desde Excel) e ignora líneas vacías', () => {
    const r = parsearSesionesMasivas(
      '1; 2026-10-14; 08:00; 12:00; Régimen disciplinario; Auditorio\n\n2\t21/10/2026\t8:00\t12:00',
    );
    expect(r.errores).toEqual([]);
    expect(r.filas).toHaveLength(2);
    expect(r.filas[0]).toEqual({
      numero: 1,
      inicio: new Date('2026-10-14T13:00:00Z'),
      fin: new Date('2026-10-14T17:00:00Z'),
      titulo: 'Régimen disciplinario',
      lugar: 'Auditorio',
    });
    expect(r.filas[1].titulo).toBeNull();
  });
  it('reporta errores por línea', () => {
    const r = parsearSesionesMasivas('x;2026-10-14;08:00;12:00\n2;2026-02-31;08:00;12:00\n3;2026-10-14;12:00;08:00\n4;2026-10-14');
    expect(r.errores).toEqual([
      'Línea 1: número de sesión no válido',
      'Línea 2: fecha u hora no válida',
      'Línea 3: la hora de fin debe ser posterior a la de inicio',
      'Línea 4: se esperan al menos 4 columnas (número; fecha; hora inicio; hora fin)',
    ]);
  });
  it('detecta números repetidos', () => {
    const r = parsearSesionesMasivas('1;2026-10-14;08:00;12:00\n1;2026-10-21;08:00;12:00');
    expect(r.errores).toEqual(['Línea 2: número de sesión repetido (1)']);
  });
});
```

- [ ] **Step 5: Correr las pruebas y confirmar que fallan**

Run: `npm test`
Expected: FAIL, porque los módulos de `@/lib/domain/...` no existen.

- [ ] **Step 6: Implementar el dominio**

`src/lib/domain/constantes.ts`:

```ts
export const ZONA_HORARIA = 'America/Bogota';
export const HABEAS_PENDIENTE = '[PENDIENTE: cláusula oficial de Avance Jurídico]';
export const TIPOS_DOCUMENTO = ['CC', 'CE', 'PA', 'TI'] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];
export const NOMBRE_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  PA: 'Pasaporte',
  TI: 'Tarjeta de identidad',
};
// 300 por (formulario, token, IP) en 10 min: los asistentes comparten la IP pública de la wifi institucional.
export const RATE_LIMIT = { max: 300, ventanaSegundos: 600 };
export type EstadoEvento = 'borrador' | 'activo' | 'archivado';
export const ETIQUETA_EVENTO: Record<EstadoEvento, string> = {
  borrador: 'Borrador',
  activo: 'Activo',
  archivado: 'Archivado',
};
export const ETIQUETA_ESTADO_SESION = { programada: 'Programada', abierta: 'Abierta', cerrada: 'Cerrada' } as const;
export const COLOR_DEFECTO = '#1F3A5F';
```

`src/lib/domain/documento.ts`:

```ts
export function normalizarDocumento(valor: string): string {
  return valor.toUpperCase().replace(/[\s.\-]/g, '');
}
```

`src/lib/domain/correo.ts`:

```ts
export function correoFueraDeDominio(correo: string, dominio: string | null): boolean {
  if (!dominio) return false;
  const esperado = dominio.trim().toLowerCase().replace(/^@/, '');
  const c = correo.trim().toLowerCase();
  if (!c.includes('@')) return false;
  const real = c.split('@').pop()!;
  return real !== esperado && !real.endsWith(`.${esperado}`);
}
```

`src/lib/domain/ip.ts`:

```ts
import { isIP } from 'node:net';

export function ipDesdeCabeceras(xff: string | null, realIp: string | null): string | null {
  const candidata = xff?.split(',')[0]?.trim() || realIp?.trim() || '';
  return isIP(candidata) ? candidata : null;
}
```

`src/lib/domain/tokens.ts`:

```ts
import { randomBytes } from 'node:crypto';

export function generarToken(): string {
  return randomBytes(16).toString('base64url');
}
```

`src/lib/domain/fechas.ts`:

```ts
import { ZONA_HORARIA } from './constantes';

const DESFASE_MS = 5 * 3600_000; // Bogotá = UTC−5 todo el año

export function aInputLocal(d: Date): string {
  return new Date(d.getTime() - DESFASE_MS).toISOString().slice(0, 16);
}

export function fechaHoraBogota(fecha: string, hora: string): Date | null {
  let iso = fecha.trim();
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(iso);
  if (dmy) iso = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const hm = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!hm) return null;
  const h = Number(hm[1]);
  const m = Number(hm[2]);
  if (h > 23 || m > 59) return null;
  const d = new Date(`${iso}T${String(h).padStart(2, '0')}:${hm[2]}:00-05:00`);
  if (Number.isNaN(d.getTime())) return null;
  if (aInputLocal(d).slice(0, 10) !== iso) return null; // p. ej. 2026-02-31 se desborda a marzo
  return d;
}

export function desdeInputLocal(valor: string): Date | null {
  const [fecha, hora] = valor.split('T');
  if (!fecha || !hora) return null;
  return fechaHoraBogota(fecha, hora.slice(0, 5));
}

export function formatearFechaHora(d: Date | string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: ZONA_HORARIA,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(d));
}
```

`src/lib/domain/sesion-estado.ts`:

```ts
export type EstadoSesion = 'programada' | 'abierta' | 'cerrada';

export interface VentanaSesion {
  inicio: Date;
  fin: Date;
  modo_apertura: 'manual' | 'automatico';
  estado_manual: 'abierta' | 'cerrada' | null;
  abre_min_antes: number;
  cierra_min_despues: number;
}

export function ventanaApertura(s: VentanaSesion): { abre: Date; cierra: Date } {
  return {
    abre: new Date(s.inicio.getTime() - s.abre_min_antes * 60_000),
    cierra: new Date(s.fin.getTime() + s.cierra_min_despues * 60_000),
  };
}

export function estadoSesion(s: VentanaSesion, ahora: Date): EstadoSesion {
  if (s.modo_apertura === 'manual') {
    if (s.estado_manual === 'abierta') return 'abierta';
    if (s.estado_manual === 'cerrada') return 'cerrada';
    return 'programada';
  }
  const { abre, cierra } = ventanaApertura(s);
  if (ahora < abre) return 'programada';
  if (ahora > cierra) return 'cerrada';
  return 'abierta';
}
```

`src/lib/domain/encuesta.ts`:

```ts
export type TipoPregunta = 'escala_1_5' | 'nps_0_10' | 'texto';

export interface Pregunta {
  clave: string;
  tipo: TipoPregunta;
  texto: string;
  orden: number;
  activa: boolean;
}

export const ETIQUETA_TIPO_PREGUNTA: Record<TipoPregunta, string> = {
  escala_1_5: 'Escala 1 a 5',
  nps_0_10: 'Recomendación 0 a 10',
  texto: 'Texto libre',
};

export function promedio(valores: number[]): number | null {
  if (!valores.length) return null;
  return Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 100) / 100;
}

export function calcularNps(valores: number[]): number | null {
  if (!valores.length) return null;
  const promotores = valores.filter((v) => v >= 9).length;
  const detractores = valores.filter((v) => v <= 6).length;
  return Math.round(((promotores - detractores) / valores.length) * 100);
}

export function separarRespuestas(
  preguntas: Pregunta[],
  valores: Record<string, unknown>,
): { respuestas: Record<string, number>; comentario: string | null } {
  const respuestas: Record<string, number> = {};
  let comentario: string | null = null;
  for (const p of preguntas.filter((x) => x.activa)) {
    const v = valores[`p_${p.clave}`];
    if (p.tipo === 'texto') {
      if (typeof v === 'string' && v.trim()) comentario = v.trim();
    } else if (typeof v === 'number') {
      respuestas[p.clave] = v;
    }
  }
  return { respuestas, comentario };
}
```

`src/lib/domain/schemas.ts`:

```ts
import { z } from 'zod';
import { TIPOS_DOCUMENTO } from './constantes';
import { normalizarDocumento } from './documento';
import type { Pregunta } from './encuesta';

const texto = (mensaje: string, max = 150) =>
  z.string({ required_error: mensaje }).trim().min(2, mensaje).max(max, `Máximo ${max} caracteres`);

export const documentoSchema = z.object({
  tipo_documento: z.enum(TIPOS_DOCUMENTO, {
    errorMap: () => ({ message: 'Seleccione el tipo de documento' }),
  }),
  numero_documento: z
    .string({ required_error: 'Ingrese su número de documento' })
    .transform(normalizarDocumento)
    .pipe(z.string().regex(/^[A-Z0-9]{3,20}$/, 'Número de documento no válido')),
});

export const datosPersonalesSchema = documentoSchema.extend({
  nombres: texto('Ingrese sus nombres', 100),
  apellidos: texto('Ingrese sus apellidos', 100),
  correo: z
    .string({ required_error: 'Ingrese su correo' })
    .trim()
    .toLowerCase()
    .email('Correo no válido')
    .max(150, 'Máximo 150 caracteres'),
  dependencia: texto('Ingrese su dependencia'),
  cargo: texto('Ingrese su cargo'),
});

export const entradaSchema = datosPersonalesSchema.extend({
  acepta_habeas: z.literal('on', {
    errorMap: () => ({ message: 'Debe autorizar el tratamiento de datos personales para continuar' }),
  }),
});

export type DatosPersonales = z.infer<typeof datosPersonalesSchema>;

const numeroEnRango = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? undefined : Number(v)),
    z
      .number({ required_error: 'Seleccione una opción', invalid_type_error: 'Seleccione una opción' })
      .int('Seleccione una opción')
      .min(min, 'Seleccione una opción')
      .max(max, 'Seleccione una opción'),
  );

export function encuestaSchema(preguntas: Pregunta[]) {
  const forma: Record<string, z.ZodTypeAny> = {};
  for (const p of preguntas.filter((x) => x.activa)) {
    const clave = `p_${p.clave}`;
    if (p.tipo === 'escala_1_5') forma[clave] = numeroEnRango(1, 5);
    else if (p.tipo === 'nps_0_10') forma[clave] = numeroEnRango(0, 10);
    else forma[clave] = z.string().trim().max(1000, 'Máximo 1000 caracteres').optional();
  }
  return z.object(forma);
}

export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? '_');
    if (!errores[campo]) errores[campo] = issue.message;
  }
  return errores;
}
```

`src/lib/domain/sesiones-masivas.ts`:

```ts
import { fechaHoraBogota } from './fechas';

export interface FilaSesion {
  numero: number;
  inicio: Date;
  fin: Date;
  titulo: string | null;
  lugar: string | null;
}

export function parsearSesionesMasivas(texto: string): { filas: FilaSesion[]; errores: string[] } {
  const filas: FilaSesion[] = [];
  const errores: string[] = [];
  texto.split(/\r?\n/).forEach((linea, i) => {
    if (!linea.trim()) return;
    const n = i + 1;
    const partes = linea.split(/;|\t/).map((p) => p.trim());
    if (partes.length < 4) {
      errores.push(`Línea ${n}: se esperan al menos 4 columnas (número; fecha; hora inicio; hora fin)`);
      return;
    }
    const [num, fecha, horaInicio, horaFin, titulo, lugar] = partes;
    const numero = Number(num);
    if (!Number.isInteger(numero) || numero < 1) {
      errores.push(`Línea ${n}: número de sesión no válido`);
      return;
    }
    const inicio = fechaHoraBogota(fecha, horaInicio);
    const fin = fechaHoraBogota(fecha, horaFin);
    if (!inicio || !fin) {
      errores.push(`Línea ${n}: fecha u hora no válida`);
      return;
    }
    if (fin <= inicio) {
      errores.push(`Línea ${n}: la hora de fin debe ser posterior a la de inicio`);
      return;
    }
    if (filas.some((f) => f.numero === numero)) {
      errores.push(`Línea ${n}: número de sesión repetido (${numero})`);
      return;
    }
    filas.push({ numero, inicio, fin, titulo: titulo || null, lugar: lugar || null });
  });
  return { filas, errores };
}
```

- [ ] **Step 7: Correr las pruebas y confirmar que pasan**

Run: `npm test`
Expected: PASS en los 5 archivos.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffolding Next.js y lógica de dominio (fechas, estados, validación, encuesta)"
```

---

### Task 2: Esquema de base de datos, RLS, vista consolidada y datos base

**Files:**
- Create: `supabase/config.toml` (con `supabase init`), `supabase/migrations/20260929000100_esquema.sql`, `20260929000200_rls.sql`, `20260929000300_vista_consolidada.sql`, `20260929000400_datos_base.sql`
- Create: `scripts/env-local.mjs`, `tests/integration/setup.ts`, `tests/integration/helpers.ts`
- Test: `tests/integration/esquema.test.ts`

**Interfaces:**
- Consumes: `generarToken()` de la Tarea 1.
- Produces:
  - Tablas: `configuracion`, `plantilla_preguntas`, `marcas`, `eventos`, `evento_habeas_versiones`, `evento_marcas`, `evento_preguntas`, `sesiones`, `asistentes`, `entradas`, `salidas`, `administradores`, `rate_limit_hits`
  - Vista: `asistencia_consolidada`
  - Funciones SQL: `es_admin()` y `consumir_rate_limit(p_clave text, p_max int, p_ventana_segundos int) returns boolean`
  - Bucket `logos`
  - Helpers de prueba (`tests/integration/helpers.ts`): `clienteServicioPrueba()`, `clienteAnonimoPrueba()`, `clienteAutenticadoPrueba(email, password)`, `limpiarDatos()`, `crearEventoPrueba(db, { estadoEvento?, estadoManual? }): Promise<EventoPrueba>`, `crearUsuarioPrueba(esAdmin): Promise<{ email; password; userId }>`, `datosPersona(doc?)`, `PNG_1x1: Buffer`
  - `interface EventoPrueba { eventoId; sesionId; tokenEntrada; tokenSalida; habeasId }`

- [ ] **Step 1: Inicializar Supabase local**

Requiere Docker Desktop en ejecución.

```bash
npx supabase init
```

Si pregunta por la configuración de VS Code o IntelliJ, responde `N`. En `supabase/config.toml`, dentro de la sección `[auth]`, cambia `enable_signup = true` por `enable_signup = false` y deja `site_url = "http://127.0.0.1:3000"` como `site_url = "http://localhost:3000"`.

- [ ] **Step 2: Escribir la migración del esquema**

`supabase/migrations/20260929000100_esquema.sql`:

```sql
create or replace function public.fijar_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table public.configuracion (
  clave text primary key,
  valor text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plantilla_preguntas (
  clave text primary key,
  tipo text not null check (tipo in ('escala_1_5', 'nps_0_10', 'texto')),
  texto text not null,
  orden int not null,
  created_at timestamptz not null default now()
);

create table public.marcas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  logo_path text,
  color_primario text check (color_primario ~ '^#[0-9A-Fa-f]{6}$'),
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cliente text,
  capacitadores text,
  dominio_correo text,
  color_primario text check (color_primario ~ '^#[0-9A-Fa-f]{6}$'),
  estado text not null default 'borrador' check (estado in ('borrador', 'activo', 'archivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evento_habeas_versiones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  version int not null check (version > 0),
  texto text not null,
  url_politica text,
  created_at timestamptz not null default now(),
  unique (evento_id, version)
);

create table public.evento_marcas (
  evento_id uuid not null references public.eventos(id) on delete cascade,
  marca_id uuid not null references public.marcas(id) on delete cascade,
  orden int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (evento_id, marca_id)
);

create table public.evento_preguntas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  clave text not null,
  tipo text not null check (tipo in ('escala_1_5', 'nps_0_10', 'texto')),
  texto text not null,
  orden int not null,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evento_id, clave)
);

create table public.sesiones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete restrict,
  numero int not null check (numero > 0),
  titulo text,
  lugar text,
  inicio timestamptz not null,
  fin timestamptz not null,
  modo_apertura text not null default 'automatico' check (modo_apertura in ('manual', 'automatico')),
  estado_manual text check (estado_manual in ('abierta', 'cerrada')),
  abre_min_antes int not null default 30 check (abre_min_antes >= 0),
  cierra_min_despues int not null default 120 check (cierra_min_despues >= 0),
  token_entrada text not null unique check (length(token_entrada) >= 22),
  token_salida text not null unique check (length(token_salida) >= 22),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evento_id, numero),
  check (fin > inicio)
);
create index sesiones_evento_idx on public.sesiones (evento_id);

create table public.asistentes (
  id uuid primary key default gen_random_uuid(),
  tipo_documento text not null check (tipo_documento in ('CC', 'CE', 'PA', 'TI')),
  numero_documento text not null check (numero_documento ~ '^[A-Z0-9]{3,20}$'),
  nombres text not null,
  apellidos text not null,
  correo text not null,
  dependencia text not null,
  cargo text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tipo_documento, numero_documento)
);

create table public.entradas (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones(id) on delete restrict,
  asistente_id uuid not null references public.asistentes(id) on delete restrict,
  registrado_at timestamptz not null default now(),
  nombres text not null,
  apellidos text not null,
  correo text not null,
  dependencia text not null,
  cargo text not null,
  habeas_version_id uuid not null references public.evento_habeas_versiones(id),
  consentimiento_at timestamptz not null,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sesion_id, asistente_id)
);

create table public.salidas (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones(id) on delete restrict,
  asistente_id uuid not null references public.asistentes(id) on delete restrict,
  registrado_at timestamptz not null default now(),
  respuestas jsonb not null default '{}'::jsonb,
  comentario text,
  sin_entrada boolean not null,
  habeas_version_id uuid references public.evento_habeas_versiones(id),
  consentimiento_at timestamptz,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sesion_id, asistente_id),
  check (not sin_entrada or (habeas_version_id is not null and consentimiento_at is not null))
);

create table public.administradores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  clave text not null,
  at timestamptz not null default now()
);
create index rate_limit_hits_clave_at_idx on public.rate_limit_hits (clave, at);

create trigger t_updated_at before update on public.configuracion for each row execute function public.fijar_updated_at();
create trigger t_updated_at before update on public.marcas for each row execute function public.fijar_updated_at();
create trigger t_updated_at before update on public.eventos for each row execute function public.fijar_updated_at();
create trigger t_updated_at before update on public.evento_preguntas for each row execute function public.fijar_updated_at();
create trigger t_updated_at before update on public.sesiones for each row execute function public.fijar_updated_at();
create trigger t_updated_at before update on public.asistentes for each row execute function public.fijar_updated_at();
create trigger t_updated_at before update on public.entradas for each row execute function public.fijar_updated_at();
create trigger t_updated_at before update on public.salidas for each row execute function public.fijar_updated_at();

create or replace function public.consumir_rate_limit(p_clave text, p_max int, p_ventana_segundos int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  delete from rate_limit_hits where at < now() - make_interval(secs => p_ventana_segundos * 2);
  select count(*) into n from rate_limit_hits
    where clave = p_clave and at > now() - make_interval(secs => p_ventana_segundos);
  if n >= p_max then
    return false;
  end if;
  insert into rate_limit_hits (clave) values (p_clave);
  return true;
end $$;

revoke all on function public.consumir_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.consumir_rate_limit(text, int, int) to service_role;
```

- [ ] **Step 3: Escribir la migración de RLS y Storage**

`supabase/migrations/20260929000200_rls.sql`:

```sql
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.administradores where user_id = auth.uid())
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'configuracion', 'plantilla_preguntas', 'marcas', 'eventos', 'evento_habeas_versiones',
    'evento_marcas', 'evento_preguntas', 'sesiones', 'asistentes', 'entradas', 'salidas'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy admin_todo on public.%I for all to authenticated using (public.es_admin()) with check (public.es_admin())',
      t
    );
  end loop;
end $$;

alter table public.administradores enable row level security;
create policy propio_registro on public.administradores for select to authenticated using (user_id = auth.uid());

alter table public.rate_limit_hits enable row level security; -- sin políticas: solo service_role

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/svg+xml', 'image/jpeg'])
on conflict (id) do nothing;

create policy logos_admin_leer on storage.objects for select to authenticated
  using (bucket_id = 'logos' and public.es_admin());
create policy logos_admin_insertar on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and public.es_admin());
create policy logos_admin_actualizar on storage.objects for update to authenticated
  using (bucket_id = 'logos' and public.es_admin());
create policy logos_admin_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and public.es_admin());
```

- [ ] **Step 4: Escribir la migración de la vista consolidada**

`supabase/migrations/20260929000300_vista_consolidada.sql`:

```sql
create view public.asistencia_consolidada with (security_invoker = true) as
select
  e.id as evento_id,
  e.nombre as evento_nombre,
  s.id as sesion_id,
  s.numero as sesion_numero,
  s.inicio as sesion_inicio,
  a.id as asistente_id,
  a.tipo_documento,
  a.numero_documento,
  coalesce(en.nombres, a.nombres) as nombres,
  coalesce(en.apellidos, a.apellidos) as apellidos,
  coalesce(en.correo, a.correo) as correo,
  coalesce(en.dependencia, a.dependencia) as dependencia,
  coalesce(en.cargo, a.cargo) as cargo,
  en.registrado_at as entrada_at,
  sa.registrado_at as salida_at,
  case
    when en.id is not null and sa.id is not null then 'completa'
    when en.id is not null then 'solo_entrada'
    else 'sin_entrada'
  end as estado_asistencia,
  sa.respuestas,
  sa.comentario,
  (
    select round(avg(r.value::numeric), 2)
    from jsonb_each_text(sa.respuestas) r
    join public.evento_preguntas p on p.evento_id = e.id and p.clave = r.key and p.tipo = 'escala_1_5'
  ) as promedio_escala,
  (
    select r.value::int
    from jsonb_each_text(sa.respuestas) r
    join public.evento_preguntas p on p.evento_id = e.id and p.clave = r.key and p.tipo = 'nps_0_10'
    limit 1
  ) as nps
from public.entradas en
full outer join public.salidas sa
  on sa.sesion_id = en.sesion_id and sa.asistente_id = en.asistente_id
join public.sesiones s on s.id = coalesce(en.sesion_id, sa.sesion_id)
join public.eventos e on e.id = s.evento_id
join public.asistentes a on a.id = coalesce(en.asistente_id, sa.asistente_id);
```

- [ ] **Step 5: Escribir la migración de datos base**

`supabase/migrations/20260929000400_datos_base.sql`:

```sql
insert into public.plantilla_preguntas (clave, tipo, texto, orden) values
  ('contenido',   'escala_1_5', 'El contenido de la sesión fue pertinente y claro', 1),
  ('expositor',   'escala_1_5', 'El expositor demostró dominio del tema', 2),
  ('metodologia', 'escala_1_5', 'La metodología facilitó el aprendizaje', 3),
  ('utilidad',    'escala_1_5', 'Lo aprendido es útil para mis funciones', 4),
  ('logistica',   'escala_1_5', 'La logística (lugar, horario, recursos) fue adecuada', 5),
  ('nps',         'nps_0_10',   '¿Qué tan probable es que recomiende esta capacitación?', 6),
  ('comentario',  'texto',      'Comentarios o sugerencias', 7);

insert into public.configuracion (clave, valor) values
  ('habeas_texto_defecto', '[PENDIENTE: cláusula oficial de Avance Jurídico]'),
  ('habeas_url_politica', '');

insert into public.marcas (nombre, color_primario) values ('Avance Jurídico', '#1F3A5F');
```

- [ ] **Step 6: Levantar Supabase local y generar `.env.local`**

`scripts/env-local.mjs`:

```js
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
```

```bash
npm run db:start
npm run db:reset
npm run env:local
```

Expected: las cuatro migraciones se aplican sin errores y se crea `.env.local`, que está ignorado por git gracias al patrón `.env*` de create-next-app.

- [ ] **Step 7: Escribir los helpers de prueba**

`tests/integration/setup.ts`:

```ts
import { config } from 'dotenv';

config({ path: '.env.local' });
```

`tests/integration/helpers.ts`:

```ts
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
```

- [ ] **Step 8: Escribir las pruebas de integración del esquema**

`tests/integration/esquema.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clienteAnonimoPrueba,
  clienteAutenticadoPrueba,
  clienteServicioPrueba,
  crearEventoPrueba,
  crearUsuarioPrueba,
  datosPersona,
  limpiarDatos,
  type EventoPrueba,
} from './helpers';

const db = clienteServicioPrueba();
beforeEach(limpiarDatos);

async function crearAsistente(doc = '1020345678'): Promise<string> {
  const { data, error } = await db.from('asistentes').insert(datosPersona(doc)).select('id').single();
  if (error) throw error;
  return data.id;
}

function crearEntrada(ev: EventoPrueba, asistenteId: string) {
  return db.from('entradas').insert({
    sesion_id: ev.sesionId,
    asistente_id: asistenteId,
    nombres: 'Ana María',
    apellidos: 'Pérez Gómez',
    correo: 'aperez@procuraduria.gov.co',
    dependencia: 'Delegada',
    cargo: 'Profesional',
    habeas_version_id: ev.habeasId,
    consentimiento_at: new Date().toISOString(),
  });
}

describe('datos base', () => {
  it('trae las 7 preguntas estándar y el marcador de Habeas Data', async () => {
    const { data: preguntas } = await db.from('plantilla_preguntas').select('clave').order('orden');
    expect(preguntas!.map((p) => p.clave)).toEqual([
      'contenido', 'expositor', 'metodologia', 'utilidad', 'logistica', 'nps', 'comentario',
    ]);
    const { data: cfg } = await db.from('configuracion').select('valor').eq('clave', 'habeas_texto_defecto').single();
    expect(cfg!.valor).toBe('[PENDIENTE: cláusula oficial de Avance Jurídico]');
  });
});

describe('restricciones', () => {
  it('no permite dos entradas de la misma persona en la misma sesión', async () => {
    const ev = await crearEventoPrueba(db);
    const a = await crearAsistente();
    expect((await crearEntrada(ev, a)).error).toBeNull();
    expect((await crearEntrada(ev, a)).error?.code).toBe('23505');
  });

  it('exige consentimiento en una salida sin entrada', async () => {
    const ev = await crearEventoPrueba(db);
    const a = await crearAsistente();
    const { error } = await db.from('salidas').insert({ sesion_id: ev.sesionId, asistente_id: a, sin_entrada: true });
    expect(error?.code).toBe('23514');
  });

  it('rechaza números de documento sin normalizar', async () => {
    const { error } = await db.from('asistentes').insert(datosPersona('1.020.345.678'));
    expect(error?.code).toBe('23514');
  });
});

describe('RLS', () => {
  it('el rol anónimo no lee ni escribe datos', async () => {
    const ev = await crearEventoPrueba(db);
    await crearEntrada(ev, await crearAsistente());
    const anon = clienteAnonimoPrueba();
    expect((await anon.from('entradas').select('id')).data).toEqual([]);
    expect((await anon.from('asistencia_consolidada').select('asistente_id')).data).toEqual([]);
    expect((await anon.from('eventos').insert({ nombre: 'Intruso' })).error).not.toBeNull();
  });

  it('un usuario autenticado que no es administrador no ve datos', async () => {
    const ev = await crearEventoPrueba(db);
    await crearEntrada(ev, await crearAsistente());
    const u = await crearUsuarioPrueba(false);
    const c = await clienteAutenticadoPrueba(u.email, u.password);
    expect((await c.from('entradas').select('id')).data).toEqual([]);
  });

  it('un administrador ve los datos', async () => {
    const ev = await crearEventoPrueba(db);
    await crearEntrada(ev, await crearAsistente());
    const u = await crearUsuarioPrueba(true);
    const c = await clienteAutenticadoPrueba(u.email, u.password);
    expect((await c.from('entradas').select('id')).data).toHaveLength(1);
  });
});

describe('vista asistencia_consolidada', () => {
  it('clasifica completa, solo entrada y sin entrada, con promedio y NPS', async () => {
    const ev = await crearEventoPrueba(db);
    const a1 = await crearAsistente('111111');
    const a2 = await crearAsistente('222222');
    const a3 = await crearAsistente('333333');
    await crearEntrada(ev, a1);
    await crearEntrada(ev, a2);
    await db.from('salidas').insert({
      sesion_id: ev.sesionId, asistente_id: a1, sin_entrada: false,
      respuestas: { contenido: 5, expositor: 4, metodologia: 5, utilidad: 4, logistica: 5, nps: 9 },
    });
    await db.from('salidas').insert({
      sesion_id: ev.sesionId, asistente_id: a3, sin_entrada: true,
      habeas_version_id: ev.habeasId, consentimiento_at: new Date().toISOString(),
      respuestas: { contenido: 3, expositor: 3, metodologia: 3, utilidad: 3, logistica: 3, nps: 6 },
    });
    const { data } = await db
      .from('asistencia_consolidada')
      .select('numero_documento, estado_asistencia, promedio_escala, nps')
      .eq('sesion_id', ev.sesionId)
      .order('numero_documento');
    expect(data).toEqual([
      { numero_documento: '111111', estado_asistencia: 'completa', promedio_escala: 4.6, nps: 9 },
      { numero_documento: '222222', estado_asistencia: 'solo_entrada', promedio_escala: null, nps: null },
      { numero_documento: '333333', estado_asistencia: 'sin_entrada', promedio_escala: 3, nps: 6 },
    ]);
  });
});

describe('consumir_rate_limit', () => {
  it('permite hasta el máximo y luego bloquea', async () => {
    const llamar = async () =>
      (await db.rpc('consumir_rate_limit', { p_clave: 'prueba', p_max: 3, p_ventana_segundos: 600 })).data;
    expect(await llamar()).toBe(true);
    expect(await llamar()).toBe(true);
    expect(await llamar()).toBe(true);
    expect(await llamar()).toBe(false);
  });

  it('no puede invocarla el rol anónimo', async () => {
    const { error } = await clienteAnonimoPrueba().rpc('consumir_rate_limit', {
      p_clave: 'x', p_max: 1, p_ventana_segundos: 1,
    });
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 9: Correr las pruebas de integración**

Run: `npm run test:int`
Expected: PASS. Si alguna migración falla, corrige el SQL, vuelve a ejecutar `npm run db:reset` y repite.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: esquema de base de datos, RLS, vista consolidada y datos base"
```

---

### Task 3: Lectura pública de sesiones por token

**Files:**
- Create: `src/lib/repo/db.ts`, `src/lib/repo/publico.ts`, `src/lib/storage.ts`, `src/lib/supabase/servicio.ts`, `src/lib/supabase/servidor.ts`, `src/lib/request-meta.ts`
- Test: `tests/integration/publico.test.ts`

**Interfaces:**
- Consumes: `estadoSesion`, `ventanaApertura`, `EstadoSesion`, `Pregunta`, `COLOR_DEFECTO` (Tarea 1); tablas (Tarea 2).
- Produces:
  - `type Db = SupabaseClient`
  - `urlLogo(path: string): string`
  - `clienteServicio(): SupabaseClient` (solo servidor) y `clienteSesion(): Promise<SupabaseClient>` (cookies del administrador)
  - `metaSolicitud(): Promise<{ ip: string | null; userAgent: string | null }>`
  - `interface MarcaVisible { nombre: string; logoUrl: string | null }`
  - `interface ContextoEvento { marcas; colorMarca: string | null; habeas: { id; texto; urlPolitica: string | null }; preguntas: Pregunta[] }`
  - `cargarContextoEvento(db, eventoId): Promise<ContextoEvento>`
  - `interface SesionPublica { id; numero; titulo; lugar; inicio: Date; fin: Date; estado: EstadoSesion; abre: Date; cierra: Date; modoApertura; evento: { id; nombre; colorPrimario: string; dominioCorreo: string | null }; marcas: MarcaVisible[]; habeas; preguntas: Pregunta[] }`
  - `type TipoEnlace = 'entrada' | 'salida'`
  - `type ResultadoSesion = { tipo: 'no_encontrada' } | { tipo: 'no_disponible'; sesion } | { tipo: 'abierta'; sesion }`
  - `obtenerSesionPorToken(db, token, tipo, ahora?): Promise<ResultadoSesion>`

- [ ] **Step 1: Escribir la prueba de integración (falla)**

`tests/integration/publico.test.ts`:

```ts
import { beforeEach, expect, it } from 'vitest';
import { obtenerSesionPorToken } from '@/lib/repo/publico';
import { generarToken } from '@/lib/domain/tokens';
import { clienteServicioPrueba, crearEventoPrueba, limpiarDatos } from './helpers';

const db = clienteServicioPrueba();
beforeEach(limpiarDatos);

it('token con formato inválido: no_encontrada', async () => {
  expect((await obtenerSesionPorToken(db, 'abc', 'entrada')).tipo).toBe('no_encontrada');
});

it('token inexistente: no_encontrada', async () => {
  expect((await obtenerSesionPorToken(db, generarToken(), 'entrada')).tipo).toBe('no_encontrada');
});

it('token de entrada usado en la URL de salida: no_encontrada', async () => {
  const ev = await crearEventoPrueba(db);
  expect((await obtenerSesionPorToken(db, ev.tokenEntrada, 'salida')).tipo).toBe('no_encontrada');
});

it('evento en borrador: no_encontrada', async () => {
  const ev = await crearEventoPrueba(db, { estadoEvento: 'borrador' });
  expect((await obtenerSesionPorToken(db, ev.tokenEntrada, 'entrada')).tipo).toBe('no_encontrada');
});

it('sesión cerrada manualmente: no_disponible', async () => {
  const ev = await crearEventoPrueba(db, { estadoManual: 'cerrada' });
  const r = await obtenerSesionPorToken(db, ev.tokenEntrada, 'entrada');
  expect(r.tipo).toBe('no_disponible');
  if (r.tipo === 'no_disponible') expect(r.sesion.estado).toBe('cerrada');
});

it('sesión abierta: devuelve el contexto del evento', async () => {
  const ev = await crearEventoPrueba(db);
  const r = await obtenerSesionPorToken(db, ev.tokenSalida, 'salida');
  expect(r.tipo).toBe('abierta');
  if (r.tipo !== 'abierta') return;
  expect(r.sesion.id).toBe(ev.sesionId);
  expect(r.sesion.numero).toBe(1);
  expect(r.sesion.habeas.id).toBe(ev.habeasId);
  expect(r.sesion.preguntas).toHaveLength(7);
  expect(r.sesion.evento.dominioCorreo).toBe('procuraduria.gov.co');
});

it('usa la última versión de Habeas Data y solo las preguntas activas', async () => {
  const ev = await crearEventoPrueba(db);
  await db.from('evento_habeas_versiones').insert({ evento_id: ev.eventoId, version: 2, texto: 'Versión dos' });
  await db.from('evento_preguntas').update({ activa: false }).eq('evento_id', ev.eventoId).eq('clave', 'logistica');
  const r = await obtenerSesionPorToken(db, ev.tokenEntrada, 'entrada');
  if (r.tipo !== 'abierta') throw new Error('se esperaba abierta');
  expect(r.sesion.habeas.texto).toBe('Versión dos');
  expect(r.sesion.preguntas.map((p) => p.clave)).not.toContain('logistica');
});

it('muestra solo marcas visibles y activas, en orden, y toma el color de la primera', async () => {
  const ev = await crearEventoPrueba(db);
  const { data: marcas } = await db
    .from('marcas')
    .insert([
      { nombre: 'PGN', color_primario: '#003366', logo_path: 'pgn/logo.png' },
      { nombre: 'Oculta' },
      { nombre: 'Inactiva', activa: false },
    ])
    .select('id, nombre');
  const id = (n: string) => marcas!.find((m) => m.nombre === n)!.id;
  const { data: avance } = await db.from('marcas').select('id').eq('nombre', 'Avance Jurídico').single();
  await db.from('evento_marcas').insert([
    { evento_id: ev.eventoId, marca_id: avance!.id, orden: 2 },
    { evento_id: ev.eventoId, marca_id: id('PGN'), orden: 1 },
    { evento_id: ev.eventoId, marca_id: id('Oculta'), orden: 3, visible: false },
    { evento_id: ev.eventoId, marca_id: id('Inactiva'), orden: 4 },
  ]);
  const r = await obtenerSesionPorToken(db, ev.tokenEntrada, 'entrada');
  if (r.tipo !== 'abierta') throw new Error('se esperaba abierta');
  expect(r.sesion.marcas.map((m) => m.nombre)).toEqual(['PGN', 'Avance Jurídico']);
  expect(r.sesion.marcas[0].logoUrl).toMatch(/\/storage\/v1\/object\/public\/logos\/pgn\/logo\.png$/);
  expect(r.sesion.marcas[1].logoUrl).toBeNull();
  expect(r.sesion.evento.colorPrimario).toBe('#003366');
});
```

- [ ] **Step 2: Confirmar que falla**

Run: `npm run test:int -- tests/integration/publico.test.ts`
Expected: FAIL, porque `@/lib/repo/publico` no existe.

- [ ] **Step 3: Implementar los clientes Supabase, storage y metadatos**

`src/lib/repo/db.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export type Db = SupabaseClient;
```

`src/lib/storage.ts`:

```ts
export function urlLogo(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${path}`;
}
```

`src/lib/supabase/servicio.ts`:

```ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function clienteServicio() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

`src/lib/supabase/servidor.ts`:

```ts
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function clienteSesion() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el middleware se encarga de refrescar.
        }
      },
    },
  });
}
```

`src/lib/request-meta.ts`:

```ts
import 'server-only';
import { headers } from 'next/headers';
import { ipDesdeCabeceras } from '@/lib/domain/ip';

export async function metaSolicitud(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  return {
    ip: ipDesdeCabeceras(h.get('x-forwarded-for'), h.get('x-real-ip')),
    userAgent: h.get('user-agent')?.slice(0, 500) ?? null,
  };
}
```

- [ ] **Step 4: Implementar `publico.ts`**

`src/lib/repo/publico.ts`:

```ts
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
  const evento = data?.evento as unknown as {
    id: string; nombre: string; color_primario: string | null; dominio_correo: string | null; estado: string;
  } | undefined;
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
```

- [ ] **Step 5: Confirmar que pasa**

Run: `npm run test:int -- tests/integration/publico.test.ts`
Expected: PASS (8 pruebas).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: resolución pública de sesiones por token con contexto de marca, Habeas Data y encuesta"
```

---

### Task 4: Registro de entrada (formulario público + Playwright)

**Files:**
- Create: `src/lib/repo/registro.ts`, `src/lib/repo/rate-limit.ts`, `src/lib/envio.ts`
- Create: `src/components/useEnvio.ts`, `src/components/publico/EncabezadoMarcas.tsx`, `MarcoPublico.tsx`, `MensajeEstado.tsx`, `campos.tsx`, `CamposDocumento.tsx`, `CamposPersonales.tsx`, `CajaHabeas.tsx`, `CampoTrampa.tsx`, `AvisoDisponibilidad.tsx`, `EnlaceNoValido.tsx`, `FormularioEntrada.tsx`
- Create: `src/app/r/[token]/page.tsx`, `src/app/r/[token]/actions.ts`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `.gitignore`
- Create: `playwright.config.ts`
- Test: `tests/integration/registro.test.ts`, `e2e/publico-entrada.spec.ts`

**Interfaces:**
- Consumes: `obtenerSesionPorToken`, `SesionPublica`, `MarcaVisible`, `clienteServicio`, `metaSolicitud` (Tarea 3); `entradaSchema`, `erroresPorCampo`, `DatosPersonales`, `correoFueraDeDominio`, `RATE_LIMIT`, `TIPOS_DOCUMENTO`, `NOMBRE_TIPO_DOCUMENTO` (Tarea 1).
- Produces:
  - `interface MetaConsentimiento { ip: string | null; userAgent: string | null }`
  - `upsertAsistente(db, d: DatosPersonales): Promise<string>`
  - `registrarEntrada(db, sesion: { id: string; habeasId: string }, d: DatosPersonales, meta, ahora?): Promise<void>`
  - `consumirRateLimit(db, clave: string): Promise<boolean>`
  - `type ResultadoEnvio = { ok: true; nombres: string } | { ok: false; errores: Record<string, string>; mensaje?: string }`
  - `type ResultadoAccion = { ok: true; mensaje?: string } | { ok: false; error: string }`
  - `useEnvio<T>(accion: (fd: FormData) => Promise<T>): { onSubmit; pendiente; resultado: T | null; errorRed: boolean; reiniciar(): void }`
  - Componentes: `EncabezadoMarcas({ marcas })` (con `data-testid="encabezado-marcas"`), `MarcoPublico({ sesion, subtitulo, children })`, `MensajeEstado({ tono?, titulo, texto })`, `Campo`, `Texto`, `Selector`, `Boton`, `claseControl`, `CamposDocumento({ errores })`, `CamposPersonales({ errores, dominioCorreo })`, `CajaHabeas({ habeas, error? })` (con `data-testid="texto-habeas"`), `CampoTrampa()` (campo `sitio_web`), `AvisoDisponibilidad({ sesion })`, `EnlaceNoValido()`

- [ ] **Step 1: Escribir la prueba de integración del repositorio (falla)**

`tests/integration/registro.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { registrarEntrada } from '@/lib/repo/registro';
import { clienteServicioPrueba, crearEventoPrueba, datosPersona, limpiarDatos } from './helpers';

const db = clienteServicioPrueba();
const meta = { ip: '181.49.1.2', userAgent: 'Prueba' };
beforeEach(limpiarDatos);

describe('registrarEntrada', () => {
  it('crea el asistente y la entrada con prueba de consentimiento', async () => {
    const ev = await crearEventoPrueba(db);
    await registrarEntrada(db, { id: ev.sesionId, habeasId: ev.habeasId }, datosPersona(), meta);
    const { data } = await db
      .from('entradas')
      .select('nombres, habeas_version_id, consentimiento_at, ip, user_agent')
      .eq('sesion_id', ev.sesionId);
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({
      nombres: 'Ana María',
      habeas_version_id: ev.habeasId,
      ip: '181.49.1.2',
      user_agent: 'Prueba',
    });
    expect(data![0].consentimiento_at).not.toBeNull();
  });

  it('un segundo registro actualiza los datos, no duplica y conserva la hora original', async () => {
    const ev = await crearEventoPrueba(db);
    const sesion = { id: ev.sesionId, habeasId: ev.habeasId };
    await registrarEntrada(db, sesion, datosPersona(), meta);
    const { data: antes } = await db.from('entradas').select('registrado_at').eq('sesion_id', ev.sesionId).single();
    await new Promise((r) => setTimeout(r, 50));
    await registrarEntrada(db, sesion, { ...datosPersona(), correo: 'nuevo@procuraduria.gov.co', cargo: 'Asesora' }, meta);
    const { data } = await db.from('entradas').select('registrado_at, correo, cargo').eq('sesion_id', ev.sesionId);
    expect(data).toHaveLength(1);
    expect(data![0].registrado_at).toBe(antes!.registrado_at);
    expect(data![0]).toMatchObject({ correo: 'nuevo@procuraduria.gov.co', cargo: 'Asesora' });
    const { data: asistentes } = await db.from('asistentes').select('correo');
    expect(asistentes).toEqual([{ correo: 'nuevo@procuraduria.gov.co' }]);
  });

  it('la misma persona en otra sesión reutiliza el asistente', async () => {
    const ev1 = await crearEventoPrueba(db);
    const ev2 = await crearEventoPrueba(db);
    await registrarEntrada(db, { id: ev1.sesionId, habeasId: ev1.habeasId }, datosPersona(), meta);
    await registrarEntrada(db, { id: ev2.sesionId, habeasId: ev2.habeasId }, datosPersona(), meta);
    expect((await db.from('asistentes').select('id')).data).toHaveLength(1);
    expect((await db.from('entradas').select('id')).data).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Confirmar que falla**

Run: `npm run test:int -- tests/integration/registro.test.ts`
Expected: FAIL, porque `@/lib/repo/registro` no existe.

- [ ] **Step 3: Implementar el repositorio, el rate limit y los tipos de envío**

`src/lib/repo/registro.ts`:

```ts
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
```

`src/lib/repo/rate-limit.ts`:

```ts
import type { Db } from './db';
import { RATE_LIMIT } from '@/lib/domain/constantes';

export async function consumirRateLimit(db: Db, clave: string): Promise<boolean> {
  const { data, error } = await db.rpc('consumir_rate_limit', {
    p_clave: clave,
    p_max: RATE_LIMIT.max,
    p_ventana_segundos: RATE_LIMIT.ventanaSegundos,
  });
  if (error) throw error;
  return data === true;
}
```

`src/lib/envio.ts`:

```ts
export type ResultadoEnvio =
  | { ok: true; nombres: string }
  | { ok: false; errores: Record<string, string>; mensaje?: string };

export type ResultadoAccion = { ok: true; mensaje?: string } | { ok: false; error: string };
```

- [ ] **Step 4: Confirmar que pasa**

Run: `npm run test:int -- tests/integration/registro.test.ts`
Expected: PASS (3 pruebas).

- [ ] **Step 5: Configurar Playwright y escribir la E2E de entrada (falla)**

```bash
npx playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [
    { name: 'movil', testMatch: /publico-.*\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    { name: 'escritorio', testMatch: /admin-.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 180_000 },
});
```

Agregar al final de `.gitignore`:

```
/test-results/
/playwright-report/
```

`e2e/publico-entrada.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';
import { clienteServicioPrueba, crearEventoPrueba, limpiarDatos } from '../tests/integration/helpers';

test.beforeEach(async () => {
  await limpiarDatos();
});

async function llenarEntrada(page: Page, documento = '1.020.345.678') {
  await page.getByLabel('Tipo de documento').selectOption('CC');
  await page.getByLabel('Número de documento').fill(documento);
  await page.getByLabel('Nombres').fill('Ana María');
  await page.getByLabel('Apellidos').fill('Pérez Gómez');
  await page.getByLabel('Correo institucional').fill('aperez@procuraduria.gov.co');
  await page.getByLabel('Dependencia').fill('Delegada para Asuntos Civiles');
  await page.getByLabel('Cargo').fill('Profesional');
}

const casillaHabeas = (page: Page) => page.getByLabel(/He leído y autorizo/);
const botonRegistrar = (page: Page) => page.getByRole('button', { name: 'Registrar entrada' });

async function contarEntradas(sesionId: string) {
  const { data } = await clienteServicioPrueba().from('entradas').select('id').eq('sesion_id', sesionId);
  return data!.length;
}

test('registra la entrada y guarda el consentimiento', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await page.goto(`/r/${ev.tokenEntrada}`);
  await expect(page.getByRole('heading', { name: 'Evento de prueba' })).toBeVisible();
  await expect(page.getByTestId('texto-habeas')).toContainText('Autorizo el tratamiento');
  await expect(casillaHabeas(page)).not.toBeChecked();
  await llenarEntrada(page);
  await casillaHabeas(page).check();
  await botonRegistrar(page).click();
  await expect(page.getByText('Registro exitoso, Ana María')).toBeVisible();

  const { data } = await clienteServicioPrueba()
    .from('entradas')
    .select('habeas_version_id, consentimiento_at, asistente:asistentes(numero_documento)')
    .eq('sesion_id', ev.sesionId);
  expect(data).toHaveLength(1);
  expect(data![0].habeas_version_id).toBe(ev.habeasId);
  expect(data![0].consentimiento_at).not.toBeNull();
  expect((data![0].asistente as unknown as { numero_documento: string }).numero_documento).toBe('1020345678');
});

test('el servidor rechaza el envío sin autorización de Habeas Data', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await page.goto(`/r/${ev.tokenEntrada}`);
  await llenarEntrada(page);
  await casillaHabeas(page).evaluate((el) => el.removeAttribute('required'));
  await botonRegistrar(page).click();
  await expect(page.getByText('Debe autorizar el tratamiento de datos personales para continuar')).toBeVisible();
  expect(await contarEntradas(ev.sesionId)).toBe(0);
});

test('registrarse dos veces no duplica la entrada', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  for (let i = 0; i < 2; i++) {
    await page.goto(`/r/${ev.tokenEntrada}`);
    await llenarEntrada(page);
    await casillaHabeas(page).check();
    await botonRegistrar(page).click();
    await expect(page.getByText('Registro exitoso, Ana María')).toBeVisible();
  }
  expect(await contarEntradas(ev.sesionId)).toBe(1);
});

test('si la sesión se cierra mientras se diligencia, no registra y lo informa', async ({ page }) => {
  const db = clienteServicioPrueba();
  const ev = await crearEventoPrueba(db);
  await page.goto(`/r/${ev.tokenEntrada}`);
  await llenarEntrada(page);
  await casillaHabeas(page).check();
  await db.from('sesiones').update({ estado_manual: 'cerrada' }).eq('id', ev.sesionId);
  await botonRegistrar(page).click();
  await expect(page.getByText('El registro para esta sesión no está disponible.')).toBeVisible();
  expect(await contarEntradas(ev.sesionId)).toBe(0);
});

test('si se cae la conexión conserva los datos y permite reintentar', async ({ page, context }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await page.goto(`/r/${ev.tokenEntrada}`);
  await llenarEntrada(page);
  await casillaHabeas(page).check();
  await context.setOffline(true);
  await botonRegistrar(page).click();
  await expect(page.getByText(/No se pudo enviar el formulario/)).toBeVisible();
  await expect(page.getByLabel('Nombres')).toHaveValue('Ana María');
  await expect(casillaHabeas(page)).toBeChecked();
  await context.setOffline(false);
  await botonRegistrar(page).click();
  await expect(page.getByText('Registro exitoso, Ana María')).toBeVisible();
});

test('advierte si el correo no es del dominio institucional', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await page.goto(`/r/${ev.tokenEntrada}`);
  await page.getByLabel('Correo institucional').fill('ana@gmail.com');
  await expect(page.getByText('Verifique: se esperaba un correo @procuraduria.gov.co')).toBeVisible();
});

test('muestra avisos para sesión cerrada y enlace inválido', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba(), { estadoManual: 'cerrada' });
  await page.goto(`/r/${ev.tokenEntrada}`);
  await expect(page.getByText('El registro para esta sesión ya cerró.')).toBeVisible();
  await expect(botonRegistrar(page)).toHaveCount(0);
  await page.goto('/r/token-que-no-existe-000000');
  await expect(page.getByRole('heading', { name: 'Enlace no válido' })).toBeVisible();
});
```

Run: `npm run e2e -- e2e/publico-entrada.spec.ts`
Expected: FAIL, porque la ruta `/r/[token]` no existe (404).

- [ ] **Step 6: Base visual de la app**

`src/app/globals.css` (reemplazar todo):

```css
@import "tailwindcss";

:root {
  --color-primario: #1f3a5f;
}

body {
  background: #f8fafc;
  color: #0f172a;
}
```

`src/app/layout.tsx` (reemplazar todo):

```tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Registro de capacitaciones',
  description: 'Registro de asistencia y evaluación de capacitaciones de Avance Jurídico',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

`src/app/page.tsx` (reemplazar todo):

```tsx
import { redirect } from 'next/navigation';

export default function Inicio() {
  redirect('/admin');
}
```

- [ ] **Step 7: Hook de envío y componentes públicos**

`src/components/useEnvio.ts`:

```ts
'use client';
import { useState, useTransition, type FormEvent } from 'react';

// Envía con onSubmit (no con action=) para que React no reinicie el formulario:
// si hay error de validación o de red, la persona conserva lo que escribió.
export function useEnvio<T>(accion: (fd: FormData) => Promise<T>) {
  const [pendiente, startTransition] = useTransition();
  const [resultado, setResultado] = useState<T | null>(null);
  const [errorRed, setErrorRed] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErrorRed(false);
    startTransition(async () => {
      try {
        const r = await accion(fd);
        setResultado(r);
      } catch {
        setErrorRed(true);
      }
    });
  }

  function reiniciar() {
    setResultado(null);
    setErrorRed(false);
  }

  return { onSubmit, pendiente, resultado, errorRed, reiniciar };
}
```

`src/components/publico/EncabezadoMarcas.tsx`:

```tsx
import type { MarcaVisible } from '@/lib/repo/publico';

export function EncabezadoMarcas({ marcas }: { marcas: MarcaVisible[] }) {
  if (!marcas.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-6" data-testid="encabezado-marcas">
      {marcas.map((m) =>
        m.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={m.nombre} src={m.logoUrl} alt={m.nombre} className="h-14 w-auto max-w-[45%] object-contain" />
        ) : (
          <span key={m.nombre} className="text-lg font-semibold text-slate-800">
            {m.nombre}
          </span>
        ),
      )}
    </div>
  );
}
```

`src/components/publico/MarcoPublico.tsx`:

```tsx
import type { CSSProperties, ReactNode } from 'react';
import type { SesionPublica } from '@/lib/repo/publico';
import { formatearFechaHora } from '@/lib/domain/fechas';
import { EncabezadoMarcas } from './EncabezadoMarcas';

export function MarcoPublico({
  sesion,
  subtitulo,
  children,
}: {
  sesion: SesionPublica;
  subtitulo: string;
  children: ReactNode;
}) {
  return (
    <main
      className="mx-auto min-h-dvh max-w-xl bg-white px-4 py-6"
      style={{ '--color-primario': sesion.evento.colorPrimario } as CSSProperties}
    >
      <header className="mb-6 space-y-4 border-b-4 border-[var(--color-primario)] pb-4 text-center">
        <EncabezadoMarcas marcas={sesion.marcas} />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-primario)]">{subtitulo}</p>
          <h1 className="text-xl font-bold text-slate-900">{sesion.evento.nombre}</h1>
          <p className="text-slate-700">
            Sesión {sesion.numero}
            {sesion.titulo ? ` · ${sesion.titulo}` : ''}
          </p>
          <p className="text-sm text-slate-600">
            {formatearFechaHora(sesion.inicio)}
            {sesion.lugar ? ` · ${sesion.lugar}` : ''}
          </p>
        </div>
      </header>
      {children}
    </main>
  );
}
```

`src/components/publico/MensajeEstado.tsx`:

```tsx
const TONOS = {
  info: 'border-slate-400 bg-slate-50',
  exito: 'border-green-700 bg-green-50',
  error: 'border-red-700 bg-red-50',
} as const;

export function MensajeEstado({
  tono = 'info',
  titulo,
  texto,
}: {
  tono?: keyof typeof TONOS;
  titulo: string;
  texto: string;
}) {
  return (
    <div role={tono === 'error' ? 'alert' : 'status'} className={`rounded-lg border-l-4 p-4 ${TONOS[tono]}`}>
      <p className="font-semibold text-slate-900">{titulo}</p>
      <p className="mt-1 text-slate-700">{texto}</p>
    </div>
  );
}
```

`src/components/publico/campos.tsx`:

```tsx
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export const claseControl =
  'mt-1 block w-full min-h-11 rounded-lg border border-slate-400 bg-white px-3 py-2 text-base text-slate-900 focus:border-[var(--color-primario)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/30';

export function Campo({
  etiqueta,
  error,
  aviso,
  children,
}: {
  etiqueta: string;
  error?: string;
  aviso?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{etiqueta}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-sm text-red-700">
          {error}
        </span>
      )}
      {!error && aviso && <span className="mt-1 block text-sm text-amber-800">{aviso}</span>}
    </label>
  );
}

export function Texto({ error, ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <input {...props} aria-invalid={error ? true : undefined} className={claseControl} />;
}

export function Selector(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={claseControl} />;
}

export function Boton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="min-h-12 w-full rounded-lg bg-[var(--color-primario)] px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
    >
      {children}
    </button>
  );
}
```

`src/components/publico/CamposDocumento.tsx`:

```tsx
import { NOMBRE_TIPO_DOCUMENTO, TIPOS_DOCUMENTO } from '@/lib/domain/constantes';
import { Campo, Selector, Texto } from './campos';

export function CamposDocumento({ errores }: { errores: Record<string, string> }) {
  return (
    <>
      <Campo etiqueta="Tipo de documento" error={errores.tipo_documento}>
        <Selector name="tipo_documento" required defaultValue="CC">
          {TIPOS_DOCUMENTO.map((t) => (
            <option key={t} value={t}>
              {NOMBRE_TIPO_DOCUMENTO[t]}
            </option>
          ))}
        </Selector>
      </Campo>
      <Campo etiqueta="Número de documento" error={errores.numero_documento}>
        <Texto name="numero_documento" autoComplete="off" required error={errores.numero_documento} />
      </Campo>
    </>
  );
}
```

`src/components/publico/CamposPersonales.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { correoFueraDeDominio } from '@/lib/domain/correo';
import { Campo, Texto } from './campos';

export function CamposPersonales({
  errores,
  dominioCorreo,
}: {
  errores: Record<string, string>;
  dominioCorreo: string | null;
}) {
  const [correo, setCorreo] = useState('');
  const fueraDeDominio = correo.includes('@') && correoFueraDeDominio(correo, dominioCorreo);
  const dominio = dominioCorreo?.replace(/^@/, '');
  return (
    <>
      <Campo etiqueta="Nombres" error={errores.nombres}>
        <Texto name="nombres" autoComplete="given-name" required error={errores.nombres} />
      </Campo>
      <Campo etiqueta="Apellidos" error={errores.apellidos}>
        <Texto name="apellidos" autoComplete="family-name" required error={errores.apellidos} />
      </Campo>
      <Campo
        etiqueta="Correo institucional"
        error={errores.correo}
        aviso={fueraDeDominio ? `Verifique: se esperaba un correo @${dominio}` : undefined}
      >
        <Texto
          name="correo"
          type="email"
          autoComplete="email"
          required
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          error={errores.correo}
        />
      </Campo>
      <Campo etiqueta="Dependencia" error={errores.dependencia}>
        <Texto name="dependencia" autoComplete="organization" required error={errores.dependencia} />
      </Campo>
      <Campo etiqueta="Cargo" error={errores.cargo}>
        <Texto name="cargo" autoComplete="organization-title" required error={errores.cargo} />
      </Campo>
    </>
  );
}
```

`src/components/publico/CajaHabeas.tsx`:

```tsx
export function CajaHabeas({
  habeas,
  error,
}: {
  habeas: { texto: string; urlPolitica: string | null };
  error?: string;
}) {
  return (
    <fieldset className="rounded-lg border border-slate-400 p-3">
      <legend className="px-1 text-sm font-semibold text-slate-800">
        Autorización de tratamiento de datos personales
      </legend>
      <div
        className="max-h-48 overflow-y-auto whitespace-pre-line text-sm text-slate-700"
        tabIndex={0}
        data-testid="texto-habeas"
      >
        {habeas.texto}
      </div>
      {habeas.urlPolitica && (
        <a
          href={habeas.urlPolitica}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm text-[var(--color-primario)] underline"
        >
          Consultar la política de tratamiento de datos
        </a>
      )}
      <label className="mt-3 flex min-h-11 items-start gap-3">
        <input type="checkbox" name="acepta_habeas" required className="mt-1 h-5 w-5 shrink-0" />
        <span className="text-sm text-slate-900">
          He leído y autorizo el tratamiento de mis datos personales en los términos anteriores.
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
```

`src/components/publico/CampoTrampa.tsx`:

```tsx
// Honeypot: invisible para las personas; los bots suelen llenarlo.
export function CampoTrampa() {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
      <input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
```

`src/components/publico/AvisoDisponibilidad.tsx`:

```tsx
import type { SesionPublica } from '@/lib/repo/publico';
import { formatearFechaHora } from '@/lib/domain/fechas';
import { MensajeEstado } from './MensajeEstado';

export function AvisoDisponibilidad({ sesion }: { sesion: SesionPublica }) {
  if (sesion.estado === 'cerrada') {
    return <MensajeEstado titulo="Registro cerrado" texto="El registro para esta sesión ya cerró." />;
  }
  const texto =
    sesion.modoApertura === 'automatico'
      ? `El registro para esta sesión abre el ${formatearFechaHora(sesion.abre)}.`
      : 'El registro para esta sesión aún no está abierto.';
  return <MensajeEstado titulo="Registro aún no disponible" texto={texto} />;
}
```

`src/components/publico/EnlaceNoValido.tsx`:

```tsx
export function EnlaceNoValido() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-bold text-slate-900">Enlace no válido</h1>
      <p className="mt-2 text-slate-700">Verifique el código QR o consulte con el organizador de la capacitación.</p>
    </main>
  );
}
```

`src/components/publico/FormularioEntrada.tsx`:

```tsx
'use client';
import type { ResultadoEnvio } from '@/lib/envio';
import { useEnvio } from '@/components/useEnvio';
import { Boton } from './campos';
import { CajaHabeas } from './CajaHabeas';
import { CampoTrampa } from './CampoTrampa';
import { CamposDocumento } from './CamposDocumento';
import { CamposPersonales } from './CamposPersonales';
import { MensajeEstado } from './MensajeEstado';

export function FormularioEntrada({
  accion,
  habeas,
  dominioCorreo,
}: {
  accion: (fd: FormData) => Promise<ResultadoEnvio>;
  habeas: { texto: string; urlPolitica: string | null };
  dominioCorreo: string | null;
}) {
  const { onSubmit, pendiente, resultado, errorRed } = useEnvio(accion);

  if (resultado?.ok) {
    return (
      <MensajeEstado
        tono="exito"
        titulo={`Registro exitoso${resultado.nombres ? `, ${resultado.nombres}` : ''}`}
        texto="Su asistencia a esta sesión quedó registrada. Puede cerrar esta página."
      />
    );
  }
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  return (
    <form onSubmit={onSubmit} className="relative space-y-4">
      <CampoTrampa />
      <CamposDocumento errores={errores} />
      <CamposPersonales errores={errores} dominioCorreo={dominioCorreo} />
      <CajaHabeas habeas={habeas} error={errores.acepta_habeas} />
      {resultado && !resultado.ok && resultado.mensaje && (
        <MensajeEstado tono="error" titulo="No se pudo registrar" texto={resultado.mensaje} />
      )}
      {errorRed && (
        <MensajeEstado
          tono="error"
          titulo="Sin conexión"
          texto="No se pudo enviar el formulario. Revise su conexión y presione de nuevo; sus datos se conservan."
        />
      )}
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? 'Enviando…' : 'Registrar entrada'}
      </Boton>
    </form>
  );
}
```

- [ ] **Step 8: Página y Server Action de entrada**

`src/app/r/[token]/actions.ts`:

```ts
'use server';
import { clienteServicio } from '@/lib/supabase/servicio';
import { metaSolicitud } from '@/lib/request-meta';
import { obtenerSesionPorToken } from '@/lib/repo/publico';
import { consumirRateLimit } from '@/lib/repo/rate-limit';
import { registrarEntrada } from '@/lib/repo/registro';
import { entradaSchema, erroresPorCampo } from '@/lib/domain/schemas';
import type { ResultadoEnvio } from '@/lib/envio';

export async function enviarEntrada(token: string, fd: FormData): Promise<ResultadoEnvio> {
  if (fd.get('sitio_web')) return { ok: true, nombres: '' }; // honeypot: se finge éxito
  const db = clienteServicio();
  const res = await obtenerSesionPorToken(db, token, 'entrada');
  if (res.tipo !== 'abierta') {
    return { ok: false, errores: {}, mensaje: 'El registro para esta sesión no está disponible.' };
  }
  const meta = await metaSolicitud();
  if (!(await consumirRateLimit(db, `entrada:${token}:${meta.ip ?? 'sin-ip'}`))) {
    return { ok: false, errores: {}, mensaje: 'Demasiados intentos. Espere unos minutos e intente de nuevo.' };
  }
  const parsed = entradaSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errores: erroresPorCampo(parsed.error) };
  await registrarEntrada(db, { id: res.sesion.id, habeasId: res.sesion.habeas.id }, parsed.data, meta);
  return { ok: true, nombres: parsed.data.nombres };
}
```

`src/app/r/[token]/page.tsx`:

```tsx
import { clienteServicio } from '@/lib/supabase/servicio';
import { obtenerSesionPorToken } from '@/lib/repo/publico';
import { MarcoPublico } from '@/components/publico/MarcoPublico';
import { AvisoDisponibilidad } from '@/components/publico/AvisoDisponibilidad';
import { EnlaceNoValido } from '@/components/publico/EnlaceNoValido';
import { FormularioEntrada } from '@/components/publico/FormularioEntrada';
import { enviarEntrada } from './actions';

export const dynamic = 'force-dynamic';

export default async function PaginaEntrada({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await obtenerSesionPorToken(clienteServicio(), token, 'entrada');
  if (res.tipo === 'no_encontrada') return <EnlaceNoValido />;
  const { sesion } = res;
  return (
    <MarcoPublico sesion={sesion} subtitulo="Registro de entrada">
      {res.tipo === 'abierta' ? (
        <FormularioEntrada
          accion={enviarEntrada.bind(null, token)}
          habeas={sesion.habeas}
          dominioCorreo={sesion.evento.dominioCorreo}
        />
      ) : (
        <AvisoDisponibilidad sesion={sesion} />
      )}
    </MarcoPublico>
  );
}
```

- [ ] **Step 9: Correr E2E, unitarias e integración**

Run: `npm run e2e -- e2e/publico-entrada.spec.ts`
Expected: PASS (7 pruebas).

Run: `npm test && npm run test:int`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: formulario público de entrada con Habeas Data, honeypot, rate limit y reintento"
```

---

### Task 5: Registro de salida con encuesta

**Files:**
- Modify: `src/lib/repo/registro.ts` (agregar `buscarEntrada`, `registrarSalida`, `DatosPersonalesRequeridos`, `DatosSalida`)
- Create: `src/components/publico/PreguntasEncuesta.tsx`, `src/components/publico/FormularioSalida.tsx`
- Create: `src/app/s/[token]/page.tsx`, `src/app/s/[token]/actions.ts`
- Test: `tests/integration/registro.test.ts` (agregar), `e2e/publico-salida.spec.ts`

**Interfaces:**
- Consumes: `upsertAsistente`, `registrarEntrada`, `MetaConsentimiento`, componentes públicos y `useEnvio` (Tarea 4); `documentoSchema`, `entradaSchema`, `encuestaSchema`, `separarRespuestas`, `TipoDocumento` (Tarea 1).
- Produces:
  - `buscarEntrada(db, sesionId, doc: { tipo_documento; numero_documento }): Promise<{ asistenteId: string; nombres: string } | null>`
  - `class DatosPersonalesRequeridos extends Error`
  - `interface DatosSalida { documento: { tipo_documento: TipoDocumento; numero_documento: string }; personales: DatosPersonales | null; respuestas: Record<string, number>; comentario: string | null }`
  - `registrarSalida(db, sesion: { id; habeasId }, datos: DatosSalida, meta, ahora?): Promise<{ sinEntrada: boolean }>`
  - `type ResultadoConsulta` (en `src/app/s/[token]/actions.ts`)
  - `PreguntasEncuesta({ preguntas, errores })`

- [ ] **Step 1: Agregar las pruebas de integración de salida (fallan)**

En `tests/integration/registro.test.ts`, cambiar la importación de `registro` por:

```ts
import { DatosPersonalesRequeridos, registrarEntrada, registrarSalida } from '@/lib/repo/registro';
```

Y agregar al final:

```ts
describe('registrarSalida', () => {
  const respuestas = { contenido: 5, expositor: 4, metodologia: 5, utilidad: 4, logistica: 5, nps: 10 };
  const documento = { tipo_documento: 'CC' as const, numero_documento: '1020345678' };

  it('con entrada previa: no pide datos ni consentimiento y queda completa', async () => {
    const ev = await crearEventoPrueba(db);
    const sesion = { id: ev.sesionId, habeasId: ev.habeasId };
    await registrarEntrada(db, sesion, datosPersona(), meta);
    const r = await registrarSalida(db, sesion, { documento, personales: null, respuestas, comentario: 'Bien' }, meta);
    expect(r.sinEntrada).toBe(false);
    const { data } = await db
      .from('asistencia_consolidada')
      .select('estado_asistencia, promedio_escala, nps, comentario')
      .eq('sesion_id', ev.sesionId)
      .single();
    expect(data).toEqual({ estado_asistencia: 'completa', promedio_escala: 4.6, nps: 10, comentario: 'Bien' });
  });

  it('sin entrada: crea el asistente, guarda consentimiento y marca sin_entrada', async () => {
    const ev = await crearEventoPrueba(db);
    const r = await registrarSalida(
      db,
      { id: ev.sesionId, habeasId: ev.habeasId },
      { documento, personales: datosPersona(), respuestas, comentario: null },
      meta,
    );
    expect(r.sinEntrada).toBe(true);
    const { data } = await db
      .from('salidas')
      .select('sin_entrada, habeas_version_id, consentimiento_at, ip')
      .eq('sesion_id', ev.sesionId)
      .single();
    expect(data).toMatchObject({ sin_entrada: true, habeas_version_id: ev.habeasId, ip: '181.49.1.2' });
    expect(data!.consentimiento_at).not.toBeNull();
  });

  it('sin entrada y sin datos personales: lanza DatosPersonalesRequeridos', async () => {
    const ev = await crearEventoPrueba(db);
    await expect(
      registrarSalida(
        db,
        { id: ev.sesionId, habeasId: ev.habeasId },
        { documento, personales: null, respuestas, comentario: null },
        meta,
      ),
    ).rejects.toBeInstanceOf(DatosPersonalesRequeridos);
  });

  it('un reenvío actualiza la salida sin duplicarla', async () => {
    const ev = await crearEventoPrueba(db);
    const sesion = { id: ev.sesionId, habeasId: ev.habeasId };
    await registrarEntrada(db, sesion, datosPersona(), meta);
    await registrarSalida(db, sesion, { documento, personales: null, respuestas, comentario: null }, meta);
    await registrarSalida(
      db,
      sesion,
      { documento, personales: null, respuestas: { ...respuestas, nps: 3 }, comentario: null },
      meta,
    );
    const { data } = await db.from('salidas').select('respuestas').eq('sesion_id', ev.sesionId);
    expect(data).toHaveLength(1);
    expect((data![0].respuestas as Record<string, number>).nps).toBe(3);
  });
});
```

Run: `npm run test:int -- tests/integration/registro.test.ts`
Expected: FAIL, porque `registrarSalida` y `DatosPersonalesRequeridos` no existen.

- [ ] **Step 2: Implementar en `registro.ts`**

Agregar al inicio de `src/lib/repo/registro.ts`:

```ts
import type { TipoDocumento } from '@/lib/domain/constantes';
```

Agregar al final:

```ts
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
```

Run: `npm run test:int -- tests/integration/registro.test.ts`
Expected: PASS (7 pruebas).

- [ ] **Step 3: Escribir la E2E de salida (falla)**

`e2e/publico-salida.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';
import { registrarEntrada } from '@/lib/repo/registro';
import { clienteServicioPrueba, crearEventoPrueba, datosPersona, limpiarDatos } from '../tests/integration/helpers';

test.beforeEach(async () => {
  await limpiarDatos();
});

const ESCALA = [
  'El contenido de la sesión fue pertinente y claro',
  'El expositor demostró dominio del tema',
  'La metodología facilitó el aprendizaje',
  'Lo aprendido es útil para mis funciones',
  'La logística (lugar, horario, recursos) fue adecuada',
];
const sinMeta = { ip: null, userAgent: null };

async function ingresarDocumento(page: Page, documento: string) {
  await page.getByLabel('Tipo de documento').selectOption('CC');
  await page.getByLabel('Número de documento').fill(documento);
  await page.getByRole('button', { name: 'Continuar' }).click();
}

async function responderEncuesta(page: Page) {
  for (const texto of ESCALA) {
    await page.getByRole('group', { name: texto }).getByText('5', { exact: true }).click();
  }
  await page
    .getByRole('group', { name: '¿Qué tan probable es que recomiende esta capacitación?' })
    .getByText('10', { exact: true })
    .click();
  await page.getByLabel('Comentarios o sugerencias (opcional)').fill('Muy buena sesión');
}

async function consolidado(sesionId: string) {
  const { data } = await clienteServicioPrueba()
    .from('asistencia_consolidada')
    .select('estado_asistencia, promedio_escala, nps, comentario')
    .eq('sesion_id', sesionId);
  return data!;
}

test('con entrada previa reconoce a la persona aunque escriba el documento con puntos', async ({ page }) => {
  const db = clienteServicioPrueba();
  const ev = await crearEventoPrueba(db);
  await registrarEntrada(db, { id: ev.sesionId, habeasId: ev.habeasId }, datosPersona('1020345678'), sinMeta);
  await page.goto(`/s/${ev.tokenSalida}`);
  await ingresarDocumento(page, '1.020.345.678');
  await expect(page.getByText('Hola, Ana María')).toBeVisible();
  await expect(page.getByTestId('texto-habeas')).toHaveCount(0);
  await responderEncuesta(page);
  await page.getByRole('button', { name: 'Enviar evaluación y registrar salida' }).click();
  await expect(page.getByText('¡Gracias!')).toBeVisible();
  expect(await consolidado(ev.sesionId)).toEqual([
    { estado_asistencia: 'completa', promedio_escala: 5, nps: 10, comentario: 'Muy buena sesión' },
  ]);
});

test('sin entrada pide datos y Habeas Data, y marca sin_entrada', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await page.goto(`/s/${ev.tokenSalida}`);
  await ingresarDocumento(page, '52123456');
  await expect(page.getByText('No encontramos su registro de entrada')).toBeVisible();
  await page.getByLabel('Nombres').fill('Luis');
  await page.getByLabel('Apellidos').fill('Rojas');
  await page.getByLabel('Correo institucional').fill('lrojas@procuraduria.gov.co');
  await page.getByLabel('Dependencia').fill('Secretaría General');
  await page.getByLabel('Cargo').fill('Técnico');
  await page.getByLabel(/He leído y autorizo/).check();
  await responderEncuesta(page);
  await page.getByRole('button', { name: 'Enviar evaluación y registrar salida' }).click();
  await expect(page.getByText('¡Gracias!')).toBeVisible();
  expect((await consolidado(ev.sesionId))[0].estado_asistencia).toBe('sin_entrada');
});

test('el servidor exige las preguntas de la encuesta', async ({ page }) => {
  const db = clienteServicioPrueba();
  const ev = await crearEventoPrueba(db);
  await registrarEntrada(db, { id: ev.sesionId, habeasId: ev.habeasId }, datosPersona(), sinMeta);
  await page.goto(`/s/${ev.tokenSalida}`);
  await ingresarDocumento(page, '1020345678');
  await page.locator('input[type=radio]').evaluateAll((els) => els.forEach((el) => el.removeAttribute('required')));
  await page.getByRole('button', { name: 'Enviar evaluación y registrar salida' }).click();
  await expect(page.getByText('Seleccione una opción').first()).toBeVisible();
  expect(await consolidado(ev.sesionId)).toEqual([
    { estado_asistencia: 'solo_entrada', promedio_escala: null, nps: null, comentario: null },
  ]);
});
```

Run: `npm run e2e -- e2e/publico-salida.spec.ts`
Expected: FAIL, porque la ruta `/s/[token]` no existe.

- [ ] **Step 4: Componentes de encuesta y formulario de salida**

`src/components/publico/PreguntasEncuesta.tsx`:

```tsx
import type { Pregunta } from '@/lib/domain/encuesta';
import { Campo, claseControl } from './campos';

function OpcionesNumericas({
  nombre,
  pregunta,
  min,
  max,
  extremos,
  error,
}: {
  nombre: string;
  pregunta: string;
  min: number;
  max: number;
  extremos: [string, string];
  error?: string;
}) {
  const valores = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-800">{pregunta}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {valores.map((v) => (
          <label key={v} className="relative">
            <input type="radio" name={nombre} value={v} required className="peer sr-only" />
            <span className="flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-400 px-2 text-base text-slate-900 peer-checked:border-[var(--color-primario)] peer-checked:bg-[var(--color-primario)] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-primario)]">
              {v}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-600">
        <span>{extremos[0]}</span>
        <span>{extremos[1]}</span>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function PreguntasEncuesta({
  preguntas,
  errores,
}: {
  preguntas: Pregunta[];
  errores: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      {preguntas.map((p) => {
        const nombre = `p_${p.clave}`;
        if (p.tipo === 'texto') {
          return (
            <Campo key={p.clave} etiqueta={`${p.texto} (opcional)`} error={errores[nombre]}>
              <textarea name={nombre} rows={3} maxLength={1000} className={claseControl} />
            </Campo>
          );
        }
        const esEscala = p.tipo === 'escala_1_5';
        return (
          <OpcionesNumericas
            key={p.clave}
            nombre={nombre}
            pregunta={p.texto}
            min={esEscala ? 1 : 0}
            max={esEscala ? 5 : 10}
            extremos={esEscala ? ['Muy en desacuerdo', 'Muy de acuerdo'] : ['Nada probable', 'Muy probable']}
            error={errores[nombre]}
          />
        );
      })}
    </div>
  );
}
```

`src/components/publico/FormularioSalida.tsx`:

```tsx
'use client';
import type { Pregunta } from '@/lib/domain/encuesta';
import type { ResultadoEnvio } from '@/lib/envio';
import type { ResultadoConsulta } from '@/app/s/[token]/actions';
import { useEnvio } from '@/components/useEnvio';
import { Boton } from './campos';
import { CajaHabeas } from './CajaHabeas';
import { CampoTrampa } from './CampoTrampa';
import { CamposDocumento } from './CamposDocumento';
import { CamposPersonales } from './CamposPersonales';
import { MensajeEstado } from './MensajeEstado';
import { PreguntasEncuesta } from './PreguntasEncuesta';

const SIN_CONEXION = 'No se pudo enviar el formulario. Revise su conexión y presione de nuevo; sus datos se conservan.';

export function FormularioSalida({
  consultar,
  enviar,
  habeas,
  dominioCorreo,
  preguntas,
}: {
  consultar: (fd: FormData) => Promise<ResultadoConsulta>;
  enviar: (fd: FormData) => Promise<ResultadoEnvio>;
  habeas: { texto: string; urlPolitica: string | null };
  dominioCorreo: string | null;
  preguntas: Pregunta[];
}) {
  const paso1 = useEnvio(consultar);
  const paso2 = useEnvio(enviar);

  if (paso2.resultado?.ok) {
    return <MensajeEstado tono="exito" titulo="¡Gracias!" texto="Su salida y su evaluación quedaron registradas." />;
  }

  const consulta = paso1.resultado?.ok ? paso1.resultado : null;
  if (!consulta) {
    const r = paso1.resultado;
    const errores = r && !r.ok ? r.errores : {};
    return (
      <form onSubmit={paso1.onSubmit} className="space-y-4">
        <p className="text-slate-700">Ingrese su documento para registrar la salida.</p>
        <CamposDocumento errores={errores} />
        {r && !r.ok && r.mensaje && <MensajeEstado tono="error" titulo="No disponible" texto={r.mensaje} />}
        {paso1.errorRed && <MensajeEstado tono="error" titulo="Sin conexión" texto={SIN_CONEXION} />}
        <Boton type="submit" disabled={paso1.pendiente}>
          {paso1.pendiente ? 'Buscando…' : 'Continuar'}
        </Boton>
      </form>
    );
  }

  const r2 = paso2.resultado;
  const errores = r2 && !r2.ok ? r2.errores : {};
  return (
    <form onSubmit={paso2.onSubmit} className="relative space-y-5">
      <CampoTrampa />
      <input type="hidden" name="tipo_documento" value={consulta.documento.tipo_documento} />
      <input type="hidden" name="numero_documento" value={consulta.documento.numero_documento} />
      {consulta.encontrado ? (
        <p className="text-lg font-semibold text-slate-900">Hola, {consulta.nombres}</p>
      ) : (
        <>
          <MensajeEstado
            titulo="No encontramos su registro de entrada"
            texto="Complete sus datos para registrar la salida."
          />
          <CamposPersonales errores={errores} dominioCorreo={dominioCorreo} />
          <CajaHabeas habeas={habeas} error={errores.acepta_habeas} />
        </>
      )}
      <PreguntasEncuesta preguntas={preguntas} errores={errores} />
      {r2 && !r2.ok && r2.mensaje && <MensajeEstado tono="error" titulo="No se pudo registrar" texto={r2.mensaje} />}
      {paso2.errorRed && <MensajeEstado tono="error" titulo="Sin conexión" texto={SIN_CONEXION} />}
      <Boton type="submit" disabled={paso2.pendiente}>
        {paso2.pendiente ? 'Enviando…' : 'Enviar evaluación y registrar salida'}
      </Boton>
      <button type="button" onClick={paso1.reiniciar} className="min-h-11 w-full text-sm text-slate-700 underline">
        Cambiar documento
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Página y acciones de salida**

`src/app/s/[token]/actions.ts`:

```ts
'use server';
import { clienteServicio } from '@/lib/supabase/servicio';
import { metaSolicitud } from '@/lib/request-meta';
import { obtenerSesionPorToken } from '@/lib/repo/publico';
import { consumirRateLimit } from '@/lib/repo/rate-limit';
import { buscarEntrada, registrarSalida } from '@/lib/repo/registro';
import {
  documentoSchema,
  encuestaSchema,
  entradaSchema,
  erroresPorCampo,
  type DatosPersonales,
} from '@/lib/domain/schemas';
import { separarRespuestas } from '@/lib/domain/encuesta';
import type { ResultadoEnvio } from '@/lib/envio';

export type ResultadoConsulta =
  | {
      ok: true;
      encontrado: boolean;
      nombres: string | null;
      documento: { tipo_documento: string; numero_documento: string };
    }
  | { ok: false; errores: Record<string, string>; mensaje?: string };

const NO_DISPONIBLE = 'El registro de salida para esta sesión no está disponible.';
const DEMASIADOS = 'Demasiados intentos. Espere unos minutos e intente de nuevo.';

async function prepararSolicitud(token: string) {
  const db = clienteServicio();
  const res = await obtenerSesionPorToken(db, token, 'salida');
  if (res.tipo !== 'abierta') return { error: NO_DISPONIBLE } as const;
  const meta = await metaSolicitud();
  if (!(await consumirRateLimit(db, `salida:${token}:${meta.ip ?? 'sin-ip'}`))) return { error: DEMASIADOS } as const;
  return { db, sesion: res.sesion, meta } as const;
}

export async function consultarDocumento(token: string, fd: FormData): Promise<ResultadoConsulta> {
  const s = await prepararSolicitud(token);
  if ('error' in s) return { ok: false, errores: {}, mensaje: s.error };
  const p = documentoSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, errores: erroresPorCampo(p.error) };
  const entrada = await buscarEntrada(s.db, s.sesion.id, p.data);
  return { ok: true, encontrado: !!entrada, nombres: entrada?.nombres ?? null, documento: p.data };
}

export async function enviarSalida(token: string, fd: FormData): Promise<ResultadoEnvio> {
  if (fd.get('sitio_web')) return { ok: true, nombres: '' };
  const s = await prepararSolicitud(token);
  if ('error' in s) return { ok: false, errores: {}, mensaje: s.error };
  const valores = Object.fromEntries(fd);
  const doc = documentoSchema.safeParse(valores);
  if (!doc.success) return { ok: false, errores: erroresPorCampo(doc.error) };

  const entrada = await buscarEntrada(s.db, s.sesion.id, doc.data);
  const errores: Record<string, string> = {};
  let personales: DatosPersonales | null = null;
  if (!entrada) {
    const p = entradaSchema.safeParse(valores);
    if (p.success) personales = p.data;
    else Object.assign(errores, erroresPorCampo(p.error));
  }
  const encuesta = encuestaSchema(s.sesion.preguntas).safeParse(valores);
  if (!encuesta.success) Object.assign(errores, erroresPorCampo(encuesta.error));
  if (!encuesta.success || Object.keys(errores).length) return { ok: false, errores };

  const { respuestas, comentario } = separarRespuestas(s.sesion.preguntas, encuesta.data);
  await registrarSalida(
    s.db,
    { id: s.sesion.id, habeasId: s.sesion.habeas.id },
    { documento: doc.data, personales, respuestas, comentario },
    s.meta,
  );
  return { ok: true, nombres: entrada?.nombres ?? personales?.nombres ?? '' };
}
```

`src/app/s/[token]/page.tsx`:

```tsx
import { clienteServicio } from '@/lib/supabase/servicio';
import { obtenerSesionPorToken } from '@/lib/repo/publico';
import { MarcoPublico } from '@/components/publico/MarcoPublico';
import { AvisoDisponibilidad } from '@/components/publico/AvisoDisponibilidad';
import { EnlaceNoValido } from '@/components/publico/EnlaceNoValido';
import { FormularioSalida } from '@/components/publico/FormularioSalida';
import { consultarDocumento, enviarSalida } from './actions';

export const dynamic = 'force-dynamic';

export default async function PaginaSalida({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await obtenerSesionPorToken(clienteServicio(), token, 'salida');
  if (res.tipo === 'no_encontrada') return <EnlaceNoValido />;
  const { sesion } = res;
  return (
    <MarcoPublico sesion={sesion} subtitulo="Registro de salida y evaluación">
      {res.tipo === 'abierta' ? (
        <FormularioSalida
          consultar={consultarDocumento.bind(null, token)}
          enviar={enviarSalida.bind(null, token)}
          habeas={sesion.habeas}
          dominioCorreo={sesion.evento.dominioCorreo}
          preguntas={sesion.preguntas}
        />
      ) : (
        <AvisoDisponibilidad sesion={sesion} />
      )}
    </MarcoPublico>
  );
}
```

- [ ] **Step 6: Correr las pruebas**

Run: `npm run e2e -- e2e/publico-salida.spec.ts`
Expected: PASS (3 pruebas).

Run: `npm test && npm run test:int`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: formulario público de salida con encuesta y registro sin entrada"
```

---

### Task 6: Autenticación del panel de administración

**Files:**
- Create: `src/middleware.ts`, `src/lib/auth/admin.ts`, `src/lib/errores.ts`, `src/lib/acciones.ts`
- Create: `src/app/admin/login/page.tsx`, `src/app/admin/login/FormularioLogin.tsx`, `src/app/admin/login/actions.ts`
- Create: `src/app/admin/(panel)/layout.tsx`, `src/app/admin/(panel)/page.tsx` (versión mínima, que la Tarea 8 reemplaza)
- Create: `src/components/admin/estilos.ts`, `src/components/admin/CampoAdmin.tsx`, `src/components/admin/FormularioAccion.tsx`
- Create: `scripts/crear-admin.mjs`
- Test: `e2e/utilidades.ts`, `e2e/admin-login.spec.ts`

**Interfaces:**
- Consumes: `clienteSesion` (Tarea 3); `useEnvio`, `ResultadoAccion`, `MensajeEstado` (Tarea 4).
- Produces:
  - `requerirAdmin(): Promise<{ db: SupabaseClient; user: User }>`: redirige a `/admin/login` sin sesión, o a `/admin/login?error=no-autorizado` si la persona no es administradora
  - `class ErrorNegocio extends Error`, `mensajeDeError(e: unknown): string`
  - `ejecutar(fn: () => Promise<string | void>): Promise<ResultadoAccion>` (deja pasar `redirect()`), `camposTexto(fd: FormData, claves: string[]): Record<string, string>`
  - `claseInput`, `claseEtiqueta`, `claseTarjeta`, `claseBoton: { primario; secundario; peligro }`
  - `CampoAdmin({ etiqueta, children })`
  - `FormularioAccion({ accion: (fd) => Promise<ResultadoAccion>; textoBoton; children?; variante?; confirmar?; className? })`
  - E2E: `iniciarSesion(page, email, password)`, `iniciarSesionAdmin(page)`

- [ ] **Step 1: Escribir la E2E de login (falla)**

`e2e/utilidades.ts`:

```ts
import { expect, type Page } from '@playwright/test';
import { crearUsuarioPrueba } from '../tests/integration/helpers';

export async function iniciarSesion(page: Page, email: string, password: string) {
  await page.goto('/admin/login');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

export async function iniciarSesionAdmin(page: Page) {
  const u = await crearUsuarioPrueba(true);
  await iniciarSesion(page, u.email, u.password);
  await expect(page.getByRole('heading', { name: 'Eventos' })).toBeVisible();
}
```

`e2e/admin-login.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { crearUsuarioPrueba, limpiarDatos } from '../tests/integration/helpers';
import { iniciarSesion, iniciarSesionAdmin } from './utilidades';

test.beforeEach(async () => {
  await limpiarDatos();
});

test('sin sesión, /admin redirige al login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('un administrador entra al panel y puede salir', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('contraseña incorrecta muestra un error', async ({ page }) => {
  const u = await crearUsuarioPrueba(true);
  await iniciarSesion(page, u.email, 'incorrecta-123');
  await expect(page.getByText('Correo o contraseña incorrectos')).toBeVisible();
});

test('un usuario que no es administrador no entra', async ({ page }) => {
  const u = await crearUsuarioPrueba(false);
  await iniciarSesion(page, u.email, u.password);
  await expect(page.getByText('Su usuario no tiene permisos de administrador.')).toBeVisible();
});
```

Run: `npm run e2e -- e2e/admin-login.spec.ts`
Expected: FAIL.

- [ ] **Step 2: Middleware, `requerirAdmin` y helpers de acciones**

`src/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !request.nextUrl.pathname.startsWith('/admin/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
```

`src/lib/auth/admin.ts`:

```ts
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
```

`src/lib/errores.ts`:

```ts
export class ErrorNegocio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorNegocio';
  }
}

export function mensajeDeError(e: unknown): string {
  if (e instanceof ErrorNegocio) return e.message;
  console.error(e);
  return 'Ocurrió un error inesperado. Intente de nuevo.';
}
```

`src/lib/acciones.ts`:

```ts
import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { mensajeDeError } from './errores';
import type { ResultadoAccion } from './envio';

export async function ejecutar(fn: () => Promise<string | void>): Promise<ResultadoAccion> {
  try {
    const mensaje = await fn();
    return { ok: true, mensaje: mensaje || 'Cambios guardados' };
  } catch (e) {
    unstable_rethrow(e); // deja pasar redirect() y notFound()
    return { ok: false, error: mensajeDeError(e) };
  }
}

export function camposTexto(fd: FormData, claves: string[]): Record<string, string> {
  return Object.fromEntries(claves.map((k) => [k, String(fd.get(k) ?? '')]));
}
```

- [ ] **Step 3: Componentes base del panel**

`src/components/admin/estilos.ts`:

```ts
export const claseInput =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';
export const claseEtiqueta = 'block text-sm font-medium text-slate-700';
export const claseTarjeta = 'rounded-lg border border-slate-200 bg-white p-5 shadow-sm';
export const claseBoton = {
  primario: 'inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60',
  secundario:
    'inline-block rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 disabled:opacity-60',
  peligro:
    'inline-block rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 disabled:opacity-60',
} as const;
```

`src/components/admin/CampoAdmin.tsx`:

```tsx
import type { ReactNode } from 'react';
import { claseEtiqueta } from './estilos';

export function CampoAdmin({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={claseEtiqueta}>{etiqueta}</span>
      {children}
    </label>
  );
}
```

`src/components/admin/FormularioAccion.tsx`:

```tsx
'use client';
import type { FormEvent, ReactNode } from 'react';
import { useEnvio } from '@/components/useEnvio';
import type { ResultadoAccion } from '@/lib/envio';
import { claseBoton } from './estilos';

export function FormularioAccion({
  accion,
  textoBoton,
  children,
  variante = 'primario',
  confirmar,
  className = 'space-y-3',
}: {
  accion: (fd: FormData) => Promise<ResultadoAccion>;
  textoBoton: string;
  children?: ReactNode;
  variante?: keyof typeof claseBoton;
  confirmar?: string;
  className?: string;
}) {
  const { onSubmit, pendiente, resultado, errorRed } = useEnvio(accion);
  function enviar(e: FormEvent<HTMLFormElement>) {
    if (confirmar && !window.confirm(confirmar)) {
      e.preventDefault();
      return;
    }
    onSubmit(e);
  }
  return (
    <form onSubmit={enviar} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pendiente} className={claseBoton[variante]}>
          {pendiente ? 'Procesando…' : textoBoton}
        </button>
        {resultado?.ok && resultado.mensaje && (
          <span role="status" className="text-sm text-green-700">
            {resultado.mensaje}
          </span>
        )}
        {resultado && !resultado.ok && (
          <span role="alert" className="text-sm text-red-700">
            {resultado.error}
          </span>
        )}
        {errorRed && (
          <span role="alert" className="text-sm text-red-700">
            No se pudo conectar. Intente de nuevo.
          </span>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Login**

`src/app/admin/login/actions.ts`:

```ts
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
```

`src/app/admin/login/FormularioLogin.tsx`:

```tsx
'use client';
import { useActionState } from 'react';
import { iniciarSesion } from './actions';
import { claseBoton, claseInput } from '@/components/admin/estilos';
import { CampoAdmin } from '@/components/admin/CampoAdmin';

export function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, null);
  return (
    <form action={accion} className="space-y-4">
      <CampoAdmin etiqueta="Correo">
        <input name="correo" type="email" autoComplete="username" required className={claseInput} />
      </CampoAdmin>
      <CampoAdmin etiqueta="Contraseña">
        <input name="clave" type="password" autoComplete="current-password" required className={claseInput} />
      </CampoAdmin>
      {estado?.error && (
        <p role="alert" className="text-sm text-red-700">
          {estado.error}
        </p>
      )}
      <button type="submit" disabled={pendiente} className={`${claseBoton.primario} w-full`}>
        {pendiente ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
```

`src/app/admin/login/page.tsx`:

```tsx
import { MensajeEstado } from '@/components/publico/MensajeEstado';
import { FormularioLogin } from './FormularioLogin';

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-bold text-slate-900">Administración de capacitaciones</h1>
      {error === 'no-autorizado' && (
        <MensajeEstado tono="error" titulo="Acceso no autorizado" texto="Su usuario no tiene permisos de administrador." />
      )}
      <FormularioLogin />
    </main>
  );
}
```

- [ ] **Step 5: Layout del panel y página inicial mínima**

`src/app/admin/(panel)/layout.tsx`:

```tsx
import Link from 'next/link';
import { requerirAdmin } from '@/lib/auth/admin';
import { cerrarSesion } from '@/app/admin/login/actions';

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const { user } = await requerirAdmin();
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-5 px-4 py-3 text-sm">
          <span className="font-bold text-slate-900">Capacitaciones · Avance Jurídico</span>
          <Link href="/admin" className="text-slate-700 hover:underline">
            Eventos
          </Link>
          <Link href="/admin/marcas" className="text-slate-700 hover:underline">
            Marcas
          </Link>
          <Link href="/admin/configuracion" className="text-slate-700 hover:underline">
            Configuración
          </Link>
          <span className="ml-auto text-slate-500">{user.email}</span>
          <form action={cerrarSesion}>
            <button type="submit" className="text-slate-700 underline">
              Salir
            </button>
          </form>
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
```

`src/app/admin/(panel)/page.tsx`:

```tsx
export default function PaginaEventos() {
  return <h1 className="text-2xl font-bold text-slate-900">Eventos</h1>;
}
```

- [ ] **Step 6: Script para crear administradores**

`scripts/crear-admin.mjs`:

```js
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
```

- [ ] **Step 7: Correr las pruebas**

Run: `npm run e2e -- e2e/admin-login.spec.ts`
Expected: PASS (4 pruebas).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: autenticación del panel con Supabase Auth y lista de administradores"
```

---

### Task 7: Marcas y configuración

**Files:**
- Create: `src/lib/domain/logo.ts`, `src/lib/domain/schemas-admin.ts`, `src/lib/repo/marcas.ts`, `src/lib/repo/configuracion.ts`
- Create: `src/app/admin/(panel)/marcas/page.tsx`, `actions.ts`; `src/app/admin/(panel)/configuracion/page.tsx`, `actions.ts`
- Modify: `next.config.ts`
- Test: `tests/unit/admin.test.ts`, `tests/integration/marcas.test.ts`, `e2e/admin-marcas.spec.ts`

**Interfaces:**
- Consumes: `ErrorNegocio`, `ejecutar`, `camposTexto`, `requerirAdmin`, `FormularioAccion`, `CampoAdmin` y estilos (Tarea 6); `urlLogo` (Tarea 3).
- Produces:
  - `LOGO_MAX_BYTES`, `LOGO_TIPOS`, `validarLogo(a: { type: string; size: number }): string | null`
  - `validar<T extends ZodTypeAny>(schema: T, valores: unknown): z.infer<T>` (lanza `ErrorNegocio` con el primer mensaje)
  - `opcional(max)`, `colorSchema`, `casillaSchema`, `marcaSchema`, `type DatosMarca`
  - `interface Marca { id; nombre; logo_path: string | null; color_primario: string | null; activa: boolean }`
  - `listarMarcas(db): Promise<Marca[]>`, `guardarMarca(db, id: string | null, d: DatosMarca): Promise<string>`, `subirLogo(db, marcaId, archivo: File): Promise<void>`
  - `obtenerConfiguracion(db): Promise<{ habeasTexto: string; habeasUrl: string }>`, `guardarConfiguracion(db, c): Promise<void>`

- [ ] **Step 1: Escribir las pruebas unitarias y de integración (fallan)**

`tests/unit/admin.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { validarLogo } from '@/lib/domain/logo';
import { marcaSchema, validar } from '@/lib/domain/schemas-admin';
import { ErrorNegocio } from '@/lib/errores';

describe('validarLogo', () => {
  it('acepta PNG, SVG y JPG de hasta 1 MB', () => {
    expect(validarLogo({ type: 'image/png', size: 1_048_576 })).toBeNull();
    expect(validarLogo({ type: 'image/svg+xml', size: 10 })).toBeNull();
    expect(validarLogo({ type: 'image/jpeg', size: 10 })).toBeNull();
  });
  it('rechaza otros tipos, archivos grandes y vacíos', () => {
    expect(validarLogo({ type: 'application/pdf', size: 10 })).toBe('El logo debe ser PNG, SVG o JPG');
    expect(validarLogo({ type: 'image/png', size: 1_048_577 })).toBe('El logo no puede superar 1 MB');
    expect(validarLogo({ type: 'image/png', size: 0 })).toBe('El archivo está vacío');
  });
});

describe('marcaSchema', () => {
  it('convierte color vacío en null y la casilla "on" en true', () => {
    expect(validar(marcaSchema, { nombre: ' PGN ', color_primario: '', activa: 'on' })).toEqual({
      nombre: 'PGN',
      color_primario: null,
      activa: true,
    });
    expect(validar(marcaSchema, { nombre: 'PGN', color_primario: '#003366', activa: null }).activa).toBe(false);
  });
  it('lanza ErrorNegocio con un mensaje en español', () => {
    expect(() => validar(marcaSchema, { nombre: 'PGN', color_primario: 'azul', activa: 'on' })).toThrow(ErrorNegocio);
    expect(() => validar(marcaSchema, { nombre: 'PGN', color_primario: 'azul', activa: 'on' })).toThrow(
      'Color no válido (use #RRGGBB)',
    );
  });
});
```

`tests/integration/marcas.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { guardarMarca, listarMarcas, subirLogo } from '@/lib/repo/marcas';
import { guardarConfiguracion, obtenerConfiguracion } from '@/lib/repo/configuracion';
import { ErrorNegocio } from '@/lib/errores';
import { PNG_1x1, clienteServicioPrueba, limpiarDatos } from './helpers';

const db = clienteServicioPrueba();
beforeEach(limpiarDatos);

describe('marcas', () => {
  it('crea, actualiza y lista marcas ordenadas por nombre', async () => {
    const id = await guardarMarca(db, null, { nombre: 'PGN', color_primario: '#003366', activa: true });
    await guardarMarca(db, id, { nombre: 'Procuraduría', color_primario: null, activa: false });
    const marcas = await listarMarcas(db);
    expect(marcas.map((m) => m.nombre)).toEqual(['Avance Jurídico', 'Procuraduría']);
    expect(marcas[1]).toMatchObject({ id, color_primario: null, activa: false });
  });

  it('sube el logo y guarda su ruta', async () => {
    const id = await guardarMarca(db, null, { nombre: 'PGN', color_primario: null, activa: true });
    await subirLogo(db, id, new File([PNG_1x1], 'pgn.png', { type: 'image/png' }));
    const marca = (await listarMarcas(db)).find((m) => m.id === id)!;
    expect(marca.logo_path).toMatch(new RegExp(`^${id}/\\d+\\.png$`));
    const { data } = await db.storage.from('logos').download(marca.logo_path!);
    expect(data!.size).toBe(PNG_1x1.length);
  });

  it('rechaza un logo inválido', async () => {
    const id = await guardarMarca(db, null, { nombre: 'PGN', color_primario: null, activa: true });
    await expect(
      subirLogo(db, id, new File(['%PDF'], 'x.pdf', { type: 'application/pdf' })),
    ).rejects.toBeInstanceOf(ErrorNegocio);
  });
});

describe('configuracion', () => {
  it('lee y guarda el texto de Habeas Data por defecto', async () => {
    expect((await obtenerConfiguracion(db)).habeasTexto).toBe('[PENDIENTE: cláusula oficial de Avance Jurídico]');
    await guardarConfiguracion(db, {
      habeasTexto: 'Cláusula oficial de prueba',
      habeasUrl: 'https://ejemplo.co/politica',
    });
    expect(await obtenerConfiguracion(db)).toEqual({
      habeasTexto: 'Cláusula oficial de prueba',
      habeasUrl: 'https://ejemplo.co/politica',
    });
  });
});
```

Run: `npm test` y `npm run test:int -- tests/integration/marcas.test.ts`
Expected: FAIL, porque los módulos no existen.

- [ ] **Step 2: Implementar dominio y repositorios**

`src/lib/domain/logo.ts`:

```ts
export const LOGO_MAX_BYTES = 1_048_576;
export const LOGO_TIPOS = { 'image/png': 'png', 'image/svg+xml': 'svg', 'image/jpeg': 'jpg' } as const;

export function validarLogo(archivo: { type: string; size: number }): string | null {
  if (!(archivo.type in LOGO_TIPOS)) return 'El logo debe ser PNG, SVG o JPG';
  if (archivo.size === 0) return 'El archivo está vacío';
  if (archivo.size > LOGO_MAX_BYTES) return 'El logo no puede superar 1 MB';
  return null;
}
```

`src/lib/domain/schemas-admin.ts`:

```ts
import { z } from 'zod';
import { ErrorNegocio } from '@/lib/errores';

export function validar<T extends z.ZodTypeAny>(schema: T, valores: unknown): z.infer<T> {
  const r = schema.safeParse(valores);
  if (!r.success) throw new ErrorNegocio(r.error.issues[0].message);
  return r.data;
}

export const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => v || null);

export const colorSchema = z
  .string()
  .trim()
  .regex(/^(#[0-9A-Fa-f]{6})?$/, 'Color no válido (use #RRGGBB)')
  .transform((v) => v || null);

export const casillaSchema = z.preprocess((v) => v === 'on' || v === true, z.boolean());

export const marcaSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingrese el nombre de la marca').max(100, 'Máximo 100 caracteres'),
  color_primario: colorSchema,
  activa: casillaSchema,
});
export type DatosMarca = z.infer<typeof marcaSchema>;
```

`src/lib/repo/marcas.ts`:

```ts
import type { Db } from './db';
import type { DatosMarca } from '@/lib/domain/schemas-admin';
import { LOGO_TIPOS, validarLogo } from '@/lib/domain/logo';
import { ErrorNegocio } from '@/lib/errores';

export interface Marca {
  id: string;
  nombre: string;
  logo_path: string | null;
  color_primario: string | null;
  activa: boolean;
}

export async function listarMarcas(db: Db): Promise<Marca[]> {
  const { data, error } = await db
    .from('marcas')
    .select('id, nombre, logo_path, color_primario, activa')
    .order('nombre');
  if (error) throw error;
  return data as Marca[];
}

export async function guardarMarca(db: Db, id: string | null, d: DatosMarca): Promise<string> {
  if (id) {
    const { error } = await db.from('marcas').update(d).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await db.from('marcas').insert(d).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function subirLogo(db: Db, marcaId: string, archivo: File): Promise<void> {
  const problema = validarLogo(archivo);
  if (problema) throw new ErrorNegocio(problema);
  const extension = LOGO_TIPOS[archivo.type as keyof typeof LOGO_TIPOS];
  const ruta = `${marcaId}/${Date.now()}.${extension}`;
  const { error } = await db.storage
    .from('logos')
    .upload(ruta, archivo, { contentType: archivo.type, upsert: false });
  if (error) throw error;
  const { error: e2 } = await db.from('marcas').update({ logo_path: ruta }).eq('id', marcaId);
  if (e2) throw e2;
}
```

`src/lib/repo/configuracion.ts`:

```ts
import type { Db } from './db';

export interface Configuracion {
  habeasTexto: string;
  habeasUrl: string;
}

export async function obtenerConfiguracion(db: Db): Promise<Configuracion> {
  const { data, error } = await db.from('configuracion').select('clave, valor');
  if (error) throw error;
  const valor = (clave: string) => data.find((r) => r.clave === clave)?.valor ?? '';
  return { habeasTexto: valor('habeas_texto_defecto'), habeasUrl: valor('habeas_url_politica') };
}

export async function guardarConfiguracion(db: Db, c: Configuracion): Promise<void> {
  const { error } = await db.from('configuracion').upsert([
    { clave: 'habeas_texto_defecto', valor: c.habeasTexto },
    { clave: 'habeas_url_politica', valor: c.habeasUrl },
  ]);
  if (error) throw error;
}
```

Run: `npm test` y `npm run test:int -- tests/integration/marcas.test.ts`
Expected: PASS.

- [ ] **Step 3: Escribir la E2E de marcas y configuración (falla)**

`e2e/admin-marcas.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { PNG_1x1, limpiarDatos } from '../tests/integration/helpers';
import { iniciarSesionAdmin } from './utilidades';

test.beforeEach(async () => {
  await limpiarDatos();
});

test('crea una marca con logo', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.getByRole('link', { name: 'Marcas' }).click();
  const nueva = page.getByTestId('nueva-marca');
  await nueva.getByLabel('Nombre').fill('Procuraduría General de la Nación');
  await nueva.getByLabel('Color principal').fill('#003366');
  await nueva.getByLabel('Logo').setInputFiles({ name: 'pgn.png', mimeType: 'image/png', buffer: PNG_1x1 });
  await nueva.getByRole('button', { name: 'Crear marca' }).click();
  await expect(nueva.getByText('Marca creada')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Procuraduría General de la Nación' })).toBeVisible();
});

test('rechaza un logo que no es imagen', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.goto('/admin/marcas');
  const nueva = page.getByTestId('nueva-marca');
  await nueva.getByLabel('Nombre').fill('Otra');
  await nueva
    .getByLabel('Logo')
    .setInputFiles({ name: 'x.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });
  await nueva.getByRole('button', { name: 'Crear marca' }).click();
  await expect(nueva.getByText('El logo debe ser PNG, SVG o JPG')).toBeVisible();
});

test('guarda el texto de Habeas Data por defecto', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.getByRole('link', { name: 'Configuración' }).click();
  await page.getByLabel('Texto de autorización por defecto').fill('Cláusula oficial de Avance Jurídico para pruebas.');
  await page.getByRole('button', { name: 'Guardar configuración' }).click();
  await expect(page.getByText('Configuración guardada')).toBeVisible();
});
```

Run: `npm run e2e -- e2e/admin-marcas.spec.ts`
Expected: FAIL.

- [ ] **Step 4: Páginas y acciones**

`next.config.ts` (reemplazar todo):

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: '2mb' } }, // logos de hasta 1 MB más los demás campos
};

export default nextConfig;
```

`src/app/admin/(panel)/marcas/actions.ts`:

```ts
'use server';
import { revalidatePath } from 'next/cache';
import { requerirAdmin } from '@/lib/auth/admin';
import { ejecutar } from '@/lib/acciones';
import { guardarMarca, subirLogo } from '@/lib/repo/marcas';
import { marcaSchema, validar } from '@/lib/domain/schemas-admin';
import { validarLogo } from '@/lib/domain/logo';
import { ErrorNegocio } from '@/lib/errores';

export async function guardarMarcaAccion(id: string | null, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    const datos = validar(marcaSchema, {
      nombre: fd.get('nombre') ?? '',
      color_primario: fd.get('color_primario') ?? '',
      activa: fd.get('activa'),
    });
    const logo = fd.get('logo');
    const hayLogo = logo instanceof File && logo.size > 0;
    if (hayLogo) {
      const problema = validarLogo(logo);
      if (problema) throw new ErrorNegocio(problema);
    }
    const marcaId = await guardarMarca(db, id, datos);
    if (hayLogo) await subirLogo(db, marcaId, logo);
    revalidatePath('/admin/marcas');
    return id ? 'Marca actualizada' : 'Marca creada';
  });
}
```

`src/app/admin/(panel)/marcas/page.tsx`:

```tsx
import { requerirAdmin } from '@/lib/auth/admin';
import { listarMarcas, type Marca } from '@/lib/repo/marcas';
import { urlLogo } from '@/lib/storage';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { CampoAdmin } from '@/components/admin/CampoAdmin';
import { claseInput, claseTarjeta } from '@/components/admin/estilos';
import { guardarMarcaAccion } from './actions';

function CamposMarca({ marca }: { marca?: Marca }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <CampoAdmin etiqueta="Nombre">
          <input name="nombre" defaultValue={marca?.nombre ?? ''} required className={claseInput} />
        </CampoAdmin>
        <CampoAdmin etiqueta="Color principal (#RRGGBB)">
          <input
            name="color_primario"
            defaultValue={marca?.color_primario ?? ''}
            placeholder="#1F3A5F"
            className={claseInput}
          />
        </CampoAdmin>
        <CampoAdmin etiqueta="Logo">
          <input type="file" name="logo" accept="image/png,image/svg+xml,image/jpeg" className={claseInput} />
        </CampoAdmin>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="activa" defaultChecked={marca?.activa ?? true} /> Activa
      </label>
    </>
  );
}

export default async function PaginaMarcas() {
  const { db } = await requerirAdmin();
  const marcas = await listarMarcas(db);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Marcas</h1>
      <p className="text-sm text-slate-600">
        Logos institucionales disponibles para el co-branding de los eventos. PNG, SVG o JPG, máximo 1 MB.
      </p>
      {marcas.map((m) => (
        <section key={m.id} className={claseTarjeta}>
          <div className="mb-3 flex h-12 items-center">
            {m.logo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlLogo(m.logo_path)} alt={m.nombre} className="h-12 w-auto" />
            ) : (
              <span className="text-sm text-slate-500">Sin logo</span>
            )}
          </div>
          <FormularioAccion accion={guardarMarcaAccion.bind(null, m.id)} textoBoton="Guardar">
            <CamposMarca marca={m} />
          </FormularioAccion>
        </section>
      ))}
      <section className={claseTarjeta} data-testid="nueva-marca">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Nueva marca</h2>
        <FormularioAccion accion={guardarMarcaAccion.bind(null, null)} textoBoton="Crear marca">
          <CamposMarca />
        </FormularioAccion>
      </section>
    </div>
  );
}
```

`src/app/admin/(panel)/configuracion/actions.ts`:

```ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requerirAdmin } from '@/lib/auth/admin';
import { camposTexto, ejecutar } from '@/lib/acciones';
import { guardarConfiguracion } from '@/lib/repo/configuracion';
import { validar } from '@/lib/domain/schemas-admin';

const configuracionSchema = z.object({
  habeas_texto: z.string().trim().min(20, 'El texto de autorización es demasiado corto'),
  habeas_url: z.string().trim().url('Enlace no válido').or(z.literal('')),
});

export async function guardarConfiguracionAccion(fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    const d = validar(configuracionSchema, camposTexto(fd, ['habeas_texto', 'habeas_url']));
    await guardarConfiguracion(db, { habeasTexto: d.habeas_texto, habeasUrl: d.habeas_url });
    revalidatePath('/admin/configuracion');
    return 'Configuración guardada';
  });
}
```

`src/app/admin/(panel)/configuracion/page.tsx`:

```tsx
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerConfiguracion } from '@/lib/repo/configuracion';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { CampoAdmin } from '@/components/admin/CampoAdmin';
import { claseInput, claseTarjeta } from '@/components/admin/estilos';
import { guardarConfiguracionAccion } from './actions';

export default async function PaginaConfiguracion() {
  const { db } = await requerirAdmin();
  const c = await obtenerConfiguracion(db);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
      <section className={claseTarjeta}>
        <p className="mb-3 text-sm text-slate-600">
          Texto que se copia a cada evento nuevo. Los eventos existentes conservan su propio texto.
        </p>
        <FormularioAccion accion={guardarConfiguracionAccion} textoBoton="Guardar configuración">
          <CampoAdmin etiqueta="Texto de autorización por defecto">
            <textarea name="habeas_texto" rows={10} defaultValue={c.habeasTexto} className={claseInput} />
          </CampoAdmin>
          <CampoAdmin etiqueta="Enlace a la política de tratamiento de datos (opcional)">
            <input name="habeas_url" type="url" defaultValue={c.habeasUrl} className={claseInput} />
          </CampoAdmin>
        </FormularioAccion>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Correr las pruebas**

Run: `npm run e2e -- e2e/admin-marcas.spec.ts`
Expected: PASS (3 pruebas).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: gestión de marcas con logos y configuración de Habeas Data por defecto"
```

---

### Task 8: Eventos (datos, co-branding, Habeas Data, encuesta, estado y duplicado)

**Files:**
- Modify: `src/lib/domain/schemas-admin.ts` (agregar `eventoSchema`, `CAMPOS_EVENTO`, `habeasSchema`, `marcasEventoSchema`)
- Create: `src/lib/repo/eventos.ts`
- Create: `src/components/admin/CamposEvento.tsx`, `src/components/admin/EncabezadoEvento.tsx`
- Create: `src/app/admin/(panel)/eventos/nuevo/page.tsx`, `actions.ts`
- Create: `src/app/admin/(panel)/eventos/[id]/page.tsx`, `actions.ts`, `EditorCoBranding.tsx`
- Modify: `src/app/admin/(panel)/page.tsx` (lista real de eventos)
- Test: `tests/unit/admin.test.ts` (agregar), `tests/integration/eventos.test.ts`, `e2e/admin-eventos.spec.ts`

**Interfaces:**
- Consumes: `validar`, `opcional`, `colorSchema` (Tarea 7); `obtenerConfiguracion`, `listarMarcas` (Tarea 7); `HABEAS_PENDIENTE`, `ETIQUETA_EVENTO`, `EstadoEvento`, `Pregunta`, `ETIQUETA_TIPO_PREGUNTA`, `formatearFechaHora` (Tarea 1); `EncabezadoMarcas` (Tarea 4); `FormularioAccion`, `CampoAdmin`, estilos, `ejecutar`, `camposTexto`, `requerirAdmin` (Tarea 6); `urlLogo` (Tarea 3).
- Produces:
  - `eventoSchema`, `type DatosEvento`, `CAMPOS_EVENTO`, `habeasSchema`, `marcasEventoSchema`
  - `interface MarcaEvento { marcaId: string; orden: number; visible: boolean }`
  - `interface VersionHabeas { id; version; texto; url_politica: string | null; created_at: string }`
  - `interface EventoDetalle extends DatosEvento { id; estado: EstadoEvento; marcas: { marca_id; orden; visible }[]; preguntas: Pregunta[]; habeas: VersionHabeas[] }` (habeas de la más reciente a la más antigua)
  - `interface EventoResumen { id; nombre; cliente: string | null; estado: EstadoEvento; sesiones: number }`
  - `puedeActivarse(texto: string): string | null`
  - `listarEventos(db)`, `obtenerEvento(db, id): Promise<EventoDetalle | null>`, `crearEvento(db, d): Promise<string>`, `actualizarEvento(db, id, d)`, `guardarMarcasEvento(db, eventoId, items: MarcaEvento[])`, `nuevaVersionHabeas(db, eventoId, texto, url: string | null): Promise<number>`, `guardarPreguntas(db, eventoId, items: { clave; texto; activa }[])`, `cambiarEstadoEvento(db, eventoId, estado)`, `duplicarEvento(db, eventoId): Promise<string>`
  - `EncabezadoEvento({ evento: { id; nombre; estado }, actual: 'configuracion' | 'sesiones' | 'datos' })`, `CamposEvento({ evento? })`

- [ ] **Step 1: Pruebas unitarias de los esquemas (fallan)**

Agregar al final de `tests/unit/admin.test.ts` y a la importación de `schemas-admin` los nombres `eventoSchema`, `habeasSchema`:

```ts
import { eventoSchema, habeasSchema } from '@/lib/domain/schemas-admin';
import { puedeActivarse } from '@/lib/repo/eventos';

describe('eventoSchema', () => {
  it('normaliza dominio y convierte vacíos en null', () => {
    expect(
      validar(eventoSchema, {
        nombre: ' Capacitación PGN 2026 ',
        cliente: '',
        capacitadores: 'Juanita, Julia',
        dominio_correo: '@Procuraduria.gov.co',
        color_primario: '',
      }),
    ).toEqual({
      nombre: 'Capacitación PGN 2026',
      cliente: null,
      capacitadores: 'Juanita, Julia',
      dominio_correo: 'procuraduria.gov.co',
      color_primario: null,
    });
  });
  it('rechaza un dominio inválido', () => {
    expect(() =>
      validar(eventoSchema, { nombre: 'Evento', cliente: '', capacitadores: '', dominio_correo: 'no es dominio', color_primario: '' }),
    ).toThrow('Dominio no válido (ej. procuraduria.gov.co)');
  });
});

describe('habeasSchema', () => {
  it('exige un texto de al menos 20 caracteres y un enlace válido u omitido', () => {
    expect(validar(habeasSchema, { texto: 'x'.repeat(20), url_politica: '' })).toEqual({ texto: 'x'.repeat(20), url_politica: null });
    expect(() => validar(habeasSchema, { texto: 'corto', url_politica: '' })).toThrow('El texto de autorización es demasiado corto');
    expect(() => validar(habeasSchema, { texto: 'x'.repeat(20), url_politica: 'no-url' })).toThrow('Enlace no válido');
  });
});

describe('puedeActivarse', () => {
  it('bloquea mientras el texto sea el provisional', () => {
    expect(puedeActivarse('[PENDIENTE: cláusula oficial de Avance Jurídico]')).toMatch(/provisional/);
    expect(puedeActivarse('Autorizo a Avance Jurídico...')).toBeNull();
  });
});
```

Run: `npm test`
Expected: FAIL.

- [ ] **Step 2: Esquemas de evento**

Agregar al final de `src/lib/domain/schemas-admin.ts`:

```ts
export const eventoSchema = z.object({
  nombre: z.string().trim().min(3, 'Ingrese el nombre del evento').max(150, 'Máximo 150 caracteres'),
  cliente: opcional(150),
  capacitadores: opcional(300),
  dominio_correo: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v.replace(/^@/, ''))
    .pipe(z.string().regex(/^(([a-z0-9-]+\.)+[a-z]{2,})?$/, 'Dominio no válido (ej. procuraduria.gov.co)'))
    .transform((v) => v || null),
  color_primario: colorSchema,
});
export type DatosEvento = z.infer<typeof eventoSchema>;
export const CAMPOS_EVENTO = ['nombre', 'cliente', 'capacitadores', 'dominio_correo', 'color_primario'];

export const habeasSchema = z.object({
  texto: z.string().trim().min(20, 'El texto de autorización es demasiado corto'),
  url_politica: z
    .string()
    .trim()
    .url('Enlace no válido')
    .or(z.literal(''))
    .transform((v) => v || null),
});

export const marcasEventoSchema = z.array(
  z.object({ marcaId: z.string().uuid(), orden: z.number().int().min(0), visible: z.boolean() }),
);
```

- [ ] **Step 3: Pruebas de integración del repositorio de eventos (fallan)**

`tests/integration/eventos.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  actualizarEvento,
  cambiarEstadoEvento,
  crearEvento,
  duplicarEvento,
  guardarMarcasEvento,
  guardarPreguntas,
  listarEventos,
  nuevaVersionHabeas,
  obtenerEvento,
} from '@/lib/repo/eventos';
import { guardarConfiguracion } from '@/lib/repo/configuracion';
import { ErrorNegocio } from '@/lib/errores';
import { clienteServicioPrueba, crearEventoPrueba, limpiarDatos } from './helpers';

const db = clienteServicioPrueba();
const datos = {
  nombre: 'Capacitación PGN 2026',
  cliente: 'PGN',
  capacitadores: null,
  dominio_correo: 'procuraduria.gov.co',
  color_primario: null,
};
const CLAUSULA = 'Autorizo a Avance Jurídico el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.';
beforeEach(limpiarDatos);

async function idAvance() {
  const { data } = await db.from('marcas').select('id').eq('nombre', 'Avance Jurídico').single();
  return data!.id as string;
}

describe('crearEvento', () => {
  it('queda en borrador con las 7 preguntas y el Habeas Data por defecto como versión 1', async () => {
    const id = await crearEvento(db, datos);
    const ev = (await obtenerEvento(db, id))!;
    expect(ev.estado).toBe('borrador');
    expect(ev.preguntas).toHaveLength(7);
    expect(ev.habeas).toHaveLength(1);
    expect(ev.habeas[0]).toMatchObject({ version: 1, texto: '[PENDIENTE: cláusula oficial de Avance Jurídico]' });
  });

  it('usa la configuración vigente al momento de crearlo', async () => {
    await guardarConfiguracion(db, { habeasTexto: CLAUSULA, habeasUrl: 'https://avance.co/politica' });
    const ev = (await obtenerEvento(db, await crearEvento(db, datos)))!;
    expect(ev.habeas[0]).toMatchObject({ texto: CLAUSULA, url_politica: 'https://avance.co/politica' });
  });
});

describe('Habeas Data y activación', () => {
  it('versiona el texto y conserva el historial', async () => {
    const id = await crearEvento(db, datos);
    expect(await nuevaVersionHabeas(db, id, CLAUSULA, null)).toBe(2);
    expect(await nuevaVersionHabeas(db, id, CLAUSULA, null)).toBe(2); // sin cambios: no crea versión
    const ev = (await obtenerEvento(db, id))!;
    expect(ev.habeas.map((h) => h.version)).toEqual([2, 1]);
  });

  it('no activa con el texto provisional y sí con la cláusula oficial', async () => {
    const id = await crearEvento(db, datos);
    await expect(cambiarEstadoEvento(db, id, 'activo')).rejects.toBeInstanceOf(ErrorNegocio);
    await nuevaVersionHabeas(db, id, CLAUSULA, null);
    await cambiarEstadoEvento(db, id, 'activo');
    expect((await obtenerEvento(db, id))!.estado).toBe('activo');
  });
});

describe('configuración del evento', () => {
  it('actualiza datos, marcas y preguntas', async () => {
    const id = await crearEvento(db, datos);
    await actualizarEvento(db, id, { ...datos, nombre: 'Nuevo nombre' });
    await guardarMarcasEvento(db, id, [{ marcaId: await idAvance(), orden: 1, visible: true }]);
    await guardarPreguntas(db, id, [
      { clave: 'logistica', texto: 'Logística', activa: false },
      { clave: 'contenido', texto: 'Contenido claro', activa: true },
    ]);
    const ev = (await obtenerEvento(db, id))!;
    expect(ev.nombre).toBe('Nuevo nombre');
    expect(ev.marcas).toHaveLength(1);
    expect(ev.preguntas.find((p) => p.clave === 'logistica')!.activa).toBe(false);
    expect(ev.preguntas.find((p) => p.clave === 'contenido')!.texto).toBe('Contenido claro');
  });

  it('rechaza una pregunta activa sin texto', async () => {
    const id = await crearEvento(db, datos);
    await expect(guardarPreguntas(db, id, [{ clave: 'contenido', texto: ' ', activa: true }])).rejects.toBeInstanceOf(
      ErrorNegocio,
    );
  });
});

describe('duplicarEvento', () => {
  it('copia configuración, marcas, preguntas y Habeas Data vigente, sin sesiones', async () => {
    const id = await crearEvento(db, datos);
    await guardarMarcasEvento(db, id, [{ marcaId: await idAvance(), orden: 1, visible: true }]);
    await guardarPreguntas(db, id, [{ clave: 'logistica', texto: 'Logística', activa: false }]);
    await nuevaVersionHabeas(db, id, CLAUSULA, null);
    const copiaId = await duplicarEvento(db, id);
    const copia = (await obtenerEvento(db, copiaId))!;
    expect(copia).toMatchObject({ nombre: 'Capacitación PGN 2026 (copia)', estado: 'borrador', dominio_correo: 'procuraduria.gov.co' });
    expect(copia.marcas).toHaveLength(1);
    expect(copia.preguntas.find((p) => p.clave === 'logistica')!.activa).toBe(false);
    expect(copia.habeas).toEqual([expect.objectContaining({ version: 1, texto: CLAUSULA })]);
    const lista = await listarEventos(db);
    expect(lista.find((e) => e.id === copiaId)!.sesiones).toBe(0);
  });
});

describe('listarEventos', () => {
  it('incluye el número de sesiones', async () => {
    const ev = await crearEventoPrueba(db);
    expect((await listarEventos(db)).find((e) => e.id === ev.eventoId)!.sesiones).toBe(1);
  });
});
```

Run: `npm run test:int -- tests/integration/eventos.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implementar `src/lib/repo/eventos.ts`**

```ts
import type { Db } from './db';
import type { DatosEvento } from '@/lib/domain/schemas-admin';
import type { Pregunta } from '@/lib/domain/encuesta';
import { HABEAS_PENDIENTE, type EstadoEvento } from '@/lib/domain/constantes';
import { ErrorNegocio } from '@/lib/errores';
import { obtenerConfiguracion } from './configuracion';

export interface MarcaEvento {
  marcaId: string;
  orden: number;
  visible: boolean;
}

export interface VersionHabeas {
  id: string;
  version: number;
  texto: string;
  url_politica: string | null;
  created_at: string;
}

export interface EventoDetalle extends DatosEvento {
  id: string;
  estado: EstadoEvento;
  marcas: { marca_id: string; orden: number; visible: boolean }[];
  preguntas: Pregunta[];
  habeas: VersionHabeas[];
}

export interface EventoResumen {
  id: string;
  nombre: string;
  cliente: string | null;
  estado: EstadoEvento;
  sesiones: number;
}

export function puedeActivarse(textoHabeas: string): string | null {
  return textoHabeas.includes(HABEAS_PENDIENTE)
    ? 'No se puede activar: el texto de Habeas Data sigue siendo el provisional. Reemplácelo por la cláusula oficial.'
    : null;
}

export async function listarEventos(db: Db): Promise<EventoResumen[]> {
  const { data, error } = await db
    .from('eventos')
    .select('id, nombre, cliente, estado, sesiones(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as (Omit<EventoResumen, 'sesiones'> & { sesiones: { count: number }[] })[]).map((e) => ({
    id: e.id,
    nombre: e.nombre,
    cliente: e.cliente,
    estado: e.estado,
    sesiones: e.sesiones[0]?.count ?? 0,
  }));
}

export async function obtenerEvento(db: Db, id: string): Promise<EventoDetalle | null> {
  const { data: ev, error } = await db
    .from('eventos')
    .select('id, nombre, cliente, capacitadores, dominio_correo, color_primario, estado')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!ev) return null;
  const [m, p, h] = await Promise.all([
    db.from('evento_marcas').select('marca_id, orden, visible').eq('evento_id', id).order('orden'),
    db.from('evento_preguntas').select('clave, tipo, texto, orden, activa').eq('evento_id', id).order('orden'),
    db
      .from('evento_habeas_versiones')
      .select('id, version, texto, url_politica, created_at')
      .eq('evento_id', id)
      .order('version', { ascending: false }),
  ]);
  if (m.error) throw m.error;
  if (p.error) throw p.error;
  if (h.error) throw h.error;
  return {
    ...(ev as Omit<EventoDetalle, 'marcas' | 'preguntas' | 'habeas'>),
    marcas: m.data,
    preguntas: p.data as Pregunta[],
    habeas: h.data as VersionHabeas[],
  };
}

async function insertarHabeas(db: Db, eventoId: string, version: number, texto: string, url: string | null) {
  const { error } = await db
    .from('evento_habeas_versiones')
    .insert({ evento_id: eventoId, version, texto, url_politica: url });
  if (error) throw error;
}

export async function crearEvento(db: Db, datos: DatosEvento): Promise<string> {
  const { data: ev, error } = await db.from('eventos').insert(datos).select('id').single();
  if (error) throw error;
  const { data: plantilla, error: e1 } = await db.from('plantilla_preguntas').select('clave, tipo, texto, orden');
  if (e1) throw e1;
  const { error: e2 } = await db.from('evento_preguntas').insert(plantilla.map((p) => ({ ...p, evento_id: ev.id })));
  if (e2) throw e2;
  const config = await obtenerConfiguracion(db);
  await insertarHabeas(db, ev.id, 1, config.habeasTexto, config.habeasUrl || null);
  return ev.id;
}

export async function actualizarEvento(db: Db, id: string, datos: DatosEvento): Promise<void> {
  const { error } = await db.from('eventos').update(datos).eq('id', id);
  if (error) throw error;
}

export async function guardarMarcasEvento(db: Db, eventoId: string, items: MarcaEvento[]): Promise<void> {
  const { error } = await db.from('evento_marcas').delete().eq('evento_id', eventoId);
  if (error) throw error;
  if (!items.length) return;
  const { error: e2 } = await db
    .from('evento_marcas')
    .insert(items.map((i) => ({ evento_id: eventoId, marca_id: i.marcaId, orden: i.orden, visible: i.visible })));
  if (e2) throw e2;
}

export async function nuevaVersionHabeas(
  db: Db,
  eventoId: string,
  texto: string,
  urlPolitica: string | null,
): Promise<number> {
  const limpio = texto.trim();
  const { data: actual, error } = await db
    .from('evento_habeas_versiones')
    .select('version, texto, url_politica')
    .eq('evento_id', eventoId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (actual && actual.texto === limpio && (actual.url_politica ?? null) === urlPolitica) return actual.version;
  const version = (actual?.version ?? 0) + 1;
  await insertarHabeas(db, eventoId, version, limpio, urlPolitica);
  return version;
}

export async function guardarPreguntas(
  db: Db,
  eventoId: string,
  items: { clave: string; texto: string; activa: boolean }[],
): Promise<void> {
  if (items.some((i) => i.activa && i.texto.trim().length < 3)) {
    throw new ErrorNegocio('Cada pregunta activa necesita un texto');
  }
  for (const i of items) {
    const { error } = await db
      .from('evento_preguntas')
      .update({ texto: i.texto.trim(), activa: i.activa })
      .eq('evento_id', eventoId)
      .eq('clave', i.clave);
    if (error) throw error;
  }
}

export async function cambiarEstadoEvento(db: Db, eventoId: string, estado: EstadoEvento): Promise<void> {
  if (estado === 'activo') {
    const { data, error } = await db
      .from('evento_habeas_versiones')
      .select('texto')
      .eq('evento_id', eventoId)
      .order('version', { ascending: false })
      .limit(1)
      .single();
    if (error) throw error;
    const motivo = puedeActivarse(data.texto);
    if (motivo) throw new ErrorNegocio(motivo);
  }
  const { error } = await db.from('eventos').update({ estado }).eq('id', eventoId);
  if (error) throw error;
}

export async function duplicarEvento(db: Db, eventoId: string): Promise<string> {
  const ev = await obtenerEvento(db, eventoId);
  if (!ev) throw new ErrorNegocio('El evento no existe');
  const { data: nuevo, error } = await db
    .from('eventos')
    .insert({
      nombre: `${ev.nombre} (copia)`,
      cliente: ev.cliente,
      capacitadores: ev.capacitadores,
      dominio_correo: ev.dominio_correo,
      color_primario: ev.color_primario,
    })
    .select('id')
    .single();
  if (error) throw error;
  const { error: e1 } = await db.from('evento_preguntas').insert(
    ev.preguntas.map((p) => ({ evento_id: nuevo.id, clave: p.clave, tipo: p.tipo, texto: p.texto, orden: p.orden, activa: p.activa })),
  );
  if (e1) throw e1;
  await guardarMarcasEvento(
    db,
    nuevo.id,
    ev.marcas.map((m) => ({ marcaId: m.marca_id, orden: m.orden, visible: m.visible })),
  );
  const vigente = ev.habeas[0];
  await insertarHabeas(db, nuevo.id, 1, vigente.texto, vigente.url_politica);
  return nuevo.id;
}
```

Run: `npm test && npm run test:int -- tests/integration/eventos.test.ts`
Expected: PASS.

- [ ] **Step 5: Escribir la E2E de eventos (falla)**

`e2e/admin-eventos.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { limpiarDatos } from '../tests/integration/helpers';
import { iniciarSesionAdmin } from './utilidades';

test.beforeEach(async () => {
  await limpiarDatos();
});

test('crea, configura, activa y duplica un evento', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.getByRole('link', { name: 'Nuevo evento' }).click();
  await page.getByLabel('Nombre del evento').fill('Capacitación PGN 2026');
  await page.getByLabel('Cliente').fill('Procuraduría General de la Nación');
  await page.getByLabel('Dominio de correo esperado').fill('procuraduria.gov.co');
  await page.getByRole('button', { name: 'Crear evento' }).click();
  await expect(page.getByRole('heading', { name: 'Capacitación PGN 2026' })).toBeVisible();

  const co = page.getByTestId('seccion-cobranding');
  await co.getByLabel('Avance Jurídico', { exact: true }).check();
  await expect(co.getByTestId('encabezado-marcas')).toContainText('Avance Jurídico');
  await co.getByRole('button', { name: 'Guardar co-branding' }).click();
  await expect(co.getByText('Co-branding guardado')).toBeVisible();

  const estado = page.getByTestId('seccion-estado');
  await estado.getByRole('button', { name: 'Activar evento' }).click();
  await expect(estado.getByText(/el texto de Habeas Data sigue siendo el provisional/)).toBeVisible();

  const habeas = page.getByTestId('seccion-habeas');
  await habeas
    .getByLabel('Texto de la autorización')
    .fill('Autorizo a Avance Jurídico el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.');
  await habeas.getByRole('button', { name: 'Guardar nueva versión' }).click();
  await expect(habeas.getByText('Versión 2 vigente')).toBeVisible();

  await page.reload();
  await page.getByTestId('seccion-estado').getByRole('button', { name: 'Activar evento' }).click();
  await expect(page.getByTestId('seccion-estado').getByText('Estado actual: Activo')).toBeVisible();

  await page.getByRole('button', { name: 'Duplicar evento' }).click();
  await expect(page.getByRole('heading', { name: 'Capacitación PGN 2026 (copia)' })).toBeVisible();
});

test('edita las preguntas de la encuesta', async ({ page }) => {
  await iniciarSesionAdmin(page);
  await page.getByRole('link', { name: 'Nuevo evento' }).click();
  await page.getByLabel('Nombre del evento').fill('Evento encuesta');
  await page.getByRole('button', { name: 'Crear evento' }).click();
  const enc = page.getByTestId('seccion-encuesta');
  await enc.getByLabel('Activar pregunta logistica').uncheck();
  await enc.getByLabel('Texto de la pregunta contenido').fill('¿El contenido fue claro?');
  await enc.getByRole('button', { name: 'Guardar encuesta' }).click();
  await expect(enc.getByText('Encuesta guardada')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('seccion-encuesta').getByLabel('Activar pregunta logistica')).not.toBeChecked();
});
```

Run: `npm run e2e -- e2e/admin-eventos.spec.ts`
Expected: FAIL.

- [ ] **Step 6: Componentes compartidos del evento**

`src/components/admin/EncabezadoEvento.tsx`:

```tsx
import Link from 'next/link';
import { ETIQUETA_EVENTO, type EstadoEvento } from '@/lib/domain/constantes';

type Pestana = 'configuracion' | 'sesiones' | 'datos';

export function EncabezadoEvento({
  evento,
  actual,
}: {
  evento: { id: string; nombre: string; estado: EstadoEvento };
  actual: Pestana;
}) {
  const pestanas: [Pestana, string, string][] = [
    ['configuracion', 'Configuración', `/admin/eventos/${evento.id}`],
    ['sesiones', 'Sesiones', `/admin/eventos/${evento.id}/sesiones`],
    ['datos', 'Datos', `/admin/eventos/${evento.id}/datos`],
  ];
  return (
    <div>
      <Link href="/admin" className="text-sm text-slate-500 hover:underline">
        ← Eventos
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">{evento.nombre}</h1>
      <p className="text-sm text-slate-600">{ETIQUETA_EVENTO[evento.estado]}</p>
      <nav className="mt-4 flex gap-5 border-b border-slate-200 text-sm">
        {pestanas.map(([clave, texto, href]) => (
          <Link
            key={clave}
            href={href}
            aria-current={clave === actual ? 'page' : undefined}
            className={
              clave === actual ? 'border-b-2 border-slate-900 pb-2 font-semibold text-slate-900' : 'pb-2 text-slate-600'
            }
          >
            {texto}
          </Link>
        ))}
      </nav>
    </div>
  );
}
```

`src/components/admin/CamposEvento.tsx`:

```tsx
import type { DatosEvento } from '@/lib/domain/schemas-admin';
import { CampoAdmin } from './CampoAdmin';
import { claseInput } from './estilos';

export function CamposEvento({ evento }: { evento?: DatosEvento }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CampoAdmin etiqueta="Nombre del evento">
        <input name="nombre" required defaultValue={evento?.nombre ?? ''} className={claseInput} />
      </CampoAdmin>
      <CampoAdmin etiqueta="Cliente">
        <input name="cliente" defaultValue={evento?.cliente ?? ''} className={claseInput} />
      </CampoAdmin>
      <CampoAdmin etiqueta="Capacitador(es)">
        <input name="capacitadores" defaultValue={evento?.capacitadores ?? ''} className={claseInput} />
      </CampoAdmin>
      <CampoAdmin etiqueta="Dominio de correo esperado (opcional)">
        <input
          name="dominio_correo"
          defaultValue={evento?.dominio_correo ?? ''}
          placeholder="procuraduria.gov.co"
          className={claseInput}
        />
      </CampoAdmin>
      <CampoAdmin etiqueta="Color principal (opcional, #RRGGBB)">
        <input
          name="color_primario"
          defaultValue={evento?.color_primario ?? ''}
          placeholder="Si se deja vacío, se usa el de la primera marca"
          className={claseInput}
        />
      </CampoAdmin>
    </div>
  );
}
```

- [ ] **Step 7: Lista de eventos y creación**

`src/app/admin/(panel)/page.tsx` (reemplazar todo):

```tsx
import Link from 'next/link';
import { requerirAdmin } from '@/lib/auth/admin';
import { listarEventos } from '@/lib/repo/eventos';
import { ETIQUETA_EVENTO } from '@/lib/domain/constantes';
import { claseBoton, claseTarjeta } from '@/components/admin/estilos';

export default async function PaginaEventos() {
  const { db } = await requerirAdmin();
  const eventos = await listarEventos(db);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Eventos</h1>
        <Link href="/admin/eventos/nuevo" className={claseBoton.primario}>
          Nuevo evento
        </Link>
      </div>
      <section className={claseTarjeta}>
        {eventos.length === 0 ? (
          <p className="text-slate-600">Aún no hay eventos.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 pr-3">Nombre</th>
                <th className="pr-3">Cliente</th>
                <th className="pr-3">Sesiones</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3">
                    <Link href={`/admin/eventos/${e.id}`} className="font-medium text-slate-900 underline">
                      {e.nombre}
                    </Link>
                  </td>
                  <td className="pr-3">{e.cliente ?? '—'}</td>
                  <td className="pr-3">{e.sesiones}</td>
                  <td>{ETIQUETA_EVENTO[e.estado]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
```

`src/app/admin/(panel)/eventos/nuevo/actions.ts`:

```ts
'use server';
import { redirect } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { camposTexto, ejecutar } from '@/lib/acciones';
import { crearEvento } from '@/lib/repo/eventos';
import { CAMPOS_EVENTO, eventoSchema, validar } from '@/lib/domain/schemas-admin';

export async function crearEventoAccion(fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    const id = await crearEvento(db, validar(eventoSchema, camposTexto(fd, CAMPOS_EVENTO)));
    redirect(`/admin/eventos/${id}`);
  });
}
```

`src/app/admin/(panel)/eventos/nuevo/page.tsx`:

```tsx
import { requerirAdmin } from '@/lib/auth/admin';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { CamposEvento } from '@/components/admin/CamposEvento';
import { claseTarjeta } from '@/components/admin/estilos';
import { crearEventoAccion } from './actions';

export default async function PaginaNuevoEvento() {
  await requerirAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Nuevo evento</h1>
      <section className={claseTarjeta}>
        <FormularioAccion accion={crearEventoAccion} textoBoton="Crear evento">
          <CamposEvento />
        </FormularioAccion>
      </section>
    </div>
  );
}
```

- [ ] **Step 8: Página del evento, editor de co-branding y acciones**

`src/app/admin/(panel)/eventos/[id]/actions.ts`:

```ts
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { camposTexto, ejecutar } from '@/lib/acciones';
import {
  actualizarEvento,
  cambiarEstadoEvento,
  duplicarEvento,
  guardarMarcasEvento,
  guardarPreguntas,
  nuevaVersionHabeas,
} from '@/lib/repo/eventos';
import {
  CAMPOS_EVENTO,
  eventoSchema,
  habeasSchema,
  marcasEventoSchema,
  validar,
} from '@/lib/domain/schemas-admin';
import type { EstadoEvento } from '@/lib/domain/constantes';
import { ErrorNegocio } from '@/lib/errores';

function refrescar(id: string) {
  revalidatePath(`/admin/eventos/${id}`);
  revalidatePath('/admin');
}

export async function guardarDatosAccion(id: string, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    await actualizarEvento(db, id, validar(eventoSchema, camposTexto(fd, CAMPOS_EVENTO)));
    refrescar(id);
    return 'Datos guardados';
  });
}

export async function guardarCoBrandingAccion(id: string, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    let crudo: unknown;
    try {
      crudo = JSON.parse(String(fd.get('marcas_json') ?? '[]'));
    } catch {
      throw new ErrorNegocio('Datos de co-branding no válidos');
    }
    await guardarMarcasEvento(db, id, validar(marcasEventoSchema, crudo));
    refrescar(id);
    return 'Co-branding guardado';
  });
}

export async function guardarHabeasAccion(id: string, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    const d = validar(habeasSchema, camposTexto(fd, ['texto', 'url_politica']));
    const version = await nuevaVersionHabeas(db, id, d.texto, d.url_politica);
    refrescar(id);
    return `Versión ${version} vigente`;
  });
}

export async function guardarPreguntasAccion(id: string, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    const items = [...fd.keys()]
      .filter((k) => k.startsWith('texto_'))
      .map((k) => {
        const clave = k.slice('texto_'.length);
        return { clave, texto: String(fd.get(k) ?? ''), activa: fd.get(`activa_${clave}`) === 'on' };
      });
    await guardarPreguntas(db, id, items);
    refrescar(id);
    return 'Encuesta guardada';
  });
}

export async function cambiarEstadoAccion(id: string, estado: EstadoEvento) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    await cambiarEstadoEvento(db, id, estado);
    refrescar(id);
    return 'Estado actualizado';
  });
}

export async function duplicarAccion(id: string) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    const nuevo = await duplicarEvento(db, id);
    revalidatePath('/admin');
    redirect(`/admin/eventos/${nuevo}`);
  });
}
```

`src/app/admin/(panel)/eventos/[id]/EditorCoBranding.tsx`:

```tsx
'use client';
import { useState } from 'react';
import type { ResultadoAccion } from '@/lib/envio';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { EncabezadoMarcas } from '@/components/publico/EncabezadoMarcas';

interface Opcion {
  id: string;
  nombre: string;
  logoUrl: string | null;
}

export function EditorCoBranding({
  accion,
  opciones,
  iniciales,
}: {
  accion: (fd: FormData) => Promise<ResultadoAccion>;
  opciones: Opcion[];
  iniciales: { marcaId: string; orden: number; visible: boolean }[];
}) {
  const [items, setItems] = useState(() =>
    opciones
      .map((o) => {
        const i = iniciales.find((x) => x.marcaId === o.id);
        return { marcaId: o.id, visible: i?.visible ?? false, orden: i?.orden ?? 999 };
      })
      .sort((a, b) => a.orden - b.orden),
  );
  const opcion = (id: string) => opciones.find((o) => o.id === id)!;

  function mover(idx: number, delta: number) {
    setItems((prev) => {
      const j = idx + delta;
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[idx], copia[j]] = [copia[j], copia[idx]];
      return copia;
    });
  }
  function alternar(idx: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, visible: !it.visible } : it)));
  }

  const vista = items.filter((i) => i.visible).map((i) => ({ nombre: opcion(i.marcaId).nombre, logoUrl: opcion(i.marcaId).logoUrl }));
  const json = JSON.stringify(items.map((it, i) => ({ marcaId: it.marcaId, orden: i + 1, visible: it.visible })));

  return (
    <FormularioAccion accion={accion} textoBoton="Guardar co-branding">
      <input type="hidden" name="marcas_json" value={json} />
      <ul className="divide-y divide-slate-100">
        {items.map((it, idx) => (
          <li key={it.marcaId} className="flex items-center gap-3 py-2 text-sm">
            <label className="flex flex-1 items-center gap-2">
              <input type="checkbox" checked={it.visible} onChange={() => alternar(idx)} />
              {opcion(it.marcaId).nombre}
            </label>
            <button type="button" onClick={() => mover(idx, -1)} aria-label={`Subir ${opcion(it.marcaId).nombre}`} className="px-2">
              ↑
            </button>
            <button type="button" onClick={() => mover(idx, 1)} aria-label={`Bajar ${opcion(it.marcaId).nombre}`} className="px-2">
              ↓
            </button>
          </li>
        ))}
      </ul>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Vista previa del encabezado</p>
        {vista.length ? <EncabezadoMarcas marcas={vista} /> : <p className="text-sm text-slate-500">Sin logos visibles</p>}
      </div>
    </FormularioAccion>
  );
}
```

`src/app/admin/(panel)/eventos/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerEvento } from '@/lib/repo/eventos';
import { listarMarcas } from '@/lib/repo/marcas';
import { urlLogo } from '@/lib/storage';
import { HABEAS_PENDIENTE, ETIQUETA_EVENTO } from '@/lib/domain/constantes';
import { ETIQUETA_TIPO_PREGUNTA } from '@/lib/domain/encuesta';
import { formatearFechaHora } from '@/lib/domain/fechas';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { CampoAdmin } from '@/components/admin/CampoAdmin';
import { CamposEvento } from '@/components/admin/CamposEvento';
import { EncabezadoEvento } from '@/components/admin/EncabezadoEvento';
import { claseInput, claseTarjeta } from '@/components/admin/estilos';
import { EditorCoBranding } from './EditorCoBranding';
import {
  cambiarEstadoAccion,
  duplicarAccion,
  guardarCoBrandingAccion,
  guardarDatosAccion,
  guardarHabeasAccion,
  guardarPreguntasAccion,
} from './actions';

export default async function PaginaEvento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requerirAdmin();
  const [evento, marcas] = await Promise.all([obtenerEvento(db, id), listarMarcas(db)]);
  if (!evento) notFound();
  const vigente = evento.habeas[0];

  return (
    <div className="space-y-6">
      <EncabezadoEvento evento={evento} actual="configuracion" />

      <section className={claseTarjeta} data-testid="seccion-estado">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Estado</h2>
        <p className="mb-3 text-sm text-slate-700">
          Estado actual: <strong>{ETIQUETA_EVENTO[evento.estado]}</strong>. Solo los eventos activos aceptan registros.
        </p>
        {vigente.texto.includes(HABEAS_PENDIENTE) && (
          <p className="mb-3 text-sm text-amber-800">
            Falta la cláusula oficial de Habeas Data: el evento no se puede activar todavía.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {evento.estado !== 'activo' && (
            <FormularioAccion accion={cambiarEstadoAccion.bind(null, id, 'activo')} textoBoton="Activar evento" className="" />
          )}
          {evento.estado !== 'borrador' && (
            <FormularioAccion
              accion={cambiarEstadoAccion.bind(null, id, 'borrador')}
              textoBoton="Volver a borrador"
              variante="secundario"
              className=""
            />
          )}
          {evento.estado !== 'archivado' && (
            <FormularioAccion
              accion={cambiarEstadoAccion.bind(null, id, 'archivado')}
              textoBoton="Archivar"
              variante="secundario"
              confirmar="¿Archivar este evento? Sus QR dejarán de aceptar registros."
              className=""
            />
          )}
          <FormularioAccion accion={duplicarAccion.bind(null, id)} textoBoton="Duplicar evento" variante="secundario" className="" />
        </div>
      </section>

      <section className={claseTarjeta} data-testid="seccion-datos">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Datos generales</h2>
        <FormularioAccion accion={guardarDatosAccion.bind(null, id)} textoBoton="Guardar datos">
          <CamposEvento evento={evento} />
        </FormularioAccion>
      </section>

      <section className={claseTarjeta} data-testid="seccion-cobranding">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Co-branding</h2>
        <EditorCoBranding
          accion={guardarCoBrandingAccion.bind(null, id)}
          opciones={marcas
            .filter((m) => m.activa)
            .map((m) => ({ id: m.id, nombre: m.nombre, logoUrl: m.logo_path ? urlLogo(m.logo_path) : null }))}
          iniciales={evento.marcas.map((m) => ({ marcaId: m.marca_id, orden: m.orden, visible: m.visible }))}
        />
      </section>

      <section className={claseTarjeta} data-testid="seccion-habeas">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Autorización de tratamiento de datos (Habeas Data)</h2>
        <p className="mb-3 text-sm text-slate-600">
          Versión vigente: {vigente.version}. Cada cambio crea una versión nueva; los registros conservan la versión que aceptaron.
        </p>
        <FormularioAccion accion={guardarHabeasAccion.bind(null, id)} textoBoton="Guardar nueva versión">
          <CampoAdmin etiqueta="Texto de la autorización">
            <textarea name="texto" rows={8} defaultValue={vigente.texto} className={claseInput} />
          </CampoAdmin>
          <CampoAdmin etiqueta="Enlace a la política (opcional)">
            <input name="url_politica" type="url" defaultValue={vigente.url_politica ?? ''} className={claseInput} />
          </CampoAdmin>
        </FormularioAccion>
        {evento.habeas.length > 1 && (
          <details className="mt-3 text-sm text-slate-600">
            <summary>Historial ({evento.habeas.length} versiones)</summary>
            <ol className="mt-2 list-inside list-disc">
              {evento.habeas.map((h) => (
                <li key={h.id}>
                  Versión {h.version} · {formatearFechaHora(h.created_at)}
                </li>
              ))}
            </ol>
          </details>
        )}
      </section>

      <section className={claseTarjeta} data-testid="seccion-encuesta">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Encuesta de salida</h2>
        <FormularioAccion accion={guardarPreguntasAccion.bind(null, id)} textoBoton="Guardar encuesta">
          {evento.preguntas.map((p) => (
            <div key={p.clave} className="flex items-center gap-3">
              <input
                type="checkbox"
                name={`activa_${p.clave}`}
                defaultChecked={p.activa}
                aria-label={`Activar pregunta ${p.clave}`}
              />
              <input
                name={`texto_${p.clave}`}
                defaultValue={p.texto}
                aria-label={`Texto de la pregunta ${p.clave}`}
                className={`${claseInput} mt-0`}
              />
              <span className="w-44 shrink-0 text-xs text-slate-500">{ETIQUETA_TIPO_PREGUNTA[p.tipo]}</span>
            </div>
          ))}
        </FormularioAccion>
      </section>
    </div>
  );
}
```

- [ ] **Step 9: Correr las pruebas**

Run: `npm run e2e -- e2e/admin-eventos.spec.ts`
Expected: PASS (2 pruebas).

Run: `npm test && npm run test:int`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: gestión de eventos con co-branding, Habeas Data versionado, encuesta y duplicado"
```

---

### Task 9: Sesiones (creación masiva, edición, apertura, tokens y conteos)

**Files:**
- Modify: `src/lib/domain/schemas-admin.ts` (agregar `sesionSchema`, `CAMPOS_SESION`, `type DatosSesion`)
- Create: `src/lib/repo/sesiones.ts`
- Create: `src/app/admin/(panel)/eventos/[id]/sesiones/page.tsx`, `actions.ts`
- Create: `src/app/admin/(panel)/eventos/[id]/sesiones/[sesionId]/page.tsx`
- Test: `tests/unit/admin.test.ts` (agregar), `tests/integration/sesiones.test.ts`, `e2e/admin-sesiones.spec.ts`

**Interfaces:**
- Consumes: `FilaSesion`, `parsearSesionesMasivas`, `desdeInputLocal`, `aInputLocal`, `formatearFechaHora`, `estadoSesion`, `EstadoSesion`, `generarToken`, `ETIQUETA_ESTADO_SESION` (Tarea 1); `obtenerSesionPorToken` (Tarea 3); `obtenerEvento` y `EncabezadoEvento` (Tarea 8); los helpers del panel (Tarea 6).
- Produces:
  - `sesionSchema`, `type DatosSesion`, `CAMPOS_SESION`
  - `interface SesionDetalle { id; evento_id; numero; titulo; lugar; inicio: Date; fin: Date; modo_apertura; estado_manual; abre_min_antes; cierra_min_despues; token_entrada; token_salida; estado: EstadoSesion }`
  - `interface SesionConConteo extends SesionDetalle { conteo: { entradas: number; salidas: number; sinEntrada: number } }`
  - `crearSesiones(db, eventoId, filas: FilaSesion[]): Promise<number>`, `actualizarSesion(db, id, d: DatosSesion)`, `cambiarEstadoManual(db, id, 'abierta' | 'cerrada')`, `usarModoAutomatico(db, id)`, `regenerarTokens(db, id)`, `obtenerSesion(db, id, ahora?): Promise<SesionDetalle | null>`, `listarSesiones(db, eventoId, ahora?): Promise<SesionConConteo[]>`

- [ ] **Step 1: Pruebas unitarias del esquema de sesión (fallan)**

Agregar a `tests/unit/admin.test.ts` (y `sesionSchema` a la importación de `schemas-admin`):

```ts
import { sesionSchema } from '@/lib/domain/schemas-admin';

describe('sesionSchema', () => {
  const base = {
    numero: '3',
    titulo: '',
    lugar: 'Auditorio',
    inicio: '2026-10-14T08:00',
    fin: '2026-10-14T12:00',
    modo_apertura: 'automatico',
    abre_min_antes: '30',
    cierra_min_despues: '120',
  };
  it('interpreta las horas en Bogotá', () => {
    const d = validar(sesionSchema, base);
    expect(d.numero).toBe(3);
    expect(d.titulo).toBeNull();
    expect(d.inicio.toISOString()).toBe('2026-10-14T13:00:00.000Z');
  });
  it('rechaza fin anterior al inicio', () => {
    expect(() => validar(sesionSchema, { ...base, fin: '2026-10-14T07:00' })).toThrow(
      'La hora de fin debe ser posterior a la de inicio',
    );
  });
});
```

Run: `npm test`
Expected: FAIL.

- [ ] **Step 2: Esquema de sesión**

Agregar al inicio de `src/lib/domain/schemas-admin.ts`:

```ts
import { desdeInputLocal } from './fechas';
```

Agregar al final:

```ts
const fechaLocal = (etiqueta: string) =>
  z.string().transform((v, ctx) => {
    const d = desdeInputLocal(v);
    if (!d) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${etiqueta} no válida` });
      return z.NEVER;
    }
    return d;
  });

const minutos = z.coerce
  .number({ invalid_type_error: 'Minutos no válidos' })
  .int('Minutos no válidos')
  .min(0, 'Minutos no válidos')
  .max(1440, 'Minutos no válidos');

export const sesionSchema = z
  .object({
    numero: z.coerce.number({ invalid_type_error: 'Número no válido' }).int('Número no válido').min(1, 'Número no válido'),
    titulo: opcional(200),
    lugar: opcional(200),
    inicio: fechaLocal('Fecha de inicio'),
    fin: fechaLocal('Fecha de fin'),
    modo_apertura: z.enum(['manual', 'automatico'], { errorMap: () => ({ message: 'Modo de apertura no válido' }) }),
    abre_min_antes: minutos,
    cierra_min_despues: minutos,
  })
  .refine((d) => d.fin > d.inicio, { message: 'La hora de fin debe ser posterior a la de inicio', path: ['fin'] });
export type DatosSesion = z.infer<typeof sesionSchema>;
export const CAMPOS_SESION = [
  'numero', 'titulo', 'lugar', 'inicio', 'fin', 'modo_apertura', 'abre_min_antes', 'cierra_min_despues',
];
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Pruebas de integración de sesiones (fallan)**

`tests/integration/sesiones.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  actualizarSesion,
  cambiarEstadoManual,
  crearSesiones,
  listarSesiones,
  obtenerSesion,
  regenerarTokens,
  usarModoAutomatico,
} from '@/lib/repo/sesiones';
import { obtenerSesionPorToken } from '@/lib/repo/publico';
import { registrarEntrada, registrarSalida } from '@/lib/repo/registro';
import { parsearSesionesMasivas } from '@/lib/domain/sesiones-masivas';
import { ErrorNegocio } from '@/lib/errores';
import { clienteServicioPrueba, crearEventoPrueba, datosPersona, limpiarDatos } from './helpers';

const db = clienteServicioPrueba();
const sinMeta = { ip: null, userAgent: null };
beforeEach(limpiarDatos);

describe('crearSesiones', () => {
  it('crea las 12 sesiones con tokens únicos', async () => {
    const ev = await crearEventoPrueba(db); // ya trae la sesión 1
    const texto = Array.from({ length: 11 }, (_, i) => `${i + 2};2026-10-${String(i + 10).padStart(2, '0')};08:00;12:00`).join('\n');
    const { filas, errores } = parsearSesionesMasivas(texto);
    expect(errores).toEqual([]);
    expect(await crearSesiones(db, ev.eventoId, filas)).toBe(11);
    const sesiones = await listarSesiones(db, ev.eventoId);
    expect(sesiones.map((s) => s.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const tokens = sesiones.flatMap((s) => [s.token_entrada, s.token_salida]);
    expect(new Set(tokens).size).toBe(24);
    tokens.forEach((t) => expect(t).toMatch(/^[A-Za-z0-9_-]{22}$/));
  });

  it('rechaza números que ya existen', async () => {
    const ev = await crearEventoPrueba(db);
    const { filas } = parsearSesionesMasivas('1;2026-10-14;08:00;12:00');
    await expect(crearSesiones(db, ev.eventoId, filas)).rejects.toBeInstanceOf(ErrorNegocio);
  });
});

describe('estado y conteos', () => {
  it('cuenta entradas, salidas y salidas sin entrada', async () => {
    const ev = await crearEventoPrueba(db);
    const s = { id: ev.sesionId, habeasId: ev.habeasId };
    await registrarEntrada(db, s, datosPersona('111111'), sinMeta);
    await registrarEntrada(db, s, datosPersona('222222'), sinMeta);
    await registrarSalida(db, s, { documento: { tipo_documento: 'CC', numero_documento: '111111' }, personales: null, respuestas: {}, comentario: null }, sinMeta);
    await registrarSalida(db, s, { documento: { tipo_documento: 'CC', numero_documento: '333333' }, personales: datosPersona('333333'), respuestas: {}, comentario: null }, sinMeta);
    const [sesion] = await listarSesiones(db, ev.eventoId);
    expect(sesion.conteo).toEqual({ entradas: 2, salidas: 2, sinEntrada: 1 });
  });

  it('abrir, cerrar y volver al modo automático cambia lo que ve el público', async () => {
    const ev = await crearEventoPrueba(db, { estadoManual: 'cerrada' });
    await cambiarEstadoManual(db, ev.sesionId, 'abierta');
    expect((await obtenerSesionPorToken(db, ev.tokenEntrada, 'entrada')).tipo).toBe('abierta');
    await cambiarEstadoManual(db, ev.sesionId, 'cerrada');
    expect((await obtenerSesionPorToken(db, ev.tokenEntrada, 'entrada')).tipo).toBe('no_disponible');
    await usarModoAutomatico(db, ev.sesionId); // la sesión de prueba está en curso: queda abierta
    const s = (await obtenerSesion(db, ev.sesionId))!;
    expect(s).toMatchObject({ modo_apertura: 'automatico', estado_manual: null, estado: 'abierta' });
  });

  it('regenerar tokens invalida los QR anteriores', async () => {
    const ev = await crearEventoPrueba(db);
    await regenerarTokens(db, ev.sesionId);
    expect((await obtenerSesionPorToken(db, ev.tokenEntrada, 'entrada')).tipo).toBe('no_encontrada');
    const s = (await obtenerSesion(db, ev.sesionId))!;
    expect((await obtenerSesionPorToken(db, s.token_entrada, 'entrada')).tipo).toBe('abierta');
  });

  it('actualiza los datos de la sesión', async () => {
    const ev = await crearEventoPrueba(db);
    await actualizarSesion(db, ev.sesionId, {
      numero: 5,
      titulo: 'Nuevo título',
      lugar: null,
      inicio: new Date('2026-10-14T13:00:00Z'),
      fin: new Date('2026-10-14T17:00:00Z'),
      modo_apertura: 'automatico',
      abre_min_antes: 15,
      cierra_min_despues: 60,
    });
    expect((await obtenerSesion(db, ev.sesionId))!).toMatchObject({ numero: 5, titulo: 'Nuevo título', abre_min_antes: 15, estado_manual: null });
  });
});
```

Run: `npm run test:int -- tests/integration/sesiones.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implementar `src/lib/repo/sesiones.ts`**

```ts
import type { Db } from './db';
import type { DatosSesion } from '@/lib/domain/schemas-admin';
import type { FilaSesion } from '@/lib/domain/sesiones-masivas';
import { estadoSesion, type EstadoSesion } from '@/lib/domain/sesion-estado';
import { generarToken } from '@/lib/domain/tokens';
import { ErrorNegocio } from '@/lib/errores';

interface FilaSesionDb {
  id: string;
  evento_id: string;
  numero: number;
  titulo: string | null;
  lugar: string | null;
  inicio: string;
  fin: string;
  modo_apertura: 'manual' | 'automatico';
  estado_manual: 'abierta' | 'cerrada' | null;
  abre_min_antes: number;
  cierra_min_despues: number;
  token_entrada: string;
  token_salida: string;
}

export interface SesionDetalle extends Omit<FilaSesionDb, 'inicio' | 'fin'> {
  inicio: Date;
  fin: Date;
  estado: EstadoSesion;
}

export interface SesionConConteo extends SesionDetalle {
  conteo: { entradas: number; salidas: number; sinEntrada: number };
}

const COLUMNAS =
  'id, evento_id, numero, titulo, lugar, inicio, fin, modo_apertura, estado_manual, abre_min_antes, cierra_min_despues, token_entrada, token_salida';

function aSesion(r: FilaSesionDb, ahora: Date): SesionDetalle {
  const inicio = new Date(r.inicio);
  const fin = new Date(r.fin);
  return { ...r, inicio, fin, estado: estadoSesion({ ...r, inicio, fin }, ahora) };
}

function errorNumeroRepetido(error: { code?: string }): never | void {
  if (error.code === '23505') throw new ErrorNegocio('Ya existe una sesión con ese número en este evento');
}

export async function crearSesiones(db: Db, eventoId: string, filas: FilaSesion[]): Promise<number> {
  if (!filas.length) throw new ErrorNegocio('No hay sesiones para crear');
  const { error } = await db.from('sesiones').insert(
    filas.map((f) => ({
      evento_id: eventoId,
      numero: f.numero,
      titulo: f.titulo,
      lugar: f.lugar,
      inicio: f.inicio.toISOString(),
      fin: f.fin.toISOString(),
      token_entrada: generarToken(),
      token_salida: generarToken(),
    })),
  );
  if (error) {
    errorNumeroRepetido(error);
    throw error;
  }
  return filas.length;
}

export async function actualizarSesion(db: Db, id: string, d: DatosSesion): Promise<void> {
  const { error } = await db
    .from('sesiones')
    .update({
      numero: d.numero,
      titulo: d.titulo,
      lugar: d.lugar,
      inicio: d.inicio.toISOString(),
      fin: d.fin.toISOString(),
      modo_apertura: d.modo_apertura,
      ...(d.modo_apertura === 'automatico' ? { estado_manual: null } : {}),
      abre_min_antes: d.abre_min_antes,
      cierra_min_despues: d.cierra_min_despues,
    })
    .eq('id', id);
  if (error) {
    errorNumeroRepetido(error);
    throw error;
  }
}

export async function cambiarEstadoManual(db: Db, id: string, estado: 'abierta' | 'cerrada'): Promise<void> {
  const { error } = await db.from('sesiones').update({ modo_apertura: 'manual', estado_manual: estado }).eq('id', id);
  if (error) throw error;
}

export async function usarModoAutomatico(db: Db, id: string): Promise<void> {
  const { error } = await db.from('sesiones').update({ modo_apertura: 'automatico', estado_manual: null }).eq('id', id);
  if (error) throw error;
}

export async function regenerarTokens(db: Db, id: string): Promise<void> {
  const { error } = await db
    .from('sesiones')
    .update({ token_entrada: generarToken(), token_salida: generarToken() })
    .eq('id', id);
  if (error) throw error;
}

export async function obtenerSesion(db: Db, id: string, ahora: Date = new Date()): Promise<SesionDetalle | null> {
  const { data, error } = await db.from('sesiones').select(COLUMNAS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? aSesion(data as FilaSesionDb, ahora) : null;
}

type Conteo = { count: number }[];

export async function listarSesiones(db: Db, eventoId: string, ahora: Date = new Date()): Promise<SesionConConteo[]> {
  const { data, error } = await db
    .from('sesiones')
    .select(`${COLUMNAS}, entradas(count), salidas(count), sin:salidas(count)`)
    .eq('evento_id', eventoId)
    .eq('sin.sin_entrada', true)
    .order('numero');
  if (error) throw error;
  return (data as unknown as (FilaSesionDb & { entradas: Conteo; salidas: Conteo; sin: Conteo })[]).map((r) => {
    const { entradas, salidas, sin, ...fila } = r;
    return {
      ...aSesion(fila, ahora),
      conteo: { entradas: entradas[0]?.count ?? 0, salidas: salidas[0]?.count ?? 0, sinEntrada: sin[0]?.count ?? 0 },
    };
  });
}
```

Run: `npm run test:int -- tests/integration/sesiones.test.ts`
Expected: PASS (6 pruebas). Si PostgREST rechaza el filtro `sin.sin_entrada`, verifica que el alias y el nombre de la relación coincidan exactamente (`sin:salidas(count)` y `.eq('sin.sin_entrada', true)`).

- [ ] **Step 5: Escribir la E2E de sesiones (falla)**

`e2e/admin-sesiones.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { clienteServicioPrueba, crearEventoPrueba, limpiarDatos } from '../tests/integration/helpers';
import { iniciarSesionAdmin } from './utilidades';

test.beforeEach(async () => {
  await limpiarDatos();
});

test('crea sesiones pegando filas y las abre y cierra', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/sesiones`);
  await page
    .getByLabel('Filas de sesiones')
    .fill('2;2099-10-21;08:00;12:00;Régimen disciplinario;Auditorio\n3\t28/10/2099\t08:00\t12:00\tSesión tres');
  await page.getByRole('button', { name: 'Crear sesiones' }).click();
  await expect(page.getByText('2 sesiones creadas')).toBeVisible();

  const fila = page.getByRole('row', { name: /Régimen disciplinario/ });
  await expect(fila).toContainText('Programada');
  await fila.getByRole('button', { name: 'Abrir', exact: true }).click();
  await expect(fila).toContainText('Abierta (manual)');
  await fila.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(fila).toContainText('Cerrada (manual)');
  await fila.getByRole('button', { name: 'Automático', exact: true }).click();
  await expect(fila).toContainText('Programada');
});

test('rechaza filas con errores sin crear nada', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/sesiones`);
  await page.getByLabel('Filas de sesiones').fill('5;2026-02-31;08:00;12:00');
  await page.getByRole('button', { name: 'Crear sesiones' }).click();
  await expect(page.getByText('Línea 1: fecha u hora no válida')).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(2); // encabezado + sesión 1
});

test('edita una sesión', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/sesiones`);
  await page.getByRole('row', { name: /Sesión de prueba/ }).getByRole('link', { name: 'Editar' }).click();
  await page.getByLabel('Título').fill('Sesión inaugural');
  await page.getByRole('button', { name: 'Guardar sesión' }).click();
  await expect(page.getByText('Sesión guardada')).toBeVisible();
});
```

Run: `npm run e2e -- e2e/admin-sesiones.spec.ts`
Expected: FAIL.

- [ ] **Step 6: Acciones y páginas de sesiones**

`src/app/admin/(panel)/eventos/[id]/sesiones/actions.ts`:

```ts
'use server';
import { revalidatePath } from 'next/cache';
import { requerirAdmin } from '@/lib/auth/admin';
import { camposTexto, ejecutar } from '@/lib/acciones';
import {
  actualizarSesion,
  cambiarEstadoManual,
  crearSesiones,
  regenerarTokens,
  usarModoAutomatico,
} from '@/lib/repo/sesiones';
import { parsearSesionesMasivas } from '@/lib/domain/sesiones-masivas';
import { CAMPOS_SESION, sesionSchema, validar } from '@/lib/domain/schemas-admin';
import { ErrorNegocio } from '@/lib/errores';

const ruta = (eventoId: string) => `/admin/eventos/${eventoId}/sesiones`;

export async function crearSesionesAccion(eventoId: string, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    const { filas, errores } = parsearSesionesMasivas(String(fd.get('filas') ?? ''));
    if (errores.length) throw new ErrorNegocio(errores.join(' · '));
    const n = await crearSesiones(db, eventoId, filas);
    revalidatePath(ruta(eventoId));
    return n === 1 ? '1 sesión creada' : `${n} sesiones creadas`;
  });
}

export async function abrirSesionAccion(eventoId: string, sesionId: string) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    await cambiarEstadoManual(db, sesionId, 'abierta');
    revalidatePath(ruta(eventoId));
    return 'Sesión abierta';
  });
}

export async function cerrarSesionAccion(eventoId: string, sesionId: string) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    await cambiarEstadoManual(db, sesionId, 'cerrada');
    revalidatePath(ruta(eventoId));
    return 'Sesión cerrada';
  });
}

export async function automaticoSesionAccion(eventoId: string, sesionId: string) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    await usarModoAutomatico(db, sesionId);
    revalidatePath(ruta(eventoId));
    return 'Apertura automática';
  });
}

export async function regenerarTokensAccion(eventoId: string, sesionId: string) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    await regenerarTokens(db, sesionId);
    revalidatePath(ruta(eventoId));
    return 'QR regenerados: vuelva a imprimirlos';
  });
}

export async function actualizarSesionAccion(eventoId: string, sesionId: string, fd: FormData) {
  return ejecutar(async () => {
    const { db } = await requerirAdmin();
    await actualizarSesion(db, sesionId, validar(sesionSchema, camposTexto(fd, CAMPOS_SESION)));
    revalidatePath(ruta(eventoId));
    revalidatePath(`${ruta(eventoId)}/${sesionId}`);
    return 'Sesión guardada';
  });
}
```

`src/app/admin/(panel)/eventos/[id]/sesiones/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerEvento } from '@/lib/repo/eventos';
import { listarSesiones } from '@/lib/repo/sesiones';
import { ETIQUETA_ESTADO_SESION } from '@/lib/domain/constantes';
import { formatearFechaHora } from '@/lib/domain/fechas';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { CampoAdmin } from '@/components/admin/CampoAdmin';
import { EncabezadoEvento } from '@/components/admin/EncabezadoEvento';
import { claseBoton, claseInput, claseTarjeta } from '@/components/admin/estilos';
import {
  abrirSesionAccion,
  automaticoSesionAccion,
  cerrarSesionAccion,
  crearSesionesAccion,
  regenerarTokensAccion,
} from './actions';

export default async function PaginaSesiones({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requerirAdmin();
  const evento = await obtenerEvento(db, id);
  if (!evento) notFound();
  const sesiones = await listarSesiones(db, id);

  return (
    <div className="space-y-6">
      <EncabezadoEvento evento={evento} actual="sesiones" />
      {evento.estado !== 'activo' && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          El evento no está activo: los QR mostrarán “Enlace no válido” hasta que lo active.
        </p>
      )}

      <section className={claseTarjeta}>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Sesiones</h2>
        {sesiones.length === 0 ? (
          <p className="text-slate-600">Aún no hay sesiones.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-3">Nº</th>
                  <th className="pr-3">Fecha</th>
                  <th className="pr-3">Título</th>
                  <th className="pr-3">Estado</th>
                  <th className="pr-3">Entradas</th>
                  <th className="pr-3">Salidas</th>
                  <th className="pr-3">Sin entrada</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sesiones.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-3 font-semibold">{s.numero}</td>
                    <td className="py-2 pr-3">{formatearFechaHora(s.inicio)}</td>
                    <td className="py-2 pr-3">{s.titulo ?? '—'}</td>
                    <td className="py-2 pr-3">
                      {ETIQUETA_ESTADO_SESION[s.estado]}
                      {s.modo_apertura === 'manual' ? ' (manual)' : ''}
                    </td>
                    <td className="py-2 pr-3">{s.conteo.entradas}</td>
                    <td className="py-2 pr-3">{s.conteo.salidas}</td>
                    <td className="py-2 pr-3">{s.conteo.sinEntrada}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <FormularioAccion accion={abrirSesionAccion.bind(null, id, s.id)} textoBoton="Abrir" variante="secundario" className="" />
                        <FormularioAccion accion={cerrarSesionAccion.bind(null, id, s.id)} textoBoton="Cerrar" variante="secundario" className="" />
                        {s.modo_apertura === 'manual' && (
                          <FormularioAccion
                            accion={automaticoSesionAccion.bind(null, id, s.id)}
                            textoBoton="Automático"
                            variante="secundario"
                            className=""
                          />
                        )}
                        <Link href={`/admin/eventos/${id}/sesiones/${s.id}`} className={claseBoton.secundario}>
                          Editar
                        </Link>
                        <FormularioAccion
                          accion={regenerarTokensAccion.bind(null, id, s.id)}
                          textoBoton="Regenerar QR"
                          variante="peligro"
                          confirmar="Los QR ya impresos de esta sesión dejarán de funcionar. ¿Continuar?"
                          className=""
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={claseTarjeta}>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Crear sesiones</h2>
        <p className="mb-3 text-sm text-slate-600">
          Una sesión por línea: número; fecha; hora de inicio; hora de fin; título (opcional); lugar (opcional). Puede
          pegar filas copiadas de Excel. Las horas son de Bogotá.
        </p>
        <FormularioAccion accion={crearSesionesAccion.bind(null, id)} textoBoton="Crear sesiones">
          <CampoAdmin etiqueta="Filas de sesiones">
            <textarea
              name="filas"
              rows={6}
              placeholder={'1; 2026-10-14; 08:00; 12:00; Régimen disciplinario; Auditorio principal\n2; 21/10/2026; 08:00; 12:00'}
              className={`${claseInput} font-mono`}
            />
          </CampoAdmin>
        </FormularioAccion>
      </section>
    </div>
  );
}
```

`src/app/admin/(panel)/eventos/[id]/sesiones/[sesionId]/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerEvento } from '@/lib/repo/eventos';
import { obtenerSesion } from '@/lib/repo/sesiones';
import { aInputLocal } from '@/lib/domain/fechas';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { CampoAdmin } from '@/components/admin/CampoAdmin';
import { EncabezadoEvento } from '@/components/admin/EncabezadoEvento';
import { claseInput, claseTarjeta } from '@/components/admin/estilos';
import { actualizarSesionAccion } from '../actions';

export default async function PaginaEditarSesion({
  params,
}: {
  params: Promise<{ id: string; sesionId: string }>;
}) {
  const { id, sesionId } = await params;
  const { db } = await requerirAdmin();
  const [evento, s] = await Promise.all([obtenerEvento(db, id), obtenerSesion(db, sesionId)]);
  if (!evento || !s || s.evento_id !== id) notFound();

  return (
    <div className="space-y-6">
      <EncabezadoEvento evento={evento} actual="sesiones" />
      <section className={claseTarjeta}>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Editar sesión {s.numero}</h2>
        <FormularioAccion accion={actualizarSesionAccion.bind(null, id, sesionId)} textoBoton="Guardar sesión">
          <div className="grid gap-3 sm:grid-cols-2">
            <CampoAdmin etiqueta="Número">
              <input name="numero" type="number" min={1} defaultValue={s.numero} className={claseInput} />
            </CampoAdmin>
            <CampoAdmin etiqueta="Título">
              <input name="titulo" defaultValue={s.titulo ?? ''} className={claseInput} />
            </CampoAdmin>
            <CampoAdmin etiqueta="Lugar">
              <input name="lugar" defaultValue={s.lugar ?? ''} className={claseInput} />
            </CampoAdmin>
            <CampoAdmin etiqueta="Apertura">
              <select name="modo_apertura" defaultValue={s.modo_apertura} className={claseInput}>
                <option value="automatico">Automática por horario</option>
                <option value="manual">Manual</option>
              </select>
            </CampoAdmin>
            <CampoAdmin etiqueta="Inicio (hora de Bogotá)">
              <input name="inicio" type="datetime-local" defaultValue={aInputLocal(s.inicio)} className={claseInput} />
            </CampoAdmin>
            <CampoAdmin etiqueta="Fin (hora de Bogotá)">
              <input name="fin" type="datetime-local" defaultValue={aInputLocal(s.fin)} className={claseInput} />
            </CampoAdmin>
            <CampoAdmin etiqueta="Abrir minutos antes del inicio">
              <input name="abre_min_antes" type="number" min={0} defaultValue={s.abre_min_antes} className={claseInput} />
            </CampoAdmin>
            <CampoAdmin etiqueta="Cerrar minutos después del fin">
              <input name="cierra_min_despues" type="number" min={0} defaultValue={s.cierra_min_despues} className={claseInput} />
            </CampoAdmin>
          </div>
        </FormularioAccion>
        <Link href={`/admin/eventos/${id}/sesiones`} className="mt-4 inline-block text-sm text-slate-600 underline">
          ← Volver a sesiones
        </Link>
      </section>
    </div>
  );
}
```

- [ ] **Step 7: Correr las pruebas**

Run: `npm run e2e -- e2e/admin-sesiones.spec.ts`
Expected: PASS (3 pruebas).

Run: `npm test && npm run test:int`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: gestión de sesiones con creación masiva, apertura manual/automática y regeneración de QR"
```

---

### Task 10: Códigos QR y hoja imprimible

**Files:**
- Create: `src/lib/qr.ts`
- Create: `src/app/api/admin/sesiones/[id]/qr/[tipo]/route.ts`
- Create: `src/app/admin/imprimir/[sesionId]/page.tsx`, `src/app/admin/imprimir/[sesionId]/BotonImprimir.tsx`
- Modify: `src/app/admin/(panel)/eventos/[id]/sesiones/page.tsx` (enlaces de QR e impresión)
- Test: `tests/unit/qr.test.ts`, `e2e/admin-sesiones.spec.ts` (agregar)

**Interfaces:**
- Consumes: `obtenerSesion` (Tarea 9), `obtenerEvento` (Tarea 8), `cargarContextoEvento` (Tarea 3), `EncabezadoMarcas` (Tarea 4), `requerirAdmin` (Tarea 6), `formatearFechaHora` (Tarea 1).
- Produces:
  - `urlPublica(base: string, tipo: 'entrada' | 'salida', token: string): string`
  - `baseUrl(): string` (lee `NEXT_PUBLIC_BASE_URL`)
  - `qrPng(url): Promise<Buffer>`, `qrSvg(url): Promise<string>`
  - `GET /api/admin/sesiones/{id}/qr/{entrada|salida}` → PNG descargable `sesion-{n}-{tipo}.png`
  - Página `/admin/imprimir/{sesionId}`

- [ ] **Step 1: Prueba unitaria (falla)**

`tests/unit/qr.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { qrPng, qrSvg, urlPublica } from '@/lib/qr';

describe('urlPublica', () => {
  it('arma rutas /r y /s sin dobles barras', () => {
    expect(urlPublica('https://x.co/', 'entrada', 'T')).toBe('https://x.co/r/T');
    expect(urlPublica('https://x.co', 'salida', 'T')).toBe('https://x.co/s/T');
  });
});

describe('qrPng', () => {
  it('codifica exactamente la URL', async () => {
    const url = 'https://capacitaciones.avancejuridico.com.co/r/AbCdEfGhIjKlMnOpQrStUv';
    const png = PNG.sync.read(await qrPng(url));
    const leido = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(leido?.data).toBe(url);
  });
});

describe('qrSvg', () => {
  it('devuelve un SVG', async () => {
    expect(await qrSvg('https://x.co/r/T')).toContain('<svg');
  });
});
```

Run: `npm test`
Expected: FAIL.

- [ ] **Step 2: Implementar `src/lib/qr.ts`**

```ts
import QRCode from 'qrcode';

export function urlPublica(base: string, tipo: 'entrada' | 'salida', token: string): string {
  return `${base.replace(/\/+$/, '')}/${tipo === 'entrada' ? 'r' : 's'}/${token}`;
}

export function baseUrl(): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (!base) throw new Error('Falta NEXT_PUBLIC_BASE_URL');
  return base;
}

export function qrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { type: 'png', width: 800, margin: 2, errorCorrectionLevel: 'M' });
}

export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
}
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Agregar la E2E de QR (falla)**

Agregar al final de `e2e/admin-sesiones.spec.ts`:

```ts
test('descarga el QR y muestra la hoja imprimible', async ({ page }) => {
  const ev = await crearEventoPrueba(clienteServicioPrueba());
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/sesiones`);
  const fila = page.getByRole('row', { name: /Sesión de prueba/ });
  const descarga = page.waitForEvent('download');
  await fila.getByRole('link', { name: 'QR entrada' }).click();
  expect((await descarga).suggestedFilename()).toBe('sesion-1-entrada.png');
  await fila.getByRole('link', { name: 'Hoja imprimible' }).click();
  await expect(page.getByText('ENTRADA', { exact: true })).toBeVisible();
  await expect(page.getByText('SALIDA', { exact: true })).toBeVisible();
  await expect(page.getByText(`/r/${ev.tokenEntrada}`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Imprimir / Guardar como PDF' })).toBeVisible();
});
```

Run: `npm run e2e -- e2e/admin-sesiones.spec.ts`
Expected: FAIL en la prueba nueva.

- [ ] **Step 4: Ruta del PNG, hoja imprimible y enlaces**

`src/app/api/admin/sesiones/[id]/qr/[tipo]/route.ts`:

```ts
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerSesion } from '@/lib/repo/sesiones';
import { baseUrl, qrPng, urlPublica } from '@/lib/qr';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; tipo: string }> }) {
  const { id, tipo } = await params;
  if (tipo !== 'entrada' && tipo !== 'salida') return new Response('Tipo no válido', { status: 400 });
  const { db } = await requerirAdmin();
  const s = await obtenerSesion(db, id);
  if (!s) return new Response('Sesión no encontrada', { status: 404 });
  const png = await qrPng(urlPublica(baseUrl(), tipo, tipo === 'entrada' ? s.token_entrada : s.token_salida));
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="sesion-${s.numero}-${tipo}.png"`,
      'Cache-Control': 'no-store',
    },
  });
}
```

`src/app/admin/imprimir/[sesionId]/BotonImprimir.tsx`:

```tsx
'use client';

export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
    >
      Imprimir / Guardar como PDF
    </button>
  );
}
```

`src/app/admin/imprimir/[sesionId]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerSesion } from '@/lib/repo/sesiones';
import { obtenerEvento } from '@/lib/repo/eventos';
import { cargarContextoEvento } from '@/lib/repo/publico';
import { formatearFechaHora } from '@/lib/domain/fechas';
import { baseUrl, qrSvg, urlPublica } from '@/lib/qr';
import { EncabezadoMarcas } from '@/components/publico/EncabezadoMarcas';
import { BotonImprimir } from './BotonImprimir';

function BloqueQr({ titulo, ayuda, svg, url }: { titulo: string; ayuda: string; svg: string; url: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-extrabold tracking-wide text-slate-900">{titulo}</p>
      <div className="mx-auto mt-3 w-full max-w-[3in]" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-2 text-base text-slate-800">{ayuda}</p>
      <p className="mt-1 break-all text-xs text-slate-500">{url}</p>
    </div>
  );
}

export default async function HojaImprimible({ params }: { params: Promise<{ sesionId: string }> }) {
  const { sesionId } = await params;
  const { db } = await requerirAdmin();
  const s = await obtenerSesion(db, sesionId);
  if (!s) notFound();
  const [evento, ctx] = await Promise.all([obtenerEvento(db, s.evento_id), cargarContextoEvento(db, s.evento_id)]);
  if (!evento) notFound();
  const base = baseUrl();
  const urlEntrada = urlPublica(base, 'entrada', s.token_entrada);
  const urlSalida = urlPublica(base, 'salida', s.token_salida);
  const [svgEntrada, svgSalida] = await Promise.all([qrSvg(urlEntrada), qrSvg(urlSalida)]);

  return (
    <main className="mx-auto max-w-[8.5in] bg-white p-8 print:p-0">
      <style>{'@page { size: letter; margin: 1.5cm; }'}</style>
      <div className="mb-6 flex justify-end print:hidden">
        <BotonImprimir />
      </div>
      <EncabezadoMarcas marcas={ctx.marcas} />
      <h1 className="mt-6 text-center text-2xl font-bold text-slate-900">{evento.nombre}</h1>
      <p className="text-center text-lg text-slate-800">
        Sesión {s.numero}
        {s.titulo ? ` · ${s.titulo}` : ''}
      </p>
      <p className="text-center text-slate-600">
        {formatearFechaHora(s.inicio)}
        {s.lugar ? ` · ${s.lugar}` : ''}
      </p>
      <div className="mt-10 grid grid-cols-2 gap-10">
        <BloqueQr titulo="ENTRADA" ayuda="Escanee al llegar" svg={svgEntrada} url={urlEntrada} />
        <BloqueQr titulo="SALIDA" ayuda="Escanee al finalizar para evaluar la sesión" svg={svgSalida} url={urlSalida} />
      </div>
    </main>
  );
}
```

En `src/app/admin/(panel)/eventos/[id]/sesiones/page.tsx`, dentro de la celda de acciones, inmediatamente después del `<Link>` de "Editar", agregar:

```tsx
                        <a href={`/api/admin/sesiones/${s.id}/qr/entrada`} className={claseBoton.secundario}>
                          QR entrada
                        </a>
                        <a href={`/api/admin/sesiones/${s.id}/qr/salida`} className={claseBoton.secundario}>
                          QR salida
                        </a>
                        <Link href={`/admin/imprimir/${s.id}`} className={claseBoton.secundario}>
                          Hoja imprimible
                        </Link>
```

- [ ] **Step 5: Correr las pruebas**

Run: `npm run e2e -- e2e/admin-sesiones.spec.ts`
Expected: PASS (4 pruebas).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: descarga de QR en PNG y hoja imprimible por sesión"
```

---

### Task 11: Datos consolidados, resumen de encuesta y exportación a Excel

**Files:**
- Create: `src/lib/domain/resumen.ts`, `src/lib/domain/texto.ts`, `src/lib/repo/consolidado.ts`, `src/lib/export/excel.ts`
- Create: `src/app/api/admin/exportar/route.ts`, `src/app/admin/(panel)/eventos/[id]/datos/page.tsx`
- Test: `tests/unit/resumen.test.ts`, `tests/unit/excel.test.ts`, `tests/integration/consolidado.test.ts`, `e2e/admin-datos.spec.ts`

**Interfaces:**
- Consumes: `Pregunta`, `promedio`, `calcularNps`, `formatearFechaHora` (Tarea 1); `obtenerEvento` (Tarea 8); `listarSesiones` y `SesionDetalle` (Tarea 9); `registrarEntrada` y `registrarSalida` (Tareas 4 y 5); helpers del panel (Tarea 6).
- Produces:
  - `type EstadoAsistencia = 'completa' | 'solo_entrada' | 'sin_entrada'`, `ETIQUETA_ESTADO_ASISTENCIA`
  - `interface FilaParaResumen`, `interface Resumen { entradas; salidas; completas; soloEntrada; sinEntrada; promedios: Record<string, number | null>; nps: number | null; comentarios: string[] }`, `resumir(preguntas, filas): Resumen`
  - `slug(texto): string`
  - `interface FilaConsolidada`, `sanitizarBusqueda(q): string`, `listarConsolidado(db, filtro): Promise<FilaConsolidada[]>` (pagina de 1000 en 1000)
  - `construirLibro(d: DatosLibro): Promise<Buffer>`
  - `GET /api/admin/exportar?evento={id}[&sesion={id}]` → `.xlsx`

- [ ] **Step 1: Pruebas unitarias (fallan)**

`tests/unit/resumen.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resumir } from '@/lib/domain/resumen';
import { slug } from '@/lib/domain/texto';
import { sanitizarBusqueda } from '@/lib/repo/consolidado';
import type { Pregunta } from '@/lib/domain/encuesta';

const preguntas: Pregunta[] = [
  { clave: 'contenido', tipo: 'escala_1_5', texto: 'C', orden: 1, activa: true },
  { clave: 'expositor', tipo: 'escala_1_5', texto: 'E', orden: 2, activa: true },
  { clave: 'nps', tipo: 'nps_0_10', texto: 'N', orden: 3, activa: true },
  { clave: 'comentario', tipo: 'texto', texto: 'T', orden: 4, activa: true },
];
const t = '2026-10-14T13:00:00Z';

describe('resumir', () => {
  it('cuenta estados y calcula promedios, NPS y comentarios', () => {
    const r = resumir(preguntas, [
      { estado_asistencia: 'completa', entrada_at: t, salida_at: t, respuestas: { contenido: 5, expositor: 4, nps: 10 }, comentario: 'Bien' },
      { estado_asistencia: 'completa', entrada_at: t, salida_at: t, respuestas: { contenido: 4, expositor: 4, nps: 6 }, comentario: ' ' },
      { estado_asistencia: 'solo_entrada', entrada_at: t, salida_at: null, respuestas: null, comentario: null },
      { estado_asistencia: 'sin_entrada', entrada_at: null, salida_at: t, respuestas: { contenido: 3, expositor: 5, nps: 9 }, comentario: null },
    ]);
    expect(r).toEqual({
      entradas: 3,
      salidas: 3,
      completas: 2,
      soloEntrada: 1,
      sinEntrada: 1,
      promedios: { contenido: 4, expositor: 4.33 },
      nps: 33,
      comentarios: ['Bien'],
    });
  });
  it('sin datos devuelve ceros y nulos', () => {
    expect(resumir(preguntas, [])).toMatchObject({ entradas: 0, promedios: { contenido: null, expositor: null }, nps: null });
  });
});

describe('slug', () => {
  it('quita tildes y espacios', () => {
    expect(slug('Capacitación PGN 2026 (copia)')).toBe('capacitacion-pgn-2026-copia');
  });
});

describe('sanitizarBusqueda', () => {
  it('elimina caracteres con significado en los filtros de PostgREST', () => {
    expect(sanitizarBusqueda(' Pérez,(x)*%.  ')).toBe('Pérez x');
  });
});
```

`tests/unit/excel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { construirLibro } from '@/lib/export/excel';
import type { FilaConsolidada } from '@/lib/repo/consolidado';
import type { Pregunta } from '@/lib/domain/encuesta';

const preguntas: Pregunta[] = [
  { clave: 'contenido', tipo: 'escala_1_5', texto: 'Contenido', orden: 1, activa: true },
  { clave: 'nps', tipo: 'nps_0_10', texto: 'Recomendación', orden: 2, activa: true },
  { clave: 'comentario', tipo: 'texto', texto: 'Comentarios', orden: 3, activa: true },
];

function fila(p: Partial<FilaConsolidada>): FilaConsolidada {
  return {
    evento_id: 'e', evento_nombre: 'Evento', sesion_id: 's1', sesion_numero: 1, sesion_inicio: '2026-10-14T13:00:00Z',
    asistente_id: 'a', tipo_documento: 'CC', numero_documento: '1020345678', nombres: 'Ana', apellidos: 'Pérez',
    correo: 'a@x.co', dependencia: 'Delegada', cargo: 'Profesional', entrada_at: '2026-10-14T12:50:00Z',
    salida_at: '2026-10-14T17:05:00Z', estado_asistencia: 'completa', respuestas: { contenido: 5, nps: 10 },
    comentario: 'Bien', promedio_escala: 5, nps: 10, ...p,
  };
}

describe('construirLibro', () => {
  it('crea la hoja Resumen y una hoja por sesión, y guarda el texto sin interpretarlo como fórmula', async () => {
    const buf = await construirLibro({
      eventoNombre: 'Capacitación PGN 2026',
      preguntas,
      sesiones: [
        { numero: 1, inicio: new Date('2026-10-14T13:00:00Z'), titulo: null },
        { numero: 2, inicio: new Date('2026-10-21T13:00:00Z'), titulo: 'Segunda' },
      ],
      filas: [fila({ nombres: '=HYPERLINK("http://x")' })],
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Resumen', 'Sesión 1', 'Sesión 2']);
    const h1 = wb.getWorksheet('Sesión 1')!;
    expect(h1.getRow(1).getCell(1).value).toBe('Tipo doc.');
    expect(h1.getRow(2).getCell(3).value).toBe('=HYPERLINK("http://x")');
    expect(h1.getRow(2).getCell(10).value).toBe('Completa');
    expect(h1.getRow(2).getCell(11).value).toBe(5);
    expect(h1.getRow(2).getCell(12).value).toBe(10);
    expect(h1.getRow(2).getCell(13).value).toBe('Bien');
    const res = wb.getWorksheet('Resumen')!;
    expect(res.getRow(1).getCell(1).value).toBe('Capacitación PGN 2026');
    expect(res.getRow(4).getCell(1).value).toBe('Sesión 1');
    expect(res.getRow(4).getCell(3).value).toBe(1);
    expect(res.getRow(5).getCell(3).value).toBe(0);
    expect(res.getRow(6).getCell(1).value).toBe('Total');
  });
});
```

Run: `npm test`
Expected: FAIL.

- [ ] **Step 2: Implementar dominio, consolidado y Excel**

`src/lib/domain/resumen.ts`:

```ts
import { calcularNps, promedio, type Pregunta } from './encuesta';

export type EstadoAsistencia = 'completa' | 'solo_entrada' | 'sin_entrada';

export const ETIQUETA_ESTADO_ASISTENCIA: Record<EstadoAsistencia, string> = {
  completa: 'Completa',
  solo_entrada: 'Solo entrada',
  sin_entrada: 'Sin entrada',
};

export interface FilaParaResumen {
  estado_asistencia: EstadoAsistencia;
  entrada_at: string | null;
  salida_at: string | null;
  respuestas: Record<string, number> | null;
  comentario: string | null;
}

export interface Resumen {
  entradas: number;
  salidas: number;
  completas: number;
  soloEntrada: number;
  sinEntrada: number;
  promedios: Record<string, number | null>;
  nps: number | null;
  comentarios: string[];
}

export function resumir(preguntas: Pregunta[], filas: FilaParaResumen[]): Resumen {
  const conSalida = filas.filter((f) => f.salida_at);
  const valores = (clave: string) =>
    conSalida.map((f) => f.respuestas?.[clave]).filter((v): v is number => typeof v === 'number');
  const promedios: Record<string, number | null> = {};
  for (const p of preguntas.filter((x) => x.tipo === 'escala_1_5')) promedios[p.clave] = promedio(valores(p.clave));
  const preguntaNps = preguntas.find((p) => p.tipo === 'nps_0_10');
  return {
    entradas: filas.filter((f) => f.entrada_at).length,
    salidas: conSalida.length,
    completas: filas.filter((f) => f.estado_asistencia === 'completa').length,
    soloEntrada: filas.filter((f) => f.estado_asistencia === 'solo_entrada').length,
    sinEntrada: filas.filter((f) => f.estado_asistencia === 'sin_entrada').length,
    promedios,
    nps: preguntaNps ? calcularNps(valores(preguntaNps.clave)) : null,
    comentarios: conSalida.map((f) => f.comentario?.trim()).filter((c): c is string => !!c),
  };
}
```

`src/lib/domain/texto.ts`:

```ts
export function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

`src/lib/repo/consolidado.ts`:

```ts
import type { Db } from './db';
import type { EstadoAsistencia } from '@/lib/domain/resumen';

export interface FilaConsolidada {
  evento_id: string;
  evento_nombre: string;
  sesion_id: string;
  sesion_numero: number;
  sesion_inicio: string;
  asistente_id: string;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  dependencia: string;
  cargo: string;
  entrada_at: string | null;
  salida_at: string | null;
  estado_asistencia: EstadoAsistencia;
  respuestas: Record<string, number> | null;
  comentario: string | null;
  promedio_escala: number | null;
  nps: number | null;
}

export interface FiltroConsolidado {
  eventoId: string;
  sesionId?: string | null;
  estado?: EstadoAsistencia | null;
  busqueda?: string | null;
}

export function sanitizarBusqueda(q: string): string {
  return q
    .replace(/[%,()*\\:."']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

const PAGINA = 1000; // máximo de filas por respuesta de PostgREST en Supabase

export async function listarConsolidado(db: Db, f: FiltroConsolidado): Promise<FilaConsolidada[]> {
  const busqueda = f.busqueda ? sanitizarBusqueda(f.busqueda) : '';
  const construir = () => {
    let q = db.from('asistencia_consolidada').select('*').eq('evento_id', f.eventoId);
    if (f.sesionId) q = q.eq('sesion_id', f.sesionId);
    if (f.estado) q = q.eq('estado_asistencia', f.estado);
    if (busqueda) {
      q = q.or(`nombres.ilike.*${busqueda}*,apellidos.ilike.*${busqueda}*,numero_documento.ilike.*${busqueda}*`);
    }
    return q.order('sesion_numero').order('apellidos').order('asistente_id');
  };
  const filas: FilaConsolidada[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await construir().range(desde, desde + PAGINA - 1);
    if (error) throw error;
    filas.push(
      ...(data as FilaConsolidada[]).map((r) => ({
        ...r,
        promedio_escala: r.promedio_escala === null ? null : Number(r.promedio_escala),
      })),
    );
    if (data.length < PAGINA) break;
  }
  return filas;
}
```

`src/lib/export/excel.ts`:

```ts
import ExcelJS from 'exceljs';
import type { Pregunta } from '@/lib/domain/encuesta';
import { ETIQUETA_ESTADO_ASISTENCIA, resumir } from '@/lib/domain/resumen';
import { formatearFechaHora } from '@/lib/domain/fechas';
import type { FilaConsolidada } from '@/lib/repo/consolidado';

export interface DatosLibro {
  eventoNombre: string;
  preguntas: Pregunta[];
  sesiones: { numero: number; inicio: Date; titulo: string | null }[];
  filas: FilaConsolidada[];
}

export async function construirLibro(d: DatosLibro): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Avance Jurídico';
  const escala = d.preguntas.filter((p) => p.tipo === 'escala_1_5');
  const preguntaNps = d.preguntas.find((p) => p.tipo === 'nps_0_10');

  const hojaResumen = wb.addWorksheet('Resumen');
  hojaResumen.addRow([d.eventoNombre]).font = { bold: true, size: 14 };
  hojaResumen.addRow([]);
  hojaResumen.addRow([
    'Sesión', 'Fecha', 'Entradas', 'Salidas', 'Completas', 'Solo entrada', 'Sin entrada',
    ...escala.map((p) => p.texto), 'NPS',
  ]).font = { bold: true };
  const agregarResumen = (etiqueta: string, fecha: string, filas: FilaConsolidada[]) => {
    const r = resumir(d.preguntas, filas);
    hojaResumen.addRow([
      etiqueta, fecha, r.entradas, r.salidas, r.completas, r.soloEntrada, r.sinEntrada,
      ...escala.map((p) => r.promedios[p.clave]), r.nps,
    ]);
  };
  for (const s of d.sesiones) {
    agregarResumen(`Sesión ${s.numero}`, formatearFechaHora(s.inicio), d.filas.filter((f) => f.sesion_numero === s.numero));
  }
  agregarResumen('Total', '', d.filas);
  hojaResumen.columns.forEach((c) => (c.width = 16));

  for (const s of d.sesiones) {
    const hoja = wb.addWorksheet(`Sesión ${s.numero}`);
    hoja.addRow([
      'Tipo doc.', 'Documento', 'Nombres', 'Apellidos', 'Correo', 'Dependencia', 'Cargo', 'Entrada', 'Salida', 'Estado',
      ...escala.map((p) => p.texto), ...(preguntaNps ? [preguntaNps.texto] : []), 'Comentario',
    ]).font = { bold: true };
    for (const f of d.filas.filter((x) => x.sesion_numero === s.numero)) {
      hoja.addRow([
        f.tipo_documento, f.numero_documento, f.nombres, f.apellidos, f.correo, f.dependencia, f.cargo,
        f.entrada_at ? formatearFechaHora(f.entrada_at) : '',
        f.salida_at ? formatearFechaHora(f.salida_at) : '',
        ETIQUETA_ESTADO_ASISTENCIA[f.estado_asistencia],
        ...escala.map((p) => f.respuestas?.[p.clave] ?? ''),
        ...(preguntaNps ? [f.respuestas?.[preguntaNps.clave] ?? ''] : []),
        f.comentario ?? '',
      ]);
    }
    hoja.columns.forEach((c) => (c.width = 18));
  }
  return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Prueba de integración del consolidado (incluye más de 1000 filas)**

`tests/integration/consolidado.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { listarConsolidado } from '@/lib/repo/consolidado';
import { registrarEntrada, registrarSalida } from '@/lib/repo/registro';
import { clienteServicioPrueba, crearEventoPrueba, datosPersona, limpiarDatos } from './helpers';

const db = clienteServicioPrueba();
const sinMeta = { ip: null, userAgent: null };
beforeEach(limpiarDatos);

describe('listarConsolidado', () => {
  it('filtra por estado y por búsqueda', async () => {
    const ev = await crearEventoPrueba(db);
    const s = { id: ev.sesionId, habeasId: ev.habeasId };
    await registrarEntrada(db, s, datosPersona('111111'), sinMeta);
    await registrarEntrada(db, s, { ...datosPersona('222222'), apellidos: 'Rojas' }, sinMeta);
    await registrarSalida(db, s, { documento: { tipo_documento: 'CC', numero_documento: '111111' }, personales: null, respuestas: { contenido: 5 }, comentario: null }, sinMeta);
    expect((await listarConsolidado(db, { eventoId: ev.eventoId, estado: 'completa' })).map((f) => f.numero_documento)).toEqual(['111111']);
    expect((await listarConsolidado(db, { eventoId: ev.eventoId, busqueda: 'rojas' })).map((f) => f.numero_documento)).toEqual(['222222']);
    expect(await listarConsolidado(db, { eventoId: ev.eventoId, busqueda: '222' })).toHaveLength(1);
  });

  it('devuelve todas las filas aunque sean más de 1000', async () => {
    const ev = await crearEventoPrueba(db);
    const personas = Array.from({ length: 1005 }, (_, i) => ({ ...datosPersona(`D${String(i).padStart(6, '0')}`) }));
    const { data: asistentes, error } = await db.from('asistentes').insert(personas).select('id');
    if (error) throw error;
    const ahora = new Date().toISOString();
    const { error: e2 } = await db.from('entradas').insert(
      asistentes.map((a) => ({
        sesion_id: ev.sesionId, asistente_id: a.id, nombres: 'Ana', apellidos: 'Pérez', correo: 'a@x.co',
        dependencia: 'D', cargo: 'C', habeas_version_id: ev.habeasId, consentimiento_at: ahora,
      })),
    );
    if (e2) throw e2;
    expect(await listarConsolidado(db, { eventoId: ev.eventoId })).toHaveLength(1005);
  });
});
```

Run: `npm run test:int -- tests/integration/consolidado.test.ts`
Expected: PASS.

- [ ] **Step 4: Escribir la E2E de datos (falla)**

`e2e/admin-datos.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { registrarEntrada, registrarSalida } from '@/lib/repo/registro';
import { clienteServicioPrueba, crearEventoPrueba, datosPersona, limpiarDatos } from '../tests/integration/helpers';
import { iniciarSesionAdmin } from './utilidades';

test.beforeEach(async () => {
  await limpiarDatos();
});

test('muestra el consolidado, el resumen y exporta a Excel', async ({ page }) => {
  const db = clienteServicioPrueba();
  const ev = await crearEventoPrueba(db);
  const s = { id: ev.sesionId, habeasId: ev.habeasId };
  const sinMeta = { ip: null, userAgent: null };
  await registrarEntrada(db, s, datosPersona('1020345678'), sinMeta);
  await registrarSalida(
    db,
    s,
    {
      documento: { tipo_documento: 'CC', numero_documento: '1020345678' },
      personales: null,
      respuestas: { contenido: 5, expositor: 5, metodologia: 4, utilidad: 4, logistica: 5, nps: 10 },
      comentario: 'Excelente',
    },
    sinMeta,
  );
  await iniciarSesionAdmin(page);
  await page.goto(`/admin/eventos/${ev.eventoId}/datos`);
  await expect(page.getByRole('row', { name: /Pérez Gómez/ })).toContainText('Completa');
  await expect(page.getByTestId('resumen-sesion-1')).toContainText('100');
  await expect(page.getByText('Excelente')).toBeAttached();

  await page.getByLabel('Estado').selectOption('solo_entrada');
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page.getByText('No hay registros con estos filtros.')).toBeVisible();

  const descarga = page.waitForEvent('download');
  await page.getByRole('link', { name: /Descargar Excel/ }).click();
  expect((await descarga).suggestedFilename()).toBe('evento-de-prueba.xlsx');
});
```

Run: `npm run e2e -- e2e/admin-datos.spec.ts`
Expected: FAIL.

- [ ] **Step 5: Ruta de exportación y página de datos**

`src/app/api/admin/exportar/route.ts`:

```ts
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerEvento } from '@/lib/repo/eventos';
import { listarSesiones } from '@/lib/repo/sesiones';
import { listarConsolidado } from '@/lib/repo/consolidado';
import { construirLibro } from '@/lib/export/excel';
import { slug } from '@/lib/domain/texto';

export async function GET(req: Request) {
  const { db } = await requerirAdmin();
  const u = new URL(req.url);
  const eventoId = u.searchParams.get('evento');
  const sesionId = u.searchParams.get('sesion');
  if (!eventoId) return new Response('Falta el evento', { status: 400 });
  const evento = await obtenerEvento(db, eventoId);
  if (!evento) return new Response('Evento no encontrado', { status: 404 });
  const todas = await listarSesiones(db, eventoId);
  const sesiones = sesionId ? todas.filter((s) => s.id === sesionId) : todas;
  if (sesionId && !sesiones.length) return new Response('Sesión no encontrada', { status: 404 });
  const filas = await listarConsolidado(db, { eventoId, sesionId });
  const libro = await construirLibro({ eventoNombre: evento.nombre, preguntas: evento.preguntas, sesiones, filas });
  const nombre = `${slug(evento.nombre)}${sesionId ? `-sesion-${sesiones[0].numero}` : ''}.xlsx`;
  return new Response(new Uint8Array(libro), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'no-store',
    },
  });
}
```

`src/app/admin/(panel)/eventos/[id]/datos/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerEvento } from '@/lib/repo/eventos';
import { listarSesiones } from '@/lib/repo/sesiones';
import { listarConsolidado } from '@/lib/repo/consolidado';
import { ETIQUETA_ESTADO_ASISTENCIA, resumir, type EstadoAsistencia } from '@/lib/domain/resumen';
import { formatearFechaHora } from '@/lib/domain/fechas';
import { EncabezadoEvento } from '@/components/admin/EncabezadoEvento';
import { CampoAdmin } from '@/components/admin/CampoAdmin';
import { claseBoton, claseInput, claseTarjeta } from '@/components/admin/estilos';

const ESTADOS = Object.keys(ETIQUETA_ESTADO_ASISTENCIA) as EstadoAsistencia[];
const MAX_FILAS_EN_PANTALLA = 500;

export default async function PaginaDatos({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sesion?: string; estado?: string; q?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { db } = await requerirAdmin();
  const evento = await obtenerEvento(db, id);
  if (!evento) notFound();
  const sesiones = await listarSesiones(db, id);
  const sesionId = sesiones.find((s) => s.id === sp.sesion)?.id ?? null;
  const estado = ESTADOS.find((e) => e === sp.estado) ?? null;
  const busqueda = sp.q?.trim() || null;

  const todas = await listarConsolidado(db, { eventoId: id });
  const filas = sesionId || estado || busqueda
    ? await listarConsolidado(db, { eventoId: id, sesionId, estado, busqueda })
    : todas;
  const escala = evento.preguntas.filter((p) => p.tipo === 'escala_1_5');
  const exportar = new URLSearchParams({ evento: id, ...(sesionId ? { sesion: sesionId } : {}) });

  return (
    <div className="space-y-6">
      <EncabezadoEvento evento={evento} actual="datos" />

      <section className={claseTarjeta}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Resumen por sesión</h2>
          <a href={`/api/admin/exportar?${exportar}`} className={claseBoton.primario}>
            Descargar Excel {sesionId ? '(sesión filtrada)' : '(evento completo)'}
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 pr-3">Sesión</th>
                <th className="pr-3">Entradas</th>
                <th className="pr-3">Salidas</th>
                <th className="pr-3">Completas</th>
                <th className="pr-3">Solo entrada</th>
                <th className="pr-3">Sin entrada</th>
                {escala.map((p) => (
                  <th key={p.clave} className="pr-3" title={p.texto}>
                    {p.clave}
                  </th>
                ))}
                <th>NPS</th>
              </tr>
            </thead>
            <tbody>
              {sesiones.map((s) => {
                const r = resumir(evento.preguntas, todas.filter((f) => f.sesion_id === s.id));
                return (
                  <tr key={s.id} className="border-b border-slate-100 align-top" data-testid={`resumen-sesion-${s.numero}`}>
                    <td className="py-2 pr-3">
                      <span className="font-semibold">Sesión {s.numero}</span>
                      <br />
                      <span className="text-xs text-slate-500">{formatearFechaHora(s.inicio)}</span>
                      {r.comentarios.length > 0 && (
                        <details className="mt-1 text-xs text-slate-600">
                          <summary>{r.comentarios.length} comentarios</summary>
                          <ul className="mt-1 list-inside list-disc">
                            {r.comentarios.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                    <td className="py-2 pr-3">{r.entradas}</td>
                    <td className="py-2 pr-3">{r.salidas}</td>
                    <td className="py-2 pr-3">{r.completas}</td>
                    <td className="py-2 pr-3">{r.soloEntrada}</td>
                    <td className="py-2 pr-3">{r.sinEntrada}</td>
                    {escala.map((p) => (
                      <td key={p.clave} className="py-2 pr-3">
                        {r.promedios[p.clave] ?? '—'}
                      </td>
                    ))}
                    <td className="py-2">{r.nps ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={claseTarjeta}>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Registros</h2>
        <form className="mb-4 flex flex-wrap items-end gap-3">
          <CampoAdmin etiqueta="Sesión">
            <select name="sesion" defaultValue={sesionId ?? ''} className={claseInput}>
              <option value="">Todas</option>
              {sesiones.map((s) => (
                <option key={s.id} value={s.id}>
                  Sesión {s.numero}
                </option>
              ))}
            </select>
          </CampoAdmin>
          <CampoAdmin etiqueta="Estado">
            <select name="estado" defaultValue={estado ?? ''} className={claseInput}>
              <option value="">Todos</option>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO_ASISTENCIA[e]}
                </option>
              ))}
            </select>
          </CampoAdmin>
          <CampoAdmin etiqueta="Buscar (nombre o documento)">
            <input name="q" defaultValue={busqueda ?? ''} className={claseInput} />
          </CampoAdmin>
          <button type="submit" className={claseBoton.secundario}>
            Filtrar
          </button>
        </form>
        {filas.length === 0 ? (
          <p className="text-slate-600">No hay registros con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-3">Sesión</th>
                  <th className="pr-3">Documento</th>
                  <th className="pr-3">Nombre</th>
                  <th className="pr-3">Dependencia / cargo</th>
                  <th className="pr-3">Entrada</th>
                  <th className="pr-3">Salida</th>
                  <th className="pr-3">Estado</th>
                  <th className="pr-3">Promedio</th>
                  <th>NPS</th>
                </tr>
              </thead>
              <tbody>
                {filas.slice(0, MAX_FILAS_EN_PANTALLA).map((f) => (
                  <tr key={`${f.sesion_id}-${f.asistente_id}`} className="border-b border-slate-100">
                    <td className="py-2 pr-3">{f.sesion_numero}</td>
                    <td className="pr-3">
                      {f.tipo_documento} {f.numero_documento}
                    </td>
                    <td className="pr-3">
                      {f.nombres} {f.apellidos}
                    </td>
                    <td className="pr-3">
                      {f.dependencia} · {f.cargo}
                    </td>
                    <td className="pr-3">{f.entrada_at ? formatearFechaHora(f.entrada_at) : '—'}</td>
                    <td className="pr-3">{f.salida_at ? formatearFechaHora(f.salida_at) : '—'}</td>
                    <td className="pr-3">{ETIQUETA_ESTADO_ASISTENCIA[f.estado_asistencia]}</td>
                    <td className="pr-3">{f.promedio_escala ?? '—'}</td>
                    <td>{f.nps ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filas.length > MAX_FILAS_EN_PANTALLA && (
              <p className="mt-2 text-sm text-slate-600">
                Se muestran {MAX_FILAS_EN_PANTALLA} de {filas.length} registros. Descargue el Excel para verlos todos.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Correr toda la batería de pruebas y el build**

Run: `npm run e2e -- e2e/admin-datos.spec.ts`
Expected: PASS.

Run: `npm test && npm run test:int && npm run e2e && npm run build`
Expected: todo PASS y `next build` sin errores de tipos ni de lint.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: consolidado por sesión, resumen de encuesta y exportación a Excel"
```

---

### Task 12: Despliegue a producción (Vercel + Supabase)

Esta tarea necesita a la persona para los inicios de sesión y para decidir la región y el dominio. Donde un comando sea interactivo, pídele que lo ejecute con `! <comando>`.

**Files:**
- Create: `README.md` (operación y despliegue)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: la URL de producción, un administrador creado y un evento de prueba verificado desde un celular.

- [ ] **Step 1: Verificación final local**

Run: `npm test && npm run test:int && npm run e2e && npm run build`
Expected: todo PASS.

- [ ] **Step 2: Repositorio en GitHub**

```bash
gh auth status
gh repo create sistema-capacitaciones --private --source . --remote origin --push
```

Confirma con la persona el dueño del repositorio (su usuario o la organización de Avance Jurídico) antes de crearlo.

- [ ] **Step 3: Proyecto de Supabase**

1. La persona crea el proyecto en https://supabase.com/dashboard. Región recomendada: `South America (São Paulo)`, la más cercana a Colombia. Guarda la contraseña de la base de datos.
2. Vincular y aplicar las migraciones:

```bash
npx supabase login          # interactivo: la persona lo ejecuta con `! npx supabase login`
npx supabase link --project-ref <REF_DEL_PROYECTO>
npx supabase db push
```

Expected: se aplican las 4 migraciones y el bucket `logos` queda creado.

3. En el dashboard, en Authentication → Sign In / Providers, desactivar "Allow new users to sign up". En Authentication → URL Configuration, poner como Site URL la URL de producción (se completa después del Step 4).

- [ ] **Step 4: Proyecto en Vercel**

1. En https://vercel.com/new, importar el repositorio de GitHub. El framework (Next.js) se detecta solo.
2. Variables de entorno de Production y Preview, con los valores de Supabase → Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (marcarla como Sensitive)
   - `NEXT_PUBLIC_BASE_URL` = URL de producción, p. ej. `https://sistema-capacitaciones.vercel.app` (o el dominio propio)
3. Desplegar. Cada push a `main` despliega a producción.

- [ ] **Step 5: Crear el primer administrador**

En Supabase → Authentication → Users → "Add user" (con "Auto confirm user"), crear el usuario con su correo. Luego, en el SQL Editor:

```sql
insert into public.administradores (user_id)
select id from auth.users where email = '<correo del administrador>';
```

- [ ] **Step 6: Prueba de humo en producción**

1. Entrar a `<URL>/admin` con el administrador.
2. Marcas: subir los logos de Avance Jurídico y de la PGN.
3. Crear el evento "Prueba producción", con co-branding de ambos logos y un texto de Habeas Data de prueba (no el marcador), y activarlo.
4. Crear una sesión que esté en curso, abrir su hoja imprimible y escanear el QR de ENTRADA con un celular real: registrar. Escanear el QR de SALIDA: responder la encuesta.
5. En Datos, verificar la fila "Completa" y descargar el Excel.
6. Archivar el evento de prueba.

- [ ] **Step 7: README de operación**

`README.md`:

```markdown
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
```

```bash
git add README.md
git commit -m "docs: guía de operación y despliegue"
git push
```

- [ ] **Step 8: Lista de verificación antes de la primera sesión en la PGN**

Entrégala a la persona:

- [ ] Cláusula oficial de Habeas Data cargada (en Configuración y en el evento).
- [ ] Logos de la PGN y de Avance Jurídico en alta resolución.
- [ ] Dominio definitivo configurado en Vercel y en `NEXT_PUBLIC_BASE_URL` **antes de imprimir**.
- [ ] Las 12 sesiones cargadas con fechas y horas reales.
- [ ] Simulacro con una sesión de prueba desde varios celulares (Android e iPhone), incluida la wifi de la PGN si es posible.
- [ ] Una persona designada para abrir o cerrar sesiones a mano si el horario cambia.
