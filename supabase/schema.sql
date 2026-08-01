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
  created_at timestamptz not null default now()
);

create table if not exists site_content (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table products enable row level security;
alter table site_content enable row level security;

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
  ('images.lock_logo', 'assets/img/lock/wordmark-maroon.png'),
  ('images.lock_tagline', 'assets/img/lock/tagline-maroon.png'),
  ('images.lock_photo', 'assets/img/lock/model.png'),
  ('lock.eyebrow', 'Somethings are worth discovering before they are announced'),
  ('lock.subheading', 'Preparing for it''s first chapter'),
  ('lock.cta', 'Join the guest list'),
  ('site.locked', 'false')
on conflict (key) do nothing;
