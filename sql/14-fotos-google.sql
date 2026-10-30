-- Salimos · fotos de Google Maps por su servicio oficial (Places API New), 30/10/2026. Decisión de Óscar.
-- Las reglas de Google: la foto NO se guarda ni se copia; se pide cada vez y se enseña con su autor,
-- el enlace a su origen en Google Maps y la marca «Google Maps». Lo único que se puede guardar es el place_id.
-- Coste: buscar el sitio y pedir la lista de fotos (solo ids) es gratis; cada foto servida cuenta en
-- «Place Details Photos», que trae 1.000 gratis al mes y luego cobra 7 $ cada 1.000.
-- Por eso hay un tope de 30 fotos al día (900 al mes como mucho): con él, Google no cobra nunca.
-- Las fotos propias (de quien estuvo allí y de los locales) van siempre antes: con una, ya no se pide a Google.

alter table salimos.locales add column if not exists google_place_id text;

create table if not exists salimos.google_uso (
  dia date primary key,
  n   int not null default 0
);
alter table salimos.google_uso enable row level security;
revoke all on salimos.google_uso from public, anon, authenticated;

-- Lo que la función del servidor necesita del sitio (solo el rol de servicio).
create or replace function public.salimos_google_local(p_local uuid)
returns jsonb language sql stable security definer set search_path = salimos, public as $$
  select jsonb_build_object('id', l.id, 'nombre', l.nombre, 'direccion', l.direccion, 'municipio', l.municipio,
           'destino', l.destino, 'lat', l.lat, 'lng', l.lng, 'place', l.google_place_id,
           'propia', exists (select 1 from salimos.fotos f where f.local_id = l.id and f.estado = 'publicada'))
  from salimos.locales l where l.id = p_local and l.activo
$$;

create or replace function public.salimos_google_guardar_place(p_local uuid, p_place text)
returns void language sql security definer set search_path = salimos, public as $$
  update salimos.locales set google_place_id = p_place where id = p_local
$$;

-- Apunta una foto servida y dice si aún cabe en el tope del día (hora de Canarias).
create or replace function public.salimos_google_gastar(p_tope int default 30)
returns boolean language plpgsql security definer set search_path = salimos, public as $$
declare v_dia date := (now() at time zone 'Atlantic/Canary')::date; v_n int;
begin
  insert into salimos.google_uso (dia, n) values (v_dia, 1)
  on conflict (dia) do update set n = salimos.google_uso.n + 1
  returning n into v_n;
  return v_n <= p_tope;
end $$;

revoke all on function public.salimos_google_local(uuid), public.salimos_google_guardar_place(uuid, text),
  public.salimos_google_gastar(int) from public, anon, authenticated;
grant execute on function public.salimos_google_local(uuid), public.salimos_google_guardar_place(uuid, text),
  public.salimos_google_gastar(int) to service_role;
