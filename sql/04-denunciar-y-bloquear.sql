-- Salimos · denunciar y bloquear comentarios (29/10/2026).
-- Lo exige Apple (norma 1.2) a toda app con contenido que escriben los usuarios:
-- poder denunciar un comentario y dejar de ver los de quien molesta. Google pide lo mismo.
--
-- Nadie ve de quién es un comentario: cada uno lleva un «autor» opaco (un resumen del id de la
-- cuenta), igual en todos los sitios, que sirve para bloquear sin saber quién es.
-- Bloquear es cosa del móvil de cada uno (se guarda allí); denunciar llega aquí.
-- Con 3 denuncias de personas distintas, el comentario se retira solo hasta que Óscar lo mire.

create table if not exists salimos.denuncias (
  id          bigserial primary key,
  local_id    uuid not null references salimos.locales(id) on delete cascade,
  autor       text not null,
  texto       text not null,
  motivo      text check (char_length(motivo) <= 200),
  denunciante uuid references auth.users(id) on delete set null,
  creado      timestamptz not null default now(),
  revisada    boolean not null default false
);
alter table salimos.denuncias enable row level security;
revoke all on salimos.denuncias from public, anon, authenticated;
create unique index if not exists denuncias_una_por_persona on salimos.denuncias (local_id, autor, denunciante);

create or replace function salimos.autor_de(p_usuario uuid)
returns text language sql immutable as $$ select left(md5('salimos-autor:' || p_usuario::text), 16) $$;

create or replace function public.salimos_comentarios(p_local uuid)
returns jsonb language sql stable security definer set search_path = salimos, public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'texto', v.comentario, 'fecha', v.actualizado, 'autor', salimos.autor_de(v.usuario_id),
           'mio', v.usuario_id = auth.uid()) order by v.actualizado desc), '[]'::jsonb)
  from (select * from salimos.votos
        where local_id = p_local and comentario is not null and comentario_estado = 'publicado'
        order by actualizado desc limit 100) v
$$;

create or replace function public.salimos_denunciar(p_local uuid, p_autor text, p_motivo text)
returns text language plpgsql security definer set search_path = salimos, public as $$
declare v_usuario uuid; v_texto text; v_n int;
begin
  select usuario_id, comentario into v_usuario, v_texto
    from salimos.votos
   where local_id = p_local and salimos.autor_de(usuario_id) = p_autor
     and comentario is not null and comentario_estado = 'publicado';
  if v_usuario is null then return 'ok'; end if;              -- ya no está: nada que hacer
  if v_usuario = auth.uid() then raise exception 'Ese comentario es tuyo.'; end if;
  -- Sin cuenta también se puede denunciar, con tope para que no se abuse.
  if auth.uid() is null and (select count(*) from salimos.denuncias where denunciante is null and creado > now() - interval '1 hour') >= 30 then
    return 'ok';
  end if;
  insert into salimos.denuncias (local_id, autor, texto, motivo, denunciante)
  values (p_local, p_autor, v_texto, nullif(btrim(coalesce(p_motivo, '')), ''), auth.uid())
  on conflict do nothing;
  select count(distinct coalesce(denunciante::text, id::text)) into v_n
    from salimos.denuncias where local_id = p_local and autor = p_autor and not revisada;
  if v_n >= 3 then
    update salimos.votos set comentario_estado = 'retirado' where local_id = p_local and usuario_id = v_usuario;
  end if;
  return 'ok';
end $$;

-- Para el panel de Óscar: las denuncias sin revisar, con el comentario y el sitio.
create or replace function public.salimos_admin_denuncias()
returns jsonb language sql stable security definer set search_path = salimos, public as $$
  select case when not salimos.es_admin() then null else coalesce(jsonb_agg(jsonb_build_object(
    'local', l.nombre, 'local_id', d.local_id, 'texto', d.texto, 'motivo', d.motivo, 'fecha', d.creado,
    'retirado', v.comentario_estado = 'retirado') order by d.creado desc), '[]'::jsonb) end
  from salimos.denuncias d join salimos.locales l on l.id = d.local_id
  left join salimos.votos v on v.local_id = d.local_id and salimos.autor_de(v.usuario_id) = d.autor
  where not d.revisada
$$;

revoke all on function public.salimos_denunciar(uuid, text, text), public.salimos_admin_denuncias() from public, anon, authenticated;
grant execute on function public.salimos_denunciar(uuid, text, text) to anon, authenticated;
grant execute on function public.salimos_admin_denuncias() to authenticated;
grant execute on function public.salimos_comentarios(uuid) to anon, authenticated;

select 'denuncias listas' as resultado;
