-- Salimos · el apartado «salimos» dentro del proyecto Supabase de Gajos.
--
-- Por qué aquí: la cuenta Saneas26 ya tiene sus 2 proyectos gratis (acumula y gajos)
-- y Óscar eligió no pagar. Gajos es, como Salimos, una app abierta con cuentas de
-- desconocidos; los datos de salud de Saneas siguen en su proyecto, aparte.
--
-- Las reglas que no se rompen:
--  1. Las tablas viven en el esquema «salimos», que NO sale por la API. El navegador
--     solo llega por las funciones public.salimos_*, que lo comprueban todo.
--  2. Un voto por persona y local (clave primaria), editable.
--  3. Para votar o recomendar hay que tener cuenta y 18 años o más (check en la tabla).
--  4. Los comentarios se publican al momento; Óscar puede retirarlos después.
--  5. Nadie ve el correo de nadie.
--  6. Las cuentas son las de Trivial (auth compartido): borrar Salimos no borra Trivial.

create schema if not exists salimos;
revoke all on schema salimos from public, anon, authenticated;

-- ───────────────────────────── tablas ─────────────────────────────

create table if not exists salimos.locales (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (char_length(nombre) between 2 and 80),
  tipo       text not null check (tipo in ('restaurante','guachinche','terraza','copas','musica','discoteca','vinoteca')),
  municipio  text not null,
  barrio     text,
  direccion  text,
  activo     boolean not null default true,
  creado     timestamptz not null default now()
);

create table if not exists salimos.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  mayor_edad  boolean not null check (mayor_edad),
  creado      timestamptz not null default now()
);

create table if not exists salimos.votos (
  local_id     uuid not null references salimos.locales(id) on delete cascade,
  usuario_id   uuid not null references salimos.perfiles(id) on delete cascade,
  crit         jsonb not null,
  rapidas      jsonb not null default '{}'::jsonb,
  comentario   text check (char_length(comentario) <= 300),
  comentario_estado text not null default 'publicado' check (comentario_estado in ('publicado','retirado')),
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now(),
  primary key (local_id, usuario_id)
);
create index if not exists votos_usuario on salimos.votos (usuario_id, creado);

create table if not exists salimos.recomendaciones (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references salimos.perfiles(id) on delete cascade,
  nombre      text not null check (char_length(nombre) between 2 and 80),
  tipo        text not null,
  municipio   text not null,
  direccion   text check (char_length(direccion) <= 200),
  estado      text not null default 'pendiente' check (estado in ('pendiente','dado_de_alta','descartado')),
  creado      timestamptz not null default now()
);

-- Quién puede retirar comentarios y dar de alta locales (correo de la cuenta).
create table if not exists salimos.admins (email text primary key);

alter table salimos.locales enable row level security;
alter table salimos.perfiles enable row level security;
alter table salimos.votos enable row level security;
alter table salimos.recomendaciones enable row level security;
alter table salimos.admins enable row level security;
revoke all on all tables in schema salimos from public, anon, authenticated;

-- ───────────────────────────── reglas ─────────────────────────────

-- Criterios de cada tipo de local: la base común más los extras.
create or replace function salimos.criterios_de(p_tipo text)
returns text[] language sql immutable as $$
  select array['limpieza','ambiente','servicio','consumiciones','precio','ubicacion','parking','guagua']
    || case when p_tipo in ('restaurante','guachinche') then array['carta'] else '{}'::text[] end
    || case when p_tipo in ('restaurante','vinoteca') then array['vinoteca'] else '{}'::text[] end
    || case when p_tipo in ('copas','musica','discoteca') then array['musica'] else '{}'::text[] end
    || case when p_tipo = 'terraza' then array['vistas'] else '{}'::text[] end
$$;

-- Respuestas válidas de las preguntas rápidas.
create or replace function salimos.rapida_valida(p_clave text, p_valor text)
returns boolean language sql immutable as $$
  select case p_clave
    when 'volver' then p_valor in ('si','depende','no')
    when 'precio' then p_valor in ('justo','caro','abusivo')
    when 'guagua' then p_valor in ('si','coche')
    when 'edad'   then p_valor in ('18-24','25-35','25-50','35-60')
    else false end
$$;

create or replace function salimos.es_admin()
returns boolean language sql stable security definer set search_path = salimos, public as $$
  select exists (select 1 from salimos.admins where email = lower(auth.jwt() ->> 'email'))
$$;

-- ─────────────────────── lo que ve todo el mundo ───────────────────────

-- Todos los locales activos con sus cifras: votos, suma y número por criterio
-- y recuento de cada respuesta rápida. Sin datos de nadie.
create or replace function public.salimos_locales()
returns jsonb language sql stable security definer set search_path = salimos, public as $$
  select coalesce(jsonb_agg(fila order by fila->>'nombre'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', l.id, 'nombre', l.nombre, 'tipo', l.tipo, 'municipio', l.municipio, 'barrio', l.barrio,
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

-- Comentarios publicados de un local, los más nuevos primero. Sin nombre ni correo.
create or replace function public.salimos_comentarios(p_local uuid)
returns jsonb language sql stable security definer set search_path = salimos, public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'texto', v.comentario, 'fecha', v.actualizado,
           'mio', v.usuario_id = auth.uid()) order by v.actualizado desc), '[]'::jsonb)
  from (select * from salimos.votos
        where local_id = p_local and comentario is not null and comentario_estado = 'publicado'
        order by actualizado desc limit 100) v
$$;

-- ─────────────────────── lo de quien tiene cuenta ───────────────────────

-- Si tiene perfil de Salimos y sus votos (para «Tú» y para editar).
create or replace function public.salimos_mi_estado()
returns jsonb language sql stable security definer set search_path = salimos, public as $$
  select jsonb_build_object(
    'perfil', exists (select 1 from salimos.perfiles where id = auth.uid()),
    'admin', salimos.es_admin(),
    'votos', coalesce((select jsonb_object_agg(v.local_id, jsonb_build_object(
               'crit', v.crit, 'rapidas', v.rapidas, 'comentario', v.comentario,
               'retirado', v.comentario_estado = 'retirado', 'fecha', v.actualizado))
             from salimos.votos v where v.usuario_id = auth.uid()), '{}'::jsonb))
$$;

create or replace function public.salimos_alta_perfil(p_mayor_edad boolean)
returns text language plpgsql security definer set search_path = salimos, public as $$
begin
  if auth.uid() is null then raise exception 'Hace falta entrar con tu correo.'; end if;
  if p_mayor_edad is not true then raise exception 'Para votar hay que tener 18 años o más.'; end if;
  insert into salimos.perfiles (id, mayor_edad) values (auth.uid(), true) on conflict (id) do nothing;
  return 'ok';
end $$;

create or replace function public.salimos_votar(p_local uuid, p_crit jsonb, p_rapidas jsonb, p_comentario text)
returns text language plpgsql security definer set search_path = salimos, public as $$
declare
  v_tipo text; v_validos text[]; v_k text; v_v text; v_n int := 0; v_hoy int; v_nuevo boolean;
  v_crit jsonb := '{}'::jsonb; v_rap jsonb := '{}'::jsonb; v_com text;
begin
  if auth.uid() is null then raise exception 'Hace falta entrar con tu correo.'; end if;
  if not exists (select 1 from salimos.perfiles where id = auth.uid()) then raise exception 'Falta confirmar que tienes 18 años o más.'; end if;
  select tipo into v_tipo from salimos.locales where id = p_local and activo;
  if v_tipo is null then raise exception 'Ese sitio no existe.'; end if;

  v_validos := salimos.criterios_de(v_tipo);
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

  -- Freno a las ráfagas: como mucho 20 sitios NUEVOS votados por persona al día.
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
        -- un comentario retirado sigue retirado si no cambia el texto
        comentario_estado = case when salimos.votos.comentario is distinct from excluded.comentario then 'publicado' else salimos.votos.comentario_estado end,
        actualizado = now();
  return 'ok';
end $$;

create or replace function public.salimos_recomendar(p_nombre text, p_tipo text, p_municipio text, p_direccion text)
returns text language plpgsql security definer set search_path = salimos, public as $$
declare v_hoy int;
begin
  if auth.uid() is null then raise exception 'Hace falta entrar con tu correo.'; end if;
  if not exists (select 1 from salimos.perfiles where id = auth.uid()) then raise exception 'Falta confirmar que tienes 18 años o más.'; end if;
  if p_tipo not in ('restaurante','guachinche','terraza','copas','musica','discoteca','vinoteca') then raise exception 'Tipo de sitio no válido.'; end if;
  select count(*) into v_hoy from salimos.recomendaciones where usuario_id = auth.uid() and creado > now() - interval '1 day';
  if v_hoy >= 10 then raise exception 'Ya has recomendado muchos sitios hoy. Gracias, sigue mañana.'; end if;
  insert into salimos.recomendaciones (usuario_id, nombre, tipo, municipio, direccion)
  values (auth.uid(), btrim(p_nombre), p_tipo, p_municipio, nullif(btrim(coalesce(p_direccion, '')), ''));
  return 'ok';
end $$;

-- Borra todo lo de Salimos. La cuenta solo se borra si no se usa en Trivial.
create or replace function public.salimos_borrar_mis_datos()
returns text language plpgsql security definer set search_path = salimos, public as $$
declare v_id uuid := auth.uid();
begin
  if v_id is null then return 'no hay sesión'; end if;
  delete from salimos.perfiles where id = v_id;   -- en cascada: votos y recomendaciones
  if not exists (select 1 from public.jugadores where id = v_id) then
    delete from auth.users where id = v_id;
    return 'cuenta borrada';
  end if;
  return 'datos de Salimos borrados';
end $$;

-- ───────────────────────────── Óscar ─────────────────────────────

create or replace function public.salimos_admin_retirar_comentario(p_local uuid, p_texto text, p_retirar boolean default true)
returns int language plpgsql security definer set search_path = salimos, public as $$
declare v_n int;
begin
  if not salimos.es_admin() then raise exception 'No autorizado.'; end if;
  update salimos.votos set comentario_estado = case when p_retirar then 'retirado' else 'publicado' end
  where local_id = p_local and comentario = p_texto;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ───────────────────────────── permisos ─────────────────────────────

revoke all on function public.salimos_locales(), public.salimos_comentarios(uuid), public.salimos_mi_estado(),
  public.salimos_alta_perfil(boolean), public.salimos_votar(uuid, jsonb, jsonb, text),
  public.salimos_recomendar(text, text, text, text), public.salimos_borrar_mis_datos(),
  public.salimos_admin_retirar_comentario(uuid, text, boolean) from public, anon, authenticated;

grant execute on function public.salimos_locales(), public.salimos_comentarios(uuid) to anon, authenticated;
grant execute on function public.salimos_mi_estado(), public.salimos_alta_perfil(boolean),
  public.salimos_votar(uuid, jsonb, jsonb, text), public.salimos_recomendar(text, text, text, text),
  public.salimos_borrar_mis_datos(), public.salimos_admin_retirar_comentario(uuid, text, boolean) to authenticated;

select 'salimos listo' as resultado;
