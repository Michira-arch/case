# Domain 12 — Microscopic Engineering Implementation & Execution Roadmap

This document serves as the master execution blueprint for the Case Agency Ecosystem. It outlines the precise sequence of deployment operations, strict implementation details, and end-to-end testing protocols required to realize the multi-domain architecture.

---

## Phase 1: Database Migration & Schema Blueprint

The foundation relies on an ordered deployment of PostgreSQL structures within the Supabase environment. Adhering to this execution order ensures referential integrity and strict access control from initialization.

### 1.1 SQL DDL Execution Order
Run the following scripts in atomic transactions:
1. **001_enums.sql**: Initialize all custom ENUM types (`agency_role`, `subscription_tier`, `subscription_status`, `join_request_status`, `transaction_type`, `pitch_status`).
2. **002_core_tables.sql**: Create base tables without foreign key constraints to external domains first (e.g., `agencies`).
3. **003_relational_tables.sql**: Create `agency_members`, `agency_profiles_overlay`, `agency_subscriptions`, `agency_join_requests`, `agency_pitches`, `agency_rules`, and `agency_events_log`.
4. **004_financial_ledgers.sql**: Deploy `agency_transactions` and `agency_payout_ledger` with strict currency validation constraints.
5. **005_indexes.sql**: Apply B-Tree and partial indexes on frequently queried paths (e.g., `idx_agencies_handle`, `idx_agency_members_agency`, `idx_transactions_agency`).

### 1.2 RLS Policy Application
Apply Row Level Security dynamically. Under no circumstances should `public` schema tables bypass RLS.
- **Enforcement**: Execute `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` across all 10 schema tables.
- **Execution Strategy**: Define the `get_agency_role()` security definer function before executing the policy bindings. Apply standard CRUD policies verifying `auth.uid()` against ownership or `agency_members` role matrix.

### 1.3 Database Triggers & Outbox Initialization
- **Trigger `trg_agency_member_audit`**: Automatically inserts a row into `agency_events_log` whenever an insert/update occurs on `agency_members`.
- **Trigger `trg_event_outbox`**: Append payload to the `outbox` table upon critical mutations (e.g., `agency.created`, `talent.join_request.approved`) to feed the Event Bus.

---

## Phase 2: Paystack & Gateway Bridge Edge Workers

This phase deploys serverless edge workers (Cloudflare Workers / Supabase Edge Functions) acting as a secure intermediary between Case's master ledger and regional payment aggregators.

### 2.1 Webhook Handlers & Signature Verifiers
- **Endpoint**: `POST /webhooks/paystack`
- **Validation**: Strict cryptographic validation using `HMAC SHA512`. Compare the `x-paystack-signature` header against a computed hash of the raw request body using the `PAYSTACK_SECRET_KEY`.
- **Idempotency**: Extract Paystack's unique event ID. Execute a Redis `SETNX` or Postgres `INSERT ... ON CONFLICT DO NOTHING` against a `processed_webhooks` ledger to prevent replay attacks and duplicate split executions.

### 2.2 Subaccount Creation API Bridge
- **Worker Logic**: When `TALENT_APPROVED` hits the Event Bus, an edge worker initiates the subaccount creation.
- **API Call**: Execute `POST https://api.paystack.co/subaccount` with the talent's bank details payload.
- **State Mutation**: Await the 200 OK. Immediately mutate the talent's `paystack_subaccount_code` in the `agency_members` table and push a `SUBACCOUNT_PROVISIONED` event to the outbox. Fallback to `suspended` state and notify the talent if KYC fails.

---

## Phase 3: Agency Core APIs & Event Bus Handler

Implement the Supabase RPCs and queue listeners to power async state transitions.

### 3.1 Supabase RPC Deployments
- **Deploy `approve_agency_member`**: Ensures atomic transaction covering status change, member creation, and event logging.
- **Deploy `execute_client_payment_split`**: A strict financial function calculating percentages using exact math (using `DECIMAL`), recording debit/credits in `agency_transactions`.
- **Deploy `leave_agency_safe` / `dissolve_agency_safe`**: Ensures the data sovereignty invariant is honored. Checks for active financial encumbrances before cascading deletes/anonymization.

### 3.2 pg_net Event Queue Listeners
- **Listener Setup**: Configure `pg_net` to tail the `outbox` table asynchronously.
- **Dispatch**: Send POST requests to the centralized Cloudflare Event Router with a standard CloudEvents v1.0 payload.
- **Dead Letter Queue (DLQ)**: The router returns a 500 status on failure. `pg_net` (or internal pg cron) implements exponential backoff. Upon 5 consecutive failures, move the event to the `dlq_events` table for Domain 4 (Smart Automations) inference and manual resolution.

---

## Phase 4: Frontend Component Specification & Route Mapping

The presentation layer utilizes Next.js App Router. Zero-friction interfaces are critical.

### 4.1 Route Map & Layout Structure
- **Public Domain (Showcase)**
  - `app/agency/@[handle]/page.tsx`: SSR generated public agency showcase.
  - `app/agency/@[handle]/pitch/[token]/page.tsx`: Secure, tokenized proposal viewer for clients.
- **Private Domain (Dashboard)**
  - `app/(dashboard)/agency/layout.tsx`: Fetches context, injects RBAC constraints into the React tree.
  - `app/(dashboard)/agency/settings/page.tsx`: Operations, rules, and subscription management.
  - `app/(dashboard)/agency/roster/page.tsx`: Talent lifecycle management.
  - `app/(dashboard)/agency/financials/page.tsx`: High-level view of ledgers, splits, and SaaS billing.

### 4.2 Component Level Specifications
- **`PitchBuilder` Component**: A complex, multi-step interactive form with real-time autosave to `agency_pitches` (status: `draft`). Utilizes local storage fallback.
- **`MemberJoinModal` Component**: Auto-suggests the talent's public profile data for fast-track onboarding. Directly interfaces with the `agency_join_requests` table.
- **`LedgerDashboard` Component**: Renders the double-entry ledger. Must employ strict decimal formatting hooks to prevent JS floating-point inaccuracies.

---

## Phase 5: Playwright End-to-End Test Suite Plan

Automated UI and API tests to guarantee invariant preservation, especially regarding financials and data sovereignty.

### 5.1 Test Suite 1: Membership Limits & RBAC
- **Scenario**: Validate `subscription_tier` limits on roster size.
- **Steps**:
  1. Seed DB with an agency on `free` tier (limit 5 members).
  2. Perform API requests to add 6 members.
  3. **Assertion**: Verify the 6th addition returns a 403 Forbidden with a smart nudge up-sell payload. Verify UI gracefully handles the limitation and prompts an upgrade modal.

### 5.2 Test Suite 2: Payment Splits & Webhook Simulation
- **Scenario**: End-to-End client invoice payment.
- **Steps**:
  1. Seed DB with an active pitch, an agency (20% cut), and talent (80% cut).
  2. Mock the `POST /webhooks/paystack` with a `charge.success` event payload.
  3. **Assertion**: Poll the `agency_transactions` table. Verify exact mathematical splitting. Verify the state machine progresses the invoice to `settled`.

### 5.3 Test Suite 3: Data Retention & Offboarding Invariant
- **Scenario**: Talent revokes agency access.
- **Steps**:
  1. Authenticate via Playwright as the Talent user.
  2. Click "Revoke Agency Access".
  3. **Assertion**: The UI removes the agency context.
  4. **Deep Assertion**: Query `agency_profiles_overlay` and `agency_members`. Confirm strict deletion. Ensure `agency_events_log` records `member_left` while preserving the core `auth.users` entity and personal portfolio data seamlessly.
