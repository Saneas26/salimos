-- Salimos · Ocho sitios que pide Óscar, 08/11/2026 (datos de Google Maps del 08/11).
-- Ojo: Bochinche Los Alisios tiene un 13,6 % de 1 estrella; El Rincón de Vegueta solo 5 opiniones (2,8);
-- Sendro y Bar Puerto Luz son nuevos y casi sin opiniones. Van porque los pide Óscar.
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng)
select * from (values
  ('Ohasis Gastrobar', 'restaurante', 'copas', 'Santa Lucía de Tirajana', 'Vecindario', 'Calle Benartemi, 90, Vecindario', '928 90 88 31', 'http://ohasisgastrobar.com/',
   array['Gastrobar'], 27.8521257::double precision, -15.4410456::double precision),
  ('Restaurante Los Corales', 'restaurante', null, 'Telde', 'Playa de Melenara', 'Calle Luis Morote, 45, Melenara', '683 26 69 74', null,
   array['Marisquería','Pescado y marisco'], 27.9885938, -15.3744973),
  ('Sendro Restaurante', 'restaurante', null, 'Telde', 'Playa de Melenara', 'Calle Luis Morote, 25, Melenara', '605 54 12 86', 'https://restaurantesendro.es/',
   array['Recién abierto'], 27.9885419, -15.3755882),
  ('Bochinche Los Alisios', 'guachinche', null, 'Telde', 'La Garita', 'Calle de la Anémona, 2, La Garita', '623 57 80 25', null,
   array['Cocina canaria'], 28.0073322, -15.3807119),
  ('Ultramarinos Machete', 'restaurante', null, 'Las Palmas de Gran Canaria', 'Vegueta', 'Calle Mendizábal, 14, Vegueta', '928 68 95 53', null,
   array['Tapas'], 28.1020641, -15.4135351),
  ('El Rincón de Vegueta', 'restaurante', null, 'Las Palmas de Gran Canaria', 'Vegueta', 'Calle Juan E. Doreste, 8, Vegueta', null, null,
   array['Menú del día'], 28.0994853, -15.4134402),
  ('Charly''s Café', 'cafe', 'restaurante', 'Las Palmas de Gran Canaria', 'Alcaravaneras', 'Calle Luis Doreste Silva, 58, Las Palmas de Gran Canaria', '928 22 70 97', null,
   array['Desayunos','Comidas'], 28.119836, -15.4242867),
  ('Bar Puerto Luz', 'copas', null, 'Las Palmas de Gran Canaria', 'La Isleta', 'Calle Doctor Juan Domínguez Pérez, 45, Las Palmas de Gran Canaria', '637 24 46 86', 'http://barpuertoluz.com/',
   array['Bar'], 28.160139, -15.4120352)
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);
