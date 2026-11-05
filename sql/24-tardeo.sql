-- Salimos · categoría Tardeo (05/11/2026). Decisión de Óscar: El Senador está en Restaurante, Tardeo y Copas.
-- Va en una columna aparte (tipo3) y no en tipo/tipo2: las apps ya instaladas no conocen «tardeo» y se romperían
-- si lo recibieran ahí; así lo ignoran. Tardeo no añade criterios: se vota con los de tipo y tipo2.
alter table salimos.locales add column if not exists tipo3 text check (tipo3 = 'tardeo');

update salimos.locales set tipo3 = 'tardeo' where id = '4c10920f-84c5-4943-b282-fc58cddd1e1c';

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
            select e.key as clave, e.value as valor, count(*) as n
            from salimos.votos v, jsonb_each_text(v.rapidas) e
            where v.local_id = l.id and salimos.voto_cuenta(v.verificado) group by e.key, e.value) x
          group by x.clave) r), '{}'::jsonb),
      'comentarios', (select count(*) from salimos.votos v where v.local_id = l.id and v.comentario is not null and v.comentario_estado = 'publicado')
    ) as fila
    from salimos.locales l where l.activo
  ) t
$function$;

CREATE OR REPLACE FUNCTION public.salimos_recomendar(p_nombre text, p_tipo text, p_municipio text, p_direccion text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'salimos', 'public'
AS $function$
declare v_hoy int;
begin
  if auth.uid() is null then raise exception 'Hace falta entrar con tu correo.'; end if;
  if not exists (select 1 from salimos.perfiles where id = auth.uid()) then raise exception 'Falta confirmar que tienes 18 años o más.'; end if;
  if p_tipo not in ('restaurante','guachinche','terraza','copas','musica','discoteca','vinoteca','tardeo') then raise exception 'Tipo de sitio no válido.'; end if;
  select count(*) into v_hoy from salimos.recomendaciones where usuario_id = auth.uid() and creado > now() - interval '1 day';
  if v_hoy >= 10 then raise exception 'Ya has recomendado muchos sitios hoy. Gracias, sigue mañana.'; end if;
  insert into salimos.recomendaciones (usuario_id, nombre, tipo, municipio, direccion)
  values (auth.uid(), btrim(p_nombre), p_tipo, p_municipio, nullif(btrim(coalesce(p_direccion, '')), ''));
  return 'ok';
end $function$;
