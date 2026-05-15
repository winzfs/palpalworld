create extension if not exists pgcrypto;

create table if not exists public.world_players (
  player_id text primary key,
  nickname text not null,
  x double precision not null default 0,
  y double precision not null default 0,
  direction text not null default 'down' check (direction in ('up', 'down', 'left', 'right')),
  region_id text not null default 'starter_meadow',
  tile_x integer not null default 1,
  tile_y integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.world_buildings (
  building_id text primary key,
  building_type text not null,
  owner_player_id text not null,
  x double precision not null default 0,
  y double precision not null default 0,
  region_id text not null default 'starter_meadow',
  tile_x integer not null default 1,
  tile_y integer not null default 1,
  hp integer not null default 1,
  max_hp integer not null default 1,
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.world_creatures (
  creature_id text primary key,
  species_id text not null,
  level integer not null default 1,
  x double precision not null default 0,
  y double precision not null default 0,
  hp integer not null default 1,
  max_hp integer not null default 1,
  region_id text not null default 'starter_meadow',
  tile_x integer not null default 1,
  tile_y integer not null default 1,
  trait_ids text[] not null default '{}',
  defeated boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.world_resources (
  resource_id text primary key,
  resource_type text not null,
  x double precision not null default 0,
  y double precision not null default 0,
  remaining_amount integer not null default 0,
  max_amount integer not null default 0,
  region_id text not null default 'starter_meadow',
  tile_x integer not null default 1,
  tile_y integer not null default 1,
  depleted boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.world_chat_messages (
  message_id uuid primary key default gen_random_uuid(),
  player_id text not null,
  nickname text not null,
  message text not null,
  message_type text not null default 'chat' check (message_type in ('chat', 'emote', 'ping')),
  x double precision not null default 0,
  y double precision not null default 0,
  region_id text not null default 'starter_meadow',
  tile_x integer not null default 1,
  tile_y integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists world_players_tile_updated_idx on public.world_players (region_id, tile_x, tile_y, updated_at desc);
create index if not exists world_buildings_tile_idx on public.world_buildings (region_id, tile_x, tile_y, deleted);
create index if not exists world_creatures_tile_idx on public.world_creatures (region_id, tile_x, tile_y, defeated);
create index if not exists world_resources_tile_idx on public.world_resources (region_id, tile_x, tile_y, depleted);
create index if not exists world_chat_messages_tile_created_idx on public.world_chat_messages (region_id, tile_x, tile_y, created_at desc);

alter table public.world_players enable row level security;
alter table public.world_buildings enable row level security;
alter table public.world_creatures enable row level security;
alter table public.world_resources enable row level security;
alter table public.world_chat_messages enable row level security;

drop policy if exists "world_players_select_all" on public.world_players;
drop policy if exists "world_players_insert_all" on public.world_players;
drop policy if exists "world_players_update_all" on public.world_players;
drop policy if exists "world_buildings_select_all" on public.world_buildings;
drop policy if exists "world_buildings_insert_all" on public.world_buildings;
drop policy if exists "world_buildings_update_all" on public.world_buildings;
drop policy if exists "world_creatures_select_all" on public.world_creatures;
drop policy if exists "world_creatures_insert_all" on public.world_creatures;
drop policy if exists "world_creatures_update_all" on public.world_creatures;
drop policy if exists "world_resources_select_all" on public.world_resources;
drop policy if exists "world_resources_insert_all" on public.world_resources;
drop policy if exists "world_resources_update_all" on public.world_resources;
drop policy if exists "world_chat_messages_select_all" on public.world_chat_messages;
drop policy if exists "world_chat_messages_insert_all" on public.world_chat_messages;

create policy "world_players_select_all" on public.world_players for select using (true);
create policy "world_players_insert_all" on public.world_players for insert with check (true);
create policy "world_players_update_all" on public.world_players for update using (true) with check (true);

create policy "world_buildings_select_all" on public.world_buildings for select using (true);
create policy "world_buildings_insert_all" on public.world_buildings for insert with check (true);
create policy "world_buildings_update_all" on public.world_buildings for update using (true) with check (true);

create policy "world_creatures_select_all" on public.world_creatures for select using (true);
create policy "world_creatures_insert_all" on public.world_creatures for insert with check (true);
create policy "world_creatures_update_all" on public.world_creatures for update using (true) with check (true);

create policy "world_resources_select_all" on public.world_resources for select using (true);
create policy "world_resources_insert_all" on public.world_resources for insert with check (true);
create policy "world_resources_update_all" on public.world_resources for update using (true) with check (true);

create policy "world_chat_messages_select_all" on public.world_chat_messages for select using (true);
create policy "world_chat_messages_insert_all" on public.world_chat_messages for insert with check (true);
