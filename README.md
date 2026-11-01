# Traveler's Thoughts

The standalone Next.js site for [travelersthoughts.com](https://travelersthoughts.com): public blog, admin for writing and publishing, MySQL for content, and local storage for images. No WordPress.

## Getting started

```bash
npm install
cp .env.example .env        # set DATABASE_URL
npm run db:migrate          # create or update tables
npm run admin:create        # create your admin login (asks for email and password)
npm run dev
```

Write at [localhost:3000/admin](http://localhost:3000/admin/). Publishing updates the post page, homepage, category pages, sitemap and RSS feed immediately.

## The admin

| Section | What it does | Who |
| --- | --- | --- |
| Dashboard | Post counts, drafts, new messages, plus traffic, Google Search and speed widgets (see below) | Everyone |
| Posts / Pages | Write in a visual editor (or HTML), set cover image, categories, tags, SEO title and description with a Google preview, preview drafts, publish, unpublish, delete (one at a time, ticked in bulk, or all drafts) | Authors: their own posts. Admins: all |
| Media | Upload (drag and drop), edit alt text, delete unused images (one at a time or ticked in bulk) | Everyone; deleting others' uploads is admin-only |
| Categories / Tags | Create, rename, reorder, delete | Admins |
| Users | Add writers, change roles, reset passwords, unlock, deactivate | Admins |
| Profile | Name, bio and photo shown on your posts; change password | Everyone |

Security notes:

- Passwords are hashed with scrypt. Sessions live in MySQL; the cookie holds a random token and the database only stores its SHA-256.
- After 5 wrong passwords an account locks for 15 minutes (admins can unlock it); each IP is also throttled.
- New users get a one-time temporary password, shown once to the admin who created them.
- All post HTML is sanitized on save; scripts, event handlers and `javascript:` links are stripped.
- `/admin` and `/api/admin` are excluded from search engines (`robots.txt` and `X-Robots-Tag`).

## MySQL

Create the database and an app user that can only reach it (run as root once):

```sql
CREATE DATABASE travelersthoughts CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'travelersthoughts'@'localhost' IDENTIFIED BY '<password>';
CREATE USER 'travelersthoughts'@'127.0.0.1' IDENTIFIED BY '<password>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON travelersthoughts.* TO 'travelersthoughts'@'localhost', 'travelersthoughts'@'127.0.0.1';
```

To change the schema: edit `lib/db/schema.ts`, run `npm run db:generate` to write a migration into `drizzle/`, then `npm run db:migrate`. Commit the migration files. (`drizzle-kit push` is avoided because it misreads MySQL's composite primary keys.)

## Images

Uploads are stored in `storage/uploads/` (or `UPLOAD_DIR`) and served from `/uploads/...`. Large photos are resized to 2400px wide on upload and served as AVIF/WebP through Next's image optimizer. **Back this folder up together with the database**; it is not in git.

### Deploying

The images are not in the repository, so a server built from git has none until you copy them over. Give them a permanent home outside the app folder, so deploys never touch them:

```bash
rsync -avz storage/uploads/ user@server:/var/www/travelersthoughts-uploads/
```

Then set `UPLOAD_DIR=/var/www/travelersthoughts-uploads` in the server's environment and restart. New uploads from the admin are written there too.

With `output: "standalone"`, also copy `public/` and `.next/static/` next to `.next/standalone/server.js` as the Next.js docs describe. Uploads are deliberately excluded from the standalone bundle.

## Dashboard insights

The dashboard reads three Google services. Each widget works on its own and shows a "Couldn't load" note with the reason until its settings are in place. Results are cached (traffic and search for an hour, speed for a day), so the site itself does no extra work.

| Widget | Needs |
| --- | --- |
| Traffic (Google Analytics 4) | `GOOGLE_SERVICE_ACCOUNT_JSON`, `GA4_PROPERTY_ID`, and `NEXT_PUBLIC_GA_ID` on the live site so visits are recorded |
| Google Search (Search Console) | `GOOGLE_SERVICE_ACCOUNT_JSON`, `GSC_SITE_URL` |
| Speed (PageSpeed Insights) | `GOOGLE_API_KEY` (without one, Google's shared free quota is usually used up) |

One-time setup:

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project, then enable **Google Analytics Data API**, **Google Search Console API** and **PageSpeed Insights API** (APIs & Services → Library).
2. IAM & Admin → Service accounts → **Create service account** (no roles needed). Open it → Keys → Add key → JSON. A key file downloads; keep it private.
3. Google Analytics → Admin → Property access management → add the service account's email as **Viewer**. Admin → Property details shows the numeric **property ID** for `GA4_PROPERTY_ID`.
4. Search Console → Settings → Users and permissions → add the same email with **Restricted** permission. `GSC_SITE_URL` is the property exactly as Search Console names it: `sc-domain:travelersthoughts.com` for a domain property, or `https://travelersthoughts.com/` for a URL-prefix one.
5. APIs & Services → Credentials → Create credentials → **API key**; restrict it to the PageSpeed Insights API. That is `GOOGLE_API_KEY`.
6. Put the values in hPanel's environment variables and redeploy. For `GOOGLE_SERVICE_ACCOUNT_JSON`, paste the key file as one line, or its base64 (`base64 -i key.json | tr -d '\n'`) if the panel breaks the JSON.

## Moving off WordPress

All content and media have already been imported. The scripts in `scripts/wordpress/` exist for one last sync just before switching the domain:

```bash
npm run wp:import           # pull posts/pages/categories/tags (skips posts edited here since)
npm run wp:media            # copy any new images and rewrite their URLs
```

Old WordPress URLs keep working: posts and categories use the same paths, `/feed/` redirects to `/rss.xml`, `/wp-content/uploads/...` redirects to `/uploads/...`, and `/wp-admin` goes to the new admin. Once the domain points here, the `scripts/wordpress/` folder and `WP_URL` can be deleted.

## Layout

| Path | What it is |
| --- | --- |
| `app/(site)/` | Public pages: home, `[slug]` posts and pages, category archives |
| `app/admin/` | Admin: `(auth)/login` and the signed-in `(panel)` |
| `app/api/admin/media/` | Image upload and library API |
| `app/uploads/` | Serves uploaded files |
| `app/sitemap.ts`, `app/robots.ts`, `app/rss.xml/` | Sitemap, robots.txt, RSS |
| `lib/content/` | Public content reads, cached under the `content` tag |
| `lib/admin/`, `lib/auth/`, `lib/media/` | Admin queries, login and sessions, image storage |
| `lib/db/schema.ts`, `drizzle/` | Schema and migrations |
| `proxy.ts` | Sends signed-out visitors from `/admin` to the login page |

## SEO notes

- URLs keep WordPress's trailing slash (`trailingSlash: true`), so existing rankings and backlinks carry over.
- Each post ships `BlogPosting` and `BreadcrumbList` structured data, a canonical URL, Open Graph article times, and a visible "Updated" date.
- Changing a published post's or category's URL records a permanent redirect from the old one.
- Drafts and unpublished posts return 404.
