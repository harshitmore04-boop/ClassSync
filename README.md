# ClassSync

Hybrid Attendance Tracking and Personalized Recovery Planning.

Live application: https://classsync-tau.vercel.app/login

## Production architecture

The interface and all five application API routes run on Vercel. Records are stored in the private `classsync` schema in Supabase Postgres. The application no longer proxies API requests to another website. Vercel Authentication is enabled.

`server/` contains the native Vercel handler, database adapter and schema. `api/proxy.js` is the bundled native handler (the filename is retained for existing routes). Rebuild from the project root with `npm ci --prefix server` followed by `node server/build.mjs`.

## Configuration

Set `DATABASE_URL` to the scoped application-role Supabase connection string in Vercel. Student and teacher sign-in uses email OTP only. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_OTP_ENABLED=true`. Configure Brevo as the custom SMTP provider in Supabase Auth and use an email template containing `{{ .Token }}` so the message includes a verification code. No password or student invitation code is required. First-time teacher registration requires the code whose SHA-256 hash is configured in CLASS_SYNC_TEACHER_SETUP_HASH; returning teachers need email and OTP only.

Any verified email can create an account. New teacher accounts also require the server registration code and share the existing classroom without replacing its owner. Students enter their full name and USN when creating an account; their verified email is linked to real QR attendance and face enrollment. Existing USNs tied to another email require teacher correction. Email allowlists are not used. The browser cannot assign teacher privileges. Existing data and sessions remain intact. Brevo email notifications still optionally use `BREVO_API_KEY` and `MAIL_FROM_EMAIL`.

Vercel runs `npm ci --prefix server && node server/build.mjs` before deployment to regenerate `api/proxy.js` from the backend source.

## Features

Student and teacher portals, QR attendance, teacher approvals, face enrollment with motion challenges, PDF/class-list uploads, manual registration, attendance recovery plans and messages. Registration is in Face enrollment. Webcam motion checks are assistance rather than certified anti-spoof detection. All face submissions require teacher approval.

## Development

For a single-computer local demonstration: `npm install --prefix local-server`, then `node serve-local.mjs`. Live records are in Supabase; local demonstration data stays on the computer. Third-party assets retain their original licenses.
