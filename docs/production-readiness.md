# Production-readiness assessment

Updated 26 October 2026. **Verdict: supervised pilot, not industry-grade or certified.** More features do not establish greater reliability. No uptime SLA, compliance certification or universal conversational accuracy is claimed.

## Implemented versus verified

| Area | Implemented | Evidence and limits |
|---|---|---|
| Public website | Multi-page information, coverage checking, validated enquiries | Desktop/mobile viewport checks; owner-reported physical-mobile pass on 26 October |
| Staff access | Individual accounts, bcrypt, roles, revocation and audit | Automated permission/session tests; no MFA/SSO or independent security assessment |
| Data and jobs | PostgreSQL, Redis/BullMQ, worker and scheduler | Persistence/idempotency checks; sustained production load untested |
| Recovery | Daily snapshots and restore tooling | Isolated-schema restore verified earlier; not cross-provider recovery or PITR |
| Telephone entry | Real Plivo number and signed callbacks | Live SDK-signed requests accepted; unsigned requests rejected |
| Audio streaming | Plivo bidirectional mu-law, ElevenLabs STT/TTS, interruption | Real-provider synthetic stream test passed; owner-reported physical-mobile calls passed; detailed audio metrics unrecorded |
| AI decisions | Existing DeepSeek tools, safety gate and operator proposals | Selected business/safety tests; no broad conversation benchmark |
| Live map | Recorded stages, transcript and two-second polling viewer | Implemented; not a display of hidden model reasoning or instant audio telemetry |
| Customer actions | Internal tasks and simulated communication outcomes | No real appointment, engineer dispatch or general SMS delivery; explicitly selected helpdesk email uses live Gmail |

## Verification record

On 26 October 2026, the project owner confirmed that the website and calls were tested on a physical mobile device and worked. This is user-reported acceptance evidence. Device/OS/browser, carrier, call IDs and individual scenario results were not supplied; no exhaustive cross-device or failure-test coverage is inferred.


- 48 automated tests passed at the streaming release; 55 passed at the later helpdesk release.
- Local WebSocket integration rejected unauthenticated upgrades and mismatched call IDs.
- Official Plivo Python SDK fixtures check webhook signature canonicalization. This was added after a real call exposed an incorrect initial implementation that self-generated tests missed.
- A hosted synthetic stream received ElevenLabs greeting audio, injected a fictional caller utterance, observed `clearAudio`, and received response audio after interruption.
- Earlier database migration and isolated snapshot-restore checks passed.

The synthetic stream did not originate on a handset. It does not prove real-network latency, acoustic echo behaviour, recognition across accents, or robustness under concurrency and failures.

## Known operational risks

- One web-service deployment hosts the gateway and app. Deployments/process failures can interrupt calls; no seamless connection migration exists.
- The configured concurrency ceiling is a per-process guard, not evidence of load-tested capacity or a distributed admission-control guarantee.
- Interrupted model turns, rapid consecutive transcripts and reconnects require more adversarial testing before unsupervised use.
- Audio-energy interruption detection may react to noise/echo. Broader acoustic and device evaluation is still needed beyond the reported successful mobile calls.
- AI tools complete before response speech begins; subsecond latency is not guaranteed.
- Streaming failures offer a turn-based fallback, but a shared database/app/provider outage can defeat both paths. Fallback is not independent disaster recovery.
- In-memory stream work is not a durable job. Session status is persisted, but a running media connection cannot be recovered merely from its record.
- Transcript retention/deletion, external alerting, incident ownership and provider spending controls need operational configuration and verification.
- Prompt instructions for patience, abuse and uncertainty are guidance, not a guarantee of correct behaviour.

## Broader production release gates — not yet fully achieved

Before real customers depend on the service, record results for:

1. **Conversation quality:** routine prices, restricted coverage, gas-safety stop, corrections, ambiguity, long pauses, accents, noise, frustration, abuse, refusal and escalation. Check for invented prices, bookings or dispatch.
2. **Audio:** handset calls across intended networks/devices, repeated interruptions, echo, quiet speech, long responses and disconnects. Measure recognition success, end-of-turn-to-first-audio latency and interruption stop time.
3. **Failure handling:** STT/TTS/LLM timeout, quota exhaustion, database/Redis failure, malformed/replayed callbacks, dropped sockets, deployments during calls and fallback failure.
4. **Capacity:** gradual concurrent-call testing with measured CPU/memory, queueing, socket buffers and rejection behaviour. Select a capacity target from evidence, not the configured limit.
5. **Operations:** external alerts, named on-call owner, provider budget alarms, rollback exercise, independent backup and timed restore. Agree recovery-time and recovery-point objectives with the operator.
6. **Security/privacy:** independent review, credential rotation, MFA/SSO decision, least privilege, data retention/deletion and approved caller disclosures.

Pass/fail thresholds and operating hours must be agreed for the intended business. No numeric uptime, latency or recovery target is currently a contractual guarantee. Any formal certification requires a specified standard, defined scope and an appropriate independent assessment; code changes alone do not provide it.
