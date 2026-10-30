-- Salimos · Casa Lolo (Agaete), 30/10/2026. Lo propone Óscar: sitio con carácter, económico, servicio rápido y comida muy rica.
-- Google Maps del 30/10: 4,4 · 1.204 reseñas · 4,9 % de 1 estrella · 4 estrellas = 35 % de las de 5 (reparto normal).
-- Roza el filtro (pide 4,5) como las terrazas de la 07; entra por decisión de Óscar.
-- La «web» que enseña Google (beermenu.usabi.es) no es suya: no se pone.
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo, lat, lng)
select * from (values
  ('Casa Lolo', 'restaurante', null::text, 'Agaete', 'Valle de Agaete · Los Berrazales',
   'Ctra. de Los Berrazales, km 3, Urb. La Suerte', '928 89 83 29', null::text, 1::smallint, null::text,
   array['Cocina canaria','Económico','Servicio rápido','Valle de Agaete'], null::text,
   28.0885934::double precision, -15.6768572::double precision)
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo, lat, lng)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);

select id, nombre, telefono, lat, lng from salimos.locales where nombre = 'Casa Lolo';
