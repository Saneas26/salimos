-- Salimos · voto verificado por check-in (30/10/2026). Decisión de Óscar:
-- hasta el 30/11 cuenta cualquier voto (para que crezcan); desde el 1/12/2026 en la nota y los rankings
-- solo cuentan los verificados. Los demás siguen guardados y sus comentarios se ven, pero no suman.
-- Check-in: estando a 150 m o menos del local, «Estoy aquí». Abre el voto verificado durante 24 horas
-- (en una discoteca: check-in en la puerta y votas al día siguiente). La posición se usa para medir
-- la distancia y NO se guarda: solo queda quién, dónde y cuándo.

create table if not exists salimos.checkins (
  id         bigserial primary key,
  usuario_id uuid not null references salimos.perfiles(id) on delete cascade,   -- se borran con la cuenta
  local_id   uuid not null references salimos.locales(id) on delete cascade,
  hecho      timestamptz not null default now()
);
create index if not exists checkins_usuario_local on salimos.checkins (usuario_id, local_id, hecho desc);
alter table salimos.checkins enable row level security;
revoke all on salimos.checkins from public, anon, authenticated;

alter table salimos.votos add column if not exists verificado boolean not null default false;

-- El interruptor del 1 de diciembre (hora de Canarias).
create or replace function salimos.voto_cuenta(p_verificado boolean)
returns boolean language sql stable as $$
  select p_verificado or now() < timestamptz '2026-12-01 00:00:00 Atlantic/Canary'
$$;

create or replace function salimos.metros(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 12742000 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2)
         + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

create or replace function public.salimos_checkin(p_local uuid, p_lat double precision, p_lng double precision)
returns jsonb language plpgsql security definer set search_path = salimos, public as $$
declare v_lat double precision; v_lng double precision; v_m int; v_hoy int;
begin
  if auth.uid() is null then raise exception 'Hace falta entrar con tu correo.'; end if;
  if not exists (select 1 from salimos.perfiles where id = auth.uid()) then raise exception 'Falta confirmar que tienes 18 años o más.'; end if;
  if p_lat is null or p_lng is null or abs(p_lat) > 90 or abs(p_lng) > 180 then raise exception 'No ha llegado bien tu ubicación. Prueba otra vez.'; end if;
  select lat, lng into v_lat, v_lng from salimos.locales where id = p_local and activo;
  if v_lat is null then raise exception 'Este sitio todavía no tiene su ubicación: no se puede hacer check-in.'; end if;
  v_m := round(salimos.metros(p_lat, p_lng, v_lat, v_lng));
  if v_m > 150 then
    raise exception 'Estás a % de este sitio. Para hacer check-in tienes que estar dentro o en la puerta.',
      case when v_m < 1000 then v_m || ' m' else replace(round(v_m / 1000.0, 1)::text, '.', ',') || ' km' end;
  end if;
  select count(*) into v_hoy from salimos.checkins where usuario_id = auth.uid() and hecho > now() - interval '1 day';
  if v_hoy >= 30 then raise exception 'Has hecho muchos check-in hoy. Sigue mañana.'; end if;
  insert into salimos.checkins (usuario_id, local_id) values (auth.uid(), p_local);
  -- Si ya había votado este sitio, su voto pasa a verificado: ha demostrado que viene.
  update salimos.votos set verificado = true where usuario_id = auth.uid() and local_id = p_local and not verificado;
  return jsonb_build_object('ok', true, 'metros', v_m, 'hasta', now() + interval '24 hours');
end $$;

create or replace function public.salimos_votar(p_local uuid, p_crit jsonb, p_rapidas jsonb, p_comentario text)
returns text language plpgsql security definer set search_path = salimos, public as $$
declare
  v_tipo text; v_tipo2 text; v_validos text[]; v_k text; v_v text; v_n int := 0; v_hoy int; v_nuevo boolean;
  v_crit jsonb := '{}'::jsonb; v_rap jsonb := '{}'::jsonb; v_com text; v_ver boolean;
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

  /* Verificado: hizo check-in en este sitio en las últimas 24 horas (o ya estaba verificado). */
  v_ver := exists (select 1 from salimos.checkins c where c.usuario_id = auth.uid() and c.local_id = p_local and c.hecho > now() - interval '24 hours');

  insert into salimos.votos (local_id, usuario_id, crit, rapidas, comentario, verificado)
  values (p_local, auth.uid(), v_crit, v_rap, v_com, v_ver)
  on conflict (local_id, usuario_id) do update
    set crit = excluded.crit, rapidas = excluded.rapidas,
        comentario = excluded.comentario,
        comentario_estado = case when salimos.votos.comentario is distinct from excluded.comentario then 'publicado' else salimos.votos.comentario_estado end,
        verificado = salimos.votos.verificado or excluded.verificado,
        actualizado = now();
  return 'ok';
end $$;

create or replace function public.salimos_locales()
returns jsonb language sql stable security definer set search_path = salimos, public as $$
  select coalesce(jsonb_agg(fila order by fila->>'nombre'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', l.id, 'nombre', l.nombre, 'tipo', l.tipo, 'tipo2', l.tipo2, 'municipio', l.municipio, 'barrio', l.barrio,
      'direccion', l.direccion, 'telefono', l.telefono, 'web', l.web, 'precio', l.precio, 'precios', l.precios,
      'etiquetas', to_jsonb(l.etiquetas), 'consejo', l.consejo,
      'destino', l.destino, 'lat', l.lat, 'lng', l.lng,
      'votos', (select count(*) from salimos.votos v where v.local_id = l.id and salimos.voto_cuenta(v.verificado)),
      'votos_total', (select count(*) from salimos.votos v where v.local_id = l.id),
      'verificados', (select count(*) from salimos.votos v where v.local_id = l.id and v.verificado),
      'crit', coalesce((
        select jsonb_object_agg(c.key, jsonb_build_object('suma', c.suma, 'n', c.n)) from (
          select e.key, sum(e.value::numeric) as suma, count(*) as n
          from salimos.votos v, jsonb_each_text(v.crit) e
          where v.local_id = l.id and salimos.voto_cuenta(v.verificado) group by e.key) c), '{}'::jsonb),
      'rapidas', coalesce((
        select jsonb_object_agg(r.clave, r.cuentas) from (
          select x.clave, jsonb_object_agg(x.valor, x.n) as cuentas from (
            select e.key as clave, e.value as valor, count(*) as n
            from salimos.votos v, jsonb_each_text(v.rapidas) e
            where v.local_id = l.id and salimos.voto_cuenta(v.verificado) group by e.key, e.value) x
          group by x.clave) r), '{}'::jsonb),
      'comentarios', (select count(*) from salimos.votos v where v.local_id = l.id and v.comentario is not null and v.comentario_estado = 'publicado')
    ) as fila
    from salimos.locales l where l.activo
  ) t
$$;

create or replace function public.salimos_comentarios(p_local uuid)
returns jsonb language sql stable security definer set search_path = salimos, public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'texto', v.comentario, 'fecha', v.actualizado, 'autor', salimos.autor_de(v.usuario_id),
           'mio', v.usuario_id = auth.uid(), 'verificado', v.verificado) order by v.actualizado desc), '[]'::jsonb)
  from (select * from salimos.votos
        where local_id = p_local and comentario is not null and comentario_estado = 'publicado'
        order by actualizado desc limit 100) v
$$;

create or replace function public.salimos_mi_estado()
returns jsonb language sql stable security definer set search_path = salimos, public as $$
  select jsonb_build_object(
    'perfil', exists (select 1 from salimos.perfiles where id = auth.uid()),
    'admin', salimos.es_admin(),
    'votos', coalesce((select jsonb_object_agg(v.local_id, jsonb_build_object(
               'crit', v.crit, 'rapidas', v.rapidas, 'comentario', v.comentario,
               'retirado', v.comentario_estado = 'retirado', 'fecha', v.actualizado, 'verificado', v.verificado))
             from salimos.votos v where v.usuario_id = auth.uid()), '{}'::jsonb),
    -- Check-in vivos (últimas 24 h): local -> hasta cuándo vale.
    'checkins', coalesce((select jsonb_object_agg(c.local_id, c.hasta) from (
               select local_id, max(hecho) + interval '24 hours' as hasta from salimos.checkins
               where usuario_id = auth.uid() and hecho > now() - interval '24 hours' group by local_id) c), '{}'::jsonb),
    'cuentan_todos', now() < timestamptz '2026-12-01 00:00:00 Atlantic/Canary')
$$;

revoke all on function public.salimos_checkin(uuid, double precision, double precision) from public, anon;
grant execute on function public.salimos_checkin(uuid, double precision, double precision) to authenticated;
