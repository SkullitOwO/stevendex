-- Mise à jour : revenu du musée. À coller dans SQL Editor → Run.
-- ---------- Revenu du musée : les cartes exposées rapportent toutes les 10 minutes (jusqu'à 1 h de réserve) ----------
alter table profiles add column if not exists museum_at timestamptz not null default now();

-- Barème du duel par carte exposée et encore possédée (une même carte ne compte qu'une fois)
create or replace function sd_museum_rate(uid uuid) returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(ra.pts * case when w.k like '%a' then 4 when w.k like '%s' then 2 else 1 end), 0)::int
  from (select distinct jsonb_array_elements_text(museum -> 'wall') k from profiles where id = uid) w
  join cards c on c.user_id = uid and c.k = w.k
  join pokemon p on p.id = regexp_replace(w.k, '[sa]$', '')::int
  join rarities ra on ra.r = p.r
$$;

create or replace function museum_collect() returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := sd_uid(); at timestamptz; n int; gain int;
begin
  select museum_at into at from profiles where id = uid for update;
  n := least(6, floor(extract(epoch from now() - at) / 600))::int;
  if n < 1 then raise exception 'Le revenu du musée n''est pas encore prêt'; end if;
  gain := n * sd_museum_rate(uid);
  update profiles set coins = coins + gain, museum_at = case when n = 6 then now() else at + n * interval '10 minutes' end where id = uid;
  return my_state() || jsonb_build_object('gain', gain);
end $$;
revoke execute on function sd_museum_rate from public, anon;
grant execute on function museum_collect to authenticated;
