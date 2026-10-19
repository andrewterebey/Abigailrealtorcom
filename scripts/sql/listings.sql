-- public.listings — the Supabase mirror of the replicated MLS Grid feed and,
-- in production, the store the site reads (lib/idx/supabase-provider.ts).
-- scripts/sync-idx.ts upserts {id, record, synced_at}; every search column is
-- GENERATED from `record` and mirrors lib/idx/filter.ts semantics.
-- Recreated 2026-10-09 after the table was dropped during demo-data cleanup.
create table if not exists public.listings (
  id            text primary key,
  record        jsonb not null,
  synced_at     timestamptz not null default now(),
  city_lower    text    generated always as (lower(record->>'city')) stored,
  zip5          text    generated always as (left(record->>'zip', 5)) stored,
  price         integer generated always as ((record->>'price')::integer) stored,
  beds          numeric generated always as ((record->>'beds')::numeric) stored,
  baths         numeric generated always as ((record->>'baths')::numeric) stored,
  status        text    generated always as (record->>'status') stored,
  property_type text    generated always as (record->>'propertyType') stored,
  -- normalizeBrokerageName(): lowercase, strip punctuation, collapse spaces
  brokerage_key text    generated always as (
    btrim(regexp_replace(regexp_replace(lower(coalesce(record->>'brokerageName', '')), '[^a-z0-9 ]', '', 'g'), '\s+', ' ', 'g'))
  ) stored,
  has_photo     boolean generated always as ((record->>'primaryImage') not like '%idx-no-photo%') stored,
  slug          text    generated always as (record->>'slug') stored
);

create index if not exists listings_status_price_idx  on public.listings (status, price);
create index if not exists listings_city_idx          on public.listings (city_lower);
create index if not exists listings_zip5_idx          on public.listings (zip5);
create index if not exists listings_brokerage_idx     on public.listings (brokerage_key);
create index if not exists listings_property_type_idx on public.listings (property_type);
create index if not exists listings_synced_at_idx     on public.listings (synced_at);
create index if not exists listings_has_photo_idx     on public.listings (has_photo desc, price);
create index if not exists listings_slug_idx          on public.listings (slug);
-- default result order of SupabaseProvider.list()
create index if not exists listings_sort_idx          on public.listings (has_photo desc, price desc, id);
-- covering index so result counts (Prefer: count=exact) are index-only scans
create index if not exists listings_search_cover_idx  on public.listings (price)
  include (beds, baths, status, property_type, has_photo, city_lower, zip5, brokerage_key);

alter table public.listings enable row level security;
drop policy if exists "public read access" on public.listings;
create policy "public read access" on public.listings for select using (true);
revoke all on public.listings from anon, authenticated;
grant select on public.listings to anon, authenticated;
