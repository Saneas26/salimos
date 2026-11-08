-- Salimos · Addio Mare San Agustín, 08/11/2026. Óscar: «hay otro en San Agustín, créalo y pon la misma puntuación que en
-- Telde excepto que el aparcamiento es un 9 y la ubicación 7». Google 08/11: 4,3 · 4.400 (C.C. San Agustín, planta 3, local 211).
-- El de Telde pasa a llamarse «Addio Mare Telde» para que no se confundan.
begin;
insert into salimos.locales (nombre, tipo, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng)
select 'Addio Mare San Agustín', 'restaurante', 'San Bartolomé de Tirajana', 'San Agustín', 'Centro Comercial San Agustín, planta 3, local 211',
       '928 77 89 24', 'https://www.addiomare.com/', array['Cocina italiana','Carne a la piedra','Pizza'], 27.7681474, -15.5484017
where not exists (select 1 from salimos.locales where nombre = 'Addio Mare San Agustín');
update salimos.locales set nombre = 'Addio Mare Telde' where id = '95dda06c-4357-478d-99cb-88fc881fc9d5';
select set_config('request.jwt.claims','{"sub":"060a312e-b22d-4ff4-8a81-a3ebd5fcab26","email":"oscarbelloso10@gmail.com","role":"authenticated"}', true);
select public.salimos_votar((select id from salimos.locales where nombre = 'Addio Mare San Agustín'),
  '{"limpieza":7,"ambiente":7,"servicio":8,"consumiciones":8,"precio":7,"ubicacion":7,"parking":9,"guagua":3,"carta":7,"vinoteca":7}'::jsonb,
  '{"volver":"si","precio":"justo","edad":"25-35,25-50,35-60"}'::jsonb,
  'Una cadena de restaurantes con una relación calidad/precio muy buena. La carne a la piedra es uno de sus platos a escoger. Las pizzas también están a buen nivel.');
commit;
