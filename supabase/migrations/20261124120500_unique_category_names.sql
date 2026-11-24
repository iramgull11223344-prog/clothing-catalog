-- Applied to project aiyzbkmwiqppqtbbuvwg on 2026-11-24 (kept here for reference).
-- No two sub-categories with the same name (ignoring case and extra spaces) in one category,
-- and no two main categories with the same name. Backstop for the admin UI checks.
create unique index if not exists subcategories_category_name_key_idx
  on public.subcategories (category_id, lower(btrim(regexp_replace(name, '\s+', ' ', 'g'))));

create unique index if not exists categories_name_key_idx
  on public.categories (lower(btrim(regexp_replace(name, '\s+', ' ', 'g'))));
