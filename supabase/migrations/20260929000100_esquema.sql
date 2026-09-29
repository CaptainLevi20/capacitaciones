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
