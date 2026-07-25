# DOMAIN 2: Talent Lifecycle, Joining Requests & Roster Moderation

## Overview
This document specifies the architecture, logic flow, user states, and UI/UX behaviors for the Talent Lifecycle and Roster Moderation within the Case Agency Ecosystem. The primary goal is to ensure frictionless recruitment, strict adherence to ecosystem constraints, fair and transparent moderation, and absolute respect for user data sovereignty.

---

## 1. Two-Way Recruitment Workflow

Recruitment in the Case Ecosystem is bi-directional, supporting both organic discovery by talent and targeted outreach by agencies.

### 1.1 Talent-Initiated Application (`case.app/agency/@handle/join`)

**Trigger:** A user navigates to an agency's public landing page and clicks "Join Roster".
**Pre-condition:** User must have an authenticated Case profile.

**State Machine Transition:**
1.  **Intent Capture:** System validates the user's current agency count (see Section 2.1). If valid, user enters the `Applying` state.
2.  **Consent & Sharing:** UI presents a data consent modal. The user explicitly selects which portions of their Case profile (portfolio items, verified vouches, availability) to share with the agency for review.
    *   *Data Sovereignty Check:* The agency is granted *read-only access* to a snapshot or live-link of the user's data. Ownership remains entirely with the user.
3.  **Submission:** The application is routed to the agency's Roster Moderation Queue (Section 3). User state transitions to `Pending_Review`.
4.  **Feedback Loop:** User's dashboard updates to show the pending application, providing transparency.

**Edge Cases & Error Modes:**
*   *Constraint Failure:* If the user is already in 4 active agencies, the UI immediately blocks the action with a clear, helpful message: "You have reached the maximum of 4 active agency memberships. Please leave an agency to apply here."
*   *Incomplete Profile:* If the user's Case completeness score is below the agency's threshold (e.g., 70%), they are prompted to update their profile before applying.

### 1.2 Agency-Initiated Deep-Link Invite (`wa.me` shareable link)

**Trigger:** Agency admin generates an invite link from their dashboard to recruit specific talent.

**Logic Flow:**
1.  **Token Generation:** System generates a cryptographic, single-use, time-bound (e.g., 72 hours) token associated with the specific agency ID.
2.  **Link Construction:** The token is embedded in a deep link (e.g., `case.app/invite/{token}`). This link is optimized for sharing via WhatsApp (`wa.me/?text=...`) or email.
3.  **Redemption:** Talent clicks the link.
    *   If unauthenticated, they are routed through the Case onboarding/login flow.
    *   If authenticated, the system validates the token.
4.  **Acceptance:** Upon validation, the user bypasses the standard moderation queue (as they are pre-approved). They are presented with the agency's terms and the data sharing consent modal.
5.  **State Change:** Upon acceptance, user state transitions directly to `Active_Member` (subject to the Max 4 rule). The token is marked `Consumed`.

---

## 2. Membership Constraints & Conflict Resolution

### 2.1 Enforcing the Max 4 Active Agencies Rule

To prevent resource hoarding and ensure realistic availability, users are strictly limited to membership in a maximum of 4 active agencies simultaneously.

**Database Level (DB):**
*   The `AgencyMemberships` table uses a constraint or a transactional check during inserts/updates.
*   `SELECT COUNT(*) FROM AgencyMemberships WHERE user_id = {id} AND status = 'Active'` must be `< 4` before any new `Active` record is committed.

**UI/UX Level:**
*   Before showing any "Join" button or allowing invite redemption, the client checks the user's active count.
*   If count == 4, join actions are disabled visually (greyed out) and tooltips explain the limit.

### 2.2 Handling Multi-Agency Availability & Active Flags

Since a talent can belong to up to 4 agencies, managing their availability across these contexts is critical to prevent booking conflicts.

**Data Flow:**
*   **Global Availability:** The user's core Case profile maintains a global availability calendar (e.g., "Available 20hrs/week").
*   **Agency-Specific Active Flags:** Within each agency membership record, there is an `is_active_for_deployment` flag.
*   **Conflict Resolution:**
    *   If Agency A books the talent for 15 hours, the global available pool drops to 5 hours.
    *   Agency B's UI reflects this updated global availability instantly.
    *   If a talent needs to pause work for Agency C without leaving it, they toggle their `is_active_for_deployment` flag for Agency C to `false`. Agency C sees them as "On Roster - Unavailable".

---

## 3. Roster Review & Moderation Queue

### 3.1 Admin Evaluation Interface

When a talent applies, agency admins review them in a dedicated dashboard.

**UI Specifications:**
*   **Applicant Card:** Displays the talent's name, avatar, and core headline.
*   **Completeness Score:** A visible metric (0-100%) showing how fleshed out the user's Case profile is.
*   **Proof Items:** Quick-view modal or inline expansion showing the user's portfolio items (images, links, past work) shared during application.
*   **Vouch Verification:** Highlights vouches (reviews/endorsements) from other verified Case users or clients. Uses badge indicators (e.g., a green check for "Verified Colleague").
*   **Action Buttons:** `Accept`, `Decline`, `Request More Info`.

### 3.2 Quality Standard Enforcement

Agencies can set automated filters to reduce manual review friction.

**Logic:**
*   **Pre-filtering:** If an agency sets a minimum completeness score of 70%, applications from users with 69% or lower are either:
    *   Automatically rejected with a polite, automated message suggesting profile improvements.
    *   Moved to a separate "Low Completeness" tab, keeping the main queue clean.
*   **Automated Acceptance:** (Optional) If a user has a score > 90% and at least 3 verified vouches, the agency can configure the system to auto-accept the application.

---

## 4. Profile Standardizer / Normalizer Tool

Agencies often need their rosters to look uniform to clients (e.g., standardizing titles like "Full Stack Dev" instead of "Web Coder").

### 4.1 Harmonization Without Alteration

**The Core Invariant:** The user's personal Case profile data is immutable by third parties. Agencies *cannot* edit a user's core profile.

**The Solution:**
1.  **Agency Overlay Profile:** When a user joins, the agency creates an "Overlay Profile".
2.  **Mapping:** The overlay maps the user's core data to the agency's taxonomy.
    *   *Example:* User's core skill: "React.js". Agency's required tag: "Frontend Frameworks". The agency admin uses the Normalizer Tool to map the user to "Frontend Frameworks".
3.  **UI Implementation:** The Normalizer Tool presents a split-screen view. Left side: User's raw Case profile. Right side: Agency's standardized display fields. Admins select core data points to populate the standard fields or add agency-specific tags.
4.  **Display:** When a client views the agency's showcase, they see the *Overlay Profile*. If they click through to the talent's root profile, they see the unaltered *Core Case Profile*.

---

## 5. Integration Touchpoints

This domain acts as a crucial node, connecting with all other ecosystem components.

*   **Domain 1 (Showcase & Landing):** Accepted talents are immediately pushed to the agency's dynamic showcase index. The Overlay Profile (Section 4) dictates how they are presented.
*   **Domain 3 (Financial Splits & Subaccounts):** Upon transitioning to `Active_Member`, an automated trigger fires to Domain 3 to verify or initiate the creation of the talent's Paystack Subaccount linked to the agency's master account.
*   **Domain 4 (Pattern Inference):** The moderation outcomes (who is accepted, who is declined) feed the inference engine. Over time, the engine learns the agency's preferences and can auto-suggest high-probability candidates or auto-flag weak applications.
*   **Domain 5 (Offboarding & Data Sovereignty):** If a user leaves or is removed, the `AgencyMemberships` record is marked `Inactive`. The Overlay Profile is archived. Crucially, the user's core Case profile remains untouched, and any access permissions granted during onboarding are instantly revoked.
