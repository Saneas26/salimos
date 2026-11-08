-- Salimos · Dos del C.C. Sunset Beach Meloneras Playa (Calle Mar Blanco 6), 08/11/2026. Los pide Óscar.
-- La Brasa: Google 4,5 · 930 opiniones (1 estrella 4,7 %).
-- Tribu Meloneras: Google 4,3 · 1.298 (1 estrella 10,3 %: no pasaría el filtro ★, pero lo pide Óscar).
insert into salimos.locales (nombre, tipo, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng)
select * from (values
  ('La Brasa Steak y Tapas', 'restaurante', 'San Bartolomé de Tirajana', 'Maspalomas · Meloneras',
   'C.C. Sunset Beach Meloneras Playa, Calle Mar Blanco, 6, Meloneras', '649 50 12 19', 'https://labrasasteakytapas.es/',
   array['Carnes a la brasa','Tapas'], 27.7452085::double precision, -15.6114694::double precision),
  ('Tribu Meloneras', 'restaurante', 'San Bartolomé de Tirajana', 'Maspalomas · Meloneras',
   'C.C. Sunset Beach Meloneras Playa, Calle Mar Blanco, 6, planta 2, locales C224-225, Meloneras', '828 05 01 13', 'https://www.instagram.com/tribu.meloneras/',
   array['Cocina fusión asiática'], 27.7455285::double precision, -15.61165::double precision)
) v(nombre, tipo, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);
