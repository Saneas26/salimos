-- Salimos · Voto de Óscar en Gorbea, 22/11/2026. Pegado desde la papeleta; ortografía corregida («más» ×2).
begin;
select set_config('request.jwt.claims','{"sub":"060a312e-b22d-4ff4-8a81-a3ebd5fcab26","email":"oscarbelloso10@gmail.com","role":"authenticated"}', true);
select public.salimos_votar('33e24d86-af28-4f84-ac8a-6b7a33473248',
  '{"limpieza":9,"ambiente":7,"servicio":7,"consumiciones":6,"precio":5,"ubicacion":10,"parking":8,"guagua":6,"carta":7,"vinoteca":8,"vistas":10}'::jsonb,
  '{"volver":"depende","precio":"caro","guagua":"coche","edad":"25-50"}'::jsonb,
  'Lo mejor, las vistas. Tiene ubicación e inversión en materiales, pero debe invertir más en el servicio. Es un lugar que podría ser mucho más, pero la calidad de la comida y el servicio dejan que desear para lo que propone. Si quieres una cita especial, que sea dentro del restaurante y en una mesa junto a la ventana.');
commit;
select crit, rapidas, comentario from salimos.votos where local_id='33e24d86-af28-4f84-ac8a-6b7a33473248' and usuario_id='060a312e-b22d-4ff4-8a81-a3ebd5fcab26';
