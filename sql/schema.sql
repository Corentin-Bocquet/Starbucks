-- ============================================================
-- EVER — Schéma Supabase
--
-- CE SCHÉMA EST DÉJÀ DÉPLOYÉ. Ce fichier documente ce qui tourne
-- réellement, et sert à le rejouer ailleurs. Il est idempotent :
-- on peut le relancer sans rien casser.
--
-- Où il tourne
-- ------------
-- Projet   : qjxeimsinxqvlodsusww  (région eu-central-1)
-- Schéma   : ever
-- Exposé   : oui, via PostgREST (db_schema = public,graphql_public,ever)
--
-- Pourquoi un schéma dédié plutôt qu'un projet dédié : le plan
-- gratuit Supabase plafonne à deux projets actifs par compte, et les
-- deux places étaient prises (learno et WALLET). Plutôt que de mettre
-- un projet existant en pause, EVER vit dans son propre schéma
-- Postgres à l'intérieur du projet WALLET.
--
-- Ce n'est pas un bricolage : un schéma est une frontière réelle.
-- Aucune table n'est partagée, aucun nom ne peut entrer en collision
-- (WALLET a lui aussi des tables profiles et user_settings), les
-- policies RLS sont indépendantes, et le client PostgREST est
-- configuré avec db: { schema: 'ever' } — il ne voit rien d'autre.
-- Seul auth.users est commun, ce qui est plutôt confortable : un seul
-- compte pour les deux applications.
--
-- Pour un projet dédié : remplacer partout « ever. » par « public. »,
-- supprimer le create schema, et remettre supabaseSchema à 'public'
-- dans js/config.js.
--
-- Choix d'architecture, assumé
-- ----------------------------
-- Le cahier des charges listait une quarantaine de tables, une par
-- type d'objet. Pour une application personnelle dont la quasi-
-- totalité des données n'est jamais interrogée en relationnel, cela
-- aurait donné quarante policies RLS à maintenir et quarante chemins
-- de synchronisation, sans aucun gain.
--
-- On garde donc des tables réelles là où la structure sert vraiment,
-- c'est-à-dire dès que plusieurs personnes touchent la même donnée
-- (shared_lists, list_members, list_items), et une table générique
-- user_collections pour les collections personnelles : activities,
-- places, foods, gifts, giftHints, giftIdeas, media, mediaIdeas,
-- garments, outfits, meals, healthDays, workouts, people, history,
-- calendarEvents.
--
-- Les vues en bas montrent comment déplier ce JSON en SQL, et donc
-- comment sortir une collection vers sa propre table le jour où une
-- vraie requête relationnelle devient nécessaire.
-- ============================================================

create schema if not exists ever;

-- ------------------------------------------------------------
-- 1. Profils
-- ------------------------------------------------------------
create table if not exists ever.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  pseudo      text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. Réglages et collections personnelles
-- ------------------------------------------------------------
create table if not exists ever.user_settings (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists ever.user_collections (
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  data        jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, name)
);
create index if not exists ever_user_collections_user_idx on ever.user_collections(user_id);

-- ------------------------------------------------------------
-- 3. Listes partagées
-- ------------------------------------------------------------
create table if not exists ever.shared_lists (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  kind                text not null default 'autre',
  share_code          text not null unique,
  default_permission  text not null default 'view'
                      check (default_permission in ('view', 'add', 'edit')),
  created_at          timestamptz not null default now()
);
create index if not exists ever_shared_lists_owner_idx on ever.shared_lists(owner_id);
create index if not exists ever_shared_lists_code_idx  on ever.shared_lists(share_code);

create table if not exists ever.list_members (
  list_id     uuid not null references ever.shared_lists(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  permission  text not null default 'view' check (permission in ('view', 'add', 'edit')),
  joined_at   timestamptz not null default now(),
  primary key (list_id, user_id)
);
create index if not exists ever_list_members_user_idx on ever.list_members(user_id);

create table if not exists ever.list_items (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references ever.shared_lists(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists ever_list_items_list_idx on ever.list_items(list_id);

-- ------------------------------------------------------------
-- 4. Intégrations externes
--    Les jetons ne descendent jamais dans le navigateur : seules les
--    fonctions edge, en service_role, lisent cette table.
-- ------------------------------------------------------------
create table if not exists ever.external_integrations (
  user_id     uuid not null references auth.users(id) on delete cascade,
  provider    text not null,
  payload     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, provider)
);

-- ------------------------------------------------------------
-- 5. Fonctions d'aide
--    Elles sont en security definer pour éviter la récursion entre
--    policies : une policy sur list_items ne peut pas interroger
--    list_members si celle-ci a elle-même une policy qui interroge
--    list_items.
-- ------------------------------------------------------------
create or replace function ever.is_list_member(l uuid)
returns boolean language sql stable security definer set search_path = ever, public as $$
  select exists (select 1 from ever.list_members m where m.list_id = l and m.user_id = auth.uid());
$$;

create or replace function ever.list_permission(l uuid)
returns text language sql stable security definer set search_path = ever, public as $$
  select case
    when exists (select 1 from ever.shared_lists s where s.id = l and s.owner_id = auth.uid()) then 'edit'
    else coalesce((select m.permission from ever.list_members m where m.list_id = l and m.user_id = auth.uid()), 'none')
  end;
$$;

-- Création automatique du profil à l'inscription
create or replace function ever.handle_new_user()
returns trigger language plpgsql security definer set search_path = ever, public as $$
begin
  insert into ever.profiles (id, pseudo)
  values (new.id, coalesce(new.raw_user_meta_data->>'pseudo', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists ever_on_auth_user_created on auth.users;
create trigger ever_on_auth_user_created
  after insert on auth.users
  for each row execute function ever.handle_new_user();

create or replace function ever.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists ever_touch_settings on ever.user_settings;
create trigger ever_touch_settings before update on ever.user_settings
  for each row execute function ever.touch_updated_at();
drop trigger if exists ever_touch_collections on ever.user_collections;
create trigger ever_touch_collections before update on ever.user_collections
  for each row execute function ever.touch_updated_at();
drop trigger if exists ever_touch_profiles on ever.profiles;
create trigger ever_touch_profiles before update on ever.profiles
  for each row execute function ever.touch_updated_at();

-- ------------------------------------------------------------
-- 6. RLS
--    Un utilisateur n'accède qu'à ses propres données, et à celles
--    qui lui sont explicitement partagées.
-- ------------------------------------------------------------
alter table ever.profiles              enable row level security;
alter table ever.user_settings         enable row level security;
alter table ever.user_collections      enable row level security;
alter table ever.shared_lists          enable row level security;
alter table ever.list_members          enable row level security;
alter table ever.list_items            enable row level security;
alter table ever.external_integrations enable row level security;

drop policy if exists ever_profiles_own on ever.profiles;
create policy ever_profiles_own on ever.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists ever_settings_own on ever.user_settings;
create policy ever_settings_own on ever.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ever_collections_own on ever.user_collections;
create policy ever_collections_own on ever.user_collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ever_integrations_own on ever.external_integrations;
create policy ever_integrations_own on ever.external_integrations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Listes : lecture pour le propriétaire et les membres
drop policy if exists ever_lists_read on ever.shared_lists;
create policy ever_lists_read on ever.shared_lists
  for select using (owner_id = auth.uid() or ever.is_list_member(id));
drop policy if exists ever_lists_insert on ever.shared_lists;
create policy ever_lists_insert on ever.shared_lists
  for insert with check (owner_id = auth.uid());
drop policy if exists ever_lists_update on ever.shared_lists;
create policy ever_lists_update on ever.shared_lists
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists ever_lists_delete on ever.shared_lists;
create policy ever_lists_delete on ever.shared_lists
  for delete using (owner_id = auth.uid());

-- Adhésions : on rejoint pour soi, on part quand on veut
drop policy if exists ever_members_read on ever.list_members;
create policy ever_members_read on ever.list_members
  for select using (user_id = auth.uid()
    or exists (select 1 from ever.shared_lists s where s.id = list_id and s.owner_id = auth.uid()));
drop policy if exists ever_members_join on ever.list_members;
create policy ever_members_join on ever.list_members
  for insert with check (user_id = auth.uid());
drop policy if exists ever_members_leave on ever.list_members;
create policy ever_members_leave on ever.list_members
  for delete using (user_id = auth.uid()
    or exists (select 1 from ever.shared_lists s where s.id = list_id and s.owner_id = auth.uid()));

-- Entrées : lecture pour tout membre, écriture selon la permission
drop policy if exists ever_items_read on ever.list_items;
create policy ever_items_read on ever.list_items
  for select using (ever.list_permission(list_id) <> 'none');
drop policy if exists ever_items_insert on ever.list_items;
create policy ever_items_insert on ever.list_items
  for insert with check (author_id = auth.uid() and ever.list_permission(list_id) in ('add', 'edit'));
drop policy if exists ever_items_update on ever.list_items;
create policy ever_items_update on ever.list_items
  for update using (ever.list_permission(list_id) = 'edit' or author_id = auth.uid());
drop policy if exists ever_items_delete on ever.list_items;
create policy ever_items_delete on ever.list_items
  for delete using (ever.list_permission(list_id) = 'edit' or author_id = auth.uid());

-- ------------------------------------------------------------
-- 7. Droits
-- ------------------------------------------------------------
grant usage on schema ever to anon, authenticated, service_role;
grant all on all tables    in schema ever to anon, authenticated, service_role;
grant all on all functions in schema ever to anon, authenticated, service_role;
grant all on all sequences in schema ever to anon, authenticated, service_role;
alter default privileges in schema ever grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema ever grant all on functions to anon, authenticated, service_role;
alter default privileges in schema ever grant all on sequences to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 8. Stockage : photos de vêtements et de repas
--    Les compartiments sont globaux au projet, donc préfixés.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('ever-garments', 'ever-garments', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('ever-meals', 'ever-meals', true)
  on conflict (id) do nothing;

drop policy if exists ever_storage_insert on storage.objects;
create policy ever_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('ever-garments', 'ever-meals')
    and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists ever_storage_delete on storage.objects;
create policy ever_storage_delete on storage.objects for delete to authenticated
  using (bucket_id in ('ever-garments', 'ever-meals')
    and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists ever_storage_read on storage.objects;
create policy ever_storage_read on storage.objects for select
  using (bucket_id in ('ever-garments', 'ever-meals'));

-- ------------------------------------------------------------
-- 9. Vues de lecture
--    Le journal alimentaire et les journées de santé, dépliés depuis
--    le JSON. Utiles pour un tableau de bord SQL, et première étape
--    si l'on veut un jour sortir ces collections en tables dédiées.
-- ------------------------------------------------------------
create or replace view ever.meals_flat as
select
  c.user_id,
  (m->>'day')::date                as jour,
  m->>'slot'                       as moment,
  m->>'nom'                        as aliment,
  nullif(m->>'kcal', '')::numeric  as kcal,
  nullif(m->>'prot', '')::numeric  as proteines,
  nullif(m->>'carb', '')::numeric  as glucides,
  nullif(m->>'fat',  '')::numeric  as lipides
from ever.user_collections c
cross join lateral jsonb_array_elements(c.data) as m
where c.name = 'meals' and coalesce((m->>'_del')::boolean, false) = false;

create or replace view ever.health_flat as
select
  c.user_id,
  (d->>'day')::date                    as jour,
  nullif(d->>'steps', '')::numeric     as pas,
  nullif(d->>'active', '')::numeric    as kcal_actives,
  nullif(d->>'exercise', '')::numeric  as minutes_exercice,
  nullif(d->>'sleep', '')::numeric     as minutes_sommeil,
  nullif(d->>'hrRest', '')::numeric    as fc_repos,
  nullif(d->>'weight', '')::numeric    as poids
from ever.user_collections c
cross join lateral jsonb_array_elements(c.data) as d
where c.name = 'healthDays' and coalesce((d->>'_del')::boolean, false) = false;

-- ------------------------------------------------------------
-- 10. Exposer le schéma
--     Déjà fait sur le projet. Sur un nouveau projet, aller dans
--     Settings > API > Exposed schemas et ajouter « ever », ou
--     appeler l'API de gestion :
--       PATCH /v1/projects/{ref}/postgrest
--       { "db_schema": "public,graphql_public,ever" }
-- ------------------------------------------------------------
