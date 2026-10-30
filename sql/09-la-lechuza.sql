-- Salimos · La Lechuza, que rozaba el criterio de sql/08 (4,7 · 248 reseñas), dentro por decisión de Óscar (30/10/2026).
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
select * from (values
  ('Bochinche La Lechuza', 'guachinche', null::text, 'San Mateo (Vega de San Mateo)', 'Camaretas',
   'GC-15, Vega de San Mateo', null::text, null::text, 1::smallint, null::text,
   array['Comida canaria casera','Ambiente familiar','Vistas al campo'], null::text)
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);

select count(*) as locales from salimos.locales;
