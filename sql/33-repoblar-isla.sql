-- Salimos · Repoblar toda la isla, 05/11/2026. Óscar eligió «solo los ★».
-- Criterio ★: Google Maps 4,5 o más y 300 opiniones o más, menos de un 5 % de 1 estrella
-- y opiniones de 4 estrellas que lleguen al 8 % de las de 5 (si no, dudoso y fuera).
-- Fuera por las estrellas: La Panthère Noire, Savana Club, I Love Mogán, Capitán Hook, Mónaco Mar,
-- A Casa Mia, B-One Costa Alegre, La Catedral Bistró y Bistro Ferro.
-- El Dorado entra porque lo pide Óscar («se come muy bien»), aunque tiene 4,1.
-- Precio sin poner: Google no lo enseña en la vista que leemos; mejor vacío que inventado.
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng)
select * from (values
  -- Las Palmas de Gran Canaria
  ('Restaurante El Dorado', 'restaurante', 'terraza', 'Las Palmas de Gran Canaria', 'Guanarteme · Las Canteras',
   'Calle Numancia, 3, Las Palmas de Gran Canaria', '928 04 01 45', null, array['Terraza frente a Las Canteras','Cocina canaria','Ropa vieja de pulpo'], 28.1321413, -15.4431185),
  ('El Almacén', 'restaurante', null, 'Las Palmas de Gran Canaria', null,
   'Calle Pascal, 22, Las Palmas de Gran Canaria', '928 94 92 49', 'https://www.facebook.com/elalmacenargentino/', array['Cocina argentina','Carne a la brasa'], 28.137099, -15.4348747),
  ('Origen SteakHouse', 'restaurante', null, 'Las Palmas de Gran Canaria', 'La Isleta',
   'Calle Lanzarote, 7, Las Palmas de Gran Canaria', '828 05 06 20', 'https://origensteakhouse.com/', array['Carnes','Parrilla'], 28.1454271, -15.430462),
  ('Lupé', 'restaurante', null, 'Las Palmas de Gran Canaria', null,
   'Calle Doctor Miguel Rosas, 8, Las Palmas de Gran Canaria', '928 22 96 03', 'https://m.facebook.com/Luperestaurante/', array['Cocina de autor'], 28.1400411, -15.4329943),
  ('Restaurante Qué leche!', 'restaurante', null, 'Las Palmas de Gran Canaria', 'Triana',
   'Calle Torres, 22, Las Palmas de Gran Canaria', '607 91 78 03', 'https://restaurantequeleche.com.es/', array['Cocina de autor','Triana'], 28.1042769, -15.4170195),
  ('La Buena Vida', 'copas', null, 'Las Palmas de Gran Canaria', 'Santa Catalina',
   'Calle Ripoche, 6, Las Palmas de Gran Canaria', null, 'https://www.barlabuenavida.es/', array['Cócteles','Platos ligeros'], 28.1405114, -15.4320793),
  -- Maspalomas, Playa del Inglés y Meloneras
  ('Kobe 96', 'restaurante', null, 'San Bartolomé de Tirajana', 'Meloneras',
   'Paseo de las Meloneras, 34-35, Maspalomas', '928 77 98 56', null, array['Paseo de Meloneras'], 27.7365006, -15.6017206),
  ('The Hook Costa Meloneras', 'restaurante', null, 'San Bartolomé de Tirajana', 'Meloneras',
   'Paseo de las Meloneras, 32-33, Maspalomas', '828 71 79 30', 'https://thehooklpa.com/', array['Paseo de Meloneras'], 27.7365272, -15.6016658),
  ('Tipsy Hammock', 'copas', 'terraza', 'San Bartolomé de Tirajana', 'Playa del Inglés',
   'Paseo Costa Canaria, 24, Playa del Inglés', '621 27 87 18', 'https://www.tipsyhammock.net/', array['Cócteles','Hamacas','Frente al mar'], 27.7540342, -15.5686194),
  ('La Costa Cocktail & Bar', 'copas', 'terraza', 'San Bartolomé de Tirajana', 'Playa del Inglés',
   'Centro Comercial Atlantic Beach Club, local 1, Playa del Inglés', '633 23 98 94', 'https://lacostabar.com/', array['Cócteles','Vistas al mar'], 27.757541, -15.566737),
  ('Turbo Rock Pub', 'musica', 'copas', 'San Bartolomé de Tirajana', 'Playa del Inglés',
   'Plaza Maspalomas, Playa del Inglés', null, null, array['Rock'], 27.7601218, -15.5697131),
  -- Mogán y Arguineguín
  ('Restaurante Salunna', 'restaurante', null, 'Mogán', 'Puerto de Mogán',
   'Paseo de los Pescadores, 2, Puerto de Mogán', '678 25 87 23', 'https://salunna.eatbu.com/', array['Puerto de Mogán'], 27.8191715, -15.7642522),
  ('Jamonal de Arguineguín', 'restaurante', null, 'Mogán', 'Arguineguín',
   'Calle Alonso Quesada, 7, Arguineguín', '928 11 06 39', 'http://restaurante-jamonal-de-arguineguin.eatbu.com/', array['Jamón y embutidos'], 27.7573844, -15.6812951),
  -- Telde
  ('Casa Mario', 'restaurante', null, 'Telde', null,
   'Calle Cervantes, 3, Telde', '685 91 86 22', null, array['Bar restaurante'], 27.9964084, -15.4179277),
  ('Addio Mare', 'restaurante', null, 'Telde', null,
   'Calle Diego Ramos Galván, 11, Telde', '928 94 71 93', 'https://www.addiomare.com/', array['Cocina italiana'], 27.9960278, -15.4166808),
  ('Tasca Flamboyán', 'restaurante', null, 'Telde', null,
   'Calle Doctor Chil, 4, Telde', '600 61 27 00', 'http://www.tascaflamboyan.com/', array['Taberna','Tapas'], 28.0030758, -15.4140373),
  ('Restaurante La Tunera', 'restaurante', null, 'Telde', null,
   'Calle Betancor Fabelo, 17, Telde', '928 69 13 63', 'http://www.latunera.com/', array['Cocina de autor'], 27.9956359, -15.4170554),
  ('Grill La Piconera', 'restaurante', null, 'Telde', 'Las Medianías',
   'Calle Río Sil, 10, Las Medianías, Telde', '928 69 03 67', null, array['Parrilla','Carnes'], 27.980949, -15.42688),
  -- Norte
  ('De Enyesque', 'restaurante', null, 'Arucas', null,
   'Calle Juan de Bethencourt Domínguez, Arucas', '928 62 31 59', null, array['Cocina canaria'], 28.1173059, -15.523849),
  ('Restaurante Esterlizia', 'restaurante', null, 'Arucas', null,
   'Paseo Poeta Pedro Lezcano, 12, Arucas', '635 80 87 45', null, array['Cocina canaria'], 28.1173013, -15.5275403),
  -- Medianías
  ('La Tasquita de Santiago', 'restaurante', null, 'Santa Brígida', 'El Madroñal',
   'Caserío El Madroñal, 82, Santa Brígida', '928 64 15 07', 'https://m.facebook.com/latasquitadesantiago/', array['Desde 1982','Cocina tradicional'], 28.0215048, -15.5175484),
  -- Agüimes y Arinaga
  ('Ca''Miguel', 'restaurante', null, 'Agüimes', 'Playa de Arinaga',
   'Calle Alcalá Galiano, 17, Arinaga', '928 18 31 30', 'https://ca-miguel-arinaga.lim-servicios.com/', array['Sin gluten','Frente al mar'], 27.856717, -15.39318)
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);
