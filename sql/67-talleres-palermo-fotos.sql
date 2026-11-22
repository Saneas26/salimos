-- Salimos · Talleres Palermo, 22/11/2026. Cinco fotos de Google Maps; primero las que tienen gente (regla de Óscar):
-- concierto con guitarra y público, el patio lleno de gente, un evento con escenario, gente en las mesas y el ambiente del taller.
insert into salimos.fotos (local_id, usuario_id, ruta, origen, credito, creado)
select '67302a59-487b-4a1a-bb66-ff40fd0f4471', null, 'locales/67302a59-487b-4a1a-bb66-ff40fd0f4471/f' || n || '.jpg', 'local', 'Foto de Google Maps', now() - (n - 1) * interval '1 minute'
from generate_series(1, 5) n
where not exists (select 1 from salimos.fotos where local_id = '67302a59-487b-4a1a-bb66-ff40fd0f4471');
