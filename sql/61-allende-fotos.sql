-- Salimos · Allende 22º, 22/11/2026. Cinco fotos de Google Maps con gente (regla de Óscar):
-- la terraza llena, un grupo brindando, comensales de noche, la terraza de noche con gente y la terraza de día.
insert into salimos.fotos (local_id, usuario_id, ruta, origen, credito, creado)
select '5aeabf43-85e6-4a2b-ab6f-f007ea160202', null, 'locales/5aeabf43-85e6-4a2b-ab6f-f007ea160202/f' || n || '.jpg', 'local', 'Foto de Google Maps', now() - (n - 1) * interval '1 minute'
from generate_series(1, 5) n
where not exists (select 1 from salimos.fotos where local_id = '5aeabf43-85e6-4a2b-ab6f-f007ea160202');
