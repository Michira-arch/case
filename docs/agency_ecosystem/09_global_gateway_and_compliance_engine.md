# DOMAIN 9: Global Financial Gateway Bridge & Regulatory Compliance

## Overview
This document serves as the microscopic technical specification for the Case Agency Ecosystem's Global Financial Gateway Bridge and Regulatory Compliance Engine (Cascade 2, Domain 9). It extends the financial base defined in Domain 3 by detailing exact API payloads, state machines, localized pricing intelligence, and statutory compliance required to operate a globally distributed talent marketplace while strictly preserving the data sovereignty of individual users.

---

## 1. Paystack Integration Deep-Dive (Kenya, Nigeria, South Africa)

To handle frictionless, localized payments and automated talent payouts in key African markets, Case utilizes the Paystack API for subaccount splitting and transaction initialization.

### 1.1 Subaccount Creation & Management
When a talent is onboarded in a Paystack-supported region, a Subaccount is programmatically generated to facilitate direct payout splits.

**Endpoint:** `POST https://api.paystack.co/subaccount`
**Headers:**
- `Authorization: Bearer sk_live_...`
- `Content-Type: application/json`

**Exact API Payload:**
```json
{
  "business_name": "Case Profile: [Talent Legal Name]",
  "settlement_bank": "058", 
  "account_number": "0123456789",
  "percentage_charge": 80.0, 
  "primary_contact_email": "talent@example.com",
  "metadata": {
    "case_user_id": "usr_7a8b9c",
    "agency_id": "agc_1x2y3z"
  }
}
```

**State Machine:**
- `init` -> System constructs payload from verified Case profile data.
- `pending_verification` -> Awaiting Paystack bank resolution.
- `active` -> `subaccount_code` (e.g., `ACCT_x1y2z3`) is returned, encrypted, and mapped to the user's `AgencyRosterLink`.

### 1.2 Transaction Initialization & Split Charges
When a client pays an invoice, the funds are split dynamically at checkout.

**Endpoint:** `POST https://api.paystack.co/transaction/initialize`

**Exact API Payload:**
```json
{
  "email": "client@enterprise.com",
  "amount": 5000000, 
  "currency": "KES",
  "reference": "inv_88a99b_case",
  "subaccount": "ACCT_x1y2z3",
  "transaction_charge": 1000000, 
  "bearer": "subaccount",
  "callback_url": "https://case.app/invoices/inv_88a99b/receipt"
}
```

### 1.3 Webhook HMAC Verification
To ensure payment integrity and prevent spoofing, all incoming Paystack webhooks are strictly verified using HMAC SHA512.

**Implementation Logic:**
1. Incoming POST request on `/api/webhooks/paystack`.
2. Extract the `x-paystack-signature` header.
3. Compute `HMAC_SHA512(request_body, PAYSTACK_SECRET_KEY)`.
4. If `computed_signature === x-paystack-signature`, acknowledge the event (e.g., `charge.success`) and update the ledger. If it fails, log as a severe security exception and drop the payload.

---

## 2. Non-Paystack Multi-Region Escrow & Ledger Bridge

For regions outside the Paystack footprint (India, SE Asia, Egypt, US/EU), the ecosystem relies on a hybrid model: Stripe Connect / Razorpay for regional capture, bridged to an internal Double-Entry Ledger.

### 2.1 Route Selection: Stripe Connect vs. Razorpay vs. Ledger
- **US/EU (Stripe Connect):** Utilizes `Destination Charges`. The client pays the platform, and funds are immediately routed to the agency/talent Stripe Connected Accounts.
- **India (Razorpay Route):** Regulatory constraints mandate specific routing. Funds enter a Razorpay Nodal (Escrow) Account. Post-milestone completion, RazorpayX is triggered via API to execute UPI/IMPS payouts to the talent.
- **Internal Double-Entry Ledger:** Irrespective of the gateway, every transaction is mirrored in the Case internal ledger (as defined in Domain 3) to maintain a unified global state.

### 2.2 Payout Request State Machine
For talent pulling funds from the internal ledger (via RazorpayX, Wise API, or local rails), the payout undergoes a strict state transition:

1. **`queued`**: Talent requests payout. Ledger debits `talent_payable` and credits `payout_hold`.
2. **`processing`**: Background worker picks up the job. API request dispatched to the payout provider (e.g., Wise).
3. **`bank_transferred`**: Gateway webhook confirms funds have left the platform's escrow and hit the banking rail.
4. **`reconciled`**: (Terminal State) End-of-day bank reconciliation matches the ledger ID against the gateway transaction ID. Funds officially cleared. User dashboard updates to "Paid."

---

## 3. PPP Subscription Lifecycle & Currency Conversion Matrix

To scale globally, the Case Agency SaaS billing employs a Purchasing Power Parity (PPP) matrix.

### 3.1 Auto-Detecting Visitor Country & Localized Pricing
- **Edge Inference:** Cloudflare Workers or Vercel Edge Functions inspect the incoming request's `CF-IPCountry` or `x-vercel-ip-country` header.
- **Pricing Delivery:** The SSR page reads the country code and queries the `PPPRateMatrix` cache.
- **Matrix Mapping Example:**
  - `US` -> Tier 1 -> $99 USD/mo
  - `ZA` -> Tier 2 -> R799 ZAR/mo
  - `IN` -> Tier 4 -> ₹2,499 INR/mo

### 3.2 Handling Currency Fluctuations
- The core platform pegs value to USD internally for platform fees.
- **Monthly Pegging:** On the 1st of every month, an automated cron job fetches exchange rates via an oracle (e.g., Fixer.io or Open Exchange Rates).
- **Soft Variance Buffers:** If a local currency devalues by > 15% against the USD intra-month, the system will not immediately hike the local subscription price (causing churn). Instead, it logs a `variance_alert` for manual review in the next billing quarter, absorbing the temporary loss to reduce agency management friction.

---

## 4. Regulatory & Tax Compliance

Automated compliance is a cornerstone of the Case Ecosystem, reducing the administrative burden on agency founders to near zero.

### 4.1 Kenya Data Protection Act (KDPA) 2019 & GDPR
- **Consent Logs:** When talent accepts an agency invite (Domain 2), the data sharing consent action is cryptographically logged with a timestamp, IP, and specific data fields shared.
- **Right to Erasure / Disconnect Protocol:** In compliance with KDPA and GDPR, if a talent executes a profile deletion or revokes agency access, a cascading webhook instantly severs the `AgencyRosterLink`. Their PII and `proof_items` are purged from the agency's public cache within 60 seconds (respecting the ISR invalidation window). 
- **Data Localization:** While the core app is globally distributed, DB schemas allow flagging specific tenant data for regional pinning if required by future statutory changes.

### 4.2 Withholding Tax (WHT) Record Generation
In jurisdictions like Kenya and Nigeria, agencies are required to withhold a percentage of payments to independent contractors for tax purposes.
- **Tax Rules Engine:** If an agency is flagged as operating in a WHT jurisdiction, the ledger bridge automatically calculates the deduction.
- **Ledger Split:** A $1,000 payout subject to 5% WHT results in:
  - Credit `talent_payable`: $950
  - Credit `agency_wht_escrow`: $50
- **Automated Payout Statements:** At the end of the month, a background job generates a PDF statement for the talent, explicitly detailing gross earnings, the WHT withheld, and the agency's tax identification number. This document is dropped into the user's secure Case vault, ensuring they have the necessary artifacts for personal tax filing without requesting them from the agency.

---

## 5. Ecosystem Synergy

- **Domain 3 (Financials):** This domain heavily extends the ledger concepts from Domain 3, providing the exact API specs to execute those theories.
- **Domain 1 (Brand) & Domain 2 (Talent):** The onboarding and proposal pipelines rely entirely on Domain 9's localized pricing and split infrastructure to function globally.
- **Domain 4 (Smart Pattern Inference):** Variance alerts from the currency conversion matrix feed directly into Domain 4, which can suggest optimal billing strategies to the ecosystem administrators.
- **Domain 5 (Operations & Sovereignty):** The KDPA compliance mechanisms technically enforce the data sovereignty invariants outlined in Domain 5.
