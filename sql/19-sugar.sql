-- Salimos · Súgar (Las Palmas), 03/11/2026. Lo propone Óscar: se lo han recomendado varias personas y está de moda.
-- Google Maps del 03/11: 2,5 · 128 reseñas · 71 de 1 estrella (55 %) · 32 de 5. NO pasa el filtro y tiene el patrón de muchos 5 y muchos 1;
-- las quejas repetidas son de la puerta (porteros 27, camiseta 16, código de vestimenta 13). Avisado; entra por decisión de Óscar: «que lo voten».
-- Rooftop abierto el 15/05/2026 en la azotea de la Fundación Puertos, junto a Poema del Mar y El Muelle (Atlántico Hoy). Sin web: su Instagram.
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo, lat, lng)
select * from (values
  ('Súgar', 'discoteca', 'terraza', 'Las Palmas de Gran Canaria', 'Puerto · Muelle Deportivo',
   'Av. de Los Consignatarios', '928 65 39 59', 'https://www.instagram.com/sugar_las_palmas/', null::smallint, null::text,
   array['Azotea con vistas al Puerto','Tardeos','DJ','Zona cubierta'], 'Tiene código de vestimenta: míralo antes de ir.',
   28.1424193::double precision, -15.4283136::double precision)
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo, lat, lng)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);

select id, nombre, tipo, tipo2, telefono, web, lat, lng from salimos.locales where nombre = 'Súgar';
