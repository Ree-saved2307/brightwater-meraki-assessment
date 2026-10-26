# Plivo inbound telephone pilot

The existing app now has a real inbound telephone adapter. Customer bookings, dispatch and general email/SMS actions remain simulated. The separate helpdesk now supports explicitly selected live Gmail replies. This is an English-language demonstration of the fictional UK Brightwater business on an Indian test number, not an emergency service.

The deployed streaming mode uses Plivo for the telephone connection, ElevenLabs for continuous transcription and speech, and DeepSeek with the existing allowlisted business tools for responses. The earlier Plivo GetInput/Speak turn-based mode remains a fallback. This is a supervised pilot, not an industry-certified service. Telephone minutes and AI/voice processing are billable.

Private web-service variables: PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, PLIVO_NUMBER. Never expose these in NEXT_PUBLIC settings or commit credentials. The linked application's POST URLs are `/api/plivo/answer`, `/api/plivo/hangup`, and `/api/plivo/fallback` under the public APP_ORIGIN. Every callback validates the Plivo V3 signature, including the URL and POST body.

In the turn-based fallback, input returns a short wait/poll flow while Next.js after() processes the agent turn. A process restart or slow model can interrupt a turn; callers receive a bounded fallback rather than a false success. This is not a durable streaming media service. Session records prevent duplicate turn processing. There is a ten-minute/20-turn session cap, three silence attempts, and 100 starts/day application guard. Set provider spending limits separately; the application guard is not a billing guarantee.

The greeting identifies AI, transcript storage and fictional-data use. Conversations belong to the active administrator chosen when the call starts. Transcript access follows existing workspace permissions. No audio recording is enabled by this adapter. Provider speech processing still occurs. Review retention and consent requirements before any real customer use.

To test: call the connected number yourself, listen to the AI disclosure, and ask a fictional question such as the published boiler-service price. In streaming mode, pause naturally and try interrupting the greeting. In the turn-based fallback, allow about three seconds of silence after speaking. Ask a follow-up, then say goodbye. Verify conversation records and Plivo call logs. API/signature checks do not prove carrier audio quality; a handset test was subsequently reported successful by the owner; continue using this procedure for regression checks.

## Mobile acceptance record

On 26 October 2026, the project owner confirmed that the website and calls were tested on a physical mobile device and worked. This is user-reported acceptance evidence. Device/OS/browser, carrier, call IDs and individual scenario results were not supplied; no exhaustive cross-device or failure-test coverage is inferred.

## Streaming upgrade

`PLIVO_STREAMING=true` starts the audio gateway on the web service's public port and Next.js on internal port 3001. The same Answer URL issues a short-lived, single-use stream credential. The gateway verifies that the Plivo start event matches the bound call and account. Audio uses native mu-law 8kHz in both directions.

ElevenLabs Scribe realtime transcribes continuously; Eleven Flash v2.5 streams speech. Caller speech activity or a partial transcript clears Plivo's playback queue and aborts stale processing. The existing DeepSeek engine still completes its tool reasoning before speech begins: audio is bidirectional, but model-response latency is not guaranteed below one second. Noise/echo can cause false interruptions and needs broader handset evaluation beyond the reported successful calls.

Call simulator → **View live telephone calls** provides an administrator/dispatcher-only read-only map and transcript, refreshed every two seconds. No secret stream credentials are returned to that screen. Agent events use the same business stages as browser simulation.

Limits: three concurrent streams per web process, 10-minute sessions, 20 caller turns, bounded socket payloads/buffers, and existing monthly speech budget. Gateway or STT failure closes the stream and the XML offers the prior turn-based path. Set PLIVO_STREAMING=false and redeploy to roll back. Brief restart interruptions remain possible; this is not multi-region failover or certified production telephony. Provider usage is billable.

Verification: 48 automated tests passed, including stale-generation cancellation and mu-law silence checks. A local WebSocket integration test rejected unauthenticated connections and mismatched call IDs. A hosted synthetic provider test received ElevenLabs greeting audio, injected a fictional caller utterance, observed clearAudio, and received subsequent response audio. This exercised real ElevenLabs/DeepSeek services but did not dial a handset or prove carrier-to-WebSocket operation; the owner subsequently confirmed successful mobile website and call testing on 26 October 2026. Device/carrier details and per-scenario streaming results were not supplied.

## Conversation continuity correction

The agent's end-call tool now requires an explicit closing request and rejects off-topic questions, pauses, a simple thank-you and negated requests such as “do not hang up” as reasons to close. Safety-stop behaviour remains separate. Prompt guidance answers related requests using tools and redirects unrelated requests without ending the conversation.

Streaming waits 2.5 seconds of speech silence before committing an utterance. Audio energy alone no longer cancels an in-progress model response; longer sustained audio is required to interrupt playback, while recognised partial speech can still interrupt. Temporary turn failures attempt a spoken retry prompt and keep listening, rather than immediately closing the stream. Provider/audio failures can still trigger fallback. Rate limits are separated by conversation, and redacted failure categories aid diagnosis. These changes do not guarantee recognition under noise or uninterrupted operation through provider outages.
