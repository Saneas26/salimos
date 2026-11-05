-- Salimos · La Oliva Restaurante (La Puntilla, Las Canteras), 05/11/2026. Lo pide Óscar: «me gusta mucho».
-- Google Maps del 05/11: 3,9 · 3.564 opiniones. Mediterráneo con menú del día y terraza frente a la playa.
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, etiquetas, consejo, lat, lng)
select * from (values
  ('La Oliva Restaurante', 'restaurante', 'terraza', 'Las Palmas de Gran Canaria', 'La Puntilla · Las Canteras',
   'Calle Prudencio Morales, 15, Las Palmas de Gran Canaria', '928 46 97 57', 'https://laolivarestaurante.com/', 2::smallint,
   array['Terraza frente a Las Canteras','Cocina mediterránea','Menú del día','Papas arrugadas y boquerones','Paella'], null::text,
   28.1487646::double precision, -15.4315134::double precision)
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, etiquetas, consejo, lat, lng)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);
