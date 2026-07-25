# Domain 6 — Inter-Domain Event Bus & Async State Machine Architecture

## 1. Event Catalog & Payload Schemas

### Architectural Overview
The Case Agency Ecosystem utilizes a centralized, distributed Event Bus to decouple the various domains. All cross-domain communication, side effects, and state transitions are driven by strictly typed, asynchronous events. This ensures that a failure in one domain (e.g., a webhook timeout in Financials) does not block critical operations in another (e.g., Talent onboarding).

### Event Schemas

All events adhere to a standard envelope format conforming to CloudEvents v1.0.

#### `AGENCY_CREATED`
*   **Trigger:** A user completes the agency onboarding flow and submits the creation form.
*   **Schema:**
```json
{
  "specversion": "1.0",
  "type": "agency.created",
  "source": "/domain/operations/agency_setup",
  "id": "evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "time": "2026-07-25T14:00:00Z",
  "data": {
    "agency_id": "ag_12345",
    "founder_user_id": "usr_98765",
    "name": "Acme Agency",
    "subscription_tier": "pro_monthly"
  }
}
```

#### `JOIN_REQUEST_SUBMITTED`
*   **Trigger:** A talent user clicks "Join Agency" or responds affirmatively to an agency invite link.
*   **Schema:**
```json
{
  "type": "talent.join_request.submitted",
  "source": "/domain/talent/onboarding",
  "data": {
    "request_id": "req_555",
    "agency_id": "ag_12345",
    "talent_user_id": "usr_abc12",
    "proposed_split_ratio": {
      "agency": 20,
      "talent": 80
    }
  }
}
```

#### `TALENT_APPROVED`
*   **Trigger:** An agency admin reviews a pending join request and clicks "Approve".
*   **Schema:**
```json
{
  "type": "talent.join_request.approved",
  "source": "/domain/operations/roster_management",
  "data": {
    "request_id": "req_555",
    "agency_id": "ag_12345",
    "talent_user_id": "usr_abc12",
    "approved_by_admin_id": "usr_98765"
  }
}
```

#### `SUBACCOUNT_PROVISIONED`
*   **Trigger:** The financial subsystem (e.g., Stripe Connect) successfully creates a linked subaccount for the newly joined talent.
*   **Schema:**
```json
{
  "type": "financial.subaccount.provisioned",
  "source": "/domain/financials/stripe_connect",
  "data": {
    "agency_id": "ag_12345",
    "talent_user_id": "usr_abc12",
    "subaccount_id": "acct_1NvXYZ2eZvKYlo2C",
    "payouts_enabled": true
  }
}
```

#### `CLIENT_INVOICE_PAID`
*   **Trigger:** Payment gateway confirms successful capture of funds from a client for a specific pitch/invoice.
*   **Schema:**
```json
{
  "type": "financial.invoice.paid",
  "source": "/domain/financials/billing",
  "data": {
    "invoice_id": "inv_777",
    "agency_id": "ag_12345",
    "client_id": "cli_999",
    "amount_cents": 500000,
    "currency": "USD"
  }
}
```

#### `PAYMENT_SPLIT_EXECUTED`
*   **Trigger:** The financial smart contract successfully divides an incoming payment and queues the transfers to the agency and talent subaccounts.
*   **Schema:**
```json
{
  "type": "financial.split.executed",
  "source": "/domain/financials/split_engine",
  "data": {
    "invoice_id": "inv_777",
    "gross_amount_cents": 500000,
    "agency_cut_cents": 100000,
    "talent_splits": [
      {
        "talent_user_id": "usr_abc12",
        "amount_cents": 400000,
        "subaccount_id": "acct_1NvXYZ"
      }
    ]
  }
}
```

#### `MEMBER_DEPARTED`
*   **Trigger:** A talent user revokes the agency's access, or an admin removes the talent from the roster.
*   **Schema:**
```json
{
  "type": "talent.member.departed",
  "source": "/domain/operations/roster_management",
  "data": {
    "agency_id": "ag_12345",
    "talent_user_id": "usr_abc12",
    "initiated_by": "talent",
    "reason": "contract_expired"
  }
}
```

#### `AGENCY_DISSOLVED`
*   **Trigger:** The agency admin initiates a total closure of the agency workspace, severing all ties.
*   **Schema:**
```json
{
  "type": "agency.dissolved",
  "source": "/domain/operations/agency_settings",
  "data": {
    "agency_id": "ag_12345",
    "dissolved_at": "2026-07-25T14:00:00Z"
  }
}
```

## 2. Async Event Handlers & Idempotency Rules

### Architecture: Supabase pg_net + Cloudflare Workers
*   **Outbox Pattern:** When a domain triggers a state change, it writes the event to a transactional `outbox` table in the PostgreSQL database within the exact same transaction.
*   **Dispatcher:** A database trigger combined with `pg_net` (or a dedicated logical replication listener) polls the `outbox` and HTTP POSTs the payload to an edge-deployed Cloudflare Worker acting as the Event Router.
*   **Fan-out:** The Cloudflare Worker evaluates the `type` and routes the event to registered subscriber queues (e.g., SQS, RabbitMQ, or direct webhooks).

### Idempotency & Concurrency
*   **Idempotency Key:** Every event is generated with a unique, UUIDv7 `id`. Consumers MUST use this `id` as an `Idempotency-Key` when processing.
*   **Database Constraints:** Handlers executing side-effects against the DB will use `INSERT ... ON CONFLICT DO NOTHING` or explicit advisory locks (`pg_advisory_xact_lock`) scoped to the `id` to prevent double-processing.

### Retry Policies & Dead Letter Queue (DLQ)
*   **Retry Strategy:** Subscribers must implement exponential backoff with jitter.
    *   Attempt 1: Immediate
    *   Attempt 2: +5 seconds
    *   Attempt 3: +30 seconds
    *   Attempt 4: +5 minutes
    *   Attempt 5: +1 hour
*   **DLQ:** If processing fails after 5 attempts, the event is routed to a Dead Letter Queue table (`dlq_events`) in the DB. Agency operations teams (or automated Smart Pattern resolvers in Domain 4) are alerted to manually intervene or auto-resolve.

## 3. Finite State Machines (FSM)

Strict FSMs govern critical lifecycle entities. Transitions are exclusively driven by the Event Bus.

### Member Joining Lifecycle FSM
Tracks the status of an `AgencyRosterLink` entity.

*   **States:** `pending`, `reviewing`, `subaccount_pending`, `active`, `suspended`, `left`.
*   **Transitions:**
    *   `[New]` -> `pending` (Trigger: `JOIN_REQUEST_SUBMITTED`)
    *   `pending` -> `reviewing` (Trigger: Admin opens review UI)
    *   `reviewing` -> `subaccount_pending` (Trigger: `TALENT_APPROVED`. A side-effect requests Stripe Connect provisioning).
    *   `subaccount_pending` -> `active` (Trigger: `SUBACCOUNT_PROVISIONED`. The talent is now publicly visible in Domain 1).
    *   `active` -> `suspended` (Trigger: Admin halts operations for talent, but retains records).
    *   `active` | `suspended` -> `left` (Trigger: `MEMBER_DEPARTED`. Data sovereignty invariant enforced; links severed).

### Invoice & Split Payment Lifecycle FSM
Tracks the status of a `ClientInvoice` entity.

*   **States:** `draft`, `sent`, `client_paid`, `split_processing`, `escrow_held`, `settled`, `disbursed`.
*   **Transitions:**
    *   `[New]` -> `draft` (Admin builds proposal in Pitch Engine).
    *   `draft` -> `sent` (Admin clicks send, email dispatched).
    *   `sent` -> `client_paid` (Trigger: `CLIENT_INVOICE_PAID` from payment gateway webhook).
    *   `client_paid` -> `split_processing` (Smart Contract / Split Engine begins calculations based on Domain 3).
    *   `split_processing` -> `settled` (Calculations complete, amounts finalized. Awaits payout window).
    *   `split_processing` -> `escrow_held` (Exception path: dispute or manual hold required).
    *   `settled` -> `disbursed` (Trigger: `PAYMENT_SPLIT_EXECUTED`. Funds successfully transferred to agency/talent accounts).

### Agency Subscription Lifecycle FSM
Tracks the Case SaaS subscription of the agency entity itself.

*   **States:** `trialing`, `active`, `past_due`, `soft_downgraded`, `canceled`.
*   **Transitions:**
    *   `[New]` -> `trialing` (Trigger: `AGENCY_CREATED`. Starts 14-day window).
    *   `trialing` -> `active` (Payment method attached, first billing successful).
    *   `active` -> `past_due` (Webhook: `invoice.payment_failed`. Grace period begins).
    *   `past_due` -> `active` (Webhook: `invoice.payment_succeeded`).
    *   `past_due` -> `soft_downgraded` (Grace period expires. Write access revoked; public Domain 1 profile remains visible but pitch creation disabled).
    *   `soft_downgraded` -> `canceled` (Manual cancellation or 90 days past due. Triggers `AGENCY_DISSOLVED` side-effects).

## 4. Integration Touchpoints

The Event Bus acts as the central nervous system binding all domains:

*   **Domain 1 (Brand & Showcase):** Listens for `SUBACCOUNT_PROVISIONED` to dynamically add talent to the public grid. Listens for `MEMBER_DEPARTED` to instantly purge talent from the public roster and any pending pitch proposals.
*   **Domain 2 (Talent Lifecycle):** Listens for `PAYMENT_SPLIT_EXECUTED` to update the talent's personal earnings dashboard. The FSM for joining directly manages the visibility toggles.
*   **Domain 3 (Financials):** Driven entirely by `TALENT_APPROVED` (to create ledgers) and `CLIENT_INVOICE_PAID` (to execute splits).
*   **Domain 4 (Smart Automations):** Ingests all events as telemetry. E.g., analyzing the velocity between `CLIENT_INVOICE_PAID` and `PAYMENT_SPLIT_EXECUTED` to warn admins of potential cashflow friction, or automatically pushing a nudge if a `JOIN_REQUEST_SUBMITTED` sits in `pending` for > 48 hours.
*   **Domain 5 (Operations & Roles):** Uses `AGENCY_CREATED` to bootstrap default admin RBAC roles. Listens to FSM state changes to adjust UI permissions in real-time.
