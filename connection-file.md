# Connecting Tawel Style to Supabase

The site's code is already built to load products and site copy from Supabase (see `supabase/schema.sql`, `assets/supabase-client.js`, `assets/products.js`, `assets/site-content.js`, and `admin.html`). Nothing will show live data until the steps below are done — until then, pages just show empty/default content.

## Steps

1. **Create a free Supabase project** at [supabase.com](https://supabase.com).

2. **Run the schema** — open the project's SQL Editor and run the contents of `supabase/schema.sql` from this repo. This creates the `products` and `site_content` tables, sets up Row Level Security (public read, owner-only write), and seeds the current 6 products plus all the site copy.

3. **Create the image bucket** — Storage → New bucket → name it `product-images` → set it **Public**.

4. **Create the owner's login** — Authentication → Users → Add user → enter the owner's email + a password. There is no public sign-up screen; this is the only way in.

5. **Add credentials to the site** — open `assets/supabase-client.js` and replace:
   ```js
   const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```
   with the values from Project Settings → API (Project URL and the `anon` public key — safe to expose, RLS is what actually protects writes).

6. **Push and redeploy.** From then on, edits made by the owner in `/admin.html` go live immediately — no rebuild or redeploy needed, since pages fetch content from Supabase at load time.
