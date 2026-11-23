# Clothing Store – Digital Catalog

Next.js 15 + Supabase. Mobile-first, RTL Kurdish (Sorani).

- `/` home (categories + latest) · `/c/[id]` category · `/p/[id]` product (color swatches, sizes, price)
- `/admin` login, add product from phone camera, manage categories, QR code

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Deploy (Vercel)

Import the repo, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Make yourself admin

1. Supabase → Authentication → Users → Add user (email + password).
2. SQL editor:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'YOUR_EMAIL';
```
