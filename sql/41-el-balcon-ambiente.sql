-- Salimos · El Balcón, 08/11/2026. Óscar: las fotos sin gente no valen; «lo más importante es que se vea gente, ambiente
-- y pasarlo bien». Fuera las dos de antes y dentro cuatro de sus historias (brindis, inauguración, gente bailando).
-- Y «sirve para tardeo y bar de copas»: deja de ser discoteca.
delete from salimos.fotos where local_id = 'bd5d71a9-abb3-4e11-aef8-d253fa9346ed';
insert into salimos.fotos (local_id, usuario_id, ruta, origen, credito, creado)
select 'bd5d71a9-abb3-4e11-aef8-d253fa9346ed', null, 'locales/bd5d71a9-abb3-4e11-aef8-d253fa9346ed/g' || n || '.jpg', 'local', 'Foto de @elbalcon.meloneras', now() - (n - 1) * interval '1 minute'
from generate_series(1, 4) n;
update salimos.locales set tipo = 'copas', tipo2 = null, tipo3 = 'tardeo' where id = 'bd5d71a9-abb3-4e11-aef8-d253fa9346ed';
