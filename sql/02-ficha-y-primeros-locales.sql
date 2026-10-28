-- Salimos · la ficha del local crece y entran los 4 primeros sitios (28/10/2026).
--
-- Lo que va en la ficha son DATOS (dónde está, cómo contactar, qué tiene). Las notas,
-- la edad del público y si es para ir en familia o en pareja son OPINIÓN: van en los
-- votos, también los de Óscar, que vota como uno más desde la app.
-- Fotos: ninguna copiada de Google, Tripadvisor ni webs ajenas; solo propias o con permiso.

alter table salimos.locales
  add column if not exists tipo2       text check (tipo2 in ('restaurante','guachinche','terraza','copas','musica','discoteca','vinoteca')),
  add column if not exists telefono    text,
  add column if not exists web         text,
  add column if not exists precio      smallint check (precio between 1 and 3),   -- 1 € · 2 €€ · 3 €€€
  add column if not exists precios     text check (char_length(precios) <= 120), -- «Copas ~12 € · Shisha ~25 €»
  add column if not exists etiquetas   text[] not null default '{}',
  add column if not exists consejo     text check (char_length(consejo) <= 160);

-- Los criterios de un local con dos tipos son la suma de los dos.
create or replace function salimos.criterios_de(p_tipo text, p_tipo2 text)
returns text[] language sql immutable as $$
  select array(select distinct unnest(salimos.criterios_de(p_tipo) || coalesce(salimos.criterios_de(p_tipo2), '{}'::text[])))
$$;

-- salimos_locales: añade los campos nuevos de la ficha.
create or replace function public.salimos_locales()
returns jsonb language sql stable security definer set search_path = salimos, public as $$
  select coalesce(jsonb_agg(fila order by fila->>'nombre'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', l.id, 'nombre', l.nombre, 'tipo', l.tipo, 'tipo2', l.tipo2, 'municipio', l.municipio, 'barrio', l.barrio,
      'direccion', l.direccion, 'telefono', l.telefono, 'web', l.web, 'precio', l.precio, 'precios', l.precios,
      'etiquetas', to_jsonb(l.etiquetas), 'consejo', l.consejo,
      'votos', (select count(*) from salimos.votos v where v.local_id = l.id),
      'crit', coalesce((
        select jsonb_object_agg(c.key, jsonb_build_object('suma', c.suma, 'n', c.n)) from (
          select e.key, sum(e.value::numeric) as suma, count(*) as n
          from salimos.votos v, jsonb_each_text(v.crit) e
          where v.local_id = l.id group by e.key) c), '{}'::jsonb),
      'rapidas', coalesce((
        select jsonb_object_agg(r.clave, r.cuentas) from (
          select x.clave, jsonb_object_agg(x.valor, x.n) as cuentas from (
            select e.key as clave, e.value as valor, count(*) as n
            from salimos.votos v, jsonb_each_text(v.rapidas) e
            where v.local_id = l.id group by e.key, e.value) x
          group by x.clave) r), '{}'::jsonb),
      'comentarios', (select count(*) from salimos.votos v where v.local_id = l.id and v.comentario is not null and v.comentario_estado = 'publicado')
    ) as fila
    from salimos.locales l where l.activo
  ) t
$$;

-- salimos_votar: valida contra los criterios de los dos tipos.
create or replace function public.salimos_votar(p_local uuid, p_crit jsonb, p_rapidas jsonb, p_comentario text)
returns text language plpgsql security definer set search_path = salimos, public as $$
declare
  v_tipo text; v_tipo2 text; v_validos text[]; v_k text; v_v text; v_n int := 0; v_hoy int; v_nuevo boolean;
  v_crit jsonb := '{}'::jsonb; v_rap jsonb := '{}'::jsonb; v_com text;
begin
  if auth.uid() is null then raise exception 'Hace falta entrar con tu correo.'; end if;
  if not exists (select 1 from salimos.perfiles where id = auth.uid()) then raise exception 'Falta confirmar que tienes 18 años o más.'; end if;
  select tipo, tipo2 into v_tipo, v_tipo2 from salimos.locales where id = p_local and activo;
  if v_tipo is null then raise exception 'Ese sitio no existe.'; end if;

  v_validos := salimos.criterios_de(v_tipo, v_tipo2);
  for v_k, v_v in select key, value from jsonb_each_text(coalesce(p_crit, '{}'::jsonb)) loop
    if not v_k = any(v_validos) then raise exception 'Criterio no válido: %', v_k; end if;
    if v_v !~ '^(10|[0-9])$' then raise exception 'Las notas van de 0 a 10.'; end if;
    v_crit := v_crit || jsonb_build_object(v_k, v_v::int); v_n := v_n + 1;
  end loop;
  if v_n < 3 then raise exception 'Vota al menos 3 cosas.'; end if;

  for v_k, v_v in select key, value from jsonb_each_text(coalesce(p_rapidas, '{}'::jsonb)) loop
    if not salimos.rapida_valida(v_k, v_v) then raise exception 'Respuesta no válida.'; end if;
    v_rap := v_rap || jsonb_build_object(v_k, v_v);
  end loop;

  v_com := nullif(btrim(coalesce(p_comentario, '')), '');
  if char_length(v_com) > 300 then raise exception 'El comentario, 300 caracteres como mucho.'; end if;

  v_nuevo := not exists (select 1 from salimos.votos where local_id = p_local and usuario_id = auth.uid());
  if v_nuevo then
    select count(*) into v_hoy from salimos.votos where usuario_id = auth.uid() and creado > now() - interval '1 day';
    if v_hoy >= 20 then raise exception 'Has votado muchos sitios hoy. Sigue mañana.'; end if;
  end if;

  insert into salimos.votos (local_id, usuario_id, crit, rapidas, comentario)
  values (p_local, auth.uid(), v_crit, v_rap, v_com)
  on conflict (local_id, usuario_id) do update
    set crit = excluded.crit, rapidas = excluded.rapidas,
        comentario = excluded.comentario,
        comentario_estado = case when salimos.votos.comentario is distinct from excluded.comentario then 'publicado' else salimos.votos.comentario_estado end,
        actualizado = now();
  return 'ok';
end $$;

-- ───────────── los 4 primeros, propuestos por Óscar ─────────────
-- Contacto: webs y directorios públicos, consultados el 28/10/2026 (ver memoria app-opina-gc).
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
select * from (values
  ('El Senador', 'restaurante', 'copas', 'San Bartolomé de Tirajana', 'Maspalomas · El Faro',
   'Paseo del Faro, 2, Maspalomas', '928 14 20 68', null, 3::smallint, 'Copas ~12 € · Shisha ~25 €',
   array['En plena playa','Terraza chill out','DJ en directo','Animación','Shisha','Vestimenta elegante','Arroces y pescado'], null),
  ('Greek Taverna', 'restaurante', null, 'San Bartolomé de Tirajana', 'San Agustín',
   'C.C. San Agustín, locales 67-69 (C. Las Dalias, 12)', null, null, 1::smallint, null,
   array['Cocina griega','Gyros y musaka','Bueno para ir en familia','Bueno para una cita'], null),
  ('Restaurante Los Porches', 'restaurante', null, 'San Bartolomé de Tirajana', 'Playa del Inglés',
   'Av. de Alemania, 16, Playa del Inglés', '928 76 04 67', 'https://restaurantelosporches.shop/', 1::smallint, null,
   array['Lo lleva el dueño','Parrillada de pescado para dos','Carnes a la parrilla','Buen aparcamiento'], null),
  ('Chez Luigi', 'restaurante', null, 'San Bartolomé de Tirajana', 'Playa del Inglés · C.C. La Sandía',
   'C.C. La Sandía, Playa del Inglés', '928 76 68 37', 'http://www.chezluigi-grancanaria.com/', 1::smallint, null,
   array['Cocina mediterránea','Raciones grandes','Bueno para grupos','Bueno para ir en pareja'],
   'Mejor entrar por la parte de atrás del centro comercial.')
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);

select count(*) as locales from salimos.locales;
