-- Salimos · dos sitios más que propone Óscar (29/10/2026).
-- Datos de directorios públicos (sandbeds.com, lopesan.com, schlouk-map.com); fotos, ninguna.
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
select * from (values
  ('Chester Meloneras Club & Lounge', 'discoteca', null::text, 'San Bartolomé de Tirajana', 'Maspalomas · Meloneras',
   'Bajo el Gran Casino Costa Meloneras, Meloneras', null::text, null::text, 3::smallint, null::text,
   array['Lounge al aire libre','DJ y actuaciones en directo','House y comercial','Vestimenta arreglada','Mejor reservar'],
   'No abre todas las noches: mira su agenda antes de ir.'),
  ('Mojito Sur', 'copas', null, 'San Bartolomé de Tirajana', 'Playa del Inglés · C.C. Kasbah',
   'C.C. Kasbah, Playa del Inglés', null, null, null, null,
   array['Terraza','Ambiente de noche','Viernes y sábado'],
   'Según los directorios abre viernes y sábado, de 21:00 a 04:00.')
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, precio, precios, etiquetas, consejo)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);

select nombre, tipo from salimos.locales order by creado;
