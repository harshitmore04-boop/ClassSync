# ClassSync

Hybrid Attendance Tracking and Personalized Recovery Planning: student and teacher portals, daily attendance, direct QR and face scanning, recovery calculations, missed-topic tasks and messages.

## Run with real local accounts

Use Node.js 22.13 or newer. In this folder:

```sh
npm install --prefix local-server
node serve-local.mjs
```

Open http://localhost:8080/login. First-time teacher setup requires the private code printed in your terminal. Choose your own email/password. Teachers create students, then use **Create / reset login** to share an activation link. Sign out or Switch portal to enter the other role.

Your local database and setup code are in ignored `.local/`. Never upload them. The local launcher binds to localhost and is for one computer. For phone QR check-in, use the hosted site, not a localhost link.

## Sample-only demo

```sh
node serve-demo.mjs
```

Open http://localhost:8080/login and choose a demo. The demo uses browser localStorage and does not submit live email or enforce a real public-IP comparison. The demo student is Harshit. Teacher/student demo changes share the same browser and origin; different devices do not share that storage. Real account forms require `serve-local.mjs` or the hosted backend.

## Scanners

## QR attendance choices

The teacher can choose three modes. New sessions default to **Student login → Teacher approval**.

| Mode | Student action | When attendance is saved |
| --- | --- | --- |
| Student login → Teacher approval | Scan, sign in to ClassSync, request attendance | Teacher approves in Approvals |
| Direct QR · name & roll match | Scan, enter registered name and roll | Matching roster entry immediately; mismatches wait for review |
| Teacher-assisted confirmation | Teacher scans and selects a student; phone users can sign in and request review | Teacher confirms at scanner or approves request |

Login preserves the scanned class token. Approval requests use the registered identity belonging to the signed-in account, never a posted name or student ID. Students see Pending, Approved or Rejected in their portal. Repeated submissions cannot duplicate attendance. Submitted requests can be reviewed after class closes. Previously created account-confirmation sessions remain supported. The optional matching-IP switch applies to all modes. New demo QR sessions use a separate shared attendance service, so phones can submit name/roll requests and the creating teacher can approve across devices. Other demo features remain in browser storage.

Face mode separates enrollment from scanning. Select Save/enroll, start camera, confirm consent and save the selected student's face. In automatic scan mode a face triggers a randomized motion challenge, then identity matching and attendance. The person must leave view before another scan. No recognition-button click is needed per person. Webcam permission and HTTPS/localhost are required. Physical-camera verification remains device-dependent.

The motion challenge is basic liveness assistance, not certified spoof detection. Replayed video or a modified client may bypass it. Learning completion never changes official attendance. Parent login is absent; teacher parent messages need configured email submission for delivery. Automatic warnings create message records, not automatic outgoing email.

## Hosted backend

The original framework project uses Vinext/Vite, Cloudflare Workers and D1. Real application login now uses email/password accounts and secure sessions, rather than platform sign-in. Hosting must permit anonymous visitors for direct QR/account entry; the API protects private records using application roles. `CLASS_SYNC_TEACHER_SETUP_HASH` is a server-only hash of the private first-teacher code. Optional email uses `BREVO_API_KEY` and `MAIL_FROM_EMAIL`. No live secrets or database are included.

Deploying unchanged to Vercel does not supply Cloudflare D1 bindings. A Vercel port needs a database/runtime adaptation. The full local Node server is a separate way to run the API on your computer.

See `AUTH_AND_SCANNING.md` and `LIVENESS.md` for detailed behavior, boundaries and validation. The explanation guide in the downloadable bundle covers the presentation and COA connection. Third-party libraries/models retain their original terms; license files are included.

### Student face self-enrollment
Teachers open **Face enrollment** and create a one-hour class QR/link. Registered students open it on their phones, confirm their identity, consent, complete a randomized blink/head-turn check, and capture three poses. Live links require the student's own ClassSync account; shared demos match the demo roster's name and roll. Only numeric descriptors are submitted; camera video and photos are not uploaded.

Submissions remain pending until a teacher verifies identity. Teachers can select pending requests and approve/reject them together. Batch results report individual failures, including duplicate face-profile conflicts. Approved profiles become available to the attendance scanner. Closing an enrollment link blocks new captures but preserves submitted requests for review. Deleting a face revokes its enrollment profile.

Students also have a **Face enrollment** tab with instructions and a field to open their teacher's enrollment link. Recovery analytics is accessible from teacher navigation. Tabs support arrow keys, Home/End, and restoring the selected tab on refresh. The COA connection section has been removed; the existing visual theme is preserved.

This webcam motion check is a project-level liveness check, not certified anti-spoof protection. Test actual camera capture on the target phone/browser before a classroom demonstration. Students can use QR attendance if face enrollment is unavailable.
