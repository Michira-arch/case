# Agency Platform — Nanny & Cleaning Vertical Spec

**Version:** 1.0  
**Verticals:** Caregiving / Nanny | Domestic & Commercial Cleaning  
**Based on:** [agency-prompt.md](../agency-prompt.md) + [Case Portfolio Architecture](../../case/feature_spec.md)

---

## What This Is

This is a **detailed, atomized feature specification** for a caregiving/nanny and cleaning agency platform. It is a vertical customization of the generic agency platform architecture (O ≡ C_θ) found in `agency-prompt.md`.

The spec is built to answer one question for every feature: *how does this make the life of a parent, a nanny, a cleaner, a property manager, or an agency admin measurably easier?*

Every leaf node maps to exactly one implementable unit — a single CRUD operation, a single business rule evaluation, a single UI screen, or a single background job.

---

## Design Philosophy

### Zero Cognitive Effort
Every feature was designed so that **users across all personas barely have to think**. The booking flow takes under 2 minutes for anonymous clients. A worker's profile grows automatically from their work. Invoices are generated, sent, and chased without admin involvement.

### Delight Through Utility
The goal is not a minimum viable product — it's a platform that users **love** because it gives them back time and takes away anxiety. A parent books a nanny and feels reassured, not stressed. A nanny sees their reputation growing. An agency owner sees their coordination happening without their manual intervention.

### Anonymous Client Support
Clients can book services without creating an account. They receive confirmation, invoices, and payment links via email/SMS, using secure tokens. Converting to a full account is easy but never forced.

### Case Portfolio Integration
This platform is designed to co-exist with the **Case Portfolio app**. Workers auto-build their Case profile from:
- Completed assignments → `did` proof items
- Verified credentials → `trained` proof items  
- Client ratings → `vouched` proof items

This makes the agency platform a **proof-of-work generator** on top of being a coordination engine.

---

## Architecture Model

```
                    org policy θ
                         │
                         ▼
Gather ─────────────▶ Coordinate ─────────────▶ Record
Gw(𝒲), Gd(𝒟)          Cθ : W × D → A            R(A) → T
         │                    │                    │
  worker pool          state machines         audit trail
  demand pool          matching engine        Case Portfolio
  anon clients         replacement logic      ratings/vouches
```

### The Three State Machines

**Worker:** `applicant → vetted → active → long_term_placement | suspended | inactive`

**Request:** `open → matched → scheduled → confirmed → in_progress → completed → closed`

**Assignment:** `proposed → worker_accepted → client_confirmed → in_progress → completed | cancelled`

---

## Vertical Specifics

### Nanny / Caregiving
- **Trust infrastructure:** DBS check, First Aid at Work, Paediatric First Aid, CPR, NVQ Level 3, Ofsted, Safeguarding
- **Service types:** Daily nanny, live-in nanny, overnight, emergency cover, maternity nurse, elderly care, after-school, holiday cover
- **Matching:** Shortlist mode (high-trust), continuity preference, child age group matching
- **Financial:** Hourly rate × hours, holiday pay accrual at 12.07%, emergency +20% surcharge, overtime ×1.5
- **Safeguarding log:** Immutable record of who was with which child, when, for how long

### Cleaning
- **Trust infrastructure:** DBS check, COSHH certification, references, specialist certs (carpet, commercial)
- **Service types:** Regular domestic, deep clean, end-of-tenancy, carpet clean, commercial/office, post-construction, holiday let
- **Matching:** Proximity-first (travel zone), auto-assign mode, continuity for regular clients
- **Financial:** Flat rate per session, travel allowance, quoted pricing for deep/specialist cleans

---

## Node Files

| File | Category | Nodes | Description |
|------|----------|-------|-------------|
| [01-identity.json](nodes/01-identity.json) | Identity & Party | 35 | Person, Org, OrgMembership, credentials, settlement accounts, anon client identity |
| [02-gathering.json](nodes/02-gathering.json) | Gathering | 26 | Worker acquisition (apply/vet/activate), client onboarding, demand capture, anon booking |
| [03-policy.json](nodes/03-policy.json) | Policy Authoring (θ) | 43 | Credential taxonomy, service types, matching strategy, payment rules, escalation, cadence |
| [04-coordination.json](nodes/04-coordination.json) | Coordination (Cθ) | 43 | Worker/Request/Assignment state machines, matching engine, replacement logic |
| [05-financial.json](nodes/05-financial.json) | Financial Engine | 40 | Invoicing, payouts, subscriptions, ledger, escrow, settlement, holiday pay |
| [06-recording.json](nodes/06-recording.json) | Recording & Trail | 27 | Audit trail, worker profiles, ratings, assignment history, Case Portfolio export |
| [07-notifications.json](nodes/07-notifications.json) | Notifications & Communication | 24 | Dispatcher, templates, preferences, inbox, direct messaging, scheduled cadence |
| [08-access.json](nodes/08-access.json) | Access Control & Admin | 18 | Invitations, roles/permissions, org lifecycle, authentication (OTP + email) |
| [09-public-presence.json](nodes/09-public-presence.json) | Public Presence | 18 | Homepage builder, worker directory, booking widget (anon flow), SEO |
| [10-integrations.json](nodes/10-integrations.json) | Integrations | 20 | Case Portfolio sync, payment rails (Paystack/Stripe), email/SMS, file storage (R2) |

**Total leaf nodes across all categories: ~250+ atomized features**

---

## Key Design Decisions

### Data, Not Schema
Credentials, service types, and payment rules are **configuration data**, not hardcoded database columns. The platform can serve a nanny agency and a cleaning company with the same codebase, differentiated only by their θ configuration.

### Shadow/Placeholder Persons
Admins can add `"Jane, nanny, 555-1234"` with no account. Jane later claims her record, her earnings come out of escrow, and her profile is fully activated. This unblocks quick org growth without upfront identity verification.

### One Party Table
Workers, clients, admins, and dispatchers are all rows in the same `Party` table. A nanny who later becomes a client doesn't get a duplicate identity. Role is on the `OrgMembership` join, not on the person.

### Replacement Logic
When a live-in nanny or regular cleaner becomes unavailable, the platform detects the vacancy, finds the best replacement (respecting continuity preferences), and notifies the client **proactively** — before they have to ask.

### Anonymous Clients
The full booking, payment, and rating flow works without any account. Anon clients get a secure token in their confirmation email that lets them track status, view invoices, and pay — all without creating a password.

---

## Onboarding Flows

### Agency Admin Onboarding
1. Create org (wizard: name, vertical, location)
2. Platform pre-seeds credential taxonomy + service types for selected vertical
3. "Rules is how we create organizations. Let's make some rules for your agency" — admin configures payment split, matching mode, escalation rules
4. First invite sent to staff/worker

### Worker Onboarding  
1. Receive invite link (or apply via public front page)
2. Conversation-style application: experience, age groups, certifications, availability
3. Submit credential documents (DBS, First Aid cert, etc.)
4. Admin reviews → vetted → activated
5. Worker's Case Portfolio stub is created

### Anonymous Client Booking
1. Tap "Book a Nanny" on agency front page — no login wall
2. Conversational form: service type → child ages/property type → date/time → address → special requirements
3. Enter name + phone/email — 2 fields only
4. Review and confirm
5. Receive SMS/email: "Your booking #REF1234 is confirmed. We'll match you with a nanny within 2 hours."
6. Optional: "Create an account to track future bookings" — never forced

### Registered Client Onboarding
1. Self-register or accept admin invite
2. Add address(es) and payment method
3. Optional: browse worker directory, pick preferred worker
4. Recurring clients: set up auto-subscription (set-it-and-forget-it billing)

---

## Event Consistency Guarantees

Every `events_emitted` at one node is consumed by at least one other node:

| Event | Emitter | Consumers |
|-------|---------|-----------|
| `assignment.completed` | `coordination.assignment_sm.check_out` | `financial.invoice.create_post_assignment`, `recording.assignment_history.write`, `recording.ratings.submit_client_rating`, `integrations.case_portfolio.push_did` |
| `credential.verified` | `identity.credential.review` | `coordination.worker_sm.vet`, `integrations.case_portfolio.push_trained` |
| `rating.submitted_for_worker` | `recording.ratings.submit_client_rating` | `recording.ratings.compute_avg`, `integrations.case_portfolio.push_vouched` |
| `worker.suspended` | `coordination.worker_sm.suspend` | `notifications.dispatch.route_event` |
| `invoice.paid` | `integrations.payment_rails.handle_webhook` | `financial.payout.calculate`, `financial.ledger.create_entry` |

---

## Open Questions (Not Resolved by Spec)

1. **Market first**: Kenya (Paystack/M-Pesa) or UK (Stripe/bank transfer)?
2. **SMS provider**: Africa's Talking vs Twilio vs Supabase built-in for OTP
3. **Case Portfolio account creation**: auto-create Case account for workers who don't have one?
4. **Worker privacy on Case**: worker controls which assignments appear on their Case profile
5. **Bio moderation**: do worker bio edits require admin approval before going public?
6. **Data retention**: how long to keep data after org closure?
7. **WhatsApp channel**: add WhatsApp Business API as a notification channel?
8. **Custom subdomain per agency**: `[agencyname].platform.com` or custom domain support?

---

*This spec is the blueprint. Implementation should begin with the Identity & Party layer (01), then Policy (03), then Coordination (04), then all other categories downstream.*
