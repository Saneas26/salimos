-- Salimos · Asador Las Lilas, 18/11/2026. Cinco fotos de Google Maps; primero las que tienen gente (regla de Óscar):
-- comensales junto al ventanal, el comedor lleno, la barra, la terraza con sombrillas y la cámara de maduración.
insert into salimos.fotos (local_id, usuario_id, ruta, origen, credito, creado)
select 'addfa400-846a-48a9-85ea-8e44e48c71a8', null, 'locales/addfa400-846a-48a9-85ea-8e44e48c71a8/f' || n || '.jpg', 'local', 'Foto de Google Maps', now() - (n - 1) * interval '1 minute'
from generate_series(1, 5) n
where not exists (select 1 from salimos.fotos where local_id = 'addfa400-846a-48a9-85ea-8e44e48c71a8');
