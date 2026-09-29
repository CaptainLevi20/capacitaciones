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
