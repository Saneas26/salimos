-- Salimos · El Senador en dos fichas, 07/11/2026. Lo pide Óscar:
-- «por un lado El Senador Restaurant y por otro El Senador Beach House (tardeo y copas)».
-- La ficha de siempre pasa a ser el restaurante; el Beach House es nuevo, en la misma dirección.
-- Su voto se reparte igual que lo dictó: el restaurante con sus notas, y el Beach House
-- con las mismas salvo Ambiente (10 de copas, 9 de tardeo); carta y vinos se quedan en el restaurante.

begin;

-- 1. El Beach House, con lo que era de copas y tardeo.
insert into salimos.locales (nombre, tipo, tipo2, tipo3, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, lat, lng, video, video_autor)
select 'El Senador Beach House', 'copas', null, 'tardeo', municipio, barrio, direccion, telefono, web, precio, precios,
       array['En plena playa','Terraza chill out','DJ en directo','Animación','Shisha'], lat, lng, video, video_autor
from salimos.locales
where id = '4c10920f-84c5-4943-b282-fc58cddd1e1c'
  and not exists (select 1 from salimos.locales where nombre = 'El Senador Beach House');

-- Las mismas fotos (son del mismo sitio), copiadas en el almacén a su carpeta: la ruta no se puede repetir.
insert into salimos.fotos (local_id, usuario_id, ruta, origen, credito, creado)
select b.id, f.usuario_id, replace(f.ruta, '4c10920f-84c5-4943-b282-fc58cddd1e1c', b.id::text), f.origen, f.credito, f.creado
from salimos.fotos f, salimos.locales b
where f.local_id = '4c10920f-84c5-4943-b282-fc58cddd1e1c' and b.nombre = 'El Senador Beach House'
  and not exists (select 1 from salimos.fotos x where x.local_id = b.id);

-- 2. La ficha de siempre se queda en restaurante.
update salimos.locales set nombre = 'El Senador Restaurant', tipo2 = null, tipo3 = null, precios = null,
       etiquetas = array['En plena playa','Arroces y pescado','Vestimenta elegante']
where id = '4c10920f-84c5-4943-b282-fc58cddd1e1c';

-- Su voto: sin Música (era de copas) y sin notas de tardeo y copas, que se van al Beach House.
update salimos.votos set crit = crit - 'musica', por_categoria = '{}'::jsonb
where local_id = '4c10920f-84c5-4943-b282-fc58cddd1e1c' and usuario_id = '060a312e-b22d-4ff4-8a81-a3ebd5fcab26';

-- 3. Su voto en el Beach House, como suyo y fijo.
select set_config('request.jwt.claims','{"sub":"060a312e-b22d-4ff4-8a81-a3ebd5fcab26","email":"oscarbelloso10@gmail.com","role":"authenticated"}', true);
select public.salimos_votar((select id from salimos.locales where nombre = 'El Senador Beach House'),
  '{"limpieza":10,"ambiente":10,"servicio":8,"consumiciones":8,"precio":8,"ubicacion":8,"parking":3,"guagua":6,"musica":9}'::jsonb,
  '{"volver":"si","precio":"caro","guagua":"si","edad":"25-50,35-60"}'::jsonb, null);
select public.salimos_votar_categorias((select id from salimos.locales where nombre = 'El Senador Beach House'),
  '{"tardeo":{"ambiente":9}}'::jsonb);

commit;
