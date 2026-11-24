-- Applied to project aiyzbkmwiqppqtbbuvwg on 2026-11-25 (kept here for reference).
-- Small key/value store for editable site texts (e.g. key 'hero' = home page banner).
create table if not exists public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_-]{1,40}$'),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

-- The storefront reads these texts; only admins can change them.
create policy "public read" on public.site_settings
  for select to anon, authenticated
  using (true);

create policy "admin write" on public.site_settings
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
