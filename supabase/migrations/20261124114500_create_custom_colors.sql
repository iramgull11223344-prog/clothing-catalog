-- Applied to project aiyzbkmwiqppqtbbuvwg on 2026-11-24 (kept here for reference).
-- Admin-defined colours, reusable on every product.
create table public.custom_colors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  hex text not null check (hex ~ '^#[0-9a-fA-F]{6}$'),
  -- same name ignoring case / extra spaces must not be saved twice
  name_key text generated always as (lower(btrim(regexp_replace(name, '\s+', ' ', 'g')))) stored,
  created_at timestamptz not null default now()
);

create unique index custom_colors_name_key_idx on public.custom_colors (name_key);

alter table public.custom_colors enable row level security;

-- Only admins use this table (the storefront reads colours from product_variants).
create policy "admin read" on public.custom_colors
  for select to authenticated
  using ((select private.is_admin()));

create policy "admin write" on public.custom_colors
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select, insert, update, delete on public.custom_colors to authenticated;
revoke all on public.custom_colors from anon;
