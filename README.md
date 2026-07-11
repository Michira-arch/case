# Case App — Getting Started

## Overview

Case is a proof-of-work profile app for Kenya, built on:
- **Next.js 14** (App Router) — SSR public profiles + PWA dashboard
- **Supabase** — Postgres, Auth (phone OTP), RLS
- **Cloudflare R2** — media storage (already configured)
- **Paystack** — payments (KES, card + M-Pesa)

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
See `docs/SUPABASE_SETUP.md` — create a project, run the SQL schema, get API keys.

### 3. Configure environment
Edit `.env.local` — add your Supabase URL, anon key, and service role key.
R2 and Paystack test keys are **already filled in**.

### 4. Start dev server
```bash
npm run dev
```

Open http://localhost:3000

---

## Project Structure

```
case/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Landing page
│   ├── layout.tsx              # Root layout (PWA meta, fonts)
│   ├── globals.css             # Design system
│   ├── @[handle]/              # Public profile routes
│   │   ├── page.tsx            # Public profile (SSR/ISR)
│   │   ├── vouch/[token]/      # Vouch submission
│   │   └── qr/                 # QR print view
│   ├── login/page.tsx          # Phone OTP login
│   ├── signup/page.tsx         # Signup
│   ├── onboarding/page.tsx     # 3-step setup wizard
│   └── dashboard/              # PWA app shell
│       ├── layout.tsx          # Sidebar/bottom nav shell
│       ├── page.tsx            # Dashboard home
│       ├── billing/page.tsx    # Paystack checkout
│       ├── analytics/page.tsx  # Owner analytics
│       └── settings/page.tsx   # Profile settings
│
├── app/api/                    # API routes
│   ├── upload/sign/route.ts    # R2 signed upload URL
│   ├── webhooks/paystack/      # Paystack webhook handler
│   └── og/[handle]/route.tsx   # Dynamic OG images
│
├── components/
│   └── profile/
│       ├── ProfilePublicView.tsx  # Public profile render
│       └── profile.module.css
│
├── lib/
│   ├── types.ts                # All TypeScript types
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   └── server.ts           # Server + service role clients
│   ├── paystack.ts             # Paystack helpers
│   ├── r2.ts                   # R2 upload pipeline
│   └── completeness.ts         # Profile completeness scoring
│
├── public/
│   ├── sw.js                   # Service worker (PWA)
│   └── manifest.json           # PWA manifest
│
├── database/
│   └── schema.sql              # ← RUN THIS IN SUPABASE
│
└── docs/
    ├── SUPABASE_SETUP.md
    └── PAYSTACK_SETUP.md
```

---

## Key Design Decisions

### Two rendering modes, one codebase
- `/@handle` — SSR/ISR, server-rendered, SEO-optimized, no loading states
- `/dashboard` — PWA shell, client-heavy, offline-capable, native-app feel

### Payments architecture
- Client never trusts its own "payment success" redirect
- Paystack webhook → HMAC verify → Supabase `apply_payment` RPC via service role
- Subscription state only mutated by verified webhook

### Media pipeline
- Client compresses images to WebP ≤300KB before any upload
- Signed PUT URL issued by `/api/upload/sign` (user identity verified)
- Client uploads directly to R2 (never through the app server)
- Public CDN serves from `media.dispatch.bld.co.ke`

### RLS ownership model
- `profiles.owner_id` = `auth.uid()` (1:many — multi-account)
- All child tables (`proof_items`, `evidence`, etc.) verify ownership via JOIN back to `profiles.owner_id`
- No write path trusts client-supplied profile_id without JOIN verification

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role (server-side only!) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | ✅ | Paystack public key (test or live) |
| `PAYSTACK_SECRET_KEY` | ✅ | Paystack secret key (server-side only!) |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare account ID (already set) |
| `R2_ACCESS_KEY_ID` | ✅ | R2 access key (already set) |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 secret (already set) |
| `R2_BUCKET_NAME` | ✅ | `stc-media` (already set) |
| `NEXT_PUBLIC_MEDIA_DOMAIN` | ✅ | CDN domain (already set) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Your app's public URL |

---

## Paystack Webhook

See `docs/PAYSTACK_SETUP.md` for full instructions.

Webhook endpoint: `POST /api/webhooks/paystack`

For local testing, use ngrok or Cloudflare Tunnel to expose localhost.

---

## PWA Features

- Service worker at `/public/sw.js` — caches app shell, enables offline dashboard
- Web app manifest at `/public/manifest.json` — installable on Android
- Install prompt shown after second meaningful visit (not on first load)
- Background sync for upload queue when offline

---

## Build for Production

```bash
npm run build
npm start
```

For Cloudflare Pages deployment, add `@cloudflare/next-on-pages` adapter.
