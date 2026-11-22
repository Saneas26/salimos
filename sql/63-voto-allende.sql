-- Salimos · Voto de Óscar en Allende 22º, 22/11/2026. Pegado desde la papeleta; «¿Se llega en guagua?» sin responder; ortografía: «difícil».
begin;
select set_config('request.jwt.claims','{"sub":"060a312e-b22d-4ff4-8a81-a3ebd5fcab26","email":"oscarbelloso10@gmail.com","role":"authenticated"}', true);
select public.salimos_votar('5aeabf43-85e6-4a2b-ab6f-f007ea160202',
  '{"limpieza":8,"ambiente":9,"servicio":8,"consumiciones":7,"precio":7,"ubicacion":7,"parking":4,"guagua":6,"carta":7,"vinoteca":7,"vistas":5}'::jsonb,
  '{"volver":"si","precio":"justo","edad":"25-50"}'::jsonb,
  'Un sitio bien cuidado, mejor ir andando, está en plena avenida y difícil aparcar si vas justo de tiempo. Carta que cumple y vinos a la altura. Para una cena de amigos o pareja, saldrás contento. Tipo picoteo snack, ideal para compartir algunos platos, aunque también tienes platos a la carta.');
commit;
select crit, rapidas, comentario from salimos.votos where local_id='5aeabf43-85e6-4a2b-ab6f-f007ea160202' and usuario_id='060a312e-b22d-4ff4-8a81-a3ebd5fcab26';
