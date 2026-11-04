-- Salimos · Casa Romántica terminada (04/11/2026). Óscar: de uno en uno, tres fotos y vídeo si lo hay, buscados por Develo.
-- Fotos de su propia web (casaromanticaagaete.com/galeria): ventanal, solomillo y tomates de su huerto. Todas ≥ 1.100 px: no hacen falta mejoras.
-- OJO: su web lleva también imágenes con nombre «ChatGPT-Image-…» (fachada, salón, vino, café): generadas, no se usan.
-- Vídeo: TikTok de @localguidegrancanaria en el restaurante.
update salimos.locales set video = 'https://www.tiktok.com/@localguidegrancanaria/video/7262422272089132320', video_autor = 'localguidegrancanaria'
where nombre = 'Casa Romántica';

insert into salimos.fotos (local_id, usuario_id, ruta, origen, credito, creado)
select l.id, null, 'locales/' || l.id || '/' || v.a, 'local', 'De la web del local', now() - v.d * interval '1 minute'
from salimos.locales l, (values ('ventanal.jpg', 0), ('solomillo.jpg', 1), ('huerto.jpg', 2)) v(a, d)
where l.nombre = 'Casa Romántica' on conflict (ruta) do nothing;

select l.id, l.video, (select count(*) from salimos.fotos f where f.local_id = l.id) fotos from salimos.locales l where l.nombre = 'Casa Romántica';
