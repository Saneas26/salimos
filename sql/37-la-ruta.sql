-- Salimos · La Ruta (Cervecería), C.C. Meloneras Playa, al lado del H10. Lo pide Óscar, 08/11/2026.
-- Google Maps 08/11: 4,6 · 1.220 opiniones. Cervecería con cocina de pub, terraza y vistas al mar.
insert into salimos.locales (nombre, tipo, tipo2, tipo3, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng)
select 'La Ruta', 'restaurante', 'terraza', 'copas', 'San Bartolomé de Tirajana', 'Maspalomas · Meloneras',
       'C.C. Meloneras Playa, 2.ª planta, Maspalomas', '928 35 85 03', 'https://cervecerialaruta.com/',
       array['Cervecería','Cervezas de importación','Terraza con vistas al mar','Al atardecer','Hamburguesas'], 27.7460214, -15.6124088
where not exists (select 1 from salimos.locales where nombre = 'La Ruta');
