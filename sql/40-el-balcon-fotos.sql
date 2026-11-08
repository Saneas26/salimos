-- Salimos · Fotos de El Balcón, 08/11/2026. Óscar: la de Google no era del local; usar sus historias de Instagram.
-- Dos capturas de @elbalcon.meloneras, recortadas para que no salga ningún cliente y mejoradas (Real-ESRGAN).
insert into salimos.fotos (local_id, usuario_id, ruta, origen, credito, creado)
select 'bd5d71a9-abb3-4e11-aef8-d253fa9346ed', null, 'locales/bd5d71a9-abb3-4e11-aef8-d253fa9346ed/f' || n || '.jpg', 'local', 'Foto de @elbalcon.meloneras', now() - (n - 1) * interval '1 minute'
from generate_series(1, 2) n
where not exists (select 1 from salimos.fotos where local_id = 'bd5d71a9-abb3-4e11-aef8-d253fa9346ed');
