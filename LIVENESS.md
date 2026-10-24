# Face motion challenge

Face enrollment and face attendance require a fresh camera challenge. In the teacher portal, create an active **Face recognition** session, start the camera, and select enrollment mode and use **Save selected student’s face** (two captures and liveness are automatic), or choose automatic scan mode to trigger recognition when a face enters view.

Follow the prompts: look straight ahead with eyes open; close/open both eyes; turn your nose toward the specified LEFT/RIGHT edge of the camera image; return to centre. Blink/head-turn order and direction are randomized. Stop camera or Cancel challenge aborts capture. If the motion is difficult, use teacher-assisted QR or daily attendance updates.

The browser uses face-api's existing pretrained landmarks and descriptors. Three neutral frames calibrate eye openness and nose position. One closed-eye frame followed by two reopened frames satisfies the blink. Two frames at the requested turn and two back at centre satisfy the turn. Frames must remain continuous, contain one sufficiently large face, and retain a similar descriptor. Capture times out after 25 seconds. Enrollment samples must match the face completing the challenge.

The live API issues an actor/session/purpose/student-bound nonce, expiring within 90 seconds or session expiry. It validates ordered numerical evidence, timing and descriptor continuity, and atomically consumes the nonce once. Missing, expired, replaced, replayed and mismatched challenges are rejected. Existing identity, session and attendance uniqueness checks still apply. Public-IP matching applies only when the teacher enables it for the session. QR/manual attendance does not require face motion.

The new `liveness_challenges` table stores temporary challenge metadata. Camera photographs/video and frame landmark evidence are not saved to the database. Attendance and scan history retain check-in outcomes. Client failures before API check-in only appear in the UI. Demo challenges stay in tab memory, and demo IP checks remain simulated.

## Limits

This is **basic motion-based liveness assistance**, not certified presentation-attack detection. Browser code supplies landmarks and evidence; a modified client can fabricate them. Replayed video, synthetic camera feeds, or sophisticated spoofing may bypass the check. The server validates a challenge protocol, not the authenticity of the physical camera. No biometric accuracy or attack-resistance study is claimed. Actual webcam testing is still required. Lighting, eyewear and camera quality can affect completion.

The backend needs the new migration. Old clients without proof fail closed; refresh to load updated scripts. Existing enrollments remain usable, but every new face attendance attempt requires motion.

## Automated verification

After installing project dependencies:

```sh
node --test tests/liveness.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Tests cover ordered/static motion, timing gaps, lost/multiple faces, cancellation, descriptor changes, live enrollment/attendance gating, nonce reuse/expiry/binding and continued QR operation. Camera-runner tests use synthetic landmarks, not real hardware.
