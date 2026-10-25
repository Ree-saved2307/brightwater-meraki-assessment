# Plivo inbound telephone pilot

The existing app now has a real inbound telephone adapter. Customer bookings, dispatch, email and SMS remain simulated. This is an English-language demonstration of the fictional UK Brightwater business on an Indian test number, not an emergency service.

Plivo handles speech recognition and telephone speech playback using GetInput/Speak. DeepSeek and the existing allowlisted tools handle responses. This pilot is turn-based, not full-duplex ElevenLabs streaming. The browser studio still supports ElevenLabs. Real inbound minutes and Plivo transcription are billable under the provider account.

Private web-service variables: PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, PLIVO_NUMBER. Never expose these in NEXT_PUBLIC settings or commit credentials. The linked application's POST URLs are `/api/plivo/answer`, `/api/plivo/hangup`, and `/api/plivo/fallback` under the public APP_ORIGIN. Every callback validates the Plivo V3 signature, including the URL and POST body.

Input returns a short wait/poll flow while Next.js after() processes the agent turn. A process restart or slow model can interrupt a turn; callers receive a bounded fallback rather than a false success. This is not a durable streaming media service. Session records prevent duplicate turn processing. There is a ten-minute/20-turn session cap, three silence attempts, and 100 starts/day application guard. Set provider spending limits separately; the application guard is not a billing guarantee.

The greeting identifies AI, transcript storage and fictional-data use. Conversations belong to the active administrator chosen when the call starts. Transcript access follows existing workspace permissions. No audio recording is enabled by this adapter. Provider speech processing still occurs. Review retention and consent requirements before any real customer use.

To test: call the connected number yourself, listen to the AI disclosure, and ask a fictional question such as the published boiler-service price. Pause three seconds after speaking. Ask a follow-up, then say goodbye. Verify conversation records and Plivo call logs. API/signature checks do not prove carrier audio quality; a real handset test is required.
