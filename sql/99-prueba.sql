-- Prueba de punta a punta del apartado salimos. Todo dentro de una transacción
-- que se deshace al final: no deja nada en la base.
begin;
create temp table r (paso text, valor text) on commit drop;
grant all on r to anon, authenticated;
insert into auth.users (id, email, aud, role) values ('00000000-0000-4000-8000-00000000a001', 'prueba-salimos@ejemplo.invalid', 'authenticated', 'authenticated');
insert into salimos.locales (id, nombre, tipo, municipio) values ('00000000-0000-4000-8000-00000000b001', 'Local de prueba', 'copas', 'Telde');

set local role anon;
insert into r select 'anon ve locales', jsonb_array_length(public.salimos_locales())::text;
do $$ begin perform 1 from salimos.votos limit 1; insert into r values ('anon tabla directa', 'PUEDE (mal)');
  exception when others then insert into r values ('anon tabla directa', 'no puede (bien): ' || sqlerrm); end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a001","email":"prueba-salimos@ejemplo.invalid","role":"authenticated"}';
do $$ begin perform public.salimos_votar('00000000-0000-4000-8000-00000000b001', '{"limpieza":8}', '{}', null);
  insert into r values ('votar sin perfil', 'PASÓ (mal)'); exception when others then insert into r values ('votar sin perfil', 'rechazado: ' || sqlerrm); end $$;
select public.salimos_alta_perfil(true);
do $$ begin perform public.salimos_votar('00000000-0000-4000-8000-00000000b001', '{"limpieza":8,"carta":5,"ambiente":7}', '{}', null);
  insert into r values ('criterio de otro tipo', 'PASÓ (mal)'); exception when others then insert into r values ('criterio de otro tipo', 'rechazado: ' || sqlerrm); end $$;
do $$ begin perform public.salimos_votar('00000000-0000-4000-8000-00000000b001', '{"limpieza":8,"ambiente":7}', '{}', null);
  insert into r values ('solo 2 criterios', 'PASÓ (mal)'); exception when others then insert into r values ('solo 2 criterios', 'rechazado: ' || sqlerrm); end $$;
insert into r select 'voto bueno', public.salimos_votar('00000000-0000-4000-8000-00000000b001', '{"limpieza":8,"ambiente":7,"musica":9}', '{"edad":"35-60","volver":"si"}', 'No es para gente de 20.');
insert into r select 'cambiar voto', public.salimos_votar('00000000-0000-4000-8000-00000000b001', '{"limpieza":6,"ambiente":7,"musica":9}', '{"edad":"35-60"}', 'No es para gente de 20.');
insert into r select 'cifras', (select f::text from jsonb_array_elements(public.salimos_locales()) f where f->>'nombre' = 'Local de prueba');
insert into r select 'comentarios', public.salimos_comentarios('00000000-0000-4000-8000-00000000b001')::text;
insert into r select 'mi estado', public.salimos_mi_estado()::text;
do $$ begin perform public.salimos_admin_retirar_comentario('00000000-0000-4000-8000-00000000b001', 'x');
  insert into r values ('retirar sin ser admin', 'PASÓ (mal)'); exception when others then insert into r values ('retirar sin ser admin', 'rechazado: ' || sqlerrm); end $$;
insert into r select 'recomendar', public.salimos_recomendar('Bar Prueba', 'terraza', 'Telde', '');
insert into r select 'borrar mis datos', public.salimos_borrar_mis_datos();
reset role;
insert into r select 'queda la cuenta', (select count(*)::text from auth.users where id = '00000000-0000-4000-8000-00000000a001');
select * from r;
rollback;
