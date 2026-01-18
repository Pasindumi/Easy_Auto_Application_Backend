-- 5. Package Ad Limits (Specific limits per vehicle type)
create table if not exists public.package_ad_limits (
  id uuid default uuid_generate_v4() primary key,
  package_id uuid references public.price_items(id) on delete cascade,
  vehicle_type_id uuid references public.vehicle_types(id) on delete cascade,
  quantity integer default 1,
  is_unlimited boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(package_id, vehicle_type_id) -- Prevent duplicate rules for same vehicle type in one package
);

-- RLS for Ad Limits
alter table public.package_ad_limits enable row level security;
drop policy if exists "Allow public read ad limits" on public.package_ad_limits;
create policy "Allow public read ad limits" on public.package_ad_limits for select using (true);
drop policy if exists "Allow admin all ad limits" on public.package_ad_limits;
create policy "Allow admin all ad limits" on public.package_ad_limits for all using (true);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
