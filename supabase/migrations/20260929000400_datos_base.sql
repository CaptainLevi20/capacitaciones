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
