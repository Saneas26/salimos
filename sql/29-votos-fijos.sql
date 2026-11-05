-- Salimos · los votos del administrador son definitivos (05/11/2026). Decisión de Óscar: lo que él vota se queda,
-- sin check-in ni fecha de caducidad. fijo es independiente de verificado: cuenta siempre, pero no lleva el sello «Estuvo allí».
-- Además, la nota de cada categoría la hacen todos los votos: quien no ha cambiado nada en ella aporta su nota general.
alter table salimos.votos add column if not exists fijo boolean not null default false;

create or replace function salimos.marcar_voto_fijo() returns trigger
language plpgsql security definer set search_path = salimos, public as $$
begin
  new.fijo := exists (select 1 from auth.users u join salimos.admins a on a.email = lower(u.email) where u.id = new.usuario_id);
  return new;
end $$;
drop trigger if exists votos_fijo on salimos.votos;
create trigger votos_fijo before insert or update on salimos.votos for each row execute function salimos.marcar_voto_fijo();

update salimos.votos v set fijo = true
where exists (select 1 from auth.users u join salimos.admins a on a.email = lower(u.email) where u.id = v.usuario_id);

CREATE OR REPLACE FUNCTION public.salimos_locales()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'salimos', 'public'
AS $function$
  select coalesce(jsonb_agg(fila order by fila->>'nombre'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', l.id, 'nombre', l.nombre, 'tipo', l.tipo, 'tipo2', l.tipo2, 'tipo3', l.tipo3, 'municipio', l.municipio, 'barrio', l.barrio,
      'direccion', l.direccion, 'telefono', l.telefono, 'web', l.web, 'precio', l.precio, 'precios', l.precios,
      'etiquetas', to_jsonb(l.etiquetas), 'consejo', l.consejo, 'nota_oscar', l.nota_oscar, 'video', l.video, 'video_autor', l.video_autor,
      'destino', l.destino, 'lat', l.lat, 'lng', l.lng,
      'foto', (select f.ruta from salimos.fotos f where f.local_id = l.id and f.estado = 'publicada' order by (f.origen = 'local') desc, f.creado desc limit 1),
      'votos', (select count(*) from salimos.votos v where v.local_id = l.id and salimos.voto_cuenta(v.verificado or v.fijo)),
      'votos_total', (select count(*) from salimos.votos v where v.local_id = l.id),
      'verificados', (select count(*) from salimos.votos v where v.local_id = l.id and v.verificado),
      'crit', coalesce((
        select jsonb_object_agg(c.key, jsonb_build_object('suma', c.suma, 'n', c.n)) from (
          select e.key, sum(e.value::numeric) as suma, count(*) as n
          from salimos.votos v, jsonb_each_text(v.crit) e
          where v.local_id = l.id and salimos.voto_cuenta(v.verificado or v.fijo) group by e.key) c), '{}'::jsonb),
      'rapidas', coalesce((
        select jsonb_object_agg(r.clave, r.cuentas) from (
          select x.clave, jsonb_object_agg(x.valor, x.n) as cuentas from (
            select e.key as clave, t.valor, count(*) as n
            from salimos.votos v, jsonb_each_text(v.rapidas) e, regexp_split_to_table(e.value, ',') as t(valor)
            where v.local_id = l.id and salimos.voto_cuenta(v.verificado or v.fijo) group by e.key, t.valor) x
          group by x.clave) r), '{}'::jsonb),
      'por_categoria', coalesce((
        select jsonb_object_agg(pc.categoria, pc.criterios) from (
          select x.categoria, jsonb_object_agg(x.clave, jsonb_build_object('suma', x.suma, 'n', x.n)) as criterios from (
            select c.categoria, e.key as clave, sum(e.value::numeric) as suma, count(*) as n
            from (select distinct k.key as categoria from salimos.votos w, jsonb_object_keys(w.por_categoria) as k(key) where w.local_id = l.id) c,
                 salimos.votos v, jsonb_each_text(v.crit || coalesce(v.por_categoria -> c.categoria, '{}'::jsonb)) e
            where v.local_id = l.id and salimos.voto_cuenta(v.verificado or v.fijo) group by c.categoria, e.key) x
          group by x.categoria) pc), '{}'::jsonb),
      'comentarios', (select count(*) from salimos.votos v where v.local_id = l.id and v.comentario is not null and v.comentario_estado = 'publicado')
    ) as fila
    from salimos.locales l where l.activo
  ) t
$function$;

CREATE OR REPLACE FUNCTION public.salimos_comentarios(p_local uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'salimos', 'public'
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'texto', v.comentario, 'fecha', v.actualizado, 'autor', salimos.autor_de(v.usuario_id),
           'mio', v.usuario_id = auth.uid(), 'verificado', v.verificado) order by v.actualizado desc), '[]'::jsonb)
  from (select * from salimos.votos
        where local_id = p_local and comentario is not null and comentario_estado = 'publicado'
        order by actualizado desc limit 100) v
$function$;

CREATE OR REPLACE FUNCTION public.salimos_mi_estado()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'salimos', 'public'
AS $function$
  select jsonb_build_object(
    'perfil', exists (select 1 from salimos.perfiles where id = auth.uid()),
    'admin', salimos.es_admin(),
    'votos', coalesce((select jsonb_object_agg(v.local_id, jsonb_build_object(
               'crit', v.crit, 'rapidas', v.rapidas, 'comentario', v.comentario,
               'retirado', v.comentario_estado = 'retirado', 'fecha', v.actualizado, 'verificado', v.verificado, 'por_categoria', v.por_categoria, 'fijo', v.fijo))
             from salimos.votos v where v.usuario_id = auth.uid()), '{}'::jsonb),
    -- Check-in vivos (últimas 24 h): local -> hasta cuándo vale.
    'checkins', coalesce((select jsonb_object_agg(c.local_id, c.hasta) from (
               select local_id, max(hecho) + interval '24 hours' as hasta from salimos.checkins
               where usuario_id = auth.uid() and hecho > now() - interval '24 hours' group by local_id) c), '{}'::jsonb),
    'cuentan_todos', now() < timestamptz '2026-12-01 00:00:00 Atlantic/Canary')
$function$;

CREATE OR REPLACE FUNCTION public.salimos_votar(p_local uuid, p_crit jsonb, p_rapidas jsonb, p_comentario text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'salimos', 'public'
AS $function$
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
    if v_hoy >= 20 and not salimos.es_admin() then raise exception 'Has votado muchos sitios hoy. Sigue mañana.'; end if;
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
end $function$;
