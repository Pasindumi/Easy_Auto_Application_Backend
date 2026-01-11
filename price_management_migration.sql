-- Price Management System Tables

-- 1. Price Items (Billable Items)
create table if not exists public.price_items (
  id uuid default uuid_generate_v4() primary key,
  code text not null unique, -- e.g., 'AD_BASE', 'PACKAGE_GOLD'
  name text not null,
  item_type text not null check (item_type in ('AD', 'BOOST', 'EXTRA', 'PACKAGE')),
  description text,
  status text default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_by_admin uuid references public.admins(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Price Items
alter table public.price_items enable row level security;
drop policy if exists "Allow public read active items" on public.price_items;
create policy "Allow public read active items" on public.price_items for select using (status = 'ACTIVE');
drop policy if exists "Allow admin all items" on public.price_items;
create policy "Allow admin all items" on public.price_items for all using (true);

-- 2. Pricing Rules
create table if not exists public.pricing_rules (
  id uuid default uuid_generate_v4() primary key,
  price_item_id uuid references public.price_items(id) on delete cascade,
  vehicle_type_id uuid references public.vehicle_types(id) on delete set null, -- Nullable generic price
  price numeric not null,
  unit text not null check (unit in ('PER_AD', 'PER_IMAGE', 'PER_DAY', 'PER_PACKAGE', 'ONE_TIME')),
  min_qty integer default 1,
  max_qty integer,
  valid_from timestamp with time zone,
  valid_to timestamp with time zone,
  created_by_admin uuid references public.admins(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Pricing Rules
alter table public.pricing_rules enable row level security;
drop policy if exists "Allow public read rules" on public.pricing_rules;
create policy "Allow public read rules" on public.pricing_rules for select using (true);
drop policy if exists "Allow admin all rules" on public.pricing_rules;
create policy "Allow admin all rules" on public.pricing_rules for all using (true);


-- 3. Package Features (Attributes for Packages)
create table if not exists public.package_features (
  id uuid default uuid_generate_v4() primary key,
  price_item_id uuid references public.price_items(id) on delete cascade,
  feature_key text not null, -- e.g., 'MAX_PHOTOS', 'IS_FEATURED'
  feature_value text not null, -- e.g., '50', 'true'
  feature_description text, -- e.g., 'Upload up to 50 photos'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Package Features
alter table public.package_features enable row level security;
drop policy if exists "Allow public read features" on public.package_features;
create policy "Allow public read features" on public.package_features for select using (true);
drop policy if exists "Allow admin all features" on public.package_features;
create policy "Allow admin all features" on public.package_features for all using (true);


-- 4. Package Included Items (Bundling items into packages)
create table if not exists public.package_included_items (
  id uuid default uuid_generate_v4() primary key,
  package_id uuid references public.price_items(id) on delete cascade,
  included_item_id uuid references public.price_items(id) on delete cascade,
  quantity integer default 1,
  is_unlimited boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Included Items
alter table public.package_included_items enable row level security;
drop policy if exists "Allow public read included items" on public.package_included_items;
create policy "Allow public read included items" on public.package_included_items for select using (true);
drop policy if exists "Allow admin all included items" on public.package_included_items;
create policy "Allow admin all included items" on public.package_included_items for all using (true);
