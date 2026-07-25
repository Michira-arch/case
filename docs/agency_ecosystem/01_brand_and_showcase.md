# Domain 1 — Public Brand, Pitch Engine & Client Acquisition

## 1. Public Agency Profile Page (`case.app/agency/@handle`)

### Rendering Strategy & State Management
*   **SSR/ISR Render Strategy:** The public profile page utilizes Incremental Static Regeneration (ISR) with a 60-second revalidation window to ensure instantaneous global delivery of the agency's primary presence, while maintaining fresh data. Fallback is set to `blocking` to serve fully rendered pages to new requests.
*   **Dynamic Header & Identity:** 
    *   **Avatar & Cover Photo:** Sourced via CDN (e.g., Cloudflare R2), optimized dynamically (WebP/AVIF).
    *   **Custom Color Palette Tokens:** The agency admin defines primary (`--agency-primary`) and secondary (`--agency-secondary`) hex codes. These are injected as inline CSS variables at the root `div`, cascading through all child UI components (buttons, badges, active states) to white-label the experience.
    *   **Verified Badge Check:** An API call checks `isVerified` on the agency entity; if true, a cryptographically signed SVG badge renders next to the agency name, backed by a tooltip showing verification date.
*   **Filtering Mechanism:** The page features sticky, client-side dynamic filters (Location, Talent Category, Availability). These manipulate URL query parameters (e.g., `?category=model&location=paris`) without triggering full page reloads, using shallow routing to update the displayed roster instantly.

## 2. Dynamic Roster Grid & Proof Aggregate

### Data Flow & Rendering
*   **Referential Integrity:** The roster grid does *not* duplicate talent data. It queries a materialized view linking the `Agency` entity to `User` entities (the talent) via an active `AgencyRosterLink`. 
*   **Proof Aggregation:** When viewing the agency, the system aggregates the top-performing proof items (`did`, `trained`, `vouched`) from the linked talent. 
*   **Grid Item State Machine:**
    *   *State: Idle* -> Shows talent headshot, name, primary category, and top 2 proof icons.
    *   *State: Hover* -> Video/GIF auto-plays on mute (if available), swaps to a carousel of recent proof items.
    *   *State: Click* -> Opens a fast-loading overlay modal (intercepting route `case.app/agency/@handle/talent/@user_handle`) fetching the full talent profile via SWR (Stale-While-Revalidate).

## 3. Client Lead & Inquiry Capture

### Interaction Flow
*   **Trigger:** User clicks "Inquire" or "Book Agency" floating action button (FAB).
*   **UI State: Modal Open:** A multi-step, frictionless modal appears.
    *   *Step 1: Intent:* Client selects desired service/talent (multi-select grid).
    *   *Step 2: Logistics:* Date selector (react-dates), Budget Picker (slider with logarithmic scale for high-value bookings), and location input (Google Places Autocomplete).
    *   *Step 3: Contact:* Client name, company, email, phone (with country code dropdown).
*   **Data Transition:** Upon submission:
    1.  An `Inquiry` record is created in the database with status `pending`.
    2.  **Automated WhatsApp Notification:** A webhook triggers the Twilio/WhatsApp Business API, sending a formatted template message to the designated agency admin's WhatsApp: 
        *   *"New Inquiry: [Client Name] is looking for [Service] on [Date]. Budget: [Budget]. Reply to this message to view."*
    3.  Client sees a success animation and receives an automated confirmation email.

## 4. Interactive Proposal & Quote Builder

### Logic Specification
*   **Creation UI:** Inside the Agency Dashboard, admins select an `Inquiry` or start fresh. They enter the "Pitch Builder".
*   **Assembly:** Admin drag-and-drops specific talent and their specific proof items (e.g., a specific `did` video of a model walking a runway) into a timeline or moodboard layout.
*   **Quoting:** Admin assigns line-item costs, agency fees (calculated dynamically based on Domain 3 rules), and terms.
*   **Generation:** System generates a secure, unique, signed token.
*   **Client View (`case.app/agency/@handle/pitch/[token]`):**
    *   The link opens a specialized SSR page.
    *   *Read Receipt:* When the client opens the link, a websocket event fires, updating the `Inquiry` status to `viewed` and notifying the admin in real-time.
    *   *Interaction:* The client can approve the quote, leave comments, or reject it via in-page action buttons.
    *   *Approval State:* Triggers smart contract/payment intent creation (Domain 3).

## 5. Embeddable Social Proof Widget & WhatsApp OG Cards

### System Architecture
*   **Dynamic Image Generator (OG Cards):** Uses Vercel `@vercel/og` (or equivalent Puppeteer service). When a link to the agency or a specific pitch is shared (e.g., on WhatsApp, iMessage, Instagram Stories), the endpoint `/api/og?type=agency&handle=@handle` generates a 1200x630 PNG on the fly.
    *   *Composition:* Agency logo, custom background color (`--agency-primary`), top 3 talent faces (composited), and dynamic text ("View our Roster" or "New Pitch for [Client]").
*   **Embeddable Widget:** An iframe and lightweight JS snippet (`<script src="case.app/embed.js" data-agency="@handle"></script>`) allows agencies to embed their dynamic roster directly onto legacy websites (WordPress, Webflow, Shopify). The widget auto-updates as talent updates their proof.

## 6. Integration Touchpoints

This domain seamlessly interacts with the rest of the Case Agency Ecosystem:

*   **Domain 2 (Talent Lifecycle):** The public roster strictly obeys the `VisibilityState` set by the talent. If talent marks themselves "Unavailable" or "Private", they are instantly filtered out of the public grid and pitch builder.
*   **Domain 3 (Financial Splits):** When a client approves a Pitch (Domain 1), the accepted line items instantly hydrate the Ledger and Smart Contracts in Domain 3, enforcing pre-agreed agency/talent split ratios.
*   **Domain 4 (Smart Matching):** Client inquiries captured here feed into the Smart Pattern Inference engine. If a client frequently books specific types of talent, Domain 4 will auto-suggest similar roster members to the admin during the Pitch Builder phase.
*   **Domain 5 (Data Sovereignty):** Individual proof items displayed on the Agency Profile and Pitches remain explicitly owned by the Talent. If Talent revokes the Agency's access to their profile, the cryptographic link is severed, and their proof instantly vanishes from all Domain 1 public views and active proposals.
