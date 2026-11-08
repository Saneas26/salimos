-- Salimos · Seis que pide Óscar, 08/11/2026: cinco de la Avenida de Tirajana (Playa del Inglés) y el tailandés
-- de al lado de Il Vespino Vecchio (Calle los Jazmines 4). Datos de Google Maps del 08/11.
-- Ojo: 450Gradi (1 estrella 8,3 %) y Sa-wa-dee (9,5 %) no pasarían el filtro ★; van porque los pide Óscar.
insert into salimos.locales (nombre, tipo, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng)
select * from (values
  ('Sakura', 'restaurante', 'San Bartolomé de Tirajana', 'Playa del Inglés', 'Avenida de Tirajana, 10, Playa del Inglés', '928 76 55 27', 'http://www.sakuracanarias.com/',
   array['Cocina japonesa','Sushi'], 27.7508233::double precision, -15.5767925::double precision),
  ('Calma Chicha', 'restaurante', 'San Bartolomé de Tirajana', 'Playa del Inglés', 'Avenida de Tirajana, 4, Playa del Inglés', '928 76 07 14', 'https://www.restaurantecalmachicha.com/',
   array['Cocina europea contemporánea'], 27.7482076, -15.5766298),
  ('Iguazú Lounge', 'copas', 'San Bartolomé de Tirajana', 'Playa del Inglés', 'Residencia Iguazú, Avenida de Tirajana, Playa del Inglés', '928 24 45 85', null,
   array['Cócteles','Lounge'], 27.7563048, -15.5783743),
  ('La Grande Crêperie', 'restaurante', 'San Bartolomé de Tirajana', 'Playa del Inglés', 'Avenida de Tirajana, 3, Playa del Inglés', '626 77 53 79', null,
   array['Crepes','Cocina francesa'], 27.7517563, -15.5774542),
  ('450 Gradi', 'restaurante', 'San Bartolomé de Tirajana', 'Playa del Inglés', 'Avenida de Tirajana, 5, Playa del Inglés', '928 96 07 56', 'https://450-gradi.com/es/restaurante-maspalomas.html',
   array['Cocina italiana','Pizza'], 27.7529809, -15.5778257),
  ('Sa-wa-dee', 'restaurante', 'San Bartolomé de Tirajana', 'Maspalomas', 'Calle los Jazmines, 4, Maspalomas', '828 66 64 34', 'http://sawadeegrancanaria.com/',
   array['Cocina tailandesa'], 27.7731857, -15.5393877)
) v(nombre, tipo, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);
