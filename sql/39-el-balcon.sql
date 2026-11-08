-- Salimos · El Balcón (Meloneras), 08/11/2026. Lo pide Óscar: «es el antiguo Mama Juana, ahora se llama El Balcón».
-- Sitio y coordenadas, los de Mama Juana en Google Maps (C.C. Sunset Beach Meloneras Playa, planta baja);
-- en Google aún figura como Mama Juana (discoteca, «cerrado temporalmente»). Instagram, el que dio Óscar.
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, web, etiquetas, lat, lng)
select 'El Balcón', 'copas', 'discoteca', 'San Bartolomé de Tirajana', 'Maspalomas · Meloneras',
       'C.C. Sunset Beach Meloneras Playa, Calle Mar Blanco, 6, planta baja, Meloneras',
       'https://www.instagram.com/elbacon.meloneras/', array['Antes Mama Juana'], 27.7455193, -15.6119531
where not exists (select 1 from salimos.locales where nombre = 'El Balcón');
