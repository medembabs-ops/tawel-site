# DEPLOY.md — Landing Pages Deployment System

## Architecture Overview

```
GitHub repo → Cloudflare Pages (auto-deploy on push)
Serving root: /pages/

pages/balance-logic/index.html  →  yoursite.pages.dev/balance-logic/
pages/new-client/index.html     →  yoursite.pages.dev/new-client/
pages/index.html                →  yoursite.pages.dev/
```

**Stack:** GitHub (source) + Cloudflare Pages (hosting, CDN, SSL — free tier supports unlimited sites and 500 deploys/month)

---

## PART 1 — First-Time Setup (Do Once)

### Step 1: Create the GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `landing-pages` (or similar)
3. Set to **Private**
4. Do NOT initialize with README, .gitignore, or license (repo already has these)
5. Click **Create repository**
6. Copy the repo URL — looks like: `https://github.com/YOUR_USERNAME/landing-pages.git`

### Step 2: Connect Local Repo to GitHub

Run these commands (replace URL with your actual repo URL):

```bash
git remote add origin https://github.com/YOUR_USERNAME/landing-pages.git
git branch -M main
git push -u origin main
```

If you have uncommitted files first commit them:

```bash
git add .gitignore pages/
git commit -m "Initial commit — Balance Logic landing page"
git push -u origin main
```

### Step 3: Connect to Cloudflare Pages

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Go to **Workers & Pages** → **Create application** → **Pages** tab
3. Click **Connect to Git**
4. Authorize Cloudflare to access your GitHub account
5. Select the `landing-pages` repository
6. Click **Begin setup**

**Configure build settings — this is critical:**

| Setting | Value |
|---|---|
| Project name | `landing-pages` (or your preferred name) |
| Production branch | `main` |
| Framework preset | None |
| Build command | *(leave empty)* |
| Deploy command | *(leave empty — Cloudflare fills this automatically)* |
| Build output directory | *(leave empty)* |

> **Note:** The repo includes a `wrangler.jsonc` file that tells Cloudflare to serve the `pages/` directory as static assets. No build output directory config needed — `wrangler.jsonc` handles it.

7. Click **Save and Deploy**

Cloudflare will deploy and give you a URL like:
`https://landing-pages.workers.dev`

Your first page is now live at:
`https://landing-pages.workers.dev/balance-logic/`

### Step 4 (Optional): Add a Custom Domain

1. In Cloudflare Pages → your project → **Custom domains** tab
2. Click **Set up a custom domain**
3. Enter your domain, e.g. `pages.yourdomain.com` or `yourdomain.com`
4. Follow the DNS setup instructions (add a CNAME record)
5. SSL is provisioned automatically — no config needed

Once set up, pages are at:
`https://yourdomain.com/balance-logic/`

---

## PART 2 — Deploying a New Page (Every Time)

### Standard Workflow

1. **Create the page folder and file:**
   ```
   pages/
   └── client-name/
       ├── index.html    ← the landing page
       └── logo.png      ← client logo (if any)
   ```
   Folder name = the URL slug. Use lowercase kebab-case: `client-name`

2. **Stage and commit:**
   ```bash
   git add pages/client-name/
   git commit -m "Add [Client Name] landing page"
   git push
   ```

3. **Update the internal dashboard** — open `pages/index.html` and add an entry to the `PAGES` array:
   ```js
   { name: 'Client Name', slug: '/client-name/', date: 'YYYY-MM-DD' },
   ```
   Commit this change together with the new page (or in the same push).

4. **Cloudflare auto-deploys** — typically live within 60 seconds.

5. **Verify the dashboard** — after deployment, open the internal dashboard and confirm the new page appears in the list. If it's missing, you forgot step 3.

6. **Live URL:**
   `https://landing-pages-abc.pages.dev/client-name/`
   or with custom domain:
   `https://yourdomain.com/client-name/`

### Updating an Existing Page

1. Edit `pages/client-name/index.html`
2. Commit and push:
   ```bash
   git add pages/client-name/index.html
   git commit -m "Update [Client Name] — [brief description of change]"
   git push
   ```
3. Live within ~60 seconds.

---

## PART 3 — URL Reference

| Client / Page | Folder | Live URL |
|---|---|---|
| Balance Logic | `pages/balance-logic/` | `yourdomain.com/balance-logic/` |
| Logical.net | `pages/logical-net/` | `yourdomain.com/logical-net/` |
| Kauzer Capital Management | `pages/kauzer-capital/` | `yourdomain.com/kauzer-capital/` |
| *(next page)* | `pages/[slug]/` | `yourdomain.com/[slug]/` |

> Keep this table updated as pages are added.

---

## PART 4 — Naming Convention

| Item | Convention | Example |
|---|---|---|
| Folder name | lowercase kebab-case | `balance-logic` |
| Logo file | `logo.png` in the page folder | `pages/balance-logic/logo.png` |
| Commit message | `Add [Client] landing page` | `Add Balance Logic landing page` |
| Update commit | `Update [Client] — [what changed]` | `Update Balance Logic — new FAQ` |

---

## PART 5 — Cloudflare Pages Free Tier Limits

| Limit | Amount |
|---|---|
| Sites | Unlimited |
| Deploys per month | 500 |
| Requests per month | Unlimited |
| Bandwidth | Unlimited |
| Custom domains | Unlimited |
| SSL certificates | Automatic (free) |

500 deploys/month = ~16 pushes/day. More than enough.

---

## PART 6 — Troubleshooting

**Page not found after push:**
- Check Cloudflare Pages → Deployments tab to confirm the deploy succeeded
- Verify the folder name in `pages/` matches the URL slug exactly
- Make sure the file is named `index.html` (not `Index.html`)

**Build failed:**
- Build output directory must be `pages` (no leading slash)
- Build command must be empty — this is a static site, no build needed

**Old version still showing:**
- Cloudflare CDN caches aggressively. Hard refresh: `Ctrl + Shift + R`
- Or purge cache: Cloudflare Dashboard → Caching → Purge Everything

**Logo not loading:**
- Logo must be in the same folder as `index.html`
- Reference it as `src="logo.png"` (relative path, no leading slash)

---

## PART 7 — Quick Reference Card

```
NEW PAGE:
  1. Create pages/[slug]/index.html
  2. Add entry to PAGES array in pages/index.html (dashboard)
  3. git add pages/[slug]/ pages/index.html
  4. git commit -m "Add [Client] landing page"
  5. git push
  6. Verify new page shows in internal dashboard
  7. Live at: yourdomain.com/[slug]/

UPDATE PAGE:
  1. Edit pages/[slug]/index.html
  2. git add pages/[slug]/index.html
  3. git commit -m "Update [Client] — [what changed]"
  4. git push
  5. Live in ~60 seconds
```
