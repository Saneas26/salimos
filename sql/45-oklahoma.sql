-- Salimos · Cervecería Oklahoma (Vecindario), 08/11/2026. Lo pide Óscar. Google 08/11: 4,3 · 821 opiniones (1 estrella 5,5 %).
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, etiquetas, lat, lng)
select 'Cervecería Oklahoma', 'copas', 'restaurante', 'Santa Lucía de Tirajana', 'Vecindario', 'Avenida del Atlántico, 723, Vecindario',
       '928 79 20 45', array['Cervecería','Abre por la noche'], 27.8602946, -15.4275858
where not exists (select 1 from salimos.locales where nombre = 'Cervecería Oklahoma');
