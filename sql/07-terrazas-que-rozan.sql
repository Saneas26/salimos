-- Salimos · las tres terrazas que rozaban el criterio de sql/06, dentro por decisión de Óscar (30/10/2026).
--   Terraza Belvedere 4,5 · 281 · 5,7 % de 1 estrella · Alis Rooftop 4,7 · 127 · 2,4 % · Café del Mar Meloneras 4,5 · 4.260 · 6,0 %
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
select * from (values
  ('Terraza Belvedere', 'terraza', 'copas', 'Las Palmas de Gran Canaria', 'Vegueta',
   'Hotel Cordial Plaza Mayor de Santa Ana, Plaza de Santa Ana, 5', null::text, null::text, 2::smallint, null::text,
   array['Azotea','Frente a la Catedral de Santa Ana','Al atardecer','Bueno para ir en pareja'], null::text),
  ('Alis Rooftop', 'terraza', 'copas', 'Las Palmas de Gran Canaria', 'Ciudad Jardín · Hotel Santa Catalina',
   'Hotel Santa Catalina, C. León y Castillo, 227', null, null, 3::smallint, null,
   array['Azotea','Coctelería','Piscina','Bueno para ir en pareja'], null),
  ('Café del Mar Meloneras', 'copas', 'terraza', 'San Bartolomé de Tirajana', 'Maspalomas · Meloneras',
   'Plaza del Faro, 3D, Meloneras', null, null, 3::smallint, null,
   array['Frente al mar','Junto al Faro de Maspalomas','Al atardecer','Música chill out'], null)
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);

select count(*) as locales from salimos.locales;
