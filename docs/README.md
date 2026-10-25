# Brightwater documentation

Current status: **functional prototype suitable for a supervised pilot; not an industry-grade or certified production service**. This documentation distinguishes implemented features from evidence and outstanding work.

## Start here

1. [Project README](../README.md): deployed links, technologies and local startup.
2. [Handbook](handbook.md): website, staff workflows, automations, infrastructure and recovery.
3. [Plivo pilot](plivo-pilot.md): current streaming path, fallback, configuration and limits.
4. [Telephone runbook](telephone-runbook.md): test calls, busy signals, monitoring and rollback.
5. [Production readiness](production-readiness.md): what is proven, known gaps and proposed acceptance gates.

## Assessment submission

- [Checklist](assessment-checklist.md): checked items have evidence; unchecked items remain outstanding.
- [Telephony and support](telephony-and-support.md): proposed client call flow/build sheet, questions, draft client email and ticket investigation. These are assessment deliverables, not proof of real carrier provisioning.
- [Development summary](development-summary.md): approach, decisions, issues, AI assistance and learning.

## Screenshots

The handbook and README embed website, task-board, analytics, agent-settings and voice-studio screenshots from `images/`. They are development captures, not a promise that every screen is pixel-identical today. Voice-studio captures predate the latest streaming/map changes. No screenshots should be interpreted as production reliability evidence.

## Source of truth

The code defines actual behaviour; tests establish only what they exercise. README and these documents supersede historical notes under local `outputs/`. Credentials, user passwords, private database connection strings and provider tokens must never be added to this public repository.

ChatGPT/Codex assisted substantially with implementation and documentation. The development summary identifies recorded design and verification workflows; no external auditor has certified this work.
