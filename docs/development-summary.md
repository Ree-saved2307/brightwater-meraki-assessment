# Development summary

26 October 2026 · Meraki technical assessment · Brightwater

## Approach and priorities

Development began with the customer journey: clear service information, published prices, coverage rules, emergency guidance and a straightforward enquiry form. Next.js and TypeScript provided a consistent foundation for the website and its supporting application. The assessment deliverables were then extended with a staff workspace, task management, automated follow-up and a voice-call demonstration.

The public website contains Home, Services, Pricing, Coverage, About, Contact and Landlords pages. Enquiries receive a reference and are stored for staff follow-up. The workspace brings together individual accounts, assignments, priorities, rota management, audit history and operational reporting. The support desk adds customer conversations, private portal links, Gmail ticket replies and response deadlines. Plivo provides the inbound telephone connection, with ElevenLabs speech and DeepSeek responses.

## Decisions and assumptions

The website and workspace share a Railway web service. PostgreSQL, Redis, the worker and scheduler run as separate services. PostgreSQL holds business records; Redis schedules background work. Transactional checks and stable job identifiers prevent duplicate processing. SQLite supports local development.

The voice agent retrieves business information through defined tools and records its actions in the conversation map. It identifies itself as AI. Booking and dispatch proposals remain subject to operator review within the simulation; telephone audio and explicitly selected support emails use connected providers. This separation keeps demonstration workflows distinct from customer-facing delivery.

The assessment's team, prices, postcode restrictions and gas-emergency guidance informed the implementation. Illustrative imagery and a temporary wordmark support the current presentation. The telephony build sheet identifies proposed settings and client decisions, including rota ownership, qualified backup, voicemail destinations and the effect of number porting on the existing broadband service.

## Quality checks

At the helpdesk release, 55 automated tests passed. Coverage includes routing, postcode eligibility, permissions, session revocation, task ownership, stale-update handling, automation idempotency, ticket privacy and portal access. Production builds and deployed service health were checked. Database migration and an isolated snapshot restore were verified.

Browser checks covered desktop and mobile layouts, enquiry and workspace interactions, and the ticket workflow. Successful website and call testing on a physical mobile device was confirmed by the project owner on 26 October 2026. A separate provider-stream test exercised greeting audio, interruption handling and a subsequent response. The conversation map also passed a synthetic gesture stress test.

## Tools and AI assistance

The implementation uses Next.js, React, TypeScript, Node.js, PostgreSQL, SQLite, Redis/BullMQ, Docker and Railway. Plivo, DeepSeek and ElevenLabs provide telephony and conversational services; Nodemailer, ImapFlow and Mailparser support the Gmail integration.

ChatGPT/Codex supported planning, implementation, debugging, tests and documentation. Taste Skill and Impeccable informed interface work, and gstack supported browser verification. AI image generation supplied design concepts and labelled illustrative photography. Generated material required factual review, and browser testing identified integration issues beyond the automated test coverage.

## Learning and improvements

Several issues shaped the final implementation: staff selectors were moved to a shared directory so new engineers appear consistently; microphone permissions were corrected; origin checks were aligned with deployment settings; and map updates were bounded and scheduled by animation frame. Voice-turn handling was adjusted to accommodate pauses and avoid ending calls after unrelated questions or a simple thank-you.

These changes reinforced the value of testing the complete user journey alongside individual functions. Clear distinctions between a queued action, provider acceptance and a customer outcome also improved the delivery tracking and documentation.

## Remaining assessment items

The next handover steps are to obtain the original Brand Pack, resolve the free-hosting requirement through a qualifying website deployment or an agreed exception, and send the prepared PDF and repository link to Meraki. Broader production acceptance criteria are maintained separately in the operational readiness guide.
