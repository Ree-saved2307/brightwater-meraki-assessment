# Telephone operations runbook

Scope: supervised testing of fictional Brightwater enquiries. The public telephone pilot is not a real plumbing emergency or dispatch service.

## Before a test

- Confirm the Railway web deployment is SUCCESS and `/api/health` responds successfully.
- Confirm Plivo's voice-enabled number is linked to the intended application and POST Answer/Hangup/Fallback URLs.
- Check private Railway variables, provider balances and speech budget. Never copy secret values into tickets or screenshots.
- Sign into the workspace as administrator/dispatcher and select **Call simulator → View live telephone calls**.
- Use fictional information. Tell the tester that calls use AI, transcripts are stored and no booking/dispatch will occur.

## Real-call acceptance exercise

Call the configured number from a handset. Record timestamp, network, device, expected outcome and actual outcome. Do not publish the caller's phone number.

| Test | Expected observation |
|---|---|
| Greeting | Clear AI/demo disclosure, audible without clipping |
| Published boiler price | Tool-grounded answer; no fabricated appointment |
| Follow-up question | Context retained across turns |
| Speak over greeting/reply | Old audio stops; new utterance is understood |
| Pause or correct postcode | No pressure; changed facts rechecked |
| Restricted service/area | Clear limitation, no false booking |
| Frustration or abuse | Calm response and appropriate boundary/escalation |
| End call | Call ends cleanly; viewer stops showing an active session |

Do not label the exercise passed until actual carrier audio has been heard and results recorded. Synthetic WebSocket tests are separate evidence.

## Busy signal / failed connection

1. Find the attempt in Plivo call logs by timestamp.
2. If no call appears, investigate dialing format, carrier reachability, number/account eligibility and trial restrictions before changing application code.
3. If a call appears, inspect the actual hangup cause. `7011 / Error Reaching Answer URL` points to callback delivery/response failure; it does not mean another caller occupies the number.
4. Check Railway availability and the configured HTTPS callback URL/method. Verify V3 signatures against official SDK fixtures; never disable authentication to make a test pass.
5. For stream failure, verify the short-lived stream lease, account/call binding, provider access, audio format and gateway logs. Do not log the bearer URL or raw audio.
6. Retest once after a specific correction and record the result. Avoid repeated calls that only consume provider credit.

## Silent or interrupted audio

Separate input from output: was the greeting audible, did caller transcription occur, did a tool/reply event appear, and did speech playback arrive? Check STT and TTS independently. False interruptions can be caused by noise/echo; do not simply disable interruption controls. The browser simulator is a useful comparison, but success there does not prove the telephone path.

## Roll back streaming

Set `PLIVO_STREAMING=false` privately on `brightwater-app` and redeploy. Wait for SUCCESS. The existing Answer URL then returns the Plivo GetInput/Speak flow. Test a handset call. This rollback changes audio mode; it does not disable AI processing or make business actions real. Deployments can interrupt active calls, so schedule or announce the test window.

If the whole application is unavailable, use an approved independent provider-side announcement/voicemail route. Such an independent route is a proposed operational safeguard, not configured recovery in this release. The existing application fallback URL depends on the same web service.

## Incident evidence and follow-up

Capture a redacted call ID, UTC timestamp, mode, deployment commit, hangup cause, provider response category, user impact and recovery action. Exclude secrets, authentication headers, stream tokens and real customer transcripts from the public repository. Assign an owner and verify recovery with a new test; a successful deployment alone does not close an audio incident.
