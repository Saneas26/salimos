-- Salimos · una edad puede caer en varios tramos (05/11/2026). Decisión de Óscar: si encaja en dos, cuenta en los dos.
-- En rapidas.edad se guardan separados por coma ('25-50,35-60') y salimos_locales los reparte, de modo que
-- las apps ya instaladas siguen recibiendo lo de siempre: cuántos votos tiene cada tramo.
create or replace function salimos.rapida_valida(p_clave text, p_valor text)
returns boolean language sql immutable as $$
  select case p_clave
    when 'volver' then p_valor in ('si','depende','no')
    when 'precio' then p_valor in ('justo','caro','abusivo')
    when 'guagua' then p_valor in ('si','coche')
    when 'edad'   then string_to_array(p_valor, ',') <@ array['18-24','25-35','25-50','35-60']
    else false end
$$;

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
      'comentarios', (select count(*) from salimos.votos v where v.local_id = l.id and v.comentario is not null and v.comentario_estado = 'publicado')
    ) as fila
    from salimos.locales l where l.activo
  ) t
$function$;

-- Los votos de Óscar: 40, 45 y 50 años caben en dos tramos.
update salimos.votos set rapidas = jsonb_set(rapidas, '{edad}', '"25-50,35-60"')
where usuario_id = '060a312e-b22d-4ff4-8a81-a3ebd5fcab26'
  and local_id in ('4c10920f-84c5-4943-b282-fc58cddd1e1c','b1683d17-d4cf-4f8a-8526-4745123f0b7e','dd0c9b16-2968-4bc1-82b9-2fcef6e47026');
