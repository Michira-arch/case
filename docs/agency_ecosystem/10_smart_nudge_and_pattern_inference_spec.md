# CASCADE 2 / DOMAIN 10: Smart Nudge & Pattern Inference Engine Algorithms

## Overview
This specification details the microscopic logic, algorithms, and state machines powering the Smart Nudge & Pattern Inference Engine. Building upon the foundational automation rules (Domain 4), this domain introduces sophisticated machine learning heuristics, dynamic optimization, and predictive churn state machines. 

**Core Invariant Check:** All inferences are computed locally within the agency's secure data boundary. All raw proof items and vouches remain the sovereign property of the individual talent (Domain 5).

---

## 1. Machine Learning & Heuristic Algorithms

### 1.1 Auto-Matching Algorithm for Client Inquiries
When an inbound lead is captured via the Agency Profile (Domain 1), the engine executes a synchronous heuristic scoring algorithm against the active roster to suggest the perfect pitch candidates.

**Scoring Equation:**
`Match Score (S) = (w1 * C) + (w2 * V) + (w3 * H) + (w4 * A) + (w5 * P)`

**Variables & Evaluation:**
*   **C (Category/Skill Fit - 35% default weight):** Semantic similarity between the inquiry tags and the talent's mapped overlay profile tags (Domain 2). Uses lightweight embedding similarity.
*   **V (Vouch Density - 25% default weight):** Logarithmic scale based on the number of verified client vouches attached to the talent's Case profile. A cryptographically verified vouch holds 3x the weight of an unverified one.
*   **H (Historical Acceptance Rate - 20% default weight):** The ratio of pitches featuring this talent that resulted in a closed contract (Domain 3).
*   **A (Availability Score - 10% default weight):** Binary check multiplied by temporal capacity. If `is_active_for_deployment` is false across the user's max 4 agencies, `A = 0`. If true, checks the global hours available.
*   **P (Proximity/Location - 10% default weight):** Geospatial bounding box calculation if the inquiry requires on-site presence. Defaults to max score for remote jobs.

**Data Flow:**
1. Inference Engine ingests the inquiry JSON payload.
2. Queries the materialized view of the active roster.
3. Computes `Match Score (S)` for all valid talent.
4. Returns the Top 5 candidates via WebSocket to the Admin's Pitch Builder UI.

### 1.2 Dynamic Commission Optimizer
To maximize agency revenue while maintaining talent satisfaction, the system analyzes financial patterns and job complexity to recommend split adjustments.

**State & Logic:**
*   **Inputs:** Default Agency Split (Domain 5), Talent's lifetime revenue generated, Client Tier (e.g., Enterprise vs. Startup), and project duration.
*   **Calculation Engine:** 
    *   If a talent consistently closes high-complexity, high-value deals (top 10% of agency revenue), the optimizer calculates a retention-focused split.
    *   `Suggested Split = Base Split + (Talent Performance Delta) - (Overhead Cost Index)`
*   **UI Integration (Domain 3):** When generating a quote, if the calculated optimal split differs from the default, a subtle UI badge appears next to the split slider: *"Optimizer Suggestion: 82/18. Yields higher retention for Top-Tier talent on Enterprise jobs."* Admin retains ultimate one-click approval authority.

---

## 2. Intelligent Nudge Triggers

The system uses an event-driven architecture (e.g., Kafka or Redis Pub/Sub) to process triggers asynchronously, reducing friction to zero.

### 2.1 Admin Nudges (Strategic & Financial)
*   **Trigger Event:** `INQUIRY_RECEIVED` with `budget_estimate > AGENCY_HIGH_VALUE_THRESHOLD`.
*   **Actionable Nudge:** Pushes a high-priority push notification and Dashboard Alert.
*   **Payload:** *"High-value client inquiry detected from [Client Name] ($25k+). Recommend rapid pitch assembly with [Talent A] & [Talent B] based on historical enterprise success."*
*   **Frictionless Resolution:** A single "Build Pitch" button embedded in the notification instantly opens the Domain 1 Pitch Builder, pre-populating it with the suggested talent and the client's requirements.

### 2.2 Talent Nudges (Quality & Compliance)
*   **Trigger Event:** Nightly cron evaluates `Case_Completeness_Score` against the agency's mandated threshold (e.g., 70%).
*   **Actionable Nudge:** If score < 70% (e.g., due to stale portfolio items > 180 days old).
*   **Payload:** *"Completeness score dropped below Agency standard (70%). Update your evidence to stay visible on the roster and receive auto-matches."*
*   **Frictionless Resolution:** The notification deep-links directly to the exact missing field (e.g., `case.app/profile/edit#recent_work`) in the Talent's core app. If not resolved within 72 hours, the talent's roster status gracefully toggles to "Hidden" (Domain 1).

---

## 3. Sentiment & Reputational Synthesis Engine

This engine converts isolated, qualitative talent feedback into quantitative, agency-wide trust metrics without violating data ownership rules.

### 3.1 Aggregation Architecture
1.  **Vouch Ingestion:** When a client leaves a verified vouch on a Talent's sovereign profile after a closed deal.
2.  **NLP Extraction:** A local, lightweight NLP model processes the text to extract categorical sentiment (Reliability: 0.9, Creativity: 0.8, Communication: 0.95).
3.  **Synthesis Calculation:** `Agency Trust Metric = Average(Sentiment Scores of all ACTIVE linked Talent) * (Total Active Verified Vouches / Log(Roster Size))`
4.  **Data Sovereignty Enforcement:** If Talent X severs their link with the Agency (via the Domain 5 Disconnect Protocol), their individual vouches are instantly subtracted from the Agency's Trust Metric. The Agency retains *no* historical rights to display that talent's specific vouches. The Trust Metric recalculates in real-time, accurately reflecting only the *current* roster's reputation.

---

## 4. Inactivity & Churn Risk Detection State Machine

To prevent roster bloat and optimize the strict "Max 4 Agencies" rule for talent, the system utilizes a precise state machine to manage lifecycle engagement.

### 4.1 State Machine Flow
*   **State: `ACTIVE`** (Baseline)
    *   *Condition:* Logged in, updated profile, or accepted a job within 30 days.
*   **State: `IDLE_WARNING`**
    *   *Transition:* 30 days without meaningful platform interaction.
    *   *System Action:* Triggers a soft Talent Nudge highlighting recent agency wins and asking them to update their availability toggle.
*   **State: `DORMANT`**
    *   *Transition:* 45 days without interaction.
    *   *System Action:* Triggers a high-priority Admin Nudge indicating churn risk. *"Talent Y has been dormant for 45 days. Suggest re-engagement outreach."* Admin can click "Send Check-In" to dispatch an automated, personalized WhatsApp message via Domain 1 integrations.
*   **State: `OFFBOARD_PENDING`**
    *   *Transition:* 60 days without interaction, OR Admin manually flags.
    *   *System Action:* Admin receives actionable nudge: *"Talent Y is unresponsive. Recommend graceful offboarding to free up their slot and your roster capacity."* 
*   **State: `TERMINATED`**
    *   *Transition:* Admin clicks "Accept Graceful Offboard."
    *   *System Action:* Executes the Domain 5 Disconnect Protocol. The talent is removed, their sovereign data is decoupled, and their global agency count decreases, allowing them to join another agency if desired.
