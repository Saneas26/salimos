-- Salimos · Voto de Óscar en Masebba, 10/11/2026. Lo pegó desde la papeleta con La Oliva seleccionada;
-- confirma que es de Masebba (La Oliva conserva su voto del 07/11). Carta y Vinos no aplican a copas/terraza.
-- Erratas corregidas con su sí («celebrar», «shishas»).
begin;
select set_config('request.jwt.claims','{"sub":"060a312e-b22d-4ff4-8a81-a3ebd5fcab26","email":"oscarbelloso10@gmail.com","role":"authenticated"}', true);
select public.salimos_votar('99b0b87f-96d9-49a9-a381-56b4e06205c7',
  '{"limpieza":8,"ambiente":8,"servicio":7,"consumiciones":7,"precio":5,"ubicacion":7,"parking":8,"guagua":9,"vistas":7}'::jsonb,
  '{"volver":"si","precio":"caro","guagua":"si","edad":"25-35"}'::jsonb,
  'Suele haber bastante gente y a veces hay que esperar para coger mesa. Es un lugar para sentarte, tomar algo, hay música, terraza al aire libre, sitio cool, tranquilo, shishas para fumar, y para celebrar con amigos.');
commit;
select crit, rapidas, comentario from salimos.votos where local_id='99b0b87f-96d9-49a9-a381-56b4e06205c7';
select crit->>'ambiente' amb_oliva, comentario from salimos.votos where local_id='26a4b252-e67f-4d47-b3d6-a2901906e549' and usuario_id='060a312e-b22d-4ff4-8a81-a3ebd5fcab26';
