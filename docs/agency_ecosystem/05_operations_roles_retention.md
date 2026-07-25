# DOMAIN 5: Agency Ecosystem Operations, Roles & Data Retention Safeguards

## 1. Multi-Admin & Manager Role-Based Access Control (RBAC)

The Case Agency Ecosystem employs a precise, matrixed RBAC system to ensure operations scale securely while defining clear boundaries between agency owners, operators, and talent.

### 1.1 Role Definitions and Permissions Matrix

| Permission/Action | Founder / Owner | Finance Admin | Roster Manager | Talent / Agent |
| :--- | :---: | :---: | :---: | :---: |
| **System Settings** | Full Access | View Only | View Only | None |
| **Manage Billing & Subscriptions**| Yes | Yes | No | No |
| **Invite/Remove Users** | Yes | No | Yes (Talent only) | No |
| **Define Base Split %** | Yes | Yes | No | No |
| **Override Split % per Deal** | Yes | Yes | Request Approval | No |
| **View Agency Financials** | Full | Full | Own Deals Only | Own Deals Only |
| **Manage Brand/Landing Page** | Yes | No | Yes | No |
| **Approve Proof/Vouches** | Yes | No | Yes | Submit Only |
| **Data Export (Agency Scope)**| Yes | Yes (Financial) | No | No |

**Role Logic Constraints:**
- **Founder / Owner**: The creator of the agency entity. Cannot be removed unless ownership is transferred. Holds the Stripe Connect master link.
- **Finance Admin**: Restricted to the Finance Engine (Domain 3). Has full read/write on payout allocations, tax document retrieval, and invoice generation, but zero write access to brand settings or talent rosters.
- **Roster Manager**: Focuses on Domain 2 (Talent Lifecycle) and Domain 1 (Brand). Can invite talent, manage the agency showcase, and curate public profiles. Cannot touch global financial settings, though they can view individual deal performance to manage talent.
- **Talent / Agent**: Subordinate members who operate under the agency's banner. Can only edit their personal profiles, view their specific split allocations, and submit proof items to the agency showcase.

## 2. Agency Operational Rule Engine

The Operational Rule Engine dictates the default behavior of the agency, eliminating micro-management friction through smart automation.

### 2.1 Default Setting Configurations
- **Global Split Percentage**: Configurable default (e.g., 80% Talent / 20% Agency).
  - *State Transition*: Updating this value affects all *future* deals. Active or pending deals retain the split assigned at their creation to prevent retroactive disputes.
- **Auto-Approve Rules**:
  - *Vouch Auto-Approval*: Toggled on/off. If ON, when Talent receives a vouch from a recognized high-trust client, it automatically bypasses Roster Manager review and publishes to the Agency Brand Page.
  - *Invoice Auto-Send*: Toggled on/off. If ON, completion of a milestone automatically triggers the invoice dispatch in Domain 3.
- **Public Visibility Toggles**:
  - *Open Roster*: Publicly displays all associated talent on the agency landing page.
  - *Curated Showcase*: Only displays specific, hand-picked projects and associated talent.

### 2.2 Inference and Suggestion Mechanisms (Domain 4 Integration)
The rule engine observes manual overrides. If a Roster Manager consistently overrides the split to 85/15 for a specific talent tier, the Inference Engine prompts the Founder:
> "You have manually adjusted Senior Dev splits to 85% on the last 5 deals. Would you like to create a 'Senior Tier' rule with this default split?"

## 3. Data Sovereignty & User Data Retention Guarantee

This is the core invariant of the Case ecosystem: **Users retain absolute, sovereign ownership of their personal profile data, proof items, and evidence.** The agency is merely a container that references this data while the relationship is active.

### 3.1 Data Isolation Model
- **Agency-Owned Data**: Client contracts, B2B invoices, agency-level messaging, overall agency performance metrics, and agency-specific branding.
- **User-Owned Data**: Personal `profile` data, individual `proof_items`, verified `evidence` blobs, and personal connection graphs.

### 3.2 The Disconnect Protocol (Microscopic Specification)
When Talent leaves or is removed from an Agency:
1. **Trigger**: Manager clicks "Remove Talent" or Talent clicks "Leave Agency".
2. **State Change**: The `agency_talent_link` record updates status from `ACTIVE` to `TERMINATED`.
3. **Data Impact**:
   - **Showcase Unlinking**: The user's `proof_items` are instantly unlinked from the Agency's public showcase. The agency can no longer display this talent's portfolio as their active capability.
   - **Data Retention**: The user's personal profile remains 100% intact. All `proof_items` and `evidence` generated during their tenure at the agency remain on their personal Case profile. The verified "Agency Vouch" remains as a cryptographic stamp of authenticity, but the active association is severed.
   - **Ongoing Deals**: Active deals are flagged for Founder intervention. The system prompts: "Talent X has active Deal Y. Assign to new talent or finalize payout?"
   - **Financial Ledger**: Historical payouts (Domain 3) remain immutable on both the agency and user ledgers for tax and auditing purposes.

## 4. Agency Dissolution & Offboarding Workflows

When a Founder decides to sunset an agency, the platform ensures a graceful, compliant shutdown.

### 4.1 Safe Archive Workflow
1. **Initiation**: Founder selects "Dissolve Agency". Requires 2FA confirmation.
2. **Active State Check**: The system scans for active subscriptions, pending invoices, or active client contracts.
   - If active items exist, the UI blocks immediate dissolution and generates a "Dissolution Checklist" (e.g., "Settle 2 pending invoices", "Reassign 1 active contract").
3. **Talent Notification**: An automated broadcast is sent to all active Talent: *"Agency [Name] is dissolving. Your data remains safe on your personal profile. Your historical payouts have been archived to your personal finance tab."*
4. **Client Notification**: Active client leads are notified of the agency closure, with optional automated hand-off routing to individual talent if configured by the Founder.
5. **Subscription Cancellation**: All active SaaS add-ons and API subscriptions linked to the agency's billing profile are scheduled for cancellation at the end of the current billing cycle.
6. **Data Archival**: The agency enters a `READ_ONLY_ARCHIVE` state. Financial records remain accessible to the Founder and Finance Admins for 7 years to satisfy compliance. The public brand page returns a 404 or an optional "Sunset" message.

## 5. Integration Touchpoints

This domain orchestrates operations by tightly integrating with the entire ecosystem:

- **Link to Domain 1 (Brand Ecosystem):** Roster Managers (Domain 5) utilize Brand settings to toggle public visibility and curate the showcase based on Operational Rules.
- **Link to Domain 2 (Talent Lifecycle):** The Disconnect Protocol (Domain 5) governs the exact state transitions and data sovereignty guarantees when Talent is offboarded from Domain 2.
- **Link to Domain 3 (Financial Engine):** The Rule Engine (Domain 5) provides the default split % parameters that the Financial Engine uses to calculate multi-party routing, while RBAC restricts ledger access to Finance Admins.
- **Link to Domain 4 (Smart Inference):** Operational automations (Domain 5) are powered by Domain 4's pattern recognition, suggesting rule updates based on managerial behavior.
