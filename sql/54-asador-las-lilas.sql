-- Salimos · Asador Las Lilas Carrizal, 18/11/2026. Lo pide Óscar.
-- Google Maps del 18/11: 4,5 ★ con 1.302 opiniones; 30-70 € por persona; abre a las 13:00, cierra a las 23:00.
insert into salimos.locales (nombre, tipo, municipio, barrio, direccion, telefono, precio, etiquetas, lat, lng, momentos)
select 'Asador Las Lilas', 'restaurante', 'Ingenio', 'El Carrizal', 'Paseo de Gando, Las Majoreras, El Carrizal', '928 30 72 24', 3::smallint,
       array['Carnes a la brasa','Chuletón','Bodega de vinos','Jamón'], 27.9168671, -15.3996277, array['comida','cena']
where not exists (select 1 from salimos.locales where nombre ilike '%las lilas%');
select id, nombre, municipio, barrio, momentos from salimos.locales where nombre = 'Asador Las Lilas';
