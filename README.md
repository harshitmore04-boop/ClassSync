# ClassSync

Hybrid Attendance Tracking and Personalized Recovery Planning.

Live application: https://classsync-tau.vercel.app/login

## Production architecture

The interface and all five application API routes run on Vercel. Records are stored in the private `classsync` schema in Supabase Postgres. The application no longer proxies API requests to another website. Vercel Authentication is enabled.

`server/` contains the native Vercel handler, database adapter and schema. `api/proxy.js` is the bundled native handler (the filename is retained for existing routes). Rebuild from the project root with `npm ci --prefix server` followed by `node server/build.mjs`.

## Configuration

Set `DATABASE_URL` to the scoped application-role Supabase connection string in Vercel. Student and teacher sign-in uses email OTP only. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_OTP_ENABLED=true`. Configure Brevo as the custom SMTP provider in Supabase Auth and use an email template containing `{{ .Token }}` so the message includes a verification code. No password, student invitation code, or private teacher setup code is required.

Existing teacher accounts retain access. `CLASS_SYNC_TEACHER_EMAILS` is a server-side comma-separated list of approved emails that can initialize the first teacher account; another email cannot take over an existing classroom. Students without an account are activated automatically after OTP verification when their email matches the teacher's class list. The browser cannot assign teacher privileges. Existing data and sessions remain intact. Brevo email notifications still optionally use `BREVO_API_KEY` and `MAIL_FROM_EMAIL`.

Vercel runs `npm ci --prefix server && node server/build.mjs` before deployment to regenerate `api/proxy.js` from the backend source.

## Features

Student and teacher portals, QR attendance, teacher approvals, face enrollment with motion challenges, PDF/class-list uploads, manual registration, attendance recovery plans and messages. Registration is in Face enrollment. Webcam motion checks are assistance rather than certified anti-spoof detection. All face submissions require teacher approval.

## Development

For a single-computer local demonstration: `npm install --prefix local-server`, then `node serve-local.mjs`. Live records are in Supabase; local demonstration data stays on the computer. Third-party assets retain their original licenses.
