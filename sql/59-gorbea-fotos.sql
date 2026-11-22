-- Salimos · Gorbea, 22/11/2026. Cinco fotos de Google Maps; primero las que tienen gente (regla de Óscar):
-- dos comensales con las vistas de noche, una clienta en mesa, el servicio con campana, el comedor con vistas al mar y la azotea al atardecer.
insert into salimos.fotos (local_id, usuario_id, ruta, origen, credito, creado)
select '33e24d86-af28-4f84-ac8a-6b7a33473248', null, 'locales/33e24d86-af28-4f84-ac8a-6b7a33473248/f' || n || '.jpg', 'local', 'Foto de Google Maps', now() - (n - 1) * interval '1 minute'
from generate_series(1, 5) n
where not exists (select 1 from salimos.fotos where local_id = '33e24d86-af28-4f84-ac8a-6b7a33473248');
-- La primera, recortada en apaisado (los dos comensales) para la cabecera de la ficha.
update salimos.fotos set ruta = 'locales/33e24d86-af28-4f84-ac8a-6b7a33473248/f1b.jpg' where ruta = 'locales/33e24d86-af28-4f84-ac8a-6b7a33473248/f1.jpg';
