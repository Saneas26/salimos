-- Salimos · guachinches (30/10/2026), con el criterio de sql/05 y sql/06:
-- Google 4,5 o más, 300 reseñas o más, menos de un 5 % de 1 estrella y las de 4 estrellas al menos el 8 % de las de 5.
--   Pasan:    Motor Grande 4,8 · 3.735 · 2,4 % · Ca'tita 4,5 · 2.916 · 4,8 % · Bar Suso 4,7 · 458 · 2,4 %
--   Roza:     La Lechuza 4,7 · 248 reseñas (pocas)
--   Flojos:   Los Chorros 4,4 · Casa Josefina 4,4 · Juansito 4,4 · El Manicomio 4,3 · El Abollado 4,1
--   Cerrados: Bodega La Montaña (abre por temporada) · Los Lirios · El de la Vuelta (temporal)
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
select * from (values
  ('Guachinche Motor Grande', 'guachinche', null::text, 'Mogán', 'Mogán pueblo',
   'C. Madrid, 56, Mogán', null::text, null::text, 1::smallint, null::text,
   array['Comida canaria casera','Medias raciones','Mejor reservar'], null::text),
  ('Ca''tita', 'guachinche', null, 'Telde', 'Telde',
   'P.º Maestra María del Rosario Hernández Santana, 8L, Telde', null, null, 1::smallint, null,
   array['Asador','Raciones generosas','Comida canaria casera'], null),
  ('Bochinche Bar Suso', 'guachinche', null, 'Teror', 'Casco de Teror',
   'C. Párroco Faustino Alonso, 14, Teror', null, null, 1::smallint, null,
   array['Comida canaria casera','En el casco de Teror'], null)
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);

select count(*) as locales from salimos.locales;
