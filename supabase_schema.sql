-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users Table
create table if not exists public.users (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text not null unique,
  phone text,
  password text not null, -- Hashed password
  role text default 'user' check (role in ('user', 'admin')),
  avatar text default 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format',
  is_premium boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- Policies for Users
drop policy if exists "Allow public insert (Signup)" on public.users;
create policy "Allow public insert (Signup)" on public.users for insert with check (true);

drop policy if exists "Users can read their own data" on public.users;
create policy "Users can read their own data" on public.users for select using (auth.uid() = id);

drop policy if exists "Public profiles are viewable by everyone" on public.users;
create policy "Public profiles are viewable by everyone" on public.users for select using (true);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);


-- Admins Table
create table if not exists public.admins (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text default 'MODERATOR' check (role in ('SUPER_ADMIN', 'MODERATOR')),
  status text default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Admins
alter table public.admins enable row level security;

drop policy if exists "Allow public insert admins" on public.admins;
create policy "Allow public insert admins" on public.admins for insert with check (true);

drop policy if exists "Allow public read admins" on public.admins;
create policy "Allow public read admins" on public.admins for select using (true);

drop policy if exists "Allow public update admins" on public.admins;
create policy "Allow public update admins" on public.admins for update using (true);


-- Vehicle Types
create table if not exists public.vehicle_types (
  id uuid default uuid_generate_v4() primary key,
  type_name text not null unique,
  status text default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by_admin uuid references public.admins(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.vehicle_types enable row level security;

drop policy if exists "Allow public all types" on public.vehicle_types;
create policy "Allow public all types" on public.vehicle_types for all using (true);

-- Vehicle Attributes
create table if not exists public.vehicle_attributes (
  id uuid default uuid_generate_v4() primary key,
  vehicle_type_id uuid references public.vehicle_types(id) on delete cascade,
  attribute_name text not null,
  data_type text not null check (data_type in ('NUMBER', 'TEXT', 'DROPDOWN', 'BOOLEAN')),
  unit text,
  is_required boolean default false,
  status text default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_by_admin uuid references public.admins(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.vehicle_attributes enable row level security;

drop policy if exists "Allow public all attributes" on public.vehicle_attributes;
create policy "Allow public all attributes" on public.vehicle_attributes for all using (true);

-- Attribute Options
create table if not exists public.vehicle_attribute_options (
  id uuid default uuid_generate_v4() primary key,
  attribute_id uuid references public.vehicle_attributes(id) on delete cascade,
  option_value text not null,
  status text default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_by_admin uuid references public.admins(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.vehicle_attribute_options enable row level security;

drop policy if exists "Allow public all options" on public.vehicle_attribute_options;
create policy "Allow public all options" on public.vehicle_attribute_options for all using (true);

-- Vehicle Brands
create table if not exists public.vehicle_brands (
  id uuid default uuid_generate_v4() primary key,
  vehicle_type_id uuid references public.vehicle_types(id) on delete cascade,
  brand_name text not null,
  status text default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by_admin uuid references public.admins(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.vehicle_brands enable row level security;

drop policy if exists "Allow public all brands" on public.vehicle_brands;
create policy "Allow public all brands" on public.vehicle_brands for all using (true);

-- Vehicle Conditions
create table if not exists public.vehicle_conditions (
  id uuid default uuid_generate_v4() primary key,
  vehicle_type_id uuid references public.vehicle_types(id) on delete cascade,
  condition_name text not null,
  status text default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by_admin uuid references public.admins(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.vehicle_conditions enable row level security;

drop policy if exists "Allow public all conditions" on public.vehicle_conditions;
create policy "Allow public all conditions" on public.vehicle_conditions for all using (true);

-- System Limits
create table if not exists public.system_limits (
  id uuid default uuid_generate_v4() primary key,
  limit_key text not null unique,
  limit_value text not null,
  vehicle_type_id uuid references public.vehicle_types(id) on delete set null,
  updated_by_admin uuid references public.admins(id),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.system_limits enable row level security;

drop policy if exists "Allow public all limits" on public.system_limits;
create policy "Allow public all limits" on public.system_limits for all using (true);

-- CarAd Table
create table if not exists public."CarAd" (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references public.users(id) on delete cascade,
  vehicle_type_id uuid references public.vehicle_types(id),
  title text not null,
  price numeric not null,
  location text not null,
  description text,
  status text default 'PENDING' check (status in ('DRAFT', 'PENDING', 'ACTIVE', 'SOLD', 'EXPIRED', 'REJECTED')),
  is_featured boolean default false,
  views_count integer default 0,
  expiry_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public."CarAd" enable row level security;

drop policy if exists "Public view active ads" on public."CarAd";
create policy "Public view active ads" on public."CarAd" for select using (status = 'ACTIVE' or status = 'SOLD');

drop policy if exists "Users can crud own ads" on public."CarAd";
create policy "Users can crud own ads" on public."CarAd" for all using (auth.uid() = seller_id);

drop policy if exists "Admins can all ads" on public."CarAd";
create policy "Admins can all ads" on public."CarAd" for all using (true);

-- CarDetails Table (Standard Attributes)
create table if not exists public."CarDetails" (
  id uuid default uuid_generate_v4() primary key,
  ad_id uuid references public."CarAd"(id) on delete cascade,
  condition text,
  brand text,
  model text,
  year text,
  mileage text,
  engine_capacity text,
  fuel_type text,
  transmission text,
  body_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public."CarDetails" enable row level security;

drop policy if exists "Public view details" on public."CarDetails";
create policy "Public view details" on public."CarDetails" for select using (true);

drop policy if exists "Users can crud own details" on public."CarDetails";
create policy "Users can crud own details" on public."CarDetails" for all using (true);

-- CarDetails Table (Dynamic Attributes)
create table if not exists public.car_details_attribute_values (
  id uuid default uuid_generate_v4() primary key,
  ad_id uuid references public."CarAd"(id) on delete cascade,
  attribute_id uuid references public.vehicle_attributes(id),
  value text, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.car_details_attribute_values enable row level security;

drop policy if exists "Public view details" on public.car_details_attribute_values;
create policy "Public view details" on public.car_details_attribute_values for all using (true);

-- Ad Images
create table if not exists public."AdImage" (
    id uuid default uuid_generate_v4() primary key,
    ad_id uuid references public."CarAd"(id) on delete cascade,
    image_url text not null,
    is_primary boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public."AdImage" enable row level security;

drop policy if exists "Public view images" on public."AdImage";
create policy "Public view images" on public."AdImage" for all using (true);
