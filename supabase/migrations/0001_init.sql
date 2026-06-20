-- Jae Travel Expedition Maps — initial schema
-- Run this in the Supabase SQL editor for the project, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- staff_users: minimal staff directory, linked to Supabase auth.users
-- ─────────────────────────────────────────────
create table if not exists staff_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- routes: one per published/draft itinerary preview
-- ─────────────────────────────────────────────
create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  source_type text not null check (source_type in ('pdf', 'url', 'form', 'free_text')),
  source_reference text, -- original filename, source URL, or null for manual form entries
  created_by uuid references staff_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists routes_status_idx on routes(status);
create index if not exists routes_slug_idx on routes(slug);

-- ─────────────────────────────────────────────
-- stops: ordered waypoints within a route
-- ─────────────────────────────────────────────
create table if not exists stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  day_number int not null,
  order_index int not null, -- ordering within a day when multiple stops share a day
  stop_type text not null check (stop_type in ('destination', 'accommodation', 'game_park', 'airport', 'activity')),
  name text not null,
  description text,
  lat double precision not null,
  lng double precision not null,
  elevation_meters numeric,
  nights int,
  arrival_mode text check (arrival_mode in ('road', 'air', null)),
  place_id text, -- Google Places place_id, cached for re-lookup
  created_at timestamptz not null default now()
);

create index if not exists stops_route_id_idx on stops(route_id);
create index if not exists stops_route_day_idx on stops(route_id, day_number, order_index);

-- ─────────────────────────────────────────────
-- route_segments: cached geometry between consecutive stops
-- avoids re-hitting Directions API / recomputing arcs on every page load
-- ─────────────────────────────────────────────
create table if not exists route_segments (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  from_stop_id uuid not null references stops(id) on delete cascade,
  to_stop_id uuid not null references stops(id) on delete cascade,
  mode text not null check (mode in ('road', 'flight')),
  geometry jsonb not null, -- GeoJSON LineString coordinates
  distance_meters numeric,
  duration_seconds numeric,
  created_at timestamptz not null default now()
);

create index if not exists route_segments_route_id_idx on route_segments(route_id);

-- ─────────────────────────────────────────────
-- geocode_cache: shared lookup so repeated place names don't re-hit Google API
-- ─────────────────────────────────────────────
create table if not exists geocode_cache (
  query text primary key, -- normalized place name used as cache key
  lat double precision not null,
  lng double precision not null,
  formatted_address text,
  place_id text,
  source text not null default 'google' check (source in ('google', 'manual')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- updated_at trigger for routes
-- ─────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists routes_set_updated_at on routes;
create trigger routes_set_updated_at
  before update on routes
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
alter table routes enable row level security;
alter table stops enable row level security;
alter table route_segments enable row level security;
alter table staff_users enable row level security;
alter table geocode_cache enable row level security;

-- Public can read published routes and their stops/segments
create policy "Public can read published routes"
  on routes for select
  using (status = 'published');

create policy "Public can read stops of published routes"
  on stops for select
  using (
    exists (
      select 1 from routes
      where routes.id = stops.route_id
      and routes.status = 'published'
    )
  );

create policy "Public can read segments of published routes"
  on route_segments for select
  using (
    exists (
      select 1 from routes
      where routes.id = route_segments.route_id
      and routes.status = 'published'
    )
  );

-- Authenticated staff can do everything on routes/stops/segments they have access to
create policy "Staff can read all routes"
  on routes for select
  using (auth.uid() in (select id from staff_users));

create policy "Staff can insert routes"
  on routes for insert
  with check (auth.uid() in (select id from staff_users));

create policy "Staff can update routes"
  on routes for update
  using (auth.uid() in (select id from staff_users));

create policy "Staff can delete routes"
  on routes for delete
  using (auth.uid() in (select id from staff_users));

create policy "Staff can manage stops"
  on stops for all
  using (auth.uid() in (select id from staff_users))
  with check (auth.uid() in (select id from staff_users));

create policy "Staff can manage segments"
  on route_segments for all
  using (auth.uid() in (select id from staff_users))
  with check (auth.uid() in (select id from staff_users));

create policy "Staff can read own profile"
  on staff_users for select
  using (auth.uid() = id);

-- geocode_cache: readable/writable by staff only (service role bypasses RLS anyway)
create policy "Staff can read geocode cache"
  on geocode_cache for select
  using (auth.uid() in (select id from staff_users));

create policy "Staff can write geocode cache"
  on geocode_cache for insert
  with check (auth.uid() in (select id from staff_users));
