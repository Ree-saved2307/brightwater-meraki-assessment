# Brightwater Plumbing & Heating

Meraki technical assessment: a multi-page public website and authenticated operations workspace, extended with simulated automations and an AI voice-call studio. **Browser calls and business actions remain simulated. A real inbound Plivo telephone pilot is now implemented; bookings, general customer-operation messages and dispatches are still simulated. Explicitly selected support-ticket emails now use Gmail SMTP, with dedicated-folder IMAP intake.** AI and voice providers process test conversations when configured; use fictional data only.

[GitHub repository](https://github.com/Ree-saved2307/brightwater-meraki-assessment)

The application combines an assessment website with a supervised telephony pilot and staff operations workspace. See the [operational readiness guide](docs/production-readiness.md) for acceptance criteria.

## Live application

- [Public website](https://brightwater-app-production.up.railway.app)
- [Staff workspace](https://brightwater-app-production.up.railway.app/workspace)
- Public pages: `/services`, `/pricing`, `/coverage`, `/about`, `/contact`, `/landlords`.
- One web deployment serves both website and workspace. Worker, scheduler, PostgreSQL and Redis are separate Railway services.

![Public website](docs/images/website.png)

## Start locally

Use Node.js 24 and npm. Clone this repository, then:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

For a local fictional demonstration set `DEMO_MODE=true` in `.env.local`, `DATA_DIR=./data`, and a random `SESSION_SECRET` of at least 32 characters. Open http://127.0.0.1:3000. Never enable demo mode on a public deployment. Local storage defaults to SQLite; set `DATABASE_URL` for PostgreSQL. No AI key is needed for scripted mode. Server-only `DEEPSEEK_API_KEY` and `ELEVENLABS_API_KEY` enable real provider processing inside simulated calls. Do not commit keys.

```sh
npm test
npm run typecheck
npm run build
npm start
```

`npm run worker` runs the local automation loop using `.env.local`. Production starts with `node scripts/start-hosted.mjs`; see the deployment guide for required variables and separate service roles.

## Documentation

- [Documentation index and suggested reading order](docs/README.md)
- [Production readiness, test evidence and remaining work](docs/production-readiness.md)
- [Telephone operations and incident runbook](docs/telephone-runbook.md)

- [Plivo inbound pilot and test procedure](docs/plivo-pilot.md)

- [Operation, architecture, deployment and troubleshooting](docs/handbook.md)
- [Assessment checklist and remaining evidence](docs/assessment-checklist.md)
- [Telephony flow, build sheet, questions, client email and support ticket](docs/telephony-and-support.md)
- [Development summary and AI assistance disclosure](docs/development-summary.md)

## Telephone streaming

The Plivo inbound pilot now supports an ElevenLabs audio bridge with caller interruption. See [streaming setup and limits](docs/plivo-pilot.md#streaming-upgrade). The Call simulator includes a live telephone map viewer. The owner confirmed successful physical-mobile website and call testing on 26 October 2026; see the [test record](docs/test-evidence.md). Further regression scenarios are listed in the telephone runbook.

## What works

Validated enquiries feed the staff workspace. Individual accounts have admin, dispatcher, engineer and viewer permissions. Staff manage enquiries, assignments, tasks, priorities, rota, customer history, reports and audited settings. New active engineers are available in assignment and rota selectors; gas qualifications require administrator verification.

The call studio combines DeepSeek tool use with optional ElevenLabs speech/transcription. Its 27-stage map and 13 scenario presets show observed context and tool activity, not hidden reasoning. Actions require operator approval and create internal simulated work. The map supports pan, bounded zoom, follow, fit and stage selection.

![Voice studio — earlier UI capture; the current map contains additional branches](docs/images/voice-studio.png)

## Technologies

Next.js 16, React 19, TypeScript, Node.js 24, PostgreSQL, local SQLite, Redis/BullMQ, Docker and Railway; bcrypt password hashing; DeepSeek reasoning and ElevenLabs voice; CSS, Lucide icons, Manrope and Inter fonts. Tests use Node's test runner and tsx.

The [development summary](docs/development-summary.md) explains the approach, tools, AI assistance, quality checks and lessons learned.

## Submission status

The website, telephony design, support-ticket response and written summary are prepared. The [assessment checklist](docs/assessment-checklist.md) records delivery status; the development summary lists the remaining handover items.

Operational scope and future production acceptance criteria are documented in the readiness guide.

## Support helpdesk

The workspace **Support** area now includes assigned tickets, priorities, public/internal conversations, elapsed-hour response/resolution targets, overdue Tasks, private customer portal links, Gmail outbox tracking and isolated-folder email intake. See the [helpdesk guide](docs/helpdesk.md) for setup, operation, permissions and limitations.

## Submission package

[Downloadable PDFs and ZIP](submission/) contain the live links, Task 2 design, Task 3 ticket response and two-page Task 4 summary. The mobile website/call pass is recorded as owner-confirmed. The package is prepared; it has not been emailed to Meraki.
