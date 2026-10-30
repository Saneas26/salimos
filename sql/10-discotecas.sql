-- Salimos · discotecas (30/10/2026). Ninguna llega al criterio completo (4,5 · 300 reseñas · <5 % de 1 estrella).
-- Óscar pidió las 3 mejores: se eligen por nota con reparto limpio, mirando en Maps todas las discotecas de Las Palmas y del sur.
--   Reina de la Noche 4,7 · 1.252 · 2,8 % de 1 estrella · Sparkles 4,4 · 925 · 5,0 % · 19th Hole 4,4 · 645 · 2,9 %
--   Fuera: Sala Groove (4,5, pero está en Pinto, Madrid) · Savana Club (4,5; 305 de 5, 14 de 4 y 40 de 1: reparto sospechoso)
--          Arena Negra (4,5, solo 102 reseñas) · el resto entre 2,4 y 4,2
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
select * from (values
  ('Reina de la Noche Music Bar', 'discoteca', 'musica', 'Las Palmas de Gran Canaria', 'Guanarteme · Las Canteras',
   'C. Portugal, 26', null::text, null::text, 2::smallint, null::text,
   array['Música para bailar','Ambiente de noche'], null::text),
  ('Sparkles', 'discoteca', null, 'San Bartolomé de Tirajana', 'Playa del Inglés',
   'C. Irlanda, 7, Playa del Inglés', null, null, 2::smallint, null,
   array['Música para bailar','Ambiente de noche'], null),
  ('19th Hole', 'musica', 'copas', 'San Bartolomé de Tirajana', 'Maspalomas · Meloneras',
   'C.C. Varadero, 2.ª planta, local A173, Meloneras', null, null, 2::smallint, null,
   array['Música en directo','Ambiente de noche'], null)
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);

select count(*) as locales from salimos.locales;
