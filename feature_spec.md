\# Case — Feature Spec v1.0



\*\*Product:\*\* Case — "prove you've got it"

\*\*Doc status:\*\* Ready for build. Written for engineering agents to execute against with minimal clarification.

\*\*Audience:\*\* Full-stack engineer/agent team building MVP → v1.

\*\*Market:\*\* Kenya first (Nairobi-dense), mobile-first, low-and-variable bandwidth, M-Pesa-native.



\---



\## 0. Product summary



Case is a proof-of-work profile: a public page where someone shows \*\*what they've done, how they learned it, who'll vouch for them, and what they're aiming for next\*\* — each claim backed by attached evidence (photos, documents, video) rather than just a written claim. It replaces the CV/portfolio/testimonials-page problem for people who don't have a traditional resume: hairstylists, electricians, nurses, tailors, drivers, job seekers, and freelancers.



Two audiences for two rendering strategies:

\- \*\*The public\*\* — anonymous visitors who land on `case.app/@handle` from WhatsApp, Instagram bio, a printed QR code, or Google search. This needs to be \*\*fast, indexable, and shareable\*\* — a plain server-rendered page, not an app shell.

\- \*\*The owner\*\* — the person building their Case. This needs to feel like a \*\*native app\*\*: installable, works offline, fast to add proof from a phone camera, nudges them to keep building.



One codebase, two experiences. See §5.



\---



\## 1. Users



| Persona | Goal | Example from prototype |

|---|---|---|

| \*\*Service provider\*\* | Convert social proof into bookings | Braider/hairstylist, electrician, mechanic |

| \*\*Credentialed professional\*\* | Prove licenses/credentials are real and current | ICU nurse, accountant, teacher |

| \*\*Job seeker\*\* | Stand out with evidence, not just a CV line | Support-to-sales career switcher |



Design for these three archetypes explicitly (persona picker at onboarding sets section copy, defaults, and empty-state prompts — this already exists in the prototype's `personas` object and should become real onboarding logic, not a demo switcher).



\---



\## 2. Core concept \& glossary



| Term | Meaning |

|---|---|

| \*\*Proof item\*\* | One claim, belonging to one of four pillars: `did`, `trained`, `vouched`, `aiming` |

| \*\*Pillar\*\* | `did` = work completed · `trained` = how they learned it · `vouched` = who'll speak for them · `aiming` = what they want next |

| \*\*Evidence\*\* | A photo, document (PDF/image), or video attached to a proof item, backing the claim |

| \*\*Vouch request\*\* | A link sent to a third party (client, employer, teacher) that lets \*them\* submit a quote/testimonial + evidence directly — without needing a Case account |

| \*\*Completeness score\*\* | % of profile "built" — nudges the owner to add evidence to bare claims |

| \*\*Handle\*\* | Public vanity URL, `case.app/@handle` |

| \*\*Case+\*\* | Paid tier (see §7.8) |

| \*\*Case (the account)\*\* | One profile/handle. A single owner may hold more than one Case — see §6.13 |

| \*\*Case Search\*\* | The in-product discovery/search surface where discoverable profiles can be found by category and location — see §6.14 |



Do not rename these terms — they're the product's voice.



\---



\## 3. Information architecture



| Route | Renders as | Auth | Indexed? |

|---|---|---|---|

| `case.app/` | Marketing/landing (multipage, static) | No | Yes |

| `case.app/@handle` | \*\*Public profile\*\* — SSR/ISR per user | No | Yes, primary SEO surface |

| `case.app/@handle/vouch/\[token]` | Public vouch-submission form | Token, no account | No |

| `case.app/@handle/qr` | Print-ready QR/card view | No | No |

| `case.app/login`, `/signup` | Auth | No | No |

| `case.app/onboarding` | Persona pick → quick-start wizard | Yes | No |

| `case.app/dashboard` | \*\*App shell\*\* — the PWA | Yes | No |

| `case.app/dashboard/proof/new` | Add proof item + evidence | Yes | No |

| `case.app/dashboard/analytics` | Owner-only view stats | Yes | No |

| `case.app/dashboard/billing` | Paystack checkout, plan status | Yes | No |

| `case.app/dashboard/settings` | Handle, socials, persona, privacy | Yes | No |



\*\*Two rendering modes, one app:\*\* public routes (`/`, `/@handle`, `/@handle/vouch/\*`) are server-rendered pages optimized for SEO and cold load speed. `/dashboard/\*` is the installable app shell — client-heavy, cached by the service worker, works offline. This is the natural split in Next.js App Router (see §5) — no separate codebase needed.



\---



\## 4. Tech stack \& architecture



\### Recommendation



| Layer | Choice | Why |

|---|---|---|

| Framework | \*\*Next.js 14+ (App Router)\*\* | One codebase gives SSR/ISR per-profile pages for SEO \*and\* an installable PWA shell for the dashboard. Largest ecosystem, best-documented for agent-driven builds — lowest risk of the agent going off the rails. |

| Hosting | \*\*Cloudflare Pages\*\* (`@cloudflare/next-on-pages`) | Matches your CDN/bucket choice, edge network genuinely close to Nairobi via Cloudflare's African PoPs, one bill. |

| Database + Auth | \*\*Supabase (Postgres + Auth + RLS)\*\* | Requested. Use Postgres for all relational data; Supabase Auth (email OTP + phone OTP via Africa's Talking or Twilio) for login. |

| Analytics store | \*\*Supabase Postgres\*\* (event table, §7.6) — \*not\* Supabase's own product analytics | You want analytics \*for the user\* (profile views, evidence taps), not app telemetry. Roll your own lightweight event table; it's simple, queryable with SQL the owner-facing dashboard needs, and keeps everything in one database. |

| Object storage | \*\*Cloudflare R2\*\* | Requested. Zero egress fees matter a lot once profile pages (with images) start getting real traffic. |

| Media transform/CDN | \*\*Cloudflare Images\*\* (resize/format variants) for photos; \*\*client-side compression\*\* before upload for both photos and video (see §7.3) | Keeps origin storage small and serves right-sized WebP/AVIF automatically at the edge. |

| Edge functions | \*\*Cloudflare Workers\*\* | Paystack webhook receiver, OG-image generation per profile, R2 signed-upload URL issuance. |

| Payments | \*\*Paystack\*\* (Kenya: card + M-Pesa) | Requested. |

| Push notifications | \*\*Web Push (VAPID)\*\* via service worker | No native app store dependency; works on Android well, degraded-but-functional on iOS 16.4+. |



\### Why not a native app

A PWA gets you install-to-home-screen, offline, push, and camera access on Android (the dominant OS in this market) without app-store friction or a 15–30% payment cut on a product already priced at 50–100 KES. Revisit native wrapping (Capacitor) only if App/Play Store discovery becomes a growth channel worth the cost — not an MVP concern.



\### High-level flow

```

Visitor → case.app/@handle (Cloudflare Pages, SSR/ISR, cached at edge)

&#x20;               │

&#x20;               ▼

&#x20;       Supabase Postgres (profile + proof + evidence rows)

&#x20;               │

Evidence files ─┴─→ Cloudflare R2 (origin) → Cloudflare Images (variants) → CDN edge



Owner → case.app/dashboard (PWA shell, service worker cached)

&#x20;               │

&#x20;               ▼

&#x20;       Supabase Auth + Postgres (read/write own data via RLS)

&#x20;               │

Uploads → client-side compress → signed R2 PUT URL (issued by Worker) → R2



Payments → Paystack checkout → webhook → Cloudflare Worker → verifies signature

&#x20;               → writes subscriptions row in Supabase → dashboard reflects new plan

```



\---



\## 5. Data model (Supabase / Postgres)



```sql

\-- Profiles ("Cases") — many per owner. Multi-account: one auth identity

\-- can hold several Cases (e.g. "braider" + "makeup artist"). Each Case

\-- has its own handle, plan, and subscription — see §6.13.

create table profiles (

&#x20; id uuid primary key default gen\_random\_uuid(),

&#x20; owner\_id uuid not null references auth.users(id),  -- login identity; 1:many

&#x20; handle text unique not null,              -- lowercase, \[a-z0-9.\_-], 3-30 chars

&#x20; persona text not null check (persona in ('service','professional','jobseeker')),

&#x20; display\_name text not null,

&#x20; role\_line text,                            -- "Freelance hairstylist \& braider · Nairobi"

&#x20; tagline text,

&#x20; avatar\_url text,

&#x20; socials jsonb default '\[]',                -- \[{platform, url}]

&#x20; is\_public boolean default true,

&#x20; locale text default 'en',                  -- 'en' | 'sw'

&#x20; category text,                              -- e.g. "hairstylist", "electrician" (search facet)

&#x20; tags text\[] default '{}',                   -- e.g. {"braids","locs","natural hair"}

&#x20; location\_area text,                         -- e.g. "Westlands, Nairobi"

&#x20; discoverable boolean default true,          -- opt-out of Case Search, see §6.14

&#x20; created\_at timestamptz default now(),

&#x20; updated\_at timestamptz default now()

);

create index on profiles (owner\_id);

create index on profiles (category, location\_area) where discoverable and is\_public;



\-- Proof items — the did/trained/vouched/aiming claims

create table proof\_items (

&#x20; id uuid primary key default gen\_random\_uuid(),

&#x20; profile\_id uuid references profiles(id) on delete cascade,

&#x20; pillar text not null check (pillar in ('did','trained','vouched','aiming')),

&#x20; title text not null,

&#x20; detail text,

&#x20; when\_label text,                           -- free-text date range, e.g. "2020–2022"

&#x20; visible boolean default true,              -- owner can draft/hide without deleting

&#x20; sort\_order int default 0,

&#x20; source text default 'owner' check (source in ('owner','vouch\_request')),

&#x20; created\_at timestamptz default now(),

&#x20; updated\_at timestamptz default now()

);



\-- Evidence — files attached to a proof item

create table evidence (

&#x20; id uuid primary key default gen\_random\_uuid(),

&#x20; proof\_item\_id uuid references proof\_items(id) on delete cascade,

&#x20; type text not null check (type in ('img','pdf','vid')),

&#x20; storage\_key text not null,                 -- R2 object key

&#x20; caption text,

&#x20; width int, height int, duration\_seconds int,

&#x20; bytes\_original int, bytes\_compressed int,

&#x20; created\_at timestamptz default now()

);



\-- Vouch requests — token-based public submission

create table vouch\_requests (

&#x20; id uuid primary key default gen\_random\_uuid(),

&#x20; profile\_id uuid references profiles(id) on delete cascade,

&#x20; token text unique not null,                -- opaque, in the shared URL

&#x20; recipient\_label text,                      -- "Faith K." — for the owner's own tracking

&#x20; message text,                              -- prefilled ask, editable by owner

&#x20; status text default 'pending' check (status in ('pending','completed','expired')),

&#x20; created\_at timestamptz default now(),

&#x20; completed\_at timestamptz,

&#x20; resulting\_proof\_item\_id uuid references proof\_items(id)

);



\-- Subscriptions / plan state

create table subscriptions (

&#x20; id uuid primary key default gen\_random\_uuid(),

&#x20; profile\_id uuid references profiles(id) on delete cascade,

&#x20; plan text not null check (plan in ('free','plus')),

&#x20; current\_period\_end timestamptz,            -- null for free

&#x20; last\_payment\_id uuid references payments(id),

&#x20; created\_at timestamptz default now()

);



\-- Payments — one row per Paystack transaction

create table payments (

&#x20; id uuid primary key default gen\_random\_uuid(),

&#x20; profile\_id uuid references profiles(id) on delete cascade,

&#x20; paystack\_reference text unique not null,

&#x20; amount\_kes numeric not null,               -- 50 or 100

&#x20; plan\_period text not null check (plan\_period in ('6m','12m')),

&#x20; channel text,                               -- 'mobile\_money' | 'card'

&#x20; status text not null check (status in ('pending','success','failed')),

&#x20; created\_at timestamptz default now()

);



\-- Analytics events — lightweight, append-only

create table analytics\_events (

&#x20; id bigint generated always as identity primary key,

&#x20; profile\_id uuid references profiles(id) on delete cascade,

&#x20; event\_type text not null,                  -- 'profile\_view','evidence\_tap','social\_click','vouch\_open','vouch\_complete','install'

&#x20; proof\_item\_id uuid,                        -- nullable, for evidence\_tap etc.

&#x20; referrer\_host text,

&#x20; device\_type text,                          -- 'mobile'|'desktop'|'tablet'

&#x20; country text,

&#x20; created\_at timestamptz default now()

);

create index on analytics\_events (profile\_id, created\_at);

```



\*\*RLS policy shape\*\* (all tables except public-read ones):

\- `profiles`, `proof\_items`, `evidence`: public `select` where `is\_public = true` and (for `proof\_items`) `visible = true`; `insert/update/delete` restricted to `auth.uid() = owner\_id` on the parent `profiles` row — \*\*not\*\* `auth.uid() = profile\_id`, since `profiles.id` is no longer the same value as the auth user (multi-account change above). Every write to a child table (`proof\_items`, `evidence`, etc.) checks ownership via a join back to `profiles.owner\_id`.

\- `vouch\_requests`: public `select`/`update` only via the opaque `token`, never by listing; owner can `select all` for their own `profile\_id`.

\- `payments`, `subscriptions`, `analytics\_events`: owner-only `select`; `insert` only from the Cloudflare Worker service role (webhook, event logger), never directly from the client.



\---



\## 6. Feature spec by area



Priority key: \*\*P0\*\* = MVP, must ship. \*\*P1\*\* = fast-follow, weeks 2–6 post-launch. \*\*P2\*\* = future, don't build now.



\### 6.1 Auth \& onboarding — P0

\- Sign up via \*\*phone number OTP\*\* (primary — this market is phone-first) with email as fallback.

\- Onboarding wizard: pick persona (service / professional / job seeker) → pick handle (live availability check) → 3 quick prompts to seed the first `did` and `trained` items so the profile is never empty on first share.

\- Persona choice sets default section copy and empty-state prompts (reuse the prototype's persona copy as the seed content, not just demo data).



\### 6.2 Profile builder \& proof items — P0

\- CRUD for proof items across all 4 pillars, matching the dashboard UI already prototyped: type picker, title, detail, optional `when\_label`, evidence attach, visible/hidden toggle.

\- Drag-to-reorder within a pillar (P1 — ship fixed chronological order for P0).

\- Draft state (`visible = false`) shown dimmed in dashboard, excluded from public page — already modeled in the prototype (`is-hidden` items).

\- Completeness score: simple weighted rule — e.g. base 20% for profile basics filled in, then +N% per proof item with ≥1 evidence file, capped at 100%. Show the bar + a single next-action tip (matches prototype `c-tip`).



\### 6.3 Evidence \& media pipeline — P0

This is the part that makes or breaks load times on Kenyan mobile data — treat it as first-class, not an afterthought.



\*\*Upload flow:\*\*

1\. Owner picks/captures photo or video in-browser (`<input capture>` for camera access on mobile).

2\. \*\*Client-side compression before any network call\*\*: images resized/re-encoded to WebP (target ≤300KB per evidence photo, max dimension 1600px) using a wasm/JS compressor in the browser; video trimmed to a max duration (e.g. 30s for evidence clips) and compressed client-side where feasible, otherwise uploaded as-is and handed to a server-side transcode step.

3\. Client requests a \*\*signed upload URL\*\* from a Cloudflare Worker, uploads directly to R2 (no file passes through the app server).

4\. On success, Worker writes the `evidence` row (or client writes it via Supabase with the returned key — either works; Worker-issued is simpler to keep storage\_key trustworthy).

5\. Cloudflare Images serves resized variants (thumbnail for grid, full for evidence panel) — never serve the original at full res on the public page.



\*\*Upload UX requirements:\*\*

\- Show compression progress ("Shrinking photo…") — this should feel fast, not like a stall.

\- Queue uploads and allow the owner to keep working while they finish (background upload).

\- \*\*Offline-tolerant\*\*: if the network drops mid-upload, queue the item locally (IndexedDB) and auto-retry when back online — critical for a market with patchy connectivity. Surface a small "waiting to upload" state on the item.



\*\*Limits:\*\* free tier — 2 evidence files per proof item, max 5 photos + 1 video across whole profile uncompressed-preview... actually cap by \*count\*, not complexity: free = 2 evidence files/item, Case+ = unlimited (see §6.8).



\### 6.4 Public profile page \& SEO — P0

\- Server-rendered (SSR or ISR with short revalidate, e.g. 60s) at `/@handle`. Never client-side-render the first paint of this page — it's the whole point of choosing Next.js.

\- Per-profile `<title>`, meta description, canonical URL.

\- \*\*Dynamic OG image per profile\*\* (name, role line, avatar, a stamp count) generated via a Cloudflare Worker or Next.js `ImageResponse` — this is what makes WhatsApp/Instagram link previews look intentional, which matters enormously for a share-driven product in this market.

\- Structured data: `schema.org/Person` with `jobTitle`, and where evidence includes credentials, reference the `trained` items as `hasCredential`.

\- Auto-generated `sitemap.xml` (all public handles) and `robots.txt`.

\- Evidence pill/panel interaction exactly as prototyped — tap to reveal, no page navigation, so it stays fast and crawlable (evidence panel content should still be in the server-rendered HTML, just visually collapsed, not client-fetched-on-demand, so it's indexable too).



\### 6.5 Vouch request flow — P0 (this is the product's sharpest differentiator, build it early)

\- From the dashboard, owner generates a vouch request: pick a label ("Faith K."), optionally edit the prefilled ask, get a shareable link + a \*\*pre-filled WhatsApp message\*\* (`wa.me` deep link) — WhatsApp is the dominant channel here, don't make them copy-paste.

\- Recipient opens `/@handle/vouch/\[token]` — no account needed. Simple form: quote/testimonial text, optional evidence upload (e.g. a screenshot of their own booking, a photo), name, relationship (e.g. "Client").

\- On submit: creates a `proof\_items` row with `pillar='vouched'`, `source='vouch\_request'`, `visible=false` \*\*by default\*\* — the owner approves it before it goes public (prevents a bad-faith or joke submission from appearing unmoderated). Notify the owner (push + optionally SMS) that a vouch came in.

\- Token expires after 30 days if unused; one submission per token.



\### 6.6 Analytics (owner-facing) — P0 core, P1 depth

\*\*P0:\*\* total profile views (all-time + last 7 days), a simple 7-day sparkline, count of evidence taps, count of social-link clicks. Log via `analytics\_events` on page view (server-side, not client JS, so it isn't lost to ad-blockers) and on evidence-pill/social-pill interaction (client event, batched).

\*\*P1:\*\* breakdown by referrer host (WhatsApp vs Instagram vs Google vs direct), device type split, per-proof-item view/tap counts so the owner learns which claims actually land, vouch-request funnel (sent → opened → completed).

Respect privacy: aggregate only, no visitor-level identity stored, no IP retained beyond what's needed for country/device inference at write time (discard raw IP after deriving country).



\### 6.7 PWA \& app-like utility features

\*\*P0 — must feel like an app from day one:\*\*

\- Web app manifest + service worker: installable, custom icon/splash, standalone display mode.

\- Offline shell for `/dashboard` (cached app shell + last-fetched profile data) so the owner can review/edit drafts with no signal and sync on reconnect.

\- Install prompt: custom "Add Case to your home screen" banner after a meaningful second visit (not on first load — that's when install prompts get dismissed and suppressed by the browser).

\- Native share sheet integration (`navigator.share`) for the "Copy link" action — falls back to copy-to-clipboard where unsupported.

\- QR code generator for the handle, downloadable as a PNG — for printing on a business card or salon window (the prototype already has a `/qr` route stub — build it for real).

\- Pull-to-refresh on the dashboard feed.



\*\*P1:\*\*

\- Push notifications (Web Push/VAPID): new vouch received, profile-view milestones ("50 people viewed your Case this week"), subscription expiring in 3 days.

\- Share Target API — let the owner share a photo \*from their camera roll or another app\* directly into Case's "add evidence" flow, skipping the file picker.

\- Background sync for queued evidence uploads (Background Sync API where supported, polling fallback elsewhere).

\- Low-data mode toggle — serves smaller image variants app-wide, useful given real data-cost sensitivity in this market.



\*\*P2:\*\*

\- Home-screen widget-style shortcuts (Android app shortcuts via manifest `shortcuts` field) — jump straight to "Add proof" or "View analytics."

\- Optional biometric/PIN quick-unlock for the dashboard on shared devices.



\### 6.8 Payments \& monetization — P0

\*\*Pricing (confirmed):\*\* KES 70 / 6 months, KES 100 / 12 months.



Annual now reads as a genuine deal — two 6-month cycles would cost 140 vs. 100 for the year (a \~29% saving), giving people a real reason to commit longer instead of defaulting to the shorter plan. Keep both price points in a config table, not hardcoded, so they can be tuned without a redeploy.



\*\*Billing is per-Case, not per-owner.\*\* An owner with two Cases (e.g. "braider" + "makeup artist," see §6.13) holds two independent `subscriptions` rows and can be on Case+ for one and free for the other. The billing screen always operates on the currently-selected Case, never "the account" as a whole.



\*\*Free vs Case+ (per Case):\*\*



| | Free | Case+ (70/100 KES) |

|---|---|---|

| Public profile | ✅ | ✅ |

| Proof items per pillar | up to 4 | unlimited |

| Evidence files per item | up to 2 | unlimited |

| Vouch requests | 3 open at a time | unlimited |

| Analytics | totals + 7-day trend | full history + referrer/device breakdown + per-item stats |

| "Built with Case" footer | shown | removable |

| Downloadable QR / print card | ✅ | ✅ (higher-res export) |

| Custom pinned "aiming" banner | — | ✅ |

| \*\*Case Search ranking\*\* (§6.14) | standard relevance | \*\*preferential placement\*\*, moderate boost — see §6.14 for why this isn't pure pay-to-win |



\*\*Flow:\*\*

1\. Dashboard → Billing (scoped to the active Case) → pick 6mo or 12mo → Paystack inline checkout (card + Mobile Money/M-Pesa channel enabled).

2\. On success callback, client shows "confirming…" — the source of truth is the \*\*webhook\*\*, not the client redirect (client redirect can be spoofed/dropped).

3\. Cloudflare Worker receives Paystack webhook, verifies the `x-paystack-signature` HMAC against the secret, writes a `payments` row (`status='success'`), then upserts `subscriptions`: `current\_period\_end = greatest(now(), current\_period\_end) + interval` (so renewing early extends from the current expiry, not from today — don't punish early renewal).

4\. Grace/lapse behavior: on expiry, \*\*do not delete data\*\*. Soft-downgrade — items beyond the free caps become `visible=false` automatically (owner sees them as "hidden — upgrade to show again," not lost), footer branding returns.

5\. Reminder notifications at 7/3/1 days before `current\_period\_end` (push, plus SMS/WhatsApp if a phone/WhatsApp number is on file — high-leverage for a market where push delivery on iOS Safari is inconsistent).



\### 6.9 Sharing \& growth — P1

\- Every public profile view and every vouch-request completion is itself a growth loop — instrument it, don't build separate virality mechanics for P0.

\- P1: lightweight referral — "Invite someone to build their Case, get 1 month of Case+ when they publish their first proof item." Track via a referral code in the signup link.

\- P1: a `case.app` directory/search page is explicitly \*\*out of scope for P0\*\* — it changes the privacy posture (people become discoverable, not just linkable) and needs its own consent model. Don't build it opportunistically inside another feature.



\### 6.10 Notifications — P1

Central `notifications` table + Web Push, triggered by: vouch received, vouch completed and auto-approved (if owner enables auto-approve later), view milestone, subscription expiring, subscription lapsed. In-app notification bell mirrors push content for users who haven't enabled push.



\### 6.11 Trust \& safety / moderation — P0 (lightweight), P1 (deeper)

\- Vouch submissions default to hidden-until-approved (§6.5) — this is the main abuse surface (fake or hostile testimonials) and is handled by that default, not by automated moderation.

\- Basic upload safety: reject non-image/video/PDF mime types server-side regardless of client-side checks; size caps enforced both client- and Worker-side.

\- Report-abuse link on every public profile (P1) routing to a simple manual review queue — don't build automated content moderation for MVP; volume won't justify it yet.

\- Kenya Data Protection Act 2019: evidence involving third parties' faces/likeness (e.g. a wedding-party photo) is the owner's responsibility to have consent for — state this plainly in the upload flow copy, don't try to solve it technically for P0.



\### 6.13 Multi-account: more than one Case per owner — P1

A single login (one phone number/email, one `auth.users` row) can own \*\*several Cases\*\* — e.g. someone who both braids hair and does makeup gets two separate public profiles, each with its own handle, persona, proof items, and subscription, rather than mixing two skill-sets into one confusing page.



\- \*\*Data model:\*\* already reflected in §5 — `profiles.owner\_id` points at the auth identity; `profiles.id` is its own key. Nothing else in the schema changes; `proof\_items`, `evidence`, `subscriptions`, `analytics\_events` all key off `profile\_id` as before, so each Case's data stays fully isolated.

\- \*\*Dashboard UX:\*\* an account switcher at the top of `/dashboard` (avatar + handle dropdown) swaps the entire dashboard context — proof items, analytics, billing — to the selected Case. Adding a new Case goes through the same onboarding wizard as the first (persona pick → handle → seed prompts).

\- \*\*Public surface:\*\* each Case gets its own independent `/@handle` — there's no "linked profiles" indicator on the public page by default; whether one Case can optionally cross-link to another owned by the same person is a nice-to-have (P2), not required for MVP.

\- \*\*Free-tier stacking risk:\*\* because the free tier has real limits (§6.8) and pricing is only \~70–100 KES, someone could otherwise create unlimited free Cases to route around the per-Case item caps rather than paying. \*\*Recommendation:\*\* the first Case an owner creates is eligible for the free tier as normal; every additional Case requires an active Case+ subscription from the moment it's created (no free tier on a 2nd, 3rd, etc. Case). This directly monetizes the multi-skill use case you're describing and closes the stacking loophole. Flagged as a decision for you to confirm in §11.



\### 6.14 Case Search — discovery \& preferential ranking — P1/P2

A dedicated `case.app/search` surface where visitors can find Cases by category and area (e.g. "braider, Westlands") rather than only arriving via a shared link. This reframes one prior non-goal (§10) — building it now on purpose, with a consent model attached from day one rather than retrofitted later.



\- \*\*Opt-in, not automatic:\*\* `profiles.discoverable` (default \*\*true\*\*) controls whether a Case can appear in search — separate from `is\_public`, which only controls whether the link itself works. A service provider or job seeker generally wants to be found; a credentialed professional job-hunting quietly at their current employer may not. Default `true` but surface the toggle prominently in onboarding and settings, not buried.

\- \*\*Search fields:\*\* `category` and `tags` (free-text facets, e.g. "hairstylist," "braids") and `location\_area` — add these as real fields at Case-creation time (already added to the `profiles` schema in §5), don't retrofit them from `role\_line` free text.

\- \*\*Index (MVP):\*\* Postgres full-text search (`tsvector` on `category`, `tags`, `display\_name`, `role\_line`) is sufficient at launch volume — no need for Algolia/Meilisearch/Elasticsearch until search traffic and result-quality demands outgrow it.

\- \*\*Ranking — not pure pay-to-win:\*\* blend a relevance score from (a) text match, (b) completeness score (§6.2) — thin, evidence-free profiles shouldn't rank well regardless of plan, (c) a light recency/activity signal, and (d) a \*\*moderate, bounded boost\*\* for Case+. The boost should move a good Case+ profile up a few positions among comparable matches, not let a thin Case+ profile outrank a strong, well-evidenced free one — that would undermine the "proof" premise of the whole product. Exact weighting is a tuning exercise post-launch, not something to hardcode confidently now.

\- \*\*This is P1/P2, not P0:\*\* ship the core proof-and-share loop first and prove people actually build and share Cases before investing in a discovery surface — search only pays off once there's a meaningful number of discoverable profiles to search through.



\### 6.15 Localization \& accessibility — P1

\- English + Swahili UI strings (the persona/onboarding copy is a natural place to start — it's already short, high-impact text). Store as a simple key-value locale file, `locale` field already on `profiles`.

\- Accessibility: all evidence pills/panels keyboard- and screen-reader-operable (the prototype uses `<button>` for pills — keep that discipline in the real build, don't swap to non-semantic `<div onclick>`).



\---



\## 7. Non-functional requirements



\- \*\*Performance budget:\*\* public profile page LCP ≤ 2.5s on a simulated Fast 3G / mid-tier Android profile (Kenya's real-world median, not desktop broadband). Total page weight for first evidence-free view ≤ 500KB.

\- \*\*Images:\*\* always served as WebP/AVIF via Cloudflare Images at the smallest variant that fits the layout slot; never ship an original upload to the browser.

\- \*\*Lighthouse targets:\*\* PWA installability checks pass; Performance ≥ 85 mobile, Accessibility ≥ 90.

\- \*\*Security:\*\* all write paths gated by Supabase RLS; signed, short-lived R2 upload URLs (never a public-write bucket); Paystack webhook signature verified server-side before any state change; no secrets in client bundle.

\- \*\*Reliability of payments:\*\* subscription state is only ever mutated by the verified webhook path — never by trusting the client-side "payment succeeded" redirect alone.

\- \*\*Compliance:\*\* Kenya Data Protection Act 2019 — data processed in-region where practical (Supabase project region: closest available, e.g. `eu-west` or similar with lowest latency to Nairobi if no `af` region exists), clear privacy policy, user can export/delete their data.



\---



\## 8. API / edge-function surface (indicative)



| Endpoint / RPC | Purpose | Auth |

|---|---|---|

| `POST /api/upload/sign` (Worker) | Issue signed R2 PUT URL | Owner session |

| `POST /api/webhooks/paystack` (Worker) | Verify + apply payment | Paystack signature |

| `GET /api/og/\[handle]` (Worker or Next `ImageResponse`) | Dynamic OG image | Public |

| Supabase RPC `get\_public\_profile(handle)` | Assemble profile + visible proof + evidence in one call | Public (RLS-scoped) |

| Supabase RPC `log\_event(profile\_id, event\_type, ...)` | Analytics event write | Public (rate-limited), service-role for server-side page-view logging |

| Supabase RPC `create\_vouch\_request(profile\_id, label, message)` | Owner creates a vouch link | Owner session |

| Supabase RPC `submit\_vouch(token, payload)` | Public vouch submission | Token only |



\---



\## 9. Build phases (suggested order for the agent team)



1\. \*\*Foundation\*\* — Next.js + Cloudflare Pages deploy pipeline, Supabase project + schema + RLS, auth (phone OTP).

2\. \*\*Profile core\*\* — onboarding wizard, proof item CRUD, dashboard shell (no PWA yet), public `/@handle` page (SSR, no evidence media yet — text-only claims).

3\. \*\*Media pipeline\*\* — client-side compression, R2 signed uploads, Cloudflare Images variants, evidence pill/panel UI on both dashboard and public page.

4\. \*\*SEO layer\*\* — dynamic OG images, structured data, sitemap, meta tags, ISR tuning.

5\. \*\*Vouch requests\*\* — request generation, WhatsApp deep link, public token form, owner approval queue.

6\. \*\*PWA + offline\*\* — manifest, service worker, install prompt, offline queueing for uploads.

7\. \*\*Payments\*\* — Paystack checkout, webhook handler, plan gating/soft-downgrade logic, billing UI.

8\. \*\*Analytics\*\* — event logging (P0 set), dashboard charts.

9\. \*\*Multi-account\*\* — account switcher, per-Case billing enforcement (§6.13).

10\. \*\*Polish\*\* — Swahili localization, notifications, referral loop, moderation queue.

11\. \*\*Case Search\*\* — discoverability toggle, tags/category/location capture, Postgres FTS index, ranking, `/search` UI (§6.14) — deliberately last; needs a real base of published Cases to be worth building.



\---



\## 10. Explicit non-goals for v1



\- Case Search (§6.14) ships as P1/P2, after the core build-and-share loop, not in the initial MVP.

\- No true recurring/auto-charging subscriptions — renewals are owner-initiated, reminded via notification.

\- No automated content moderation — manual report queue only.

\- No native iOS/Android app wrapper.

\- No AI-generated content anywhere in the proof/evidence flow — the entire premise is \*real\* evidence.



\---



\## 11. Open questions for the founder (not for the agents to decide)



1\. \~\~Annual pricing discount\~\~ — resolved: 70 KES/6mo, 100 KES/12mo.

2\. \*\*Free-tier stacking on multi-account\*\* — confirm the recommendation in §6.13: first Case free-eligible, every additional Case requires Case+ from creation. Without this, the per-Case limits in §6.8 are easy to route around.

3\. \*\*Case Search ranking weight\*\* — confirm the "moderate, bounded boost" philosophy in §6.14 rather than a stronger pay-to-rank model; this affects trust in the product and is worth deciding deliberately rather than defaulting to whatever's easiest to build.

4\. Auto-approve vs. manual-approve for vouch submissions — spec above defaults to manual; confirm that's the right friction level.

5\. Phone-OTP provider for Kenya (Africa's Talking vs. Twilio vs. Supabase's built-in) — cost and deliverability differ meaningfully at this price point.

6\. Supabase project region — confirm closest available region and accept the latency tradeoff, or evaluate self-hosted Supabase on a Kenya/Africa-adjacent region if latency to auth/DB becomes a bottleneck.

7\. Whether "Case+" is the final name for the paid tier, and what the removable-branding footer should say for free users (drives organic growth — don't make it invisible).

