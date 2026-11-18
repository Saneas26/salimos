-- Salimos · El Mocán by Relax, 18/11/2026. Cinco fotos de Google Maps con gente (regla de Óscar):
-- el comedor lleno, la terraza con mesas ocupadas, el parrillero, el corte en mesa y el cocinero en la brasa.
insert into salimos.fotos (local_id, usuario_id, ruta, origen, credito, creado)
select '2fdee4b0-3fea-4d86-bfdc-fe4b75965025', null, 'locales/2fdee4b0-3fea-4d86-bfdc-fe4b75965025/f' || n || '.jpg', 'local', 'Foto de Google Maps', now() - (n - 1) * interval '1 minute'
from generate_series(1, 5) n
where not exists (select 1 from salimos.fotos where local_id = '2fdee4b0-3fea-4d86-bfdc-fe4b75965025');
