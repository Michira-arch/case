# DOMAIN 8: End-to-End User & Client Experience Journeys

## Overview
This document synthesizes the operational, financial, smart automation, and talent lifecycle mechanisms of the Case Agency Ecosystem into tangible, microscopic user journeys. These narratives demonstrate how the system reduces friction to near zero while maintaining absolute data sovereignty for all actors.

---

## Journey 1: Founding an Agency & Recruiting Top 10 Talent
*From zero to an active, monetizable agency with zero management friction.*

### Phase 1: Agency Instantiation
1. **Trigger:** User `Alice` (an experienced creative director) decides to launch "Studio V" on Case. She logs into her Case profile and clicks "Launch Agency."
2. **Setup Wizard:** Alice enters the `Agency Setup` flow. 
   - **Identity:** She defines the brand. The UI provides a real-time preview of `case.app/agency/@studiov`. She uploads her logo and sets her custom color palette (`--agency-primary` and `--agency-secondary`). (Domain 1)
   - **Financials:** She selects her region (e.g., US) and sets the global default split percentage (e.g., 80% Talent / 20% Agency). A Stripe Connect master link is automatically provisioned in the background. (Domain 3)
3. **State Change:** "Studio V" is instantly instantiated. The ISR engine generates the public page in <60 seconds.

### Phase 2: Frictionless Recruitment
1. **Targeting:** Alice wants to onboard 10 top-tier 3D artists she previously worked with. Instead of making them fill out long forms, she utilizes the Agency-Initiated Deep-Link Invite. (Domain 2)
2. **Token Generation:** She navigates to "Recruit" in her dashboard. The system generates 10 unique, cryptographic, time-bound (72h) tokens.
3. **Distribution:** Alice clicks "Share via WhatsApp," which constructs a pre-formatted message: *"Hey! I'm launching Studio V on Case. Click here to join my private roster: wa.me/?text=case.app/invite/{token}"*.
4. **Automation:** The Smart Inference Engine (Domain 4) automatically flags these invites as "Pre-Approved" so that when the talent accepts, they bypass the manual moderation queue entirely.

---

## Journey 2: Talent Joining via WhatsApp Invite & Linking Payout Accounts
*Mobile-first onboarding, multi-agency management, and automated financial setup.*

### Phase 1: Mobile Redemption & Sovereignty Check
1. **Trigger:** `Bob`, a 3D artist, receives Alice's WhatsApp message and clicks the invite link on his iPhone.
2. **Authentication:** The link opens the Case App (or mobile web view). Bob is already authenticated. The system validates the token and confirms Bob currently belongs to 2 active agencies (passing the Max 4 rule constraint). (Domain 2)
3. **Consent Modal:** Bob is presented with the Studio V Terms and a Data Sharing Consent screen. The UI explicitly states: *"Studio V requests read-only access to your portfolio. You retain 100% ownership."*
4. **Acceptance:** Bob clicks "Accept." His state transitions directly to `Active_Member`.

### Phase 2: Financial Routing Automation
1. **Subaccount Trigger:** The transition to `Active_Member` fires a webhook to the Financial Engine. (Domain 3)
2. **Paystack/Stripe Provisioning:** Behind the scenes, the system calls the payment gateway API to verify or create Bob's localized subaccount, tying it to Studio V's master account. 
3. **State Update:** Bob receives a push notification: *"You're all set! Your payouts for Studio V are linked to your existing bank account."*

### Phase 3: The Profile Overlay
1. **Normalization:** On Alice's dashboard, she uses the Normalizer Tool to tag Bob's profile with the agency-specific "Senior 3D Generalist" tag, harmonizing her roster's appearance to clients without altering Bob's core data. (Domain 2)

---

## Journey 3: Client Booking, Split Checkout & Automated Review Attribution
*Seamless B2B transactions with atomic financial splits and sovereign portfolio building.*

### Phase 1: The Frictionless Inquiry
1. **Trigger:** Client `Charlie` visits `case.app/agency/@studiov`. He uses the client-side filters (Domain 1) to find "3D Generalists" and sees Bob's hovering video reel.
2. **Inquiry:** Charlie clicks "Book Agency." The multi-step modal captures his intent: 1 Senior 3D Artist, next week, $5,000 budget.
3. **Dispatch:** The inquiry is captured. The Pattern Inference Engine (Domain 4) auto-ranks available talent and highlights Bob as a 95% match based on availability and tags.

### Phase 2: The Pitch & Smart Checkout
1. **Proposal:** Alice drag-and-drops Bob into the "Pitch Builder." The system auto-fills the price ($5,000) and the internal split (80/20). She generates the secure pitch link and sends it to Charlie.
2. **Approval & Payment:** Charlie opens the link, reviews Bob's embedded proof items, and clicks "Approve & Pay."
3. **Atomic Split:** Charlie enters his credit card. The $5,000 payment is instantly split via the gateway API (Domain 3): $4,000 routes to Bob's subaccount (or escrow ledger), and $1,000 routes to Studio V's master account.

### Phase 3: Automated Proof & Vouch Attribution
1. **Completion:** The job is marked `JOB_COMPLETED`.
2. **Review:** Charlie leaves a 5-star rating and a review: *"Bob delivered incredible renders on time."*
3. **Sovereign Attribution:** The Smart Automations Engine (Domain 4) ingests the review. 
   - The review is cryptographically attached to **Bob's personal Case profile** (Domain 5).
   - Simultaneously, an aggregated, anonymized metric boosts Studio V's overall agency reputation score.

---

## Journey 4: Agency Offboarding & Data Independence
*Demonstrating the absolute guarantee of 100% personal data retention.*

### Phase 1: The Disconnect
1. **Trigger:** Six months later, Bob decides to focus on a different niche and leaves Studio V. He navigates to his agency settings and clicks "Leave Studio V."
2. **State Transition:** The `agency_talent_link` record instantly updates to `TERMINATED`.

### Phase 2: Data Sovereignty In Action
1. **Agency View:** Bob's face, portfolio, and the 5-star review from Charlie instantly disappear from `case.app/agency/@studiov` (Domain 1). Studio V can no longer claim Bob's future availability or display his past work as their active capability.
2. **Talent View:** Bob checks his personal Case profile. His core data remains entirely intact. 
   - The $4,000 payout from Charlie remains in his immutable financial history (Domain 3).
   - The specific renders he created for Charlie, and Charlie's 5-star *"incredible renders"* vouch, remain securely on Bob's profile as verified evidence of his skill (Domain 5).
3. **The Guarantee:** Bob's data was never owned by the agency; it was merely leased for the duration of the relationship. He walks away with his complete history, ready to connect his robust, proven profile to a new agency or client with zero data loss.
