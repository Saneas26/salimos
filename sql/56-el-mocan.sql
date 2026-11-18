-- Salimos · El Mocán by Relax (Maspalomas), 18/11/2026. Lo pide Óscar («el Mocán de Maspalomas»).
-- Google Maps del 18/11: 4,9 ★ con 1.705 opiniones; 20-30 € por persona; cierra a las 0:00.
-- Ojo: «El Mocán, dulces y brasas» (Av. Touroperador Tui, 18) está cerrado para siempre; este es el que abre.
insert into salimos.locales (nombre, tipo, municipio, barrio, direccion, telefono, precio, etiquetas, lat, lng, momentos)
select 'El Mocán by Relax', 'restaurante', 'San Bartolomé de Tirajana', 'Maspalomas', 'Av. Touroperador Tui, 8, Maspalomas', '653 60 46 70', 2::smallint,
       array['Carnes a la brasa','Parrilla'], 27.7613147, -15.5889656, array['comida','cena']
where not exists (select 1 from salimos.locales where nombre ilike '%moc_n%');
select id, nombre from salimos.locales where nombre ilike '%moc_n%';
