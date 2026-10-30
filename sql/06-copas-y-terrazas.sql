-- Salimos · copas y terrazas (30/10/2026), con el mismo criterio que sql/05-cenar-en-pareja.sql:
-- Google 4,5 o más, 300 reseñas o más, menos de un 5 % de 1 estrella y un reparto normal.
-- Nuevo en esta tanda: si las de 4 estrellas no llegan al 8 % de las de 5, el reparto es sospechoso
-- (en los 12 restaurantes de la 05 siempre pasa del 9 %).
--   Pasa:      Atelier Cocktail Bar 4,5 · 952 · 4,9 %
--   Rozan:     Terraza Belvedere 4,5 · 281 · 5,7 % · Alis Rooftop 4,7 · 127 · 2,4 % · Café del Mar Meloneras 4,5 · 4.260 · 6,0 %
--   Dudosos:   New Panoramic Bar (257 de 5 y 16 de 4) · Sunset Taurito (369 de 5 y 23 de 4) · La Inquieta (133 de 5 y 5 de 4, 19 de 1)
--   Flojos:    TAJ 4,4 · Restaurante 360° 4,2 · La Pepa de Triana 4,2 · Rooftop Aloe 4,1 · Sailor's Bay 3,9 · Casa Blanca 3,5
--   Cerrados:  La Azotea de Benito y La Bohême (para siempre) · Blue Marlin Sky Lounge (para siempre) · Rosa Blanca (temporal)
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
select * from (values
  ('Atelier Cocktail Bar', 'copas', 'terraza', 'San Bartolomé de Tirajana', 'Playa del Inglés',
   'Azotea del Hotel Bohemia Suites & Spa, Av. Estados Unidos, 28', null::text, null::text, 3::smallint, null::text,
   array['Azotea','Coctelería','Bueno para ir en pareja'], null::text)
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);

select count(*) as locales from salimos.locales;
