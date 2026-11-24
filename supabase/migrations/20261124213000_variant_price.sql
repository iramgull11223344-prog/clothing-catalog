-- Applied to project aiyzbkmwiqppqtbbuvwg on 2026-11-25 (kept here for reference).
-- Optional price per variant (colour/item). NULL = use the product's price.
-- Purely additive: existing rows keep NULL, so every current price stays the same.
alter table public.product_variants
  add column if not exists price numeric(12, 2) null
  check (price is null or price >= 0);

comment on column public.product_variants.price is 'Optional price for this variant; NULL means products.price is used.';
