-- Salimos · cenar en pareja en Gran Canaria (29/10/2026).
-- Cribado con Google Maps del 29/10 (nota · total de reseñas · % de 1 estrella), cruzado con Guía Repsol 2026,
-- Michelin y TripAdvisor. Entra quien tiene 4,5 o más, 300 reseñas o más (o un aval de guía),
-- menos de un 5 % de 1 estrella y un reparto normal (no todo 5 y 1, que es lo que delata compras y ataques).
--   Casa Romántica 4,7 · ~890 · Sol Repsol          Poemas 4,7 · 178 · 1,7 % · dos Soles Repsol
--   Emblemática Rooftop 4,6 · 1.831 · 3,8 %          Rêver 4,7 · 319 · 1,9 %
--   La Pizarra 4,5 · 945 · 4,3 %                     Deliciosa Marta 4,7 · 716 · 2,5 %
--   La Vicaría 4,5 · 1.117 · 3,4 %                   Samsara 4,6 · 1.309 · 3,7 %
--   La Aquarela 4,7 · 539 · 1,7 % · dos Soles        Los Guayres 4,5 · 732 · 2,7 % · estrella Michelin
--   Casa Montesdeoca 4,6 · 769 · 4,9 %               Nakar 4,6 · 458 · 3,0 %
-- Fuera: El Churrasco Meloneras (4,1 · 8 % de 1 estrella), Ciao Ciao Meloneras (4,2), Embarcadero (4,4),
-- Anno Domini (cerrado temporalmente) y Locanda El Roque (cambió de dueños en marzo de 2026: sus reseñas ya no valen).
-- Las notas de Google NO se guardan ni se enseñan en la app: aquí solo puntúa la gente de Salimos.
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
select * from (values
  ('Casa Romántica', 'restaurante', null::text, 'Agaete', 'Valle de Agaete',
   'Valle de Agaete', null::text, null::text, 2::smallint, null::text,
   array['Bueno para ir en pareja','Cocina canaria creativa','Menú degustación o carta','Vinos del Valle de Agaete','Sol Repsol'],
   'Está valle adentro: mejor ir con luz de día o con calma por la carretera.'),
  ('Poemas by Hermanos Padrón', 'restaurante', null, 'Las Palmas de Gran Canaria', 'Ciudad Jardín · Hotel Santa Catalina',
   'Hotel Santa Catalina, C. León y Castillo, 227', null, null, 3::smallint, null,
   array['Bueno para ir en pareja','Cocina de autor','Menú degustación','Dos Soles Repsol','Mejor reservar'], null),
  ('Emblemática Rooftop', 'restaurante', 'terraza', 'Arucas', 'Casco de Arucas',
   'C. Párroco Morales, 4, Arucas', null, null, 2::smallint, null,
   array['Bueno para ir en pareja','Azotea','Casco histórico','Mejor reservar'], null),
  ('Rêver Restaurante', 'restaurante', null, 'Las Palmas de Gran Canaria', 'Vegueta',
   'C. Armas, 7, Vegueta', null, null, null, null,
   array['Bueno para ir en pareja','Casco histórico de Vegueta','Mejor reservar'], null),
  ('La Pizarra: Sabores del Mar', 'restaurante', null, 'Gáldar', 'Sardina del Norte',
   'Av. Alcalde Antonio Rosas, 70, Sardina del Norte', null, null, 2::smallint, null,
   array['Bueno para ir en pareja','Pescado y marisco','Junto al mar'], null),
  ('Deliciosa Marta', 'restaurante', null, 'Las Palmas de Gran Canaria', 'Triana',
   'C. Escritor Benito Pérez Galdós, 33', null, null, 2::smallint, null,
   array['Bueno para ir en pareja','Cocina de mercado','Pocas mesas','Mejor reservar'], null),
  ('La Vicaría', 'restaurante', null, 'Ingenio', 'Casco de Ingenio',
   'Pl. de la Candelaria, 11, Ingenio', null, null, 2::smallint, null,
   array['Bueno para ir en pareja','Cocina italiana','Pasta fresca','En la plaza del pueblo'], null),
  ('Samsara', 'restaurante', null, 'San Bartolomé de Tirajana', 'Maspalomas · La Charca',
   'C.C. La Charca, Av. del Oasis, 30, 2.ª planta', null, null, 3::smallint, null,
   array['Bueno para ir en pareja','Junto a la Charca de Maspalomas','Mejor reservar'], null),
  ('La Aquarela', 'restaurante', null, 'Mogán', 'Patalavaca',
   'Apartamentos Aquamarina, Barranco de la Verga s/n, Patalavaca', null, null, 3::smallint, null,
   array['Bueno para ir en pareja','Vistas al mar','Cocina de autor','Dos Soles Repsol','Mejor reservar'], null),
  ('Los Guayres', 'restaurante', null, 'Mogán', 'Puerto de Mogán',
   'Hotel Cordial Mogán Playa, Av. de Los Marrero, 2, Puerto de Mogán', null, null, 3::smallint, null,
   array['Bueno para ir en pareja','Estrella Michelin','Menú degustación','Mejor reservar'],
   'El menú degustación no admite cambios: avisa de alergias o de si no comes algo al reservar.'),
  ('Casa Montesdeoca', 'restaurante', null, 'Las Palmas de Gran Canaria', 'Vegueta',
   'C. Montesdeoca, 10, Vegueta', null, null, 2::smallint, null,
   array['Bueno para ir en pareja','Casa colonial del siglo XVI','Casco histórico de Vegueta'], null),
  ('Nakar', 'restaurante', null, 'Las Palmas de Gran Canaria', 'Guanarteme · Las Canteras',
   'C. Fernando Guanarteme, 10', null, null, 3::smallint, null,
   array['Bueno para ir en pareja','Cocina canaria de autor','Cerca de Las Canteras','Mejor reservar'], null)
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);

select count(*) as locales from salimos.locales;
