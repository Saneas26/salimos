-- Salimos · Talleres Palermo (Las Palmas de Gran Canaria), 22/11/2026. Lo pide Óscar.
-- Google Maps del 22/11: 4,5 ★ con 812 opiniones; bar con música en directo en un antiguo taller; 10-20 € por persona; abre a las 10:00.
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, etiquetas, lat, lng, momentos)
select 'Talleres Palermo', 'musica', 'copas', 'Las Palmas de Gran Canaria', 'Mesa y López',
       'Calle República Dominicana, 18, Las Palmas de Gran Canaria', '676 57 88 29', 'https://tallerespalermo.es', 1::smallint,
       array['Música en directo','Antiguo taller','Vermut','Eventos'], 28.1317928, -15.4402474, array['tardeo','copas']
where not exists (select 1 from salimos.locales where nombre ilike '%talleres palermo%');
select id, nombre from salimos.locales where nombre ilike '%talleres palermo%';
