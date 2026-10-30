-- Salimos · destino (isla o ciudad) y coordenadas de cada local (30/10/2026).
-- destino: lo que se elige arriba del todo (hoy solo «Gran Canaria»; Madrid, Salamanca… aparecen solos al tener sitios).
-- lat/lng: para «Cerca de mí». La distancia se calcula en el móvil: la ubicación de la persona NUNCA llega aquí.
-- Coordenadas sacadas de la ficha de cada sitio en Google Maps el 30/10.
-- La zona dentro del destino no se guarda: la calcula js/datos.js con el municipio y el barrio.
alter table salimos.locales
  add column if not exists destino text not null default 'Gran Canaria' check (char_length(destino) between 2 and 60),
  add column if not exists lat double precision check (lat between -90 and 90),
  add column if not exists lng double precision check (lng between -180 and 180);

update salimos.locales l set lat = v.lat, lng = v.lng
from (values
  ('Casa Romántica', 28.0828022, -15.6696169),
  ('Poemas by Hermanos Padrón', 28.1211775, -15.4284076),
  ('Emblemática Rooftop', 28.1189813, -15.5234514),
  ('Rêver Restaurante', 28.1018909, -15.414109),
  ('La Pizarra: Sabores del Mar', 28.1514737, -15.6961446),
  ('Deliciosa Marta', 28.1064377, -15.4193048),
  ('La Vicaría', 27.9198282, -15.4437633),
  ('Samsara', 27.738549, -15.5954153),
  ('La Aquarela', 27.7741347, -15.6929984),
  ('Los Guayres', 27.822581, -15.7603634),
  ('Casa Montesdeoca', 28.1017562, -15.4134556),
  ('Nakar', 28.1384792, -15.433753),
  ('Atelier Cocktail Bar', 27.7562271, -15.5701783),
  ('Terraza Belvedere', 28.1001994, -15.4156709),
  ('Alis Rooftop', 28.1211984, -15.4282991),
  ('Café del Mar Meloneras', 27.7360377, -15.6005106),
  ('Guachinche Motor Grande', 27.7992893, -15.696458),
  ('Ca''tita', 27.9994483, -15.4177049),
  ('Bochinche Bar Suso', 28.0391244, -15.5490503),
  ('Bochinche La Lechuza', 28.0069954, -15.5509058),
  ('Reina de la Noche Music Bar', 28.1373854, -15.4367909),
  ('Sparkles', 27.7583579, -15.5775521),
  ('19th Hole', 27.7379189, -15.6028523),
  ('Chester Meloneras Club & Lounge', 27.7392157, -15.6006979),
  ('Restaurante Los Porches', 27.753906, -15.574329),
  ('Greek Taverna', 27.768379, -15.549836),
  ('El Senador', 27.735395, -15.5974216),
  ('Chez Luigi', 27.7561153, -15.5721714),
  ('Mojito Sur', 27.7599936, -15.5699129)
) v(nombre, lat, lng) where l.nombre = v.nombre;

create or replace function public.salimos_locales()
returns jsonb language sql stable security definer set search_path = salimos, public as $$
  select coalesce(jsonb_agg(fila order by fila->>'nombre'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', l.id, 'nombre', l.nombre, 'tipo', l.tipo, 'tipo2', l.tipo2, 'municipio', l.municipio, 'barrio', l.barrio,
      'direccion', l.direccion, 'telefono', l.telefono, 'web', l.web, 'precio', l.precio, 'precios', l.precios,
      'etiquetas', to_jsonb(l.etiquetas), 'consejo', l.consejo,
      'destino', l.destino, 'lat', l.lat, 'lng', l.lng,
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

select count(*) filter (where lat is null) as sin_coordenadas, count(*) as locales from salimos.locales;
