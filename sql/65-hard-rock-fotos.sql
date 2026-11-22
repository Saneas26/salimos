-- Salimos · Hard Rock Cafe Gran Canaria, 22/11/2026. Cinco fotos de Google Maps; primero las que tienen gente (regla de Óscar):
-- concierto en directo con público, el comedor lleno, una camarera, la fachada iluminada de noche y la terraza con vistas al mar.
insert into salimos.fotos (local_id, usuario_id, ruta, origen, credito, creado)
select '8602d64c-8aa0-4491-a52b-50b49d340478', null, 'locales/8602d64c-8aa0-4491-a52b-50b49d340478/f' || n || '.jpg', 'local', 'Foto de Google Maps', now() - (n - 1) * interval '1 minute'
from generate_series(1, 5) n
where not exists (select 1 from salimos.fotos where local_id = '8602d64c-8aa0-4491-a52b-50b49d340478');
