-- Salimos · Masebba, 10/11/2026. Cinco fotos de Google Maps con gente y ambiente (regla de Óscar):
-- música en directo de noche, la terraza llena, el cartel «Sorry mum, I'm in Masebba» y el DJ.
insert into salimos.fotos (local_id, usuario_id, ruta, origen, credito, creado)
select '99b0b87f-96d9-49a9-a381-56b4e06205c7', null, 'locales/99b0b87f-96d9-49a9-a381-56b4e06205c7/f' || n || '.jpg', 'local', 'Foto de Google Maps', now() - (n - 1) * interval '1 minute'
from generate_series(1, 5) n
where not exists (select 1 from salimos.fotos where local_id = '99b0b87f-96d9-49a9-a381-56b4e06205c7');
