# ClassSync accounts and scanner workflow

## Real accounts

Teacher and student pages use email and password. New users set an 8–128 character password. The app stores a salted PBKDF2 hash, not the password. New teacher accounts also require the server-verified registration code; returning teachers use email and password. SMTP and Supabase Auth OTP are not part of this sign-in path.

An existing account keeps its stored role. Any email can create a student account with full name and USN; teacher accounts need the server-configured registration code. Authorized teachers share the existing classroom; registration preserves its owner and data. Email allowlists are not used. The site does not verify mailbox ownership, so a school deployment should add a recovery/verification policy before using sensitive student data.

Session cookies remain HttpOnly, SameSite=Lax and Secure on HTTPS, with hashed server-side session tokens and a seven-day expiry. Same-origin requests, field limits and per-email/IP attempt limits remain in place. Existing OTP-only accounts can set a password through an active signed-in session. Without an active session, they require administrator-assisted recovery; the public form cannot claim an existing account by email alone.

## QR attendance choices

The teacher can choose three modes. New sessions default to **Student login → Teacher approval**.

| Mode | Student action | When attendance is saved |
| --- | --- | --- |
| Student login → Teacher approval | Scan, sign in to ClassSync, request attendance | Teacher approves in Approvals |
| Direct QR · name & roll match | Scan, enter registered name and roll | Matching roster entry immediately; mismatches wait for review |
| Teacher-assisted confirmation | Teacher scans and selects a student; phone users can sign in and request review | Teacher confirms at scanner or approves request |

Login preserves the scanned class token. Approval requests use the registered identity belonging to the signed-in account, never a posted name or student ID. Students see Pending, Approved or Rejected in their portal. Repeated submissions cannot duplicate attendance. Submitted requests can be reviewed after class closes. Previously created account-confirmation sessions remain supported. The optional matching-IP switch applies to all modes. New demo QR sessions use a separate shared attendance service, so phones can submit name/roll requests and the creating teacher can approve across devices. Other demo features remain in browser storage.

## Direct QR attendance and teacher approval

Create a QR session using Direct QR. The student scans it, enters their full name and roll number, and submits without account sign-in. Names match after trimming, Unicode normalization, case folding and collapsing spaces; roll numbers match the registered roll exactly after trimming. A matching registered name and roll immediately creates presence. A missing or mismatched roster entry creates a Pending request instead and does not create attendance.

The teacher’s **Approvals** tab shows submitted name/roll, class, registered name if known, submission time and status. Approve writes one presence record and teacher audit history; Reject leaves attendance unchanged. For an unknown roll, Register student first prefills the roster form; the teacher supplies a real email, registers the student, then approves. For a name mismatch on a known roll, the teacher explicitly approves as the canonical registered student. Pending requests submitted during an active session can be reviewed after it closes. Approval of a newly registered student establishes their enrollment start at the request time so that approved attendance counts in their dashboard.

Pending requests have a random private receipt; its hash is stored server-side. That receipt lets the submitting browser poll the status, including after class closes, without exposing the roster. Receipts are kept in sessionStorage, not in publicly shared URLs. Repeated matching requests do not create multiple queue entries or attendance rows. Reviewed requests cannot be reviewed again. The database batch makes approval and its changes atomic. Receipt values are never included in the teacher’s API list. Student accounts cannot access other students’ queue data or approve attendance.

**Matching IP is the teacher’s choice.** The checkbox initially defaults on. Before a session, its value is saved at creation. On an active session, changing it immediately updates that session through a teacher-only API. Turning it on sets the reference to the teacher’s current public IP. Turning it off allows QR and face check-in from different connections, including when no public IP is available. Face identity and liveness checks still apply. Existing session tokens and QR images remain valid when this setting changes. The check-in page states whether matching IP is required.

Name/roll entry is self-declared and weaker than verified identity; someone who knows both fields may impersonate a student. IP matching is only a network signal, not proof of classroom presence. The public endpoint still requires the unexpired direct-session token, validates inputs, applies the chosen IP rule, limits repeated failed/pending attempts and prevents duplicate presence. Only limited session metadata and receipt-bound status are public.

The teacher’s in-page QR scanner still supports teacher-assisted confirmation. A phone's ordinary camera opens the direct form. Demo QR requests are shared across devices on the hosted site or full local server, using isolated demo tables. Students scan to a dedicated name/roll form; only the teacher browser that created the session can review it. Demo class access expires after 24 hours and old rows are cleared on a later session creation. Student receipts are private to their submitting tab. Other demo modules remain browser-local. The static demo launcher has no shared backend. The localhost launcher remains single-computer; its network address is loopback, not a real classroom gateway.

## Face enrollment and automatic attendance

1. Create a Face recognition session.
2. Choose the **Face operation**: Save/enroll or automatic attendance scanning.
3. Start camera once and grant permission.
4. To enroll, select the registered student, confirm consent, and choose **Save selected student's face**. The app captures two samples, runs the motion challenge and saves matching descriptors.
5. In scan mode, detection begins automatically when the camera opens. A visible face triggers the liveness challenge without pressing Recognize. After a pass, the existing matching/session/IP/duplicate checks save attendance.
6. The person steps out of view. Two empty frames re-arm the scanner for the next person. This prevents repeatedly challenging a person who remains in front of the camera. Unknown/failed attempts also wait for departure before another attempt.

Stop camera, changing operations or leaving the scanner cancels processing. A running operation must finish or be cancelled before switching session settings. A changed face, lost/multiple faces, a timeout or failed challenge prevents saving. See `LIVENESS.md` for the basic motion check's spoofing limitations. Automatic scanning never removes the liveness requirement.

## Run real accounts locally

Install Node.js 22.13 or newer, open the extracted code folder in VS Code, then run:

```sh
npm install --prefix local-server
node serve-local.mjs
```

Open `http://localhost:8080/login`. Set `CLASS_SYNC_TEACHER_SETUP_HASH` to the SHA-256 digest of the teacher registration code. Use the teacher or student email and password form. The local database stays in ignored `.local/`. Do not upload that directory to GitHub. Reusing the same folder keeps your local records; deleting/moving `.local/` loses or disconnects those records.

The full server uses the same API route logic with a Node SQLite adapter. It is bound to localhost for one computer; it does not provide LAN access. Its connection comparison uses the loopback peer address, not a real classroom gateway. A phone scanning its localhost QR opens the phone's own localhost, so use the hosted URL for cross-device demonstrations.

For sample-only use without installation:

```sh
node serve-demo.mjs
```

That static launcher does not provide real registration/login. Choose a demo button there. Local and hosted accounts/databases are separate. A hosted setup code cannot activate the local database; use the code printed by your local server.

## Source and validation

- `app/lib/accounts.ts`: password derivation, session cookies, invite tokens and attempt counters.
- `app/api/auth/route.ts`: login, registration and logout.
- `app/api/checkin/route.ts`: dispatches QR check-in by session policy; `app/lib/direct-checkin.ts` retains the public name/roll flow.
- `public/account-login.js`, `portal-session.js`, `checkin.js`: user-facing forms.
- `public/face-auto.js`: face arrival/departure scanner state machine.
- `serve-local.mjs`: SQLite local backend and route loader.
- New database migrations add account, session, invite and attempt-counter tables.

Run `node --test tests/accounts-checkin.test.mjs tests/liveness.test.mjs tests/face-auto.test.mjs` after dependencies are installed in the source project. Tests use in-memory SQLite and synthetic camera inputs. They do not establish physical-camera reliability or biometric attack resistance.

## Shared demo QR transport

`public/demo-sync.js` publishes a minimal demo roster (ID, name and roll; no emails or faces) to `/api/demo-attendance`. New QR codes link to `public/demo-checkin.html`. Students do not need the teacher browser’s localStorage. Approval mode always queues a request; Direct QR auto-marks an exact name/roll match. A private teacher capability hash controls review and classroom edits, and a private student receipt hash controls status reads. Public metadata omits roster, receipts and teacher keys. The same optional IP policy is enforced server-side. Requests are deduplicated, sessions and request counts are bounded, and demo records never enter real attendance/account tables.
