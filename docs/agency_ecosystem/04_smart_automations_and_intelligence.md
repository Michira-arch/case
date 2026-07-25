# Domain 4: Smart Operational Automations & Pattern Inference Engine

## Overview
The Smart Operational Automations & Pattern Inference Engine serves as the analytical heart of the Case Agency Ecosystem. It transforms raw transactional and interaction data into proactive nudges, automated matchmaking, and health monitoring alerts. By minimizing manual oversight, it enables agency admins to focus on strategic growth while the ecosystem handles routine friction. Crucially, all inferences maintain the core invariant of data sovereignty—insights are derived locally to the agency context and talent retain full ownership of their Case profiles.

## 1. Pattern Inference & Nudge Engine
This sub-system continuously monitors agency operations to learn admin habits and suggest operational optimizations.

### 1.1 Habit Learning & Split Pattern Detection
- **Trigger**: Every time an admin finalizes a contract or modifies a financial split via the Agency Dashboard.
- **Data Flow**:
  1. Engine logs the talent ID, job category, client type, and finalized split percentages.
  2. A background worker periodically aggregates this data (e.g., using a time-decayed moving average).
  3. If a consistent deviation from the default agency split is detected (e.g., admin consistently gives Talent X an 85/15 split instead of the standard 80/20 for 'Enterprise' jobs), the engine caches this pattern.
- **Action**: When drafting the next contract for Talent X with an 'Enterprise' client, the system auto-fills the 85/15 split and presents a tooltip: *"Auto-suggested based on your last 3 contracts with this talent."*

### 1.2 Proactive Admin Nudges
- **Trigger**: Talent milestone achievements (e.g., completing N successful jobs, generating $Y in revenue).
- **Data Flow**:
  1. The engine listens for `JOB_COMPLETED` events.
  2. It evaluates the talent's lifetime metrics against customizable agency thresholds.
- **Action/UI State**:
  - A notification card appears in the admin's 'Action Center': *"Talent X has successfully completed 5 high-value jobs this quarter. Consider offering a 5% bonus cut on their next job to increase retention."*
  - Admins have one-click options to [Apply Rule to Next Job] or [Dismiss].

## 2. Intelligent Job Dispatch & Matchmaking
This module automates the initial triage of incoming client inquiries, mapping them to the most suitable roster members.

### 2.1 Matchmaking Algorithm
- **Trigger**: Receipt of a new client inquiry (via Domain 1 Webhooks/Forms).
- **Data Inputs**:
  - **Inquiry Details**: Category tags, budget range, location requirements, deadline.
  - **Talent Metrics**: Case profile completeness score, location, past proof items (relevance evaluated via semantic tag matching), availability status, and average turnaround time.
- **Data Flow & Logic**:
  1. **Filtering**: Exclude talent marked 'Unavailable' or outside strict location bounds.
  2. **Scoring**: Calculate a match score (0-100) based on:
     - Tag overlap between inquiry and talent's verified proof items (40%).
     - Profile completeness (20%).
     - Past client sentiment scores for similar job categories (30%).
     - Budget alignment (10%).
  3. **Ranking**: Generate a sorted list of the top 3-5 candidates.
- **Action**: The system automatically generates a "Dispatch Proposal" for the admin, or, if "Auto-Dispatch" is enabled for the client tier, sends preliminary availability requests directly to the matched talent.

## 3. Quality Score & Completeness Monitoring
Ensures that the agency's outward-facing roster is always up-to-date and representative of the talent's best work.

### 3.1 Automated Talent Nudges
- **Trigger**: Scheduled weekly cron job assessing the `Case_Completeness_Score` of all rostered talent.
- **Data Flow**:
  1. Engine checks the timestamp of the last portfolio update and the current completeness score.
  2. If the score drops below the agency's minimum threshold (e.g., due to new required fields added by the admin, or stale evidence > 6 months old), a nudge event is queued.
- **Action/UI State**:
  - The talent receives an in-app notification and a weekly digest email: *"Your Case profile is missing recent proof items for [Category]. Update your portfolio to improve your matchmaking rank."*
  - The nudge includes deep links directly to the specific missing sections of their Case profile.

## 4. Client Sentiment & Review Synthesizer
Aggregates qualitative feedback into actionable agency metrics.

### 4.1 Vouch Conversion Logic
- **Trigger**: A client submits a post-job vouch/review.
- **Data Flow**:
  1. The raw text and quantitative ratings (if any) are ingested.
  2. A lightweight NLP process extracts key sentiment keywords (e.g., "fast", "creative", "difficult").
  3. The individual vouch is appended to the talent's personal Case profile (owned by the talent).
  4. An anonymized, aggregated version of the sentiment data is fed into the agency's overarching reputation dashboard.
- **UI State**: The Admin Dashboard displays a "Client Sentiment Trend" graph, highlighting positive spikes or warning signs across the roster, independent of specific talent identities unless investigating a specific flagged review.

## 5. Churn & Inactivity Alerts
Detects stagnation to prevent talent churn and client drop-off.

### 5.1 Inactivity Detection
- **Trigger**: Nightly scan of `LAST_ACTIVE_DATE` (login) and `LAST_JOB_DATE`.
- **Logic**:
  - **Talent Churn Risk**: If a high-performing talent (top 20% revenue generator) has not logged in or accepted a job in 45 days.
  - **Agency Churn Risk**: If an admin has not logged in or processed an inquiry in 14 days.
- **Action**:
  - **For Talent**: Triggers a re-engagement workflow—sending a personalized check-in from the admin (drafted automatically) highlighting new opportunities in their niche.
  - **For Agency Admin**: Triggers a system alert offering a summary of pending inquiries and a quick-action "Clear Inbox" wizard.

## 6. Integration Touchpoints
The Pattern Inference Engine acts as the central nervous system, connecting to all other domains:
- **Domain 1 (Inbound & Client Ops)**: Receives raw inquiry data to feed the Job Dispatch Matchmaker.
- **Domain 2 (Roster & Talent Lifecycle)**: Provides the completeness metrics and churn risk data to inform roster moderation decisions (e.g., auto-hiding inactive talent).
- **Domain 3 (Financial Engine)**: Feeds habit learning data (split patterns) directly into the contract generation and financial nudges workflows.
- **Domain 5 (Ecosystem Integrity & Sovereignty)**: Ensures all sentiment analysis and matchmaking data respects the talent's personal privacy settings and honors their ownership of their root Case profile.
