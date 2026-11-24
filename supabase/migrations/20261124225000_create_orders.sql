-- Applied to project aiyzbkmwiqppqtbbuvwg on 2026-11-25 (kept here for reference).
-- Orders placed on the website. Visitors never write this table directly: they call
-- public.place_order(), which re-reads every price from the catalogue.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigint generated always as identity (start with 1001) unique,
  customer_name text not null check (char_length(btrim(customer_name)) between 1 and 80),
  phone text not null check (char_length(btrim(phone)) between 5 and 30),
  address text not null check (char_length(btrim(address)) between 1 and 300),
  note text check (note is null or char_length(note) <= 600),
  -- [{product_id, name, image, color, color_hex, size, qty, unit_price, line_total}]
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  total numeric(12, 2) not null check (total >= 0),
  status text not null default 'new' check (status in ('new', 'contacted', 'delivered', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;

create policy "admin read" on public.orders for select to authenticated using ((select private.is_admin()));
create policy "admin update" on public.orders for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin delete" on public.orders for delete to authenticated using ((select private.is_admin()));

revoke all on public.orders from anon, authenticated;
grant select, update, delete on public.orders to authenticated;

-- public.place_order(p_name, p_phone, p_address, p_note, p_items jsonb)
--   returns (order_no, total); SECURITY DEFINER, search_path ''.
--   Validates the customer fields, looks every item up in products/product_variants
--   (active product, matching colour/size, is_available), takes the price from the
--   variant (or the product), stores name/photo/colour/size/qty/unit_price/line_total,
--   inserts the order and returns its number and total. See the live definition with:
--   select pg_get_functiondef('public.place_order(text,text,text,text,jsonb)'::regprocedure);
-- grant execute on function public.place_order(text, text, text, text, jsonb) to anon, authenticated;
