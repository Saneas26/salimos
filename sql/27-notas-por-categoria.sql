-- Salimos · notas distintas según la categoría (05/11/2026). Decisión de Óscar: El Senador no se vive igual
-- comiendo, de tardeo o de copas. por_categoria guarda solo lo que cambia respecto a crit, por ejemplo
-- {"tardeo":{"ambiente":9},"copas":{"ambiente":10}}; lo demás vale lo mismo. La nota general sigue saliendo de crit,
-- y salimos_votar no toca esta columna al cambiar el voto.
alter table salimos.votos add column if not exists por_categoria jsonb not null default '{}'::jsonb;

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
            from salimos.votos v, jsonb_each(v.por_categoria) c, jsonb_each_text(c.value) e
            where v.local_id = l.id and salimos.voto_cuenta(v.verificado) group by c.key, e.key) x
          group by x.categoria) pc), '{}'::jsonb),
      'comentarios', (select count(*) from salimos.votos v where v.local_id = l.id and v.comentario is not null and v.comentario_estado = 'publicado')
    ) as fila
    from salimos.locales l where l.activo
  ) t
$function$;

update salimos.votos set por_categoria = '{"tardeo":{"ambiente":9},"copas":{"ambiente":10}}'::jsonb
where usuario_id = '060a312e-b22d-4ff4-8a81-a3ebd5fcab26' and local_id = '4c10920f-84c5-4943-b282-fc58cddd1e1c';
