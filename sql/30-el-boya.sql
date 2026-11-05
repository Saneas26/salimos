-- Salimos · Bar Playa El Boya (El Pajar, Arguineguín), 05/11/2026. Lo pide Óscar. Google Maps del 05/11: 4,3 · 8.893 opiniones.
-- El Pajar es de San Bartolomé de Tirajana, pero entra en la zona Arguineguín por su barrio.
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, etiquetas, consejo, lat, lng, video, video_autor)
select * from (values
  ('Bar Playa El Boya', 'restaurante', null::text, 'San Bartolomé de Tirajana', 'Arguineguín · El Pajar',
   'Calle Santa Águeda, 32, El Pajar', '928 73 53 14', 'http://www.barplaya.com/ https://www.instagram.com/barplayaelboya/', 2::smallint,
   array['A pie de playa','Terraza con vistas al mar','Pescado y marisco','Paella','Pulpo frito'], 'El fin de semana, a partir de mediodía cuesta aparcar.',
   27.7525102::double precision, -15.6719971::double precision,
   'https://www.tiktok.com/@quecomerengrancanaria/video/7350765806428458273', 'quecomerengrancanaria')
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, etiquetas, consejo, lat, lng, video, video_autor)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);

-- Sus 3 fotos, subidas al almacén (terraza, paella y pulpo frente al mar).
insert into salimos.fotos (local_id, usuario_id, ruta, origen, credito, creado)
select '87b3e083-1266-4710-8960-bf020517a8a3', null, 'locales/87b3e083-1266-4710-8960-bf020517a8a3/f' || n || '.jpg', 'local', 'Foto de Google Maps', now() - (n - 1) * interval '1 minute' from generate_series(1, 3) n;
