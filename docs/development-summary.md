# Development summary

25 October 2026 · Meraki technical assessment · Brightwater

## Approach and priorities

The starting priority was a usable public website with accurate prices, coverage restrictions, emergency guidance and a straightforward enquiry journey. Next.js and TypeScript were selected with the user. The scope then expanded at the user's request to staff accounts, operations, automations and simulated AI calls. These additions do not replace the assessment's written telephony/support deliverables.

The site has separate Home, Services, Pricing, Coverage, About, Contact and Landlords pages. Enquiries persist with a reference for office follow-up. The workspace provides role-based access, assignment, internal tasks, rota, audit events and record-based analytics. Customer communications, bookings and dispatch remain simulated.

## Decisions and assumptions

One Railway web service serves both website and workspace; PostgreSQL, Redis, worker and beat are separate services. SQLite remains a convenient local-development fallback. Business records are authoritative; Redis schedules idempotent work. DeepSeek uses allowlisted tools for business facts and proposes actions rather than executing customer deliveries. ElevenLabs provides turn-based speech/transcription. Human consent and operator approval remain distinct. The agent identifies as AI and escalates uncertainty.

The assessment's fictional people, pricing, postcode rules and gas-emergency number are treated as requirements. Missing Brand Pack assets are replaced by clearly labelled illustrative imagery and a temporary wordmark. Telephony platform details and operational choices remain proposed assumptions in the build sheet, with client questions rather than invented confirmations.

## Quality checks and lessons

Routing/coverage, permissions, session revocation, task ownership, version conflicts, automation idempotency, AI tool limits and voice ownership have automated coverage. Browser checks covered desktop/mobile viewports and key workspace flows. Earlier live provider checks confirmed speech/transcription and selected AI tool cases. Database migration and isolated snapshot restore were verified. This is not physical-phone, load, independent accessibility or security certification.

Problems found included local dependency-read stalls, legitimate requests rejected by origin handling, hard-coded engineer lists, microphone access disabled by a security header, and a queued drag update reading cleared state. These were corrected. The map now limits updates to animation frames and passed a synthetic 900-gesture/9,000-movement stress test. Passing tests does not establish universal device compatibility or enterprise reliability.

## Tools and AI assistance

ChatGPT/Codex provided substantial help with requirements analysis, design exploration, code, debugging, tests and documentation. Recorded design workflows included Taste Skill and Impeccable; gstack browser tooling supported verification. AI image generation produced concepts and labelled illustrative photography. Next.js, React, TypeScript, Node.js, PostgreSQL, SQLite, BullMQ/Redis, Docker, Railway, DeepSeek and ElevenLabs form the implementation stack.

AI output was not accepted as proof: generated mockups needed factual correction, and browser integration exposed issues that unit tests missed. The distinction between a simulated event, provider response and real customer outcome is essential. The latest voice adjustment allows a longer pause before transcription and adds concise, calm handling guidance for frustrated or abusive callers; broad live conversational evaluation remains outstanding.

## Outstanding handover

Confirm a physical mobile test, receive the Brand Pack, resolve the brief's free-hosting requirement, grant Meraki repository access, and package/send the final assessment submission. Real use would additionally require independent recovery, security/accessibility/load review, stronger identity lifecycle and monitored external delivery. No real number port, customer email or submission email has been sent. The accompanying checklist records these gaps openly.
