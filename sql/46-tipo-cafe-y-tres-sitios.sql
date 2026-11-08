-- Salimos · Nuevo tipo «Café» (desayuno, café y merienda), 08/11/2026. Óscar: «Pastelería Óscar, solo para un café,
-- desayuno o merienda. No es cena ni música; otro apartado que podemos añadir es Un café».
-- Criterios: solo los de base (criterios_de no le suma extras). Las apps instaladas (1.0.2) no conocen «cafe»:
-- un sitio con tipo «cafe» les sale sin icono hasta la 1.0.3.
alter table salimos.locales drop constraint locales_tipo_check;
alter table salimos.locales add constraint locales_tipo_check check (tipo = any (array['restaurante','guachinche','terraza','copas','musica','discoteca','vinoteca','cafe']));
alter table salimos.locales drop constraint locales_tipo2_check;
alter table salimos.locales add constraint locales_tipo2_check check (tipo2 = any (array['restaurante','guachinche','terraza','copas','musica','discoteca','vinoteca','cafe']));
alter table salimos.locales drop constraint locales_tipo3_check;
alter table salimos.locales add constraint locales_tipo3_check check (tipo3 = any (array['tardeo','restaurante','guachinche','terraza','copas','musica','discoteca','vinoteca','cafe']));

CREATE OR REPLACE FUNCTION public.salimos_recomendar(p_nombre text, p_tipo text, p_municipio text, p_direccion text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'salimos', 'public'
AS $function$
declare v_hoy int;
begin
  if auth.uid() is null then raise exception 'Hace falta entrar con tu correo.'; end if;
  if not exists (select 1 from salimos.perfiles where id = auth.uid()) then raise exception 'Falta confirmar que tienes 18 años o más.'; end if;
  if p_tipo not in ('restaurante','guachinche','terraza','copas','musica','discoteca','vinoteca','tardeo','cafe') then raise exception 'Tipo de sitio no válido.'; end if;
  select count(*) into v_hoy from salimos.recomendaciones where usuario_id = auth.uid() and creado > now() - interval '1 day';
  if v_hoy >= 10 then raise exception 'Ya has recomendado muchos sitios hoy. Gracias, sigue mañana.'; end if;
  insert into salimos.recomendaciones (usuario_id, nombre, tipo, municipio, direccion)
  values (auth.uid(), btrim(p_nombre), p_tipo, p_municipio, nullif(btrim(coalesce(p_direccion, '')), ''));
  return 'ok';
end $function$;

-- Tres sitios nuevos que pide Óscar (Google Maps, 08/11).
insert into salimos.locales (nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng)
select * from (values
  ('El Salón de la Sal', 'restaurante', null::text, 'Agüimes', 'Playa de Arinaga', 'Calle Alcalá Galiano, 2, Arinaga', '928 18 03 05', null::text,
   array['Marisquería','Pescado y marisco'], 27.8554973::double precision, -15.3937082::double precision),
  ('Terraza El Viento', 'restaurante', 'terraza', 'Santa Lucía de Tirajana', 'Pozo Izquierdo', 'Avenida Punta Tenefé, 2, Pozo Izquierdo', '928 12 10 52', 'https://www.elvientorestaurante.com/',
   array['Frente al mar'], 27.823014, -15.4233581),
  ('Pastelería Óscar', 'cafe', null, 'Santa Lucía de Tirajana', 'La Unión', 'Avenida de Canarias, 218, La Unión', '928 12 52 10', null,
   array['Desayunos','Meriendas','Pasteles y tartas'], 27.851633, -15.4408725)
) v(nombre, tipo, tipo2, municipio, barrio, direccion, telefono, web, etiquetas, lat, lng)
where not exists (select 1 from salimos.locales l where l.nombre = v.nombre);
