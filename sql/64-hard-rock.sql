-- Salimos · Hard Rock Cafe Gran Canaria (Playa del Inglés), 22/11/2026. Lo pide Óscar.
-- Google Maps del 22/11: 4,0 ★ con 6.271 opiniones (por debajo del filtro ★: avisado y va porque lo pide él); 20-30 € por persona; abre a las 13:00.
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, etiquetas, lat, lng, momentos)
select 'Hard Rock Cafe Gran Canaria', 'restaurante', 'copas', 'San Bartolomé de Tirajana', 'Playa del Inglés',
       'Calle Las Dunas, 4, Playa del Inglés', '928 30 26 70', 'https://www.hardrockcafe.com', 2::smallint,
       array['Hamburguesas','Cocina americana','Música rock'], 27.7536406, -15.5700629, array['comida','cena','copas']
where not exists (select 1 from salimos.locales where nombre ilike '%hard rock%');
select id, nombre from salimos.locales where nombre ilike '%hard rock%';
