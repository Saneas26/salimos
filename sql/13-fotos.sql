-- Salimos · fotos de los sitios (30/10/2026). Decisión de Óscar: las suben quienes votan y los propios locales.
-- Nunca se copian de Google, Pinterest ni TripAdvisor (tienen dueño).
--   · Quien vota: solo con un check-in vivo en ese sitio (estuvo allí) y con la cámara. Se publica al momento,
--     se puede denunciar y con 3 denuncias distintas se retira sola, como los comentarios.
--   · Los locales: las sube un administrador (Óscar) con el permiso del local y su crédito («Foto: el local»).
-- Ruta en el almacén: <uid>/<local>/<marca>.jpg. El móvil la reduce y la vuelve a codificar: sin datos GPS.

-- Administrador: Óscar.
insert into salimos.admins (email) values ('oscarbelloso10@gmail.com') on conflict do nothing;

-- El almacén solo ve el uid (no el correo): para las políticas hace falta este.
create or replace function salimos.es_admin_uid()
returns boolean language sql stable security definer set search_path = salimos, public as $$
  select exists (select 1 from salimos.admins a join auth.users u on lower(u.email) = a.email where u.id = auth.uid())
$$;

create table if not exists salimos.fotos (
  id         uuid primary key default gen_random_uuid(),
  local_id   uuid not null references salimos.locales(id) on delete cascade,
  usuario_id uuid not null references salimos.perfiles(id) on delete cascade,   -- se borran con la cuenta
  ruta       text not null unique check (char_length(ruta) <= 200),
  origen     text not null check (origen in ('votante', 'local')),
  credito    text check (char_length(credito) <= 80),
  estado     text not null default 'publicada' check (estado in ('publicada', 'retirada')),
  creado     timestamptz not null default now()
);
create index if not exists fotos_local on salimos.fotos (local_id, creado desc);
alter table salimos.fotos enable row level security;
revoke all on salimos.fotos from public, anon, authenticated;

create table if not exists salimos.fotos_denuncias (
  foto_id    uuid not null references salimos.fotos(id) on delete cascade,
  quien      text not null,                -- uid o, sin cuenta, una huella del móvil
  motivo     text check (char_length(motivo) <= 200),
  creado     timestamptz not null default now(),
  primary key (foto_id, quien)
);
alter table salimos.fotos_denuncias enable row level security;
revoke all on salimos.fotos_denuncias from public, anon, authenticated;

-- ¿Puede subir a la carpeta de este sitio? Check-in vivo (24 h) o administrador.
create or replace function public.salimos_puede_subir_foto(p_local text)
returns boolean language sql stable security definer set search_path = salimos, public as $$
  select auth.uid() is not null and exists (select 1 from salimos.perfiles where id = auth.uid())
     and (salimos.es_admin_uid() or exists (
           select 1 from salimos.checkins c where c.usuario_id = auth.uid() and c.local_id::text = p_local
             and c.hecho > now() - interval '24 hours'))
$$;
revoke all on function public.salimos_puede_subir_foto(text) from public, anon;
grant execute on function public.salimos_puede_subir_foto(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('salimos-fotos', 'salimos-fotos', true, 3145728, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg'];

drop policy if exists "salimos fotos: subir" on storage.objects;
create policy "salimos fotos: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'salimos-fotos' and (storage.foldername(name))[1] = auth.uid()::text
              and public.salimos_puede_subir_foto((storage.foldername(name))[2]));
drop policy if exists "salimos fotos: borrar las mías" on storage.objects;
create policy "salimos fotos: borrar las mías" on storage.objects for delete to authenticated
  using (bucket_id = 'salimos-fotos' and ((storage.foldername(name))[1] = auth.uid()::text or salimos.es_admin_uid()));

-- Apuntar la foto ya subida.
create or replace function public.salimos_foto_registrar(p_local uuid, p_ruta text, p_credito text default null)
returns jsonb language plpgsql security definer set search_path = salimos, public as $$
declare v_admin boolean := salimos.es_admin_uid(); v_hoy int; v_id uuid;
begin
  if not public.salimos_puede_subir_foto(p_local::text) then
    raise exception 'Para subir una foto tienes que haber hecho check-in en este sitio en las últimas 24 horas.';
  end if;
  if p_ruta !~ ('^' || auth.uid()::text || '/' || p_local::text || '/[A-Za-z0-9_-]+\.jpg$') then raise exception 'Foto no válida.'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'salimos-fotos' and name = p_ruta) then raise exception 'La foto no ha llegado. Prueba otra vez.'; end if;
  if not v_admin then
    select count(*) into v_hoy from salimos.fotos where usuario_id = auth.uid() and creado > now() - interval '1 day';
    if v_hoy >= 10 then raise exception 'Has subido muchas fotos hoy. Sigue mañana.'; end if;
  end if;
  insert into salimos.fotos (local_id, usuario_id, ruta, origen, credito)
  values (p_local, auth.uid(), p_ruta, case when v_admin then 'local' else 'votante' end,
          case when v_admin then nullif(btrim(coalesce(p_credito, '')), '') end)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.salimos_fotos(p_local uuid)
returns jsonb language sql stable security definer set search_path = salimos, public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'ruta', f.ruta, 'origen', f.origen, 'credito', f.credito,
           'fecha', f.creado, 'mia', f.usuario_id = auth.uid()) order by (f.origen = 'local') desc, f.creado desc), '[]'::jsonb)
  from salimos.fotos f where f.local_id = p_local and f.estado = 'publicada'
$$;

create or replace function public.salimos_denunciar_foto(p_foto uuid, p_quien text, p_motivo text)
returns text language plpgsql security definer set search_path = salimos, public as $$
declare v_quien text := coalesce(auth.uid()::text, 'anon:' || left(coalesce(p_quien, ''), 64)); v_n int;
begin
  if v_quien = 'anon:' then raise exception 'No se ha podido enviar.'; end if;
  if auth.uid() is null and (select count(*) from salimos.fotos_denuncias where quien = v_quien and creado > now() - interval '1 hour') >= 30 then
    raise exception 'Demasiadas denuncias seguidas. Prueba más tarde.';
  end if;
  insert into salimos.fotos_denuncias (foto_id, quien, motivo) values (p_foto, v_quien, left(nullif(btrim(coalesce(p_motivo, '')), ''), 200))
  on conflict do nothing;
  select count(*) into v_n from salimos.fotos_denuncias where foto_id = p_foto;
  if v_n >= 3 then update salimos.fotos set estado = 'retirada' where id = p_foto; end if;
  return 'ok';
end $$;

create or replace function public.salimos_retirar_foto(p_foto uuid)
returns text language plpgsql security definer set search_path = salimos, public as $$
begin
  update salimos.fotos set estado = 'retirada'
  where id = p_foto and (usuario_id = auth.uid() or salimos.es_admin_uid());
  if not found then raise exception 'No puedes quitar esta foto.'; end if;
  return 'ok';
end $$;

revoke all on function public.salimos_foto_registrar(uuid, text, text), public.salimos_retirar_foto(uuid) from public, anon;
grant execute on function public.salimos_foto_registrar(uuid, text, text), public.salimos_retirar_foto(uuid) to authenticated;
grant execute on function public.salimos_fotos(uuid), public.salimos_denunciar_foto(uuid, text, text) to anon, authenticated;

-- La portada de cada sitio: la del local si la hay; si no, la más reciente.
create or replace function public.salimos_locales()
returns jsonb language sql stable security definer set search_path = salimos, public as $$
  select coalesce(jsonb_agg(fila order by fila->>'nombre'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', l.id, 'nombre', l.nombre, 'tipo', l.tipo, 'tipo2', l.tipo2, 'municipio', l.municipio, 'barrio', l.barrio,
      'direccion', l.direccion, 'telefono', l.telefono, 'web', l.web, 'precio', l.precio, 'precios', l.precios,
      'etiquetas', to_jsonb(l.etiquetas), 'consejo', l.consejo,
      'destino', l.destino, 'lat', l.lat, 'lng', l.lng,
      'foto', (select f.ruta from salimos.fotos f where f.local_id = l.id and f.estado = 'publicada' order by (f.origen = 'local') desc, f.creado desc limit 1),
      'votos', (select count(*) from salimos.votos v where v.local_id = l.id and salimos.voto_cuenta(v.verificado)),
      'votos_total', (select count(*) from salimos.votos v where v.local_id = l.id),
      'verificados', (select count(*) from salimos.votos v where v.local_id = l.id and v.verificado),
      'crit', coalesce((
        select jsonb_object_agg(c.key, jsonb_build_object('suma', c.suma, 'n', c.n)) from (
          select e.key, sum(e.value::numeric) as suma, count(*) as n
          from salimos.votos v, jsonb_each_text(v.crit) e
          where v.local_id = l.id and salimos.voto_cuenta(v.verificado) group by e.key) c), '{}'::jsonb),
      'rapidas', coalesce((
        select jsonb_object_agg(r.clave, r.cuentas) from (
          select x.clave, jsonb_object_agg(x.valor, x.n) as cuentas from (
            select e.key as clave, e.value as valor, count(*) as n
            from salimos.votos v, jsonb_each_text(v.rapidas) e
            where v.local_id = l.id and salimos.voto_cuenta(v.verificado) group by e.key, e.value) x
          group by x.clave) r), '{}'::jsonb),
      'comentarios', (select count(*) from salimos.votos v where v.local_id = l.id and v.comentario is not null and v.comentario_estado = 'publicado')
    ) as fila
    from salimos.locales l where l.activo
  ) t
$$;
