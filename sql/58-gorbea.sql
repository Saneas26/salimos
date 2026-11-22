-- Salimos · Gorbea Restaurant & Chill Out (Hotel Gloria Palace, San Agustín), 22/11/2026. Lo pide Óscar.
-- Google Maps del 22/11: 4,4 ★ con 453 opiniones; 10-60 € por persona; cocina vasca e internacional, vistas panorámicas; cierra a la 1:00.
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, etiquetas, lat, lng, momentos)
select 'Gorbea Restaurant & Chill Out', 'restaurante', 'terraza', 'San Bartolomé de Tirajana', 'San Agustín · Hotel Gloria Palace',
       'Hotel Gloria Palace, Calle Las Margaritas, s/n, San Agustín', '928 76 75 61', 'https://gloriapalaceth.com', 2::smallint,
       array['Cocina vasca','Vistas panorámicas','Chill out'], 27.7723219, -15.5470533, array['comida','cena','copas']
where not exists (select 1 from salimos.locales where nombre ilike '%gorbea%');
select id, nombre from salimos.locales where nombre ilike '%gorbea%';
