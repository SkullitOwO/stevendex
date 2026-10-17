-- ============================================================================
-- StevenDex : base de données Supabase
-- Les joueurs ne peuvent RIEN écrire directement : tout passe par les fonctions
-- ci-dessous (security definer), qui vérifient les règles du jeu. C'est l'anti-triche.
-- À coller une fois dans Supabase → SQL Editor → Run. Relançable sans risque.
-- ============================================================================

-- ---------- Données du jeu (lecture seule) ----------
create table if not exists rarities (r text primary key, ord int not null, weight numeric not null, guar numeric not null, dup int not null, pts int not null);
create table if not exists pokemon (id int primary key, r text not null references rarities, types text[] not null);
create table if not exists boosters (id text primary key, price int not null, types text[]);
create table if not exists anim (id int primary key references pokemon);
create table if not exists furniture (id text primary key, price int not null);

-- ---------- Données des joueurs ----------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  pseudo text not null check (pseudo ~ '^[A-Za-z0-9_-]{3,16}$'),
  coins int not null default 1000 check (coins >= 0),
  pity_m int not null default 0,
  pity_s int not null default 0,
  free_at timestamptz not null default now(),
  museum jsonb not null default '{}',
  inv jsonb not null default '{}',
  prize_day date not null default current_date,
  prizes int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_pseudo_lower on profiles (lower(pseudo));

create table if not exists cards (
  user_id uuid not null references profiles on delete cascade,
  k text not null check (k ~ '^[0-9]{1,3}[sa]?$'),
  n int not null check (n > 0),
  primary key (user_id, k)
);

create table if not exists packs (
  id bigserial primary key,
  user_id uuid not null references profiles on delete cascade,
  booster text not null,
  cards jsonb not null,
  score int not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists duel_reports (
  code text not null, user_id uuid not null references profiles on delete cascade,
  pack_id bigint not null, stake int not null, settled boolean not null default false, delta int,
  created_at timestamptz not null default now(), primary key (code, user_id)
);

create table if not exists battle_reports (
  code text not null, user_id uuid not null references profiles on delete cascade,
  winner text not null, settled boolean not null default false,
  created_at timestamptz not null default now(), primary key (code, user_id)
);

create table if not exists trades (
  id bigserial primary key,
  from_id uuid not null references profiles on delete cascade,
  to_id uuid not null references profiles on delete cascade,
  give jsonb not null default '[]', want jsonb not null default '[]',
  give_coins int not null default 0 check (give_coins >= 0), want_coins int not null default 0 check (want_coins >= 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- ---------- Droits : lecture seulement, écriture interdite ----------
alter table rarities enable row level security;
alter table pokemon enable row level security;
alter table boosters enable row level security;
alter table anim enable row level security;
alter table furniture enable row level security;
alter table profiles enable row level security;
alter table cards enable row level security;
alter table packs enable row level security;
alter table duel_reports enable row level security;
alter table battle_reports enable row level security;
alter table trades enable row level security;

do $$ begin
  drop policy if exists "lecture" on rarities;  create policy "lecture" on rarities for select using (true);
  drop policy if exists "lecture" on pokemon;   create policy "lecture" on pokemon for select using (true);
  drop policy if exists "lecture" on boosters;  create policy "lecture" on boosters for select using (true);
  drop policy if exists "lecture" on anim;      create policy "lecture" on anim for select using (true);
  drop policy if exists "lecture" on furniture; create policy "lecture" on furniture for select using (true);
  -- profils et collections visibles par les joueurs connectés (pour les échanges, le classement, les musées)
  drop policy if exists "lecture" on profiles;  create policy "lecture" on profiles for select to authenticated using (true);
  drop policy if exists "lecture" on cards;     create policy "lecture" on cards for select to authenticated using (true);
  drop policy if exists "lecture" on packs;     create policy "lecture" on packs for select to authenticated using (user_id = auth.uid());
  drop policy if exists "lecture" on trades;    create policy "lecture" on trades for select to authenticated using (auth.uid() in (from_id, to_id));
end $$;

-- ---------- Création du profil à l'inscription ----------
create or replace function sd_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, pseudo) values (new.id, coalesce(new.raw_user_meta_data ->> 'pseudo', split_part(new.email, '@', 1)));
  return new;
end $$;
drop trigger if exists sd_on_signup on auth.users;
create trigger sd_on_signup after insert on auth.users for each row execute function sd_new_user();

-- ---------- Outils internes ----------
create or replace function sd_uid() returns uuid language plpgsql stable as $$
begin
  if auth.uid() is null then raise exception 'Tu dois être connecté.'; end if;
  return auth.uid();
end $$;

-- Tirage d'une rareté ; une rareté absente du booster cède son poids à la suivante en dessous
create or replace function sd_roll(have text[], guar boolean) returns text language plpgsql as $$
declare rec record; carry numeric := 0; w numeric; rs text[] := '{}'; ws numeric[] := '{}'; total numeric := 0; x numeric; i int;
begin
  for rec in select * from rarities order by ord desc loop
    w := (case when guar then rec.guar else rec.weight end) + carry;
    if rec.r = any (have) then rs := rs || rec.r; ws := ws || w; total := total + w; carry := 0; else carry := w; end if;
  end loop;
  x := random() * total;
  for i in 1 .. array_length(rs, 1) loop
    x := x - ws[i];
    if x < 0 then return rs[i]; end if;
  end loop;
  return rs[array_length(rs, 1)];
end $$;

create or replace function sd_add_card(uid uuid, key text, qty int) returns void language plpgsql security definer set search_path = public as $$
begin
  if qty > 0 then
    insert into cards (user_id, k, n) values (uid, key, qty) on conflict (user_id, k) do update set n = cards.n + qty;
  elsif qty < 0 then
    delete from cards where user_id = uid and k = key and n = -qty;
    if not found then
      update cards set n = n + qty where user_id = uid and k = key and n > -qty;
      if not found then raise exception 'Carte % manquante', key; end if;
    end if;
  end if;
end $$;

create or replace function sd_price(key text) returns int language sql stable as $$
  select ra.dup * (case when key like '%a' then 12 when key like '%s' then 3 else 1 end)
  from pokemon p join rarities ra on ra.r = p.r where p.id = (regexp_replace(key, '[sa]$', ''))::int
$$;

-- ---------- État du joueur ----------
create or replace function my_state() returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := sd_uid();
begin
  return (select to_jsonb(p) - 'id' || jsonb_build_object('cards', coalesce((select jsonb_object_agg(k, n) from cards where user_id = uid), '{}'))
          from profiles p where p.id = uid);
end $$;

-- ---------- Ouvrir un booster (tout le tirage se fait ici) ----------
create or replace function open_pack(p_booster text) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := sd_uid(); b boosters%rowtype; pr profiles%rowtype; free boolean; have text[]; has_m boolean;
  ids int[] := '{}'; vs int[] := '{}'; rs text[] := '{}'; rar text; cid int; cand int; i int; v int; key text;
  res jsonb := '[]'; score int := 0; pts int; pid bigint;
begin
  select * into b from boosters where id = p_booster;
  if not found then raise exception 'Booster inconnu'; end if;
  select * into pr from profiles where id = uid for update;
  free := pr.free_at <= now();
  if not free and pr.coins < b.price then raise exception 'Pas assez de Pokédollars'; end if;
  select array_agg(distinct p.r) into have from pokemon p where b.types is null or p.types && b.types;
  has_m := 'M' = any (have);
  pr.pity_m := pr.pity_m + 1; pr.pity_s := pr.pity_s + 1;
  for i in 1 .. 5 loop
    rar := case when i < 5 then sd_roll(have, false) when has_m and pr.pity_m >= 150 then 'M' else sd_roll(have, true) end;
    -- jamais deux fois le même Pokémon dans un booster ; une relance si la carte est déjà possédée
    select p.id into cid from pokemon p where p.r = rar and (b.types is null or p.types && b.types) and not p.id = any (ids) order by random() limit 1;
    if cid is null then
      select p.id into cid from pokemon p where (b.types is null or p.types && b.types) and not p.id = any (ids) order by random() limit 1;
    end if;
    if exists (select 1 from cards c where c.user_id = uid and c.k in (cid::text, cid || 's', cid || 'a')) then
      select p.id into cand from pokemon p where p.r = rar and (b.types is null or p.types && b.types) and not p.id = any (ids) order by random() limit 1;
      if cand is not null then cid := cand; end if;
    end if;
    ids := ids || cid;
    rs := rs || (select p.r from pokemon p where p.id = cid);
    vs := vs || (case when random() < 0.012 then 1 else 0 end);
  end loop;
  if pr.pity_s >= 15 and not (1 = any (vs)) then vs[1 + floor(random() * 5)::int] := 1; end if;
  for i in 1 .. 5 loop
    if exists (select 1 from anim a where a.id = ids[i]) and random() < 0.06 then vs[i] := 2; end if;
  end loop;
  if 'M' = any (rs) then pr.pity_m := 0; end if;
  if 1 = any (vs) or 2 = any (vs) then pr.pity_s := 0; end if;
  for i in 1 .. 5 loop
    v := vs[i];
    key := ids[i]::text || (case v when 2 then 'a' when 1 then 's' else '' end);
    res := res || jsonb_build_object('id', ids[i], 'v', v, 'new', not exists (select 1 from cards c where c.user_id = uid and c.k = key));
    perform sd_add_card(uid, key, 1);
    select ra.pts into pts from rarities ra where ra.r = rs[i];
    score := score + pts * (case v when 2 then 4 when 1 then 2 else 1 end);
  end loop;
  update profiles set coins = coins - (case when free then 0 else b.price end),
    free_at = case when free then now() + interval '5 minutes' else free_at end,
    pity_m = pr.pity_m, pity_s = pr.pity_s
  where id = uid;
  insert into packs (user_id, booster, cards, score) values (uid, p_booster, res, score) returning id into pid;
  return jsonb_build_object('pack', pid, 'cards', res, 'state', my_state());
end $$;

-- ---------- Marché ----------
create or replace function sell_card(p_k text, p_n int default 1) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := sd_uid();
begin
  if p_n < 1 then raise exception 'Quantité invalide'; end if;
  perform sd_add_card(uid, p_k, -p_n);
  update profiles set coins = coins + sd_price(p_k) * p_n where id = uid;
  return my_state();
end $$;

create or replace function sell_dups() returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := sd_uid(); total int;
begin
  select coalesce(sum((n - 1) * sd_price(k)), 0) into total from cards where user_id = uid and n > 1;
  update cards set n = 1 where user_id = uid and n > 1;
  update profiles set coins = coins + total where id = uid;
  return my_state();
end $$;

-- ---------- Musée ----------
create or replace function buy_furniture(p_id text) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := sd_uid(); price int;
begin
  select f.price into price from furniture f where f.id = p_id;
  if price is null then raise exception 'Meuble inconnu'; end if;
  update profiles set coins = coins - price, inv = jsonb_set(inv, array[p_id], to_jsonb(coalesce((inv ->> p_id)::int, 0) + 1))
  where id = uid and coins >= price;
  if not found then raise exception 'Pas assez de Pokédollars'; end if;
  return my_state();
end $$;

-- Le musée est vérifié avant d'être enregistré : cartes possédées, meubles achetés, positions bornées
create or replace function museum_save(p jsonb) returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := sd_uid(); stock jsonb; wall jsonb := '[]'; items jsonb := '[]'; e jsonb; used jsonb := '{}'; fid text; i int;
begin
  select pr.inv into stock from profiles pr where pr.id = uid;
  for i in 0 .. 11 loop
    e := p -> 'wall' -> i;
    wall := wall || (case when jsonb_typeof(e) = 'string' and exists (select 1 from cards c where c.user_id = uid and c.k = e #>> '{}') then e else 'null'::jsonb end);
  end loop;
  for e in select * from jsonb_array_elements(coalesce(p -> 'items', '[]')) limit 16 loop
    fid := e ->> 'id';
    if exists (select 1 from furniture f where f.id = fid) and coalesce((used ->> fid)::int, 0) < coalesce((stock ->> fid)::int, 0) then
      used := jsonb_set(used, array[fid], to_jsonb(coalesce((used ->> fid)::int, 0) + 1));
      items := items || jsonb_build_object('id', fid,
        'x', least(96, greatest(4, coalesce((e ->> 'x')::numeric, 50))),
        'z', least(.97, greatest(.05, coalesce((e ->> 'z')::numeric, .5))),
        'r', least(7, greatest(0, coalesce((e ->> 'r')::int, 0))));
    end if;
  end loop;
  update profiles set museum = jsonb_build_object('wall', wall, 'items', items,
    'theme', case when p ->> 'theme' in ('galerie', 'classique', 'nuit', 'bois') then p ->> 'theme' else 'galerie' end)
  where id = uid;
end $$;

-- ---------- Duel de boosters : chacun déclare son booster, le serveur compare et transfère la mise ----------
create or replace function duel_report(p_code text, p_pack bigint, p_stake int) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := sd_uid(); mine packs%rowtype; other duel_reports%rowtype; theirs packs%rowtype; win uuid; lose uuid; amount int;
begin
  if p_stake not in (50, 100, 250, 500) then raise exception 'Mise invalide'; end if;
  perform pg_advisory_xact_lock(hashtext('duel' || p_code)); -- les deux déclarations passent l'une après l'autre
  update packs set used = true where id = p_pack and user_id = uid and not used and created_at > now() - interval '10 minutes' returning * into mine;
  if not found then raise exception 'Booster de duel invalide'; end if;
  insert into duel_reports (code, user_id, pack_id, stake) values (p_code, uid, p_pack, p_stake);
  select * into other from duel_reports d where d.code = p_code and d.user_id <> uid and not d.settled for update;
  if not found then return jsonb_build_object('status', 'waiting'); end if;
  if other.stake <> p_stake then raise exception 'Les mises ne correspondent pas'; end if;
  select * into theirs from packs where id = other.pack_id;
  if mine.score = theirs.score then
    update duel_reports set settled = true, delta = 0 where code = p_code;
    return jsonb_build_object('status', 'settled', 'delta', 0, 'state', my_state());
  end if;
  win := case when mine.score > theirs.score then uid else other.user_id end;
  lose := case when win = uid then other.user_id else uid end;
  select least(p_stake, coins) into amount from profiles where id = lose for update;
  update profiles set coins = coins - amount where id = lose;
  update profiles set coins = coins + amount where id = win;
  update duel_reports set settled = true, delta = case when user_id = win then amount else -amount end where code = p_code;
  return jsonb_build_object('status', 'settled', 'delta', case when win = uid then amount else -amount end, 'state', my_state());
end $$;

create or replace function duel_result(p_code text) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := sd_uid(); d duel_reports%rowtype;
begin
  select * into d from duel_reports where code = p_code and user_id = uid;
  if not found or not d.settled then return jsonb_build_object('status', 'waiting'); end if;
  return jsonb_build_object('status', 'settled', 'delta', d.delta, 'state', my_state());
end $$;

-- ---------- Combat : la prime n'est versée que si les deux joueurs déclarent le même gagnant (5 primes par jour) ----------
create or replace function battle_report(p_code text, p_winner text) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := sd_uid(); other battle_reports%rowtype; wid uuid;
begin
  perform pg_advisory_xact_lock(hashtext('combat' || p_code)); -- les deux déclarations passent l'une après l'autre
  insert into battle_reports (code, user_id, winner) values (p_code, uid, lower(p_winner)) on conflict do nothing;
  if not found then return jsonb_build_object('status', 'done'); end if;
  select * into other from battle_reports b where b.code = p_code and b.user_id <> uid;
  if not found then return jsonb_build_object('status', 'waiting'); end if;
  update battle_reports set settled = true where code = p_code;
  if other.winner <> lower(p_winner) then return jsonb_build_object('status', 'disputed'); end if;
  select id into wid from profiles where lower(pseudo) = lower(p_winner) and id in (uid, other.user_id);
  if wid is null then return jsonb_build_object('status', 'none'); end if;
  update profiles set prizes = case when prize_day = current_date then prizes + 1 else 1 end, prize_day = current_date,
    coins = coins + case when prize_day <> current_date or prizes < 5 then 120 else 0 end
  where id = wid;
  return jsonb_build_object('status', 'settled', 'state', my_state());
end $$;

-- ---------- Échanges entre amis ----------
create or replace function sd_check_items(items jsonb) returns void language plpgsql as $$
declare e jsonb;
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 12 then raise exception 'Liste de cartes invalide'; end if;
  for e in select * from jsonb_array_elements(items) loop
    if coalesce(e ->> 'k', '') !~ '^[0-9]{1,3}[sa]?$' or coalesce((e ->> 'n')::int, 0) < 1 then raise exception 'Carte invalide'; end if;
  end loop;
end $$;

create or replace function trade_offer(p_to text, p_give jsonb, p_want jsonb, p_give_coins int default 0, p_want_coins int default 0) returns bigint
language plpgsql security definer set search_path = public as $$
declare uid uuid := sd_uid(); dest uuid; e jsonb; tid bigint;
begin
  perform sd_check_items(p_give); perform sd_check_items(p_want);
  if p_give_coins < 0 or p_want_coins < 0 then raise exception 'Montant invalide'; end if;
  if jsonb_array_length(p_give) + jsonb_array_length(p_want) = 0 and p_give_coins + p_want_coins = 0 then raise exception 'Échange vide'; end if;
  select id into dest from profiles where lower(pseudo) = lower(p_to);
  if dest is null then raise exception 'Joueur introuvable'; end if;
  if dest = uid then raise exception 'Tu ne peux pas échanger avec toi-même'; end if;
  if (select count(*) from trades where from_id = uid and status = 'pending') >= 10 then raise exception 'Trop d''offres en attente'; end if;
  for e in select * from jsonb_array_elements(p_give) loop
    if not exists (select 1 from cards c where c.user_id = uid and c.k = e ->> 'k' and c.n >= (e ->> 'n')::int) then raise exception 'Tu ne possèdes pas %', e ->> 'k'; end if;
  end loop;
  insert into trades (from_id, to_id, give, want, give_coins, want_coins) values (uid, dest, p_give, p_want, p_give_coins, p_want_coins) returning id into tid;
  return tid;
end $$;

create or replace function trade_respond(p_id bigint, p_accept boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := sd_uid(); t trades%rowtype; e jsonb;
begin
  select * into t from trades where id = p_id and to_id = uid and status = 'pending' for update;
  if not found then raise exception 'Offre introuvable ou déjà traitée'; end if;
  if not p_accept then update trades set status = 'declined', updated_at = now() where id = p_id; return my_state(); end if;
  perform 1 from profiles where id in (t.from_id, t.to_id) order by id for update;
  for e in select * from jsonb_array_elements(t.give) loop
    perform sd_add_card(t.from_id, e ->> 'k', -(e ->> 'n')::int); perform sd_add_card(t.to_id, e ->> 'k', (e ->> 'n')::int);
  end loop;
  for e in select * from jsonb_array_elements(t.want) loop
    perform sd_add_card(t.to_id, e ->> 'k', -(e ->> 'n')::int); perform sd_add_card(t.from_id, e ->> 'k', (e ->> 'n')::int);
  end loop;
  update profiles set coins = coins - t.give_coins + t.want_coins where id = t.from_id;
  update profiles set coins = coins + t.give_coins - t.want_coins where id = t.to_id;
  update trades set status = 'accepted', updated_at = now() where id = p_id;
  return my_state();
end $$;

create or replace function trade_cancel(p_id bigint) returns void language plpgsql security definer set search_path = public as $$
begin
  update trades set status = 'cancelled', updated_at = now() where id = p_id and from_id = sd_uid() and status = 'pending';
end $$;

create or replace function my_trades() returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := sd_uid();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'from', f.pseudo, 'to', d.pseudo, 'mine', t.from_id = uid, 'give', t.give, 'want', t.want,
      'give_coins', t.give_coins, 'want_coins', t.want_coins, 'status', t.status, 'at', t.updated_at) order by t.updated_at desc)
    from trades t join profiles f on f.id = t.from_id join profiles d on d.id = t.to_id
    where uid in (t.from_id, t.to_id) and (t.status = 'pending' or t.updated_at > now() - interval '3 days')), '[]');
end $$;

create or replace function player_cards(p_pseudo text) returns jsonb language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_object_agg(c.k, c.n), '{}') from cards c join profiles p on p.id = c.user_id where lower(p.pseudo) = lower(p_pseudo)
$$;

-- ---------- Classement et musées ----------
create or replace function leaderboard() returns jsonb language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(row_to_json(x) order by x.dex desc, x.rares desc), '[]') from (
    select p.pseudo, count(distinct regexp_replace(c.k, '[sa]$', '')) as dex,
      count(*) filter (where c.k ~ '[sa]$') as rares
    from profiles p left join cards c on c.user_id = p.id group by p.id order by 2 desc, 3 desc limit 30) x
$$;

create or replace function player_museum(p_pseudo text) returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object('pseudo', pseudo, 'museum', museum) from profiles where lower(pseudo) = lower(p_pseudo)
$$;

-- Aucune fonction n'est appelable sans être connecté (sauf la lecture des données du jeu)
revoke execute on all functions in schema public from public, anon;
grant execute on function my_state, open_pack, sell_card, sell_dups, buy_furniture, museum_save, duel_report, duel_result, battle_report,
  trade_offer, trade_respond, trade_cancel, my_trades, player_cards, leaderboard, player_museum to authenticated;
-- Données du jeu, généré par seed.js. Relançable.
truncate anim, pokemon, boosters, furniture, rarities cascade;
insert into rarities values ('C',0,71,0,10,1),('R',1,26,91,25,3),('E',2,2.5,7.3,60,8),('L',3,0.42,1.4,200,20),('M',4,0.08,0.3,600,50);
insert into pokemon values (1,'C','{plante,poison}'),(2,'R','{plante,poison}'),(3,'L','{plante,poison}'),(4,'C','{feu}'),(5,'R','{feu}'),(6,'L','{feu,vol}'),(7,'C','{eau}'),(8,'R','{eau}'),(9,'L','{eau}'),(10,'C','{insecte}'),(11,'C','{insecte}'),(12,'R','{insecte,vol}'),(13,'C','{insecte,poison}'),(14,'C','{insecte,poison}'),(15,'R','{insecte,poison}'),(16,'C','{normal,vol}'),(17,'C','{normal,vol}'),(18,'R','{normal,vol}'),(19,'C','{normal}'),(20,'C','{normal}'),(21,'C','{normal,vol}'),(22,'R','{normal,vol}'),(23,'C','{poison}'),(24,'R','{poison}'),(25,'E','{electrik}'),(26,'E','{electrik}'),(27,'C','{sol}'),(28,'R','{sol}'),(29,'C','{poison}'),(30,'C','{poison}'),(31,'E','{poison,sol}'),(32,'C','{poison}'),(33,'C','{poison}'),(34,'E','{poison,sol}'),(35,'C','{fee}'),(36,'R','{fee}'),(37,'C','{feu}'),(38,'E','{feu}'),(39,'C','{normal,fee}'),(40,'R','{normal,fee}'),(41,'C','{poison,vol}'),(42,'R','{poison,vol}'),(43,'C','{plante,poison}'),(44,'C','{plante,poison}'),(45,'R','{plante,poison}'),(46,'C','{insecte,plante}'),(47,'R','{insecte,plante}'),(48,'C','{insecte,poison}'),(49,'R','{insecte,poison}'),(50,'C','{sol}'),(51,'R','{sol}'),(52,'C','{normal}'),(53,'R','{normal}'),(54,'C','{eau}'),(55,'R','{eau}'),(56,'C','{combat}'),(57,'R','{combat}'),(58,'C','{feu}'),(59,'E','{feu}'),(60,'C','{eau}'),(61,'C','{eau}'),(62,'R','{eau,combat}'),(63,'C','{psy}'),(64,'R','{psy}'),(65,'L','{psy}'),(66,'C','{combat}'),(67,'R','{combat}'),(68,'E','{combat}'),(69,'C','{plante,poison}'),(70,'C','{plante,poison}'),(71,'R','{plante,poison}'),(72,'C','{eau,poison}'),(73,'R','{eau,poison}'),(74,'C','{roche,sol}'),(75,'C','{roche,sol}'),(76,'R','{roche,sol}'),(77,'C','{feu}'),(78,'R','{feu}'),(79,'C','{eau,psy}'),(80,'R','{eau,psy}'),(81,'C','{electrik,acier}'),(82,'R','{electrik,acier}'),(83,'C','{normal,vol}'),(84,'C','{normal,vol}'),(85,'R','{normal,vol}'),(86,'C','{eau}'),(87,'R','{eau,glace}'),(88,'C','{poison}'),(89,'R','{poison}'),(90,'C','{eau}'),(91,'R','{eau,glace}'),(92,'C','{spectre,poison}'),(93,'R','{spectre,poison}'),(94,'L','{spectre,poison}'),(95,'R','{roche,sol}'),(96,'C','{psy}'),(97,'R','{psy}'),(98,'C','{eau}'),(99,'R','{eau}'),(100,'C','{electrik}'),(101,'R','{electrik}'),(102,'C','{plante,psy}'),(103,'R','{plante,psy}'),(104,'C','{sol}'),(105,'R','{sol}'),(106,'R','{combat}'),(107,'R','{combat}'),(108,'R','{normal}'),(109,'C','{poison}'),(110,'R','{poison}'),(111,'C','{sol,roche}'),(112,'R','{sol,roche}'),(113,'E','{normal}'),(114,'R','{plante}'),(115,'E','{normal}'),(116,'C','{eau}'),(117,'R','{eau}'),(118,'C','{eau}'),(119,'R','{eau}'),(120,'C','{eau}'),(121,'R','{eau,psy}'),(122,'R','{psy,fee}'),(123,'E','{insecte,vol}'),(124,'R','{glace,psy}'),(125,'R','{electrik}'),(126,'R','{feu}'),(127,'R','{insecte}'),(128,'R','{normal}'),(129,'C','{eau}'),(130,'L','{eau,vol}'),(131,'E','{eau,glace}'),(132,'R','{normal}'),(133,'R','{normal}'),(134,'E','{eau}'),(135,'E','{electrik}'),(136,'E','{feu}'),(137,'R','{normal}'),(138,'C','{roche,eau}'),(139,'R','{roche,eau}'),(140,'C','{roche,eau}'),(141,'R','{roche,eau}'),(142,'L','{roche,vol}'),(143,'L','{normal}'),(144,'M','{glace,vol}'),(145,'M','{electrik,vol}'),(146,'M','{feu,vol}'),(147,'C','{dragon}'),(148,'R','{dragon}'),(149,'L','{dragon,vol}'),(150,'M','{psy}'),(151,'M','{psy}');
insert into boosters values ('mix',150,null),('feu',175,'{feu}'),('eau',175,'{eau,glace}'),('plante',175,'{plante,insecte}'),('elec',175,'{electrik,acier}'),('psy',175,'{psy,fee}'),('spectre',175,'{spectre,poison}'),('combat',175,'{combat,sol,roche}'),('ciel',175,'{vol,dragon}');
insert into anim values (25),(94),(133),(145),(150),(151);
insert into furniture values ('pottedPlant',120),('plantSmall1',60),('bench',180),('benchCushion',240),('loungeSofa',380),('loungeDesignSofa',420),('loungeChair',220),('loungeDesignChair',240),('lampRoundFloor',160),('lampSquareFloor',160),('rugRound',150),('rugRectangle',200),('tableCoffeeGlass',240),('tableRound',200),('sideTable',130),('bookcaseOpen',300),('bear',150),('speaker',160),('televisionVintage',280),('radio',120),('coatRackStanding',110);
