-- Salimos · el comentario del administrador no tiene tope (05/11/2026). Decisión de Óscar: lo que él dicta se escribe entero.
-- Para los demás siguen los 300 caracteres. El orden importa: el disparador pone fijo antes de que se compruebe la restricción.
alter table salimos.votos drop constraint if exists votos_comentario_check;
alter table salimos.votos add constraint votos_comentario_check check (fijo or char_length(comentario) <= 300);

CREATE OR REPLACE FUNCTION public.salimos_votar(p_local uuid, p_crit jsonb, p_rapidas jsonb, p_comentario text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'salimos', 'public'
AS $function$
declare
  v_tipo text; v_tipo2 text; v_validos text[]; v_k text; v_v text; v_n int := 0; v_hoy int; v_nuevo boolean;
  v_crit jsonb := '{}'::jsonb; v_rap jsonb := '{}'::jsonb; v_com text; v_ver boolean;
begin
  if auth.uid() is null then raise exception 'Hace falta entrar con tu correo.'; end if;
  if not exists (select 1 from salimos.perfiles where id = auth.uid()) then raise exception 'Falta confirmar que tienes 18 años o más.'; end if;
  select tipo, tipo2 into v_tipo, v_tipo2 from salimos.locales where id = p_local and activo;
  if v_tipo is null then raise exception 'Ese sitio no existe.'; end if;

  v_validos := salimos.criterios_de(v_tipo, v_tipo2);
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

-- El Boya: lo que cuenta Óscar sobre el sitio.
update salimos.locales set precio = 1,
  consejo = 'Cierra miércoles y jueves. En los días punta se coge número y puedes tardar una hora en pasar.'
where id = '87b3e083-1266-4710-8960-bf020517a8a3';
