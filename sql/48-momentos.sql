-- Salimos · Momentos de salir, 08/11/2026. Óscar: «Un café. Tardeo, Tapeo, Comida, Cena, Copas. Categorías que la gente
-- asocia con salir. Hay varias maneras de querer salir.» El filtro «Qué» pasa a ser «¿Qué te apetece?» y busca por momentos.
-- El tipo de sitio (restaurante, guachinche, terraza…) se queda para la ficha y para los criterios de votar.
-- Las apps instaladas no leen «momentos»: siguen igual hasta la 1.0.3.
alter table salimos.locales add column if not exists momentos text[] not null default '{}';
alter table salimos.locales drop constraint if exists locales_momentos_check;
alter table salimos.locales add constraint locales_momentos_check
  check (momentos <@ array['cafe','tapeo','comida','cena','tardeo','copas','fiesta']);

CREATE OR REPLACE FUNCTION public.salimos_locales()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'salimos', 'public'
AS $function$
  select coalesce(jsonb_agg(fila order by fila->>'nombre'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', l.id, 'nombre', l.nombre, 'tipo', l.tipo, 'tipo2', l.tipo2, 'tipo3', l.tipo3, 'momentos', to_jsonb(l.momentos), 'municipio', l.municipio, 'barrio', l.barrio,
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

-- Primer reparto, sacado de lo que es cada sitio; Óscar corrige lo que no le cuadre.
update salimos.locales l set momentos = array(select m from unnest(array['cafe','tapeo','comida','cena','tardeo','copas','fiesta']) with ordinality as o(m, i)
  where m = any(array_remove(array[
    case when 'cafe' in (l.tipo, l.tipo2, l.tipo3) then 'cafe' end,
    case when 'vinoteca' in (l.tipo, l.tipo2, l.tipo3) or exists (select 1 from unnest(l.etiquetas) e where e ilike '%tapa%' or e ilike '%taberna%') then 'tapeo' end,
    case when 'restaurante' in (l.tipo, l.tipo2, l.tipo3) or 'guachinche' in (l.tipo, l.tipo2, l.tipo3) then 'comida' end,
    case when 'restaurante' in (l.tipo, l.tipo2, l.tipo3) then 'cena' end,
    case when 'tardeo' in (l.tipo, l.tipo2, l.tipo3) or (l.tipo = 'terraza' and l.tipo2 is distinct from 'restaurante') then 'tardeo' end,
    case when 'copas' in (l.tipo, l.tipo2, l.tipo3) or 'vinoteca' in (l.tipo, l.tipo2, l.tipo3) or 'musica' in (l.tipo, l.tipo2, l.tipo3) or l.tipo = 'terraza' then 'copas' end,
    case when 'discoteca' in (l.tipo, l.tipo2, l.tipo3) or 'musica' in (l.tipo, l.tipo2, l.tipo3) then 'fiesta' end
  ], null)) order by i)
where l.momentos = '{}';

-- Ajustes a mano sobre el reparto automático (horarios de Google y lo que es cada sitio).
update salimos.locales set momentos = '{cena,tardeo,copas}' where nombre = 'Café del Mar Meloneras';   -- abre a las 16:30
update salimos.locales set momentos = '{tapeo,cena,copas}' where nombre = 'Cervecería Oklahoma';      -- abre a las 19:30
update salimos.locales set momentos = '{tardeo,cena,copas}' where nombre = 'La Ruta';                 -- abre a las 17:00
update salimos.locales set momentos = '{tapeo,comida}' where nombre like 'Bochinche%';                -- el bochinche es de tapas
update salimos.locales set momentos = '{tardeo,copas}' where nombre in ('Tipsy Hammock', 'La Costa Cocktail & Bar');
update salimos.locales set momentos = '{tapeo,comida,cena,copas}' where nombre = 'Ohasis Gastrobar';
update salimos.locales set momentos = '{cafe,comida}' where nombre = 'Charly''s Café';
update salimos.locales set momentos = '{tardeo,copas,fiesta}' where nombre = 'Súgar';
