-- Salimos · la primera ficha terminada: Casa Lolo (04/11/2026). Óscar: fotos, vídeo «como herramienta para darlo a conocer» y su comentario.
-- Fotos: las 3 URL que trajo Óscar (miniaturas de la búsqueda de Google: 201x251, 338x450 y 299x168). No son del local ni cedidas: el crédito no lo dice.
-- Las fotos de un local no tienen por qué colgar de un perfil: usuario_id pasa a admitir vacío (Óscar no tiene perfil de votante).
-- Portada: la de dentro; es la que mejor aguanta el tamaño (la fachada, recortada, pierde el letrero y se emborrona).
-- Vídeo: reel de @taniapyetku, con su crédito. Solo se carga en la ficha si se pulsa.
alter table salimos.locales add column if not exists nota_oscar text check (char_length(nota_oscar) <= 500);
alter table salimos.locales add column if not exists video text;
alter table salimos.locales add column if not exists video_autor text;
alter table salimos.fotos alter column usuario_id drop not null;

create or replace function public.salimos_locales()
returns jsonb language sql stable security definer set search_path = salimos, public as $$
  select coalesce(jsonb_agg(fila order by fila->>'nombre'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', l.id, 'nombre', l.nombre, 'tipo', l.tipo, 'tipo2', l.tipo2, 'municipio', l.municipio, 'barrio', l.barrio,
      'direccion', l.direccion, 'telefono', l.telefono, 'web', l.web, 'precio', l.precio, 'precios', l.precios,
      'etiquetas', to_jsonb(l.etiquetas), 'consejo', l.consejo, 'nota_oscar', l.nota_oscar, 'video', l.video, 'video_autor', l.video_autor,
      'destino', l.destino, 'lat', l.lat, 'lng', l.lng,
      'foto', (select f.ruta from salimos.fotos f where f.local_id = l.id and f.estado = 'publicada' order by (f.origen = 'local') desc, f.creado desc limit 1),
      'votos', (select count(*) from salimos.votos v where v.local_id = l.id and salimos.voto_cuenta(v.verificado)),
      'votos_total', (select count(*) from salimos.votos v where v.local_id = l.id),
      'verificados', (select count(*) from salimos.votos v where v.local_id = l.id and v.verificado),
      'crit', coalesce((
        select jsonb_object_agg(c.key, jsonb_build_object('suma', c.suma, 'n', c.n)) from (
          select e.key, sum(e.value::numeric) as suma, count(*) as n
          from salimos.votos v, jsonb_each_text(v.crit) e
          where v.local_id = l.id and salimos.voto_cuenta(v.verificado) group by e.key) c), '{}'::jsonb),
      'rapidas', coalesce((
        select jsonb_object_agg(r.clave, r.cuentas) from (
          select x.clave, jsonb_object_agg(x.valor, x.n) as cuentas from (
            select e.key as clave, e.value as valor, count(*) as n
            from salimos.votos v, jsonb_each_text(v.rapidas) e
            where v.local_id = l.id and salimos.voto_cuenta(v.verificado) group by e.key, e.value) x
          group by x.clave) r), '{}'::jsonb),
      'comentarios', (select count(*) from salimos.votos v where v.local_id = l.id and v.comentario is not null and v.comentario_estado = 'publicado')
    ) as fila
    from salimos.locales l where l.activo
  ) t
$$;

update salimos.locales set
  nota_oscar = 'Un sitio muy humilde, súper peculiar y que no defrauda a ningún viajero. A mí me encantó la sencillez, la humildad y también, por no decirlo, el precio.',
  video = 'https://www.instagram.com/reel/C79bE39og7i/',
  video_autor = 'taniapyetku'
where nombre = 'Casa Lolo';

insert into salimos.fotos (local_id, usuario_id, ruta, origen, credito, creado)
select l.id, null, 'locales/' || l.id || '/' || v.a, 'local', 'Imagen de internet', now() - v.d * interval '1 minute'
from salimos.locales l, (values ('dentro.jpg', 0), ('fachada.jpg', 1), ('mesa-valle.jpg', 2)) v(a, d)
where l.nombre = 'Casa Lolo' on conflict (ruta) do nothing;

select nombre, nota_oscar, video, (select count(*) from salimos.fotos f where f.local_id = l.id) fotos from salimos.locales l where nombre = 'Casa Lolo';

-- Mismo día: las 3 fotos mejoradas con Real-ESRGAN (×4, revisadas por Óscar): sustituyen a las miniaturas.
update salimos.fotos set ruta = replace(ruta, '.jpg', '-hd.jpg')
where ruta like 'locales/058c4f41-87ef-4aa0-8df9-6b4cb702694f/%' and ruta not like '%-hd.jpg';
