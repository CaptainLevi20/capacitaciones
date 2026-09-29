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
