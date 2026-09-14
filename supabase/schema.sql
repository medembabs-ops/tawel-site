-- Tawel Style — Supabase schema, RLS policies, and seed data.
-- Run this once in the Supabase project's SQL editor (Dashboard → SQL Editor → New query).

-- ============================================================
-- Tables
-- ============================================================

create table if not exists products (
  id text primary key,
  name text not null,
  category text not null,
  price numeric not null,
  sizes text[] not null default '{}',
  image text,
  description text,
  stock integer,
  created_at timestamptz not null default now()
);

-- stock is nullable and untracked by default (NULL = always available,
-- same as every product before this column existed) — only an explicit
-- 0 (or less) counts as sold out. Harmless no-op if the table was just
-- created above with the column already.
alter table products add column if not exists stock integer;

-- Shopify linkage — nullable, populated by the Worker after the admin panel
-- syncs a product. shopify_variant_ids maps each size to its Shopify
-- variant/inventory item id, e.g. {"M": {"variant_id": 123, "inventory_item_id": 456}}.
alter table products add column if not exists shopify_product_id text;
alter table products add column if not exists shopify_variant_ids jsonb not null default '{}';

create table if not exists site_content (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists guest_list (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- THE VAULT: an open-ended, admin-managed photo gallery — unlike the fixed
-- images.debut_1..4 slots, the admin can add or remove as many of these as
-- they like from the admin panel, each with its own name.
create table if not exists vault_images (
  id bigint generated always as identity primary key,
  name text not null default '',
  image text not null,
  created_at timestamptz not null default now()
);

-- Locked landing page photo(s). When site_content['lock.photos_alternate']
-- is 'true' and there are 2+ rows here, the locked page rotates through
-- all of them, 30 minutes apart. With alternating off (or 0 rows), the
-- page falls back to images.lock_photo, then to a hardcoded default.
create table if not exists lock_photos (
  id bigint generated always as identity primary key,
  image text not null,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id bigint generated always as identity primary key,
  reference text not null unique,
  customer_name text not null,
  customer_email text not null,
  shipping_address jsonb not null default '{}',
  items jsonb not null default '[]',
  amount numeric not null,
  currency text not null default 'NGN',
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Shopify linkage — set once the Worker creates the matching draft order,
-- then reused so a retried checkout/webhook never creates a duplicate.
alter table orders add column if not exists shopify_draft_order_id text;

-- Widen the status check for tables created before "cancelled" existed —
-- harmless no-op if the table was just created above with it already.
alter table orders drop constraint if exists orders_payment_status_check;
alter table orders add constraint orders_payment_status_check
  check (payment_status in ('pending', 'paid', 'failed', 'cancelled'));

-- ============================================================
-- Row Level Security
-- ============================================================

alter table products enable row level security;
alter table site_content enable row level security;
alter table guest_list enable row level security;
alter table orders enable row level security;
alter table vault_images enable row level security;
alter table lock_photos enable row level security;

-- Public (storefront) can read everything.
drop policy if exists "products readable by anyone" on products;
create policy "products readable by anyone"
  on products for select
  to anon, authenticated
  using (true);

drop policy if exists "site_content readable by anyone" on site_content;
create policy "site_content readable by anyone"
  on site_content for select
  to anon, authenticated
  using (true);

-- Only the logged-in owner (the one manually-created auth user) can write.
drop policy if exists "products writable by authenticated" on products;
create policy "products writable by authenticated"
  on products for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "site_content writable by authenticated" on site_content;
create policy "site_content writable by authenticated"
  on site_content for all
  to authenticated
  using (true)
  with check (true);

-- Guest list: anyone can join (insert their own email), but only the
-- logged-in owner can read the list back — visitors can't see who else signed up.
drop policy if exists "guest_list insertable by anyone" on guest_list;
create policy "guest_list insertable by anyone"
  on guest_list for insert
  to anon, authenticated
  with check (true);

drop policy if exists "guest_list readable by authenticated" on guest_list;
create policy "guest_list readable by authenticated"
  on guest_list for select
  to authenticated
  using (true);

-- Orders: checkout can create its own order, always starting pending — it
-- can never insert a row already marked paid. Only the webhook (using the
-- Supabase service role key, which bypasses RLS entirely) marks one paid.
-- The owner can read every order and, if needed, correct one by hand.
drop policy if exists "orders insertable by anyone" on orders;
create policy "orders insertable by anyone"
  on orders for insert
  to anon, authenticated
  with check (payment_status = 'pending');

drop policy if exists "orders readable by authenticated" on orders;
create policy "orders readable by authenticated"
  on orders for select
  to authenticated
  using (true);

drop policy if exists "orders writable by authenticated" on orders;
create policy "orders writable by authenticated"
  on orders for update
  to authenticated
  using (true)
  with check (true);

-- Vault gallery: anyone can view it, only the owner can add/rename/remove photos.
drop policy if exists "vault_images readable by anyone" on vault_images;
create policy "vault_images readable by anyone"
  on vault_images for select
  to anon, authenticated
  using (true);

drop policy if exists "vault_images writable by authenticated" on vault_images;
create policy "vault_images writable by authenticated"
  on vault_images for all
  to authenticated
  using (true)
  with check (true);

-- Locked page photos: anyone can view them (they're shown to logged-out
-- visitors on the locked landing page itself), only the owner can manage them.
drop policy if exists "lock_photos readable by anyone" on lock_photos;
create policy "lock_photos readable by anyone"
  on lock_photos for select
  to anon, authenticated
  using (true);

drop policy if exists "lock_photos writable by authenticated" on lock_photos;
create policy "lock_photos writable by authenticated"
  on lock_photos for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Storage — product images
-- ============================================================
-- Create the bucket first via Dashboard → Storage → New bucket → "product-images" → Public.
-- Then run the policies below (Storage policies live on storage.objects).

drop policy if exists "product-images readable by anyone" on storage.objects;
create policy "product-images readable by anyone"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "product-images writable by authenticated" on storage.objects;
create policy "product-images writable by authenticated"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

-- ============================================================
-- Storage — site images (logo, marks, homepage photography)
-- ============================================================
-- Create the bucket first via Dashboard → Storage → New bucket → "site-images" → Public.

drop policy if exists "site-images readable by anyone" on storage.objects;
create policy "site-images readable by anyone"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'site-images');

drop policy if exists "site-images writable by authenticated" on storage.objects;
create policy "site-images writable by authenticated"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'site-images')
  with check (bucket_id = 'site-images');

-- ============================================================
-- Seed data — current catalog and site copy
-- ============================================================

insert into products (id, name, category, price, sizes, image, description) values
  ('wordmark-tank-black', 'Wordmark Tank — Black', 'Tops', 68, '{S,M,L,XL}', 'assets/img/products/wordmark-tank-black.png', 'Heavyweight ribbed cotton tank with the house wordmark embroidered in Bordeaux across the chest. Black.'),
  ('wordmark-tank-white', 'Wordmark Tank — White', 'Tops', 68, '{S,M,L,XL}', 'assets/img/products/wordmark-tank-white.png', 'Heavyweight ribbed cotton tank with the house wordmark embroidered in Bordeaux across the chest. White.'),
  ('well-beloved-polo-burgundy', 'Well Beloved Rugby Polo — Burgundy', 'Polos', 148, '{S,M,L,XL}', 'assets/img/products/rugby-polo-burgundy.png', 'Block-striped rugby polo in Bordeaux and white, with the TS monogram and Well Beloved crest embroidered at the chest.'),
  ('well-beloved-polo-green', 'Well Beloved Rugby Polo — Green', 'Polos', 148, '{S,M,L,XL}', 'assets/img/products/rugby-polo-green.png', 'Block-striped rugby polo in green and white, with the TS monogram and Well Beloved crest embroidered at the chest.'),
  ('well-beloved-polo-charcoal', 'Well Beloved Rugby Polo — Charcoal', 'Polos', 148, '{S,M,L,XL}', 'assets/img/products/rugby-polo-charcoal.png', 'Block-striped rugby polo in charcoal marl and black, with the TS monogram and Well Beloved crest embroidered at the chest.'),
  ('well-beloved-polo-tan', 'Well Beloved Rugby Polo — Tan', 'Polos', 148, '{S,M,L,XL}', 'assets/img/products/rugby-polo-tan.png', 'Block-striped rugby polo in tan and white, with the TS monogram and Well Beloved crest embroidered at the chest.')
on conflict (id) do nothing;

insert into site_content (key, value) values
  ('home.hero_tagline', 'To All We Ever Loved'),
  ('home.manifesto', 'We do not bend to the moment we create for every chapter love will write'),
  ('home.atelier_heading', 'Curated for the life you love'),
  ('home.atelier_paragraph', 'Tawel Style keeps a small palette on purpose — Bordeaux, Ivory, Ink, Blush — and asks every piece to earn its place inside it. Nothing is added that the signature didn''t already say.'),
  ('about.hero_headline', 'The house was built around a signature before it was built around a collection.'),
  ('about.origin_paragraph', 'Tawel Style began with a single piece of handwriting — a name, written once, in Bordeaux ink, and never redrawn. Everything the house makes since has been an attempt to earn a place next to that mark: cut with the same restraint, finished with the same patience.'),
  ('about.pull_quote', 'Four colours. One hand. No second script.'),
  ('contact.intro_paragraph', 'For orders, fit questions, or press enquiries, write to us directly. We reply within two working days.'),
  ('contact.email', 'hello@tawelstyle.com'),
  ('contact.shipping_note', 'Complimentary returns within 14 days of delivery.'),
  ('images.wordmark', 'brand_assets/wordmark-bordeaux.png'),
  ('images.gold_star', 'brand_assets/gold-star.png'),
  ('images.lifestyle_seated', 'assets/img/lifestyle/well-beloved-seated.jpg'),
  ('images.lifestyle_back', 'assets/img/lifestyle/well-beloved-back.png'),
  ('images.about_photo', ''),
  ('images.lock_logo', 'assets/img/lock/wordmark-maroon.png'),
  ('images.lock_tagline', 'assets/img/lock/tagline-maroon.png'),
  ('images.lock_photo', 'assets/img/lock/model.png'),
  ('images.debut_1', 'assets/img/products/wordmark-tank-black.png'),
  ('images.debut_2', 'assets/img/products/wordmark-tank-white.png'),
  ('images.debut_3', 'assets/img/products/rugby-polo-burgundy.png'),
  ('images.debut_4', 'assets/img/products/rugby-polo-green.png'),
  ('debut.subtitle_1', ''),
  ('debut.subtitle_2', ''),
  ('debut.subtitle_3', ''),
  ('debut.subtitle_4', ''),
  ('vault.heading', 'For the beautiful life'),
  ('vault.subheading', 'An ongoing archive, added to as it happens.'),
  ('lock.eyebrow', 'Somethings are worth discovering before they are announced'),
  ('lock.subheading', 'Preparing for it''s first chapter'),
  ('lock.cta', 'Join the guest list'),
  ('lock.photos_alternate', 'false'),
  ('site.locked', 'false')
on conflict (key) do nothing;
