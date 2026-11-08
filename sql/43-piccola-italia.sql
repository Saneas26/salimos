-- Salimos · Ristorante Piccola Italia (C.C. San Agustín), 08/11/2026. Lo pide Óscar.
-- Google Maps 08/11: 4,5 · 949 opiniones (1 estrella 4,2 %).
insert into salimos.locales (nombre, tipo, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng)
select 'Piccola Italia', 'restaurante', 'San Bartolomé de Tirajana', 'San Agustín', 'Centro Comercial San Agustín, 2.ª planta, local 156',
       '928 77 41 22', 'http://www.ristorantepiccolaitalia.com/', array['Cocina italiana'], 27.7682501, -15.5481407
where not exists (select 1 from salimos.locales where nombre = 'Piccola Italia');
