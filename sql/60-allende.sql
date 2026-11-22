-- Salimos · Restaurante Allende 22º (Av. de Tirajana, Playa del Inglés), 22/11/2026. Lo pide Óscar.
-- Google Maps del 22/11: 4,4 ★ con 3.507 opiniones; 20-30 € por persona; tapas y raciones de cocina española innovadora, con terraza; abre a las 13:30.
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, etiquetas, lat, lng, momentos)
select 'Restaurante Allende 22º', 'restaurante', 'terraza', 'San Bartolomé de Tirajana', 'Playa del Inglés',
       'Av. de Tirajana, 36, Playa del Inglés', '928 76 00 49', 'https://allenderestauracion.com', 2::smallint,
       array['Tapas y raciones','Cocina española','Terraza'], 27.7613775, -15.5786968, array['tapeo','comida','cena']
where not exists (select 1 from salimos.locales where nombre ilike '%allende%');
select id, nombre from salimos.locales where nombre ilike '%allende%';
