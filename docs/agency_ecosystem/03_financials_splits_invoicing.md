# DOMAIN 3: Financial Infrastructure, Multi-Region Splits & Invoicing

## 1. Domain Overview
This domain encompasses the entire financial nervous system of the Case Agency Ecosystem. It manages how money flows from clients to agencies and talent, how the Case platform monetizes agencies via PPP (Purchasing Power Parity) subscriptions, and how multi-region payment splitting and escrow functions operate. 

The core invariant is trust and transparency: all financial movements are atomic, recorded in an immutable ledger, and clearly communicated to all stakeholders.

## 2. Paystack Sub-Account Automation (Kenya, Nigeria, South Africa)

### 2.1. Triggering Subaccount Creation
For agencies operating in Paystack-supported regions, the platform automates the creation of Paystack Subaccounts to facilitate direct transaction splits.

**State Machine / Logic Flow:**
1. **Trigger Event:** Talent is officially onboarded and approved by an agency administrator (linked to Domain 2).
2. **Action:** The system initiates a `POST /subaccount` request to the Paystack API.
   - **Payload:** Talent's verified banking details (Bank Code, Account Number), Business Name (Talent's Name), and primary contact email.
3. **Response Handling:**
   - **Success (200 OK):** System receives `subaccount_code`. This code is encrypted and stored in the talent's profile linked to the agency. State updates to `PAYSTACK_SUBACCOUNT_ACTIVE`.
   - **Failure:** State updates to `PAYSTACK_SUBACCOUNT_FAILED`. System logs the error and triggers a notification to the talent to verify bank details (linked to Domain 4).

### 2.2. Paystack Transaction Split API
When a client pays an invoice, the payment is automatically split between the talent and the agency at checkout.

**Logic Flow:**
1. **Trigger Event:** Client clicks "Pay Now" on a milestone invoice.
2. **Action:** System initiates `POST /transaction/initialize`.
   - **Payload:** Client Email, Amount, `split_code` or array of `subaccounts` with specified shares.
   - **Automatic Percentage Routing:** The system calculates the split dynamically based on the agency's configuration (e.g., 80% to Talent `subaccount_code`, 20% to Agency primary account).
3. **Webhooks:** System listens for `charge.success`. Upon receipt, milestone status updates to `PAID`, triggering project progression and sending receipts to both parties.

## 3. Non-Paystack Virtual Escrow & Internal Double-Entry Ledger (India, SE Asia, Egypt, US/EU)

### 3.1. Escrow Payment Capture
For regions without direct split gateways, the platform utilizes regional aggregators (e.g., Razorpay, Stripe, Adyen) to capture funds into a master regional escrow account.

**Logic Flow:**
1. **Trigger Event:** Client pays an invoice via an alternative gateway.
2. **Action:** Funds land in the Case Regional Escrow. The system webhooks intercept the success event and immediately register the transaction in the internal ledger.

### 3.2. Internal Double-Entry Ledger (`agency_transactions`)
An immutable double-entry ledger ensures every cent is tracked.

**Schema Structure:**
- `transaction_id`: UUID
- `timestamp`: UTC DateTime
- `type`: `CLIENT_PAYMENT`, `ESCROW_FEE`, `AGENCY_REVENUE`, `TALENT_PAYABLE`, `PAYOUT`
- `debit_account`: (e.g., `escrow_inbound`)
- `credit_account`: (e.g., `talent_payable_ID`, `agency_revenue_ID`)
- `amount`: Decimal
- `currency`: String

**Entry Example (Invoice $1000, 80/20 split):**
- Debit `escrow_inbound` $1000
- Credit `talent_payable` $800
- Credit `agency_revenue` $200

### 3.3. Payout Request Workflows
**Talent Payout:**
1. Talent views "Available Balance" mapped directly to the sum of their `talent_payable` credits minus `payout` debits.
2. Talent clicks "Request Payout."
3. **Admin Approval (Optional based on RBAC):** Agency Admin approves.
4. **Execution:** System integrates with local settlement rails (Wise API for international wire, RazorpayX for UPI/IMPS in India) to disburse funds.
5. **Ledger Update:** Debit `talent_payable`, Credit `escrow_outbound`.

## 4. PPP Agency SaaS Subscription Engine

### 4.1. Dynamic Pricing Matrix
The platform charges agencies a SaaS subscription dynamically adjusted based on the agency's registered region (PPP).

**Pricing Tiers (Monthly / Yearly):**
- **Tier 1 (US/EU/UK):** USD $99 / $999
- **Tier 2 (Kenya, South Africa):** KES 5,000 / 50,000; ZAR 799 / 7,999
- **Tier 3 (Nigeria):** NGN 25,000 / 250,000
- **Tier 4 (India, Egypt):** INR 2,499 / 24,999; EGP 899 / 8,999

### 4.2. Billing Lifecycle & Grace Periods
1. **Invoice Generation:** `T-7 days` from renewal, an upcoming invoice notification is sent.
2. **Charge Attempt:** `T=0`. System attempts to charge the agency's primary payment method.
3. **Success:** Subscription extends by 1 billing cycle.
4. **Failure (Soft-Downgrade Path):**
   - **T+1 to T+3:** Grace Period. Agency operates normally. Daily automated nudges (Domain 4).
   - **T+4:** Soft-Downgrade. Agency cannot send *new* client proposals or onboard new talent. Existing active projects and invoices remain functional to allow revenue generation.
   - **T+14:** Hard-Downgrade. Agency admin dashboard locked except for the billing portal.

## 5. Client Milestone Invoicing & Tax/Payout Statements

### 5.1. Milestone Invoicing
Invoices are directly tied to project milestones to ensure work aligns with payment.
- **Generation:** When a milestone is marked `READY_FOR_BILLING`, a secure, localized checkout link is generated.
- **Release Triggers:** Funds are held in escrow/split-hold until the client clicks "Approve Milestone Delivery," which triggers the ledger release or Paystack payout.

### 5.2. Automated Statements
At the end of every month, the system generates PDF statements.
- **Agency Admins:** Comprehensive P&L, total processed volume, platform fees, and SaaS invoices for tax reporting.
- **Talent:** Detailed breakdown of earnings, project sources, and agency deductions to assist in personal income tax filing.

## 6. Integration Touchpoints
- **Domain 1 (Proposals):** Proposal acceptance automatically maps the agreed budget to the invoicing engine and sets up the ledger split expectations.
- **Domain 2 (Talent Lifecycle):** Approval of talent profiles triggers the Paystack `subaccount` creation or ledger profile generation.
- **Domain 4 (Automated Nudges):** Overdue client invoices or failing agency SaaS subscriptions trigger smart follow-up emails and SMS.
- **Domain 5 (RBAC):** Controls who can approve manual payouts from the ledger, edit agency split percentages, and view global financial dashboards.
