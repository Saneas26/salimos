-- Salimos · cada categoría de un local se vota con todos sus parámetros (05/11/2026). Decisión de Óscar.
-- El voto de la categoría principal sigue siendo crit (la nota general). De las otras se guarda solo lo que cambia;
-- quien entra en una categoría aporta sus notas generales en lo que no haya cambiado, y quien no la ha votado no cuenta en ella.
-- Función aparte: las apps instaladas siguen llamando a salimos_votar, que no toca por_categoria.
create or replace function public.salimos_votar_categorias(p_local uuid, p_por_categoria jsonb)
returns text language plpgsql security definer set search_path = salimos, public as $$
declare
  v_tipo text; v_tipo2 text; v_tipo3 text; v_validos text[]; v_cat text; v_notas jsonb; v_k text; v_v text;
begin
  if auth.uid() is null then raise exception 'Hace falta entrar con tu correo.'; end if;
  select tipo, tipo2, tipo3 into v_tipo, v_tipo2, v_tipo3 from salimos.locales where id = p_local and activo;
  if v_tipo is null then raise exception 'Ese sitio no existe.'; end if;
  if jsonb_typeof(coalesce(p_por_categoria, '{}'::jsonb)) <> 'object' then raise exception 'Categorías no válidas.'; end if;
  v_validos := salimos.criterios_de(v_tipo, v_tipo2);
  for v_cat, v_notas in select key, value from jsonb_each(coalesce(p_por_categoria, '{}'::jsonb)) loop
    if v_cat is distinct from v_tipo2 and v_cat is distinct from v_tipo3 then raise exception 'Categoría no válida: %', v_cat; end if;
    if jsonb_typeof(v_notas) <> 'object' then raise exception 'Categorías no válidas.'; end if;
    for v_k, v_v in select key, value from jsonb_each_text(v_notas) loop
      if not v_k = any(v_validos) then raise exception 'Criterio no válido: %', v_k; end if;
      if v_v !~ '^(10|[0-9])$' then raise exception 'Las notas van de 0 a 10.'; end if;
    end loop;
  end loop;
  update salimos.votos set por_categoria = coalesce(p_por_categoria, '{}'::jsonb), actualizado = now()
  where local_id = p_local and usuario_id = auth.uid();
  if not found then raise exception 'Primero publica tu voto.'; end if;
  return 'ok';
end $$;
revoke all on function public.salimos_votar_categorias(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.salimos_votar_categorias(uuid, jsonb) to authenticated;

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
            select e.key as clave, t.valor, count(*) as n
            from salimos.votos v, jsonb_each_text(v.rapidas) e, regexp_split_to_table(e.value, ',') as t(valor)
            where v.local_id = l.id and salimos.voto_cuenta(v.verificado) group by e.key, t.valor) x
          group by x.clave) r), '{}'::jsonb),
      'por_categoria', coalesce((
        select jsonb_object_agg(pc.categoria, pc.criterios) from (
          select x.categoria, jsonb_object_agg(x.clave, jsonb_build_object('suma', x.suma, 'n', x.n)) as criterios from (
            select c.key as categoria, e.key as clave, sum(e.value::numeric) as suma, count(*) as n
            from salimos.votos v, jsonb_each(v.por_categoria) c, jsonb_each_text(v.crit || c.value) e
            where v.local_id = l.id and salimos.voto_cuenta(v.verificado) group by c.key, e.key) x
          group by x.categoria) pc), '{}'::jsonb),
      'comentarios', (select count(*) from salimos.votos v where v.local_id = l.id and v.comentario is not null and v.comentario_estado = 'publicado')
    ) as fila
    from salimos.locales l where l.activo
  ) t
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
               'retirado', v.comentario_estado = 'retirado', 'fecha', v.actualizado, 'verificado', v.verificado, 'por_categoria', v.por_categoria))
             from salimos.votos v where v.usuario_id = auth.uid()), '{}'::jsonb),
    -- Check-in vivos (últimas 24 h): local -> hasta cuándo vale.
    'checkins', coalesce((select jsonb_object_agg(c.local_id, c.hasta) from (
               select local_id, max(hecho) + interval '24 hours' as hasta from salimos.checkins
               where usuario_id = auth.uid() and hecho > now() - interval '24 hours' group by local_id) c), '{}'::jsonb),
    'cuentan_todos', now() < timestamptz '2026-12-01 00:00:00 Atlantic/Canary')
$function$;
