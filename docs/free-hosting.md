# Free-hosting decision

Reviewed 26 October 2026. Current Railway deployment remains live; no hosting migration was made during the documentation update.

The brief asks for the public website on a free hosting service. A paid Railway project does not establish that requirement. The extra PostgreSQL, Redis, worker and live voice services need not all be moved to satisfy a website-only requirement.

Recommended path for this fictional, personal assessment: create a separate website-only Vercel Hobby deployment and keep the existing operations/voice backend on Railway. Vercel documents Hobby as free for personal, non-commercial use: https://vercel.com/docs/plans/hobby . Confirm that the assessment use qualifies; do not use Hobby for a commercial client production site.

Before deploying, prepare a website-only build from the current code. The repository currently includes stateful APIs, local SQLite fallback and a long-running voice gateway, so importing the whole repository unchanged is not equivalent to migrating the current system. Keep provider secrets and staff routes off the public mirror. The enquiry form can validate and show an explicitly labelled demonstration confirmation (the brief does not require delivery), with its production destination explained, or use a separately secured backend integration.

Then verify public page links, images, mobile layout, tap-to-call, postcode checks and form confirmation on the new URL. Add that URL to the README and submission PDF; keep Railway listed as the extra workspace/pilot. Only then mark free hosting complete.

Alternatively, obtain Meraki's explicit acceptance of the existing Railway deployment. Until a qualifying free deployment exists or an exception is approved, the checklist remains unchecked. No new account or paid plan is required merely to decide this.
