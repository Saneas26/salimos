-- Salimos · Masebba Cocktail Bar, 10/11/2026. Lo pide Óscar («terraza de tardeo en San Agustín, algo como Macera»).
-- Datos de Google Maps del 10/11: 4,6 ★ con 807 opiniones; abre a las 19:00; DJ, cócteles y shisha.
insert into salimos.locales (nombre, tipo, tipo2, tipo3, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng, momentos)
select 'Masebba Cocktail Bar', 'copas', 'terraza', 'tardeo', 'San Bartolomé de Tirajana', 'San Agustín',
       'C.C. El Portón, Calle Las Retamas, 2, local 6B, San Agustín', '650 08 80 21', 'https://masebba.fun',
       array['Cócteles','Terraza','DJ','Shisha'], 27.772039, -15.541558, array['tardeo','copas']
where not exists (select 1 from salimos.locales where nombre = 'Masebba Cocktail Bar');
select nombre, tipo, tipo2, tipo3, barrio, momentos from salimos.locales where nombre = 'Masebba Cocktail Bar';
