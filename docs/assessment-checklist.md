# Assessment checklist — 25 October 2026

Source: Meraki Technical Assessment – Sebastian, TMG-TA-2610-01. Deadline stated as 27 October 2026, 5pm; timezone unspecified. Checkmarks indicate available evidence, not client approval.

## Final deliverables

- [x] Live website and workspace links in README.
- [x] Source published in a public GitHub repository with README and documentation.
- [ ] Repository link formally delivered to Meraki: submission delivery is not verified.
- [x] Task 2 call-flow diagram source, rendered by GitHub Mermaid in telephony-and-support.md.
- [x] Task 2 proposed build sheet (users/extensions, devices, routing, hours, voicemail and porting).
- [x] Task 2 client questions with reasons.
- [x] Task 2 draft email to Sarah (not sent).
- [x] Task 3 ordered investigation, required information, initial reply, prevention and separate caller-ID issue.
- [x] Updated concise development summary, including AI assistance and remaining work.
- [ ] Final PDF attachments or shared submission folder and submission email: not sent by this task.

## Website requirements

- [x] Responsive layouts and desktop/mobile viewport checks.
- [ ] Physical mobile-device test: no recorded evidence; emulation does not satisfy this requirement.
- [x] Tap-to-call, services/pricing, coverage, emergency/gas guidance, landlord section, team, reviews and opening hours.
- [x] Enquiry fields, validation, confirmation/reference and documented production destination (staff database/work queue; customer delivery simulated).
- [x] Public deployment on Railway.
- [ ] Free-hosting requirement: Railway usage is not certified as a free hosting tier.
- [x] README local-running instructions and source prepared for GitHub.
- [ ] Original client Brand Pack: pending; temporary wordmark and labelled illustrative imagery are used.

## Extra scope requested after the brief

- [x] Individual staff accounts, permissions and bcrypt password hashing.
- [x] Enquiry/rota automations, internal task assignment and customer history.
- [x] Analytics based on recorded data; simulated delivery/retry tracking.
- [x] Dedicated PostgreSQL, Redis, worker and beat on Railway.
- [x] DeepSeek/ElevenLabs integration and simulated conversational map.
- [x] Snapshot restore verification previously completed in isolated schema.
- [x] Real inbound Plivo adapter deployed; SDK-compatible signature checks verified.
- [x] Bidirectional ElevenLabs streaming and interruption handling implemented; hosted synthetic audio test passed.
- [x] Live telephone map/transcript viewer implemented (two-second refresh).
- [ ] Successful end-to-end carrier/handset streaming evaluation: not yet recorded.
- [ ] Enterprise certification, MFA/SSO, real customer messaging/dispatch and cross-provider disaster recovery: not implemented/claimed.

## Evidence boundaries

48 automated tests passed at the streaming release. A hosted synthetic audio test used real providers and verified greeting audio, interruption clearing and subsequent response audio. This is not a sustained real-call evaluation. No provider calls were made for this documentation-only update. Prompt guidance for patience/abuse is not a guarantee of handling every conversation. Screenshots are illustrative captures from development; voice-map images predate its latest expansion. Existing historical output notes may describe older architecture; README and this handbook are the current handover.
