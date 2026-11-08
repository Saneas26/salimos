-- Salimos · Óscar votó El Salón de la Sal creyendo que era Terraza El Viento (su comentario habla de Pozo Izquierdo).
-- 08/11/2026: el voto pasa tal cual a Terraza El Viento y se quita de El Salón de la Sal.
begin;
select set_config('request.jwt.claims','{"sub":"060a312e-b22d-4ff4-8a81-a3ebd5fcab26","email":"oscarbelloso10@gmail.com","role":"authenticated"}', true);
select public.salimos_votar((select id from salimos.locales where nombre = 'Terraza El Viento'), v.crit, v.rapidas, v.comentario)
from salimos.votos v join salimos.locales l on l.id = v.local_id
where l.nombre = 'El Salón de la Sal' and v.usuario_id = '060a312e-b22d-4ff4-8a81-a3ebd5fcab26';
delete from salimos.votos v using salimos.locales l
where l.id = v.local_id and l.nombre = 'El Salón de la Sal' and v.usuario_id = '060a312e-b22d-4ff4-8a81-a3ebd5fcab26'
  and exists (select 1 from salimos.votos x join salimos.locales y on y.id = x.local_id
              where y.nombre = 'Terraza El Viento' and x.usuario_id = '060a312e-b22d-4ff4-8a81-a3ebd5fcab26');
commit;
