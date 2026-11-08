-- Salimos · Il Vespino Vecchio (Maspalomas), 08/11/2026. Óscar preguntó por qué no salía: no se había dado de alta
-- (la búsqueda del 05/11 en Google Maps solo enseñaba 6 restaurantes del sur y no apareció).
-- Google Maps 08/11: 4,6 · 1.601 opiniones; 1 estrella 2,6 %, 4 estrellas = 20 % de las de 5 → pasa el criterio ★.
insert into salimos.locales (nombre, tipo, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng)
select 'Il Vespino Vecchio', 'restaurante', 'San Bartolomé de Tirajana', 'Maspalomas', 'Calle los Jazmines, 4, Maspalomas', '673 32 38 27',
       'http://www.ilvespinovecchio.com/', array['Cocina italiana'], 27.7729828, -15.5397065
where not exists (select 1 from salimos.locales where nombre = 'Il Vespino Vecchio');
