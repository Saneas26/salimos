-- Salimos · La tercera categoría admite cualquier tipo, 07/11/2026.
-- Óscar: Café del Mar también es Restaurante, sin dejar de ser Bar de copas y Terraza.
-- tipo3 nació solo para Tardeo (las apps instaladas se rompen con un tipo que no conocen en tipo/tipo2;
-- tipo3 no lo leen). Ahora admite cualquier tipo y suma sus criterios, igual que tipo2.
alter table salimos.locales drop constraint locales_tipo3_check;
alter table salimos.locales add constraint locales_tipo3_check
  check (tipo3 = any (array['tardeo','restaurante','guachinche','terraza','copas','musica','discoteca','vinoteca']));

CREATE OR REPLACE FUNCTION public.salimos_votar(p_local uuid, p_crit jsonb, p_rapidas jsonb, p_comentario text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'salimos', 'public'
AS $function$
declare
  v_tipo text; v_tipo2 text; v_tipo3 text; v_validos text[]; v_k text; v_v text; v_n int := 0; v_hoy int; v_nuevo boolean;
  v_crit jsonb := '{}'::jsonb; v_rap jsonb := '{}'::jsonb; v_com text; v_ver boolean;
begin
  if auth.uid() is null then raise exception 'Hace falta entrar con tu correo.'; end if;
  if not exists (select 1 from salimos.perfiles where id = auth.uid()) then raise exception 'Falta confirmar que tienes 18 años o más.'; end if;
  select tipo, tipo2, tipo3 into v_tipo, v_tipo2, v_tipo3 from salimos.locales where id = p_local and activo;
  if v_tipo is null then raise exception 'Ese sitio no existe.'; end if;

  v_validos := salimos.criterios_de(v_tipo, v_tipo2) || salimos.criterios_de(coalesce(v_tipo3, ''));
  for v_k, v_v in select key, value from jsonb_each_text(coalesce(p_crit, '{}'::jsonb)) loop
    if not v_k = any(v_validos) then raise exception 'Criterio no válido: %', v_k; end if;
    if v_v !~ '^(10|[0-9])$' then raise exception 'Las notas van de 0 a 10.'; end if;
    v_crit := v_crit || jsonb_build_object(v_k, v_v::int); v_n := v_n + 1;
  end loop;
  if v_n < 3 then raise exception 'Vota al menos 3 cosas.'; end if;

  for v_k, v_v in select key, value from jsonb_each_text(coalesce(p_rapidas, '{}'::jsonb)) loop
    if not salimos.rapida_valida(v_k, v_v) then raise exception 'Respuesta no válida.'; end if;
    v_rap := v_rap || jsonb_build_object(v_k, v_v);
  end loop;

  v_com := nullif(btrim(coalesce(p_comentario, '')), '');
  if char_length(v_com) > 300 and not salimos.es_admin() then raise exception 'El comentario, 300 caracteres como mucho.'; end if;

  v_nuevo := not exists (select 1 from salimos.votos where local_id = p_local and usuario_id = auth.uid());
  if v_nuevo then
    select count(*) into v_hoy from salimos.votos where usuario_id = auth.uid() and creado > now() - interval '1 day';
    if v_hoy >= 20 and not salimos.es_admin() then raise exception 'Has votado muchos sitios hoy. Sigue mañana.'; end if;
  end if;

  /* Verificado: hizo check-in en este sitio en las últimas 24 horas (o ya estaba verificado). */
  v_ver := exists (select 1 from salimos.checkins c where c.usuario_id = auth.uid() and c.local_id = p_local and c.hecho > now() - interval '24 hours');

  insert into salimos.votos (local_id, usuario_id, crit, rapidas, comentario, verificado)
  values (p_local, auth.uid(), v_crit, v_rap, v_com, v_ver)
  on conflict (local_id, usuario_id) do update
    set crit = excluded.crit, rapidas = excluded.rapidas,
        comentario = excluded.comentario,
        comentario_estado = case when salimos.votos.comentario is distinct from excluded.comentario then 'publicado' else salimos.votos.comentario_estado end,
        verificado = salimos.votos.verificado or excluded.verificado,
        actualizado = now();
  return 'ok';
end $function$;

CREATE OR REPLACE FUNCTION public.salimos_votar_categorias(p_local uuid, p_por_categoria jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'salimos', 'public'
AS $function$
declare
  v_tipo text; v_tipo2 text; v_tipo3 text; v_validos text[]; v_cat text; v_notas jsonb; v_k text; v_v text;
begin
  if auth.uid() is null then raise exception 'Hace falta entrar con tu correo.'; end if;
  select tipo, tipo2, tipo3 into v_tipo, v_tipo2, v_tipo3 from salimos.locales where id = p_local and activo;
  if v_tipo is null then raise exception 'Ese sitio no existe.'; end if;
  if jsonb_typeof(coalesce(p_por_categoria, '{}'::jsonb)) <> 'object' then raise exception 'Categorías no válidas.'; end if;
  v_validos := salimos.criterios_de(v_tipo, v_tipo2) || salimos.criterios_de(coalesce(v_tipo3, ''));
  for v_cat, v_notas in select key, value from jsonb_each(coalesce(p_por_categoria, '{}'::jsonb)) loop
    if v_cat is distinct from v_tipo2 and v_cat is distinct from v_tipo3 then raise exception 'Categoría no válida: %', v_cat; end if;
    if jsonb_typeof(v_notas) <> 'object' then raise exception 'Categorías no válidas.'; end if;
    for v_k, v_v in select key, value from jsonb_each_text(v_notas) loop
      if not v_k = any(v_validos) then raise exception 'Criterio no válido: %', v_k; end if;
      if v_v !~ '^(10|[0-9])$' then raise exception 'Las notas van de 0 a 10.'; end if;
    end loop;
  end loop;
  update salimos.votos set por_categoria = coalesce(p_por_categoria, '{}'::jsonb), actualizado = now()
  where local_id = p_local and usuario_id = auth.uid();
  if not found then raise exception 'Primero publica tu voto.'; end if;
  return 'ok';
end $function$;

-- Café del Mar Meloneras: también Restaurante (carta y vinos entran en su voto).
update salimos.locales set tipo3 = 'restaurante' where id = '3770be80-81f8-4622-8ae2-0981ac3f0029';
