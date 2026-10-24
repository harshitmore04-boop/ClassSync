# ClassSync

Hybrid Attendance Tracking and Personalized Recovery Planning.

Live application: https://classsync-tau.vercel.app/login

## Production architecture

The interface and all five application API routes run on Vercel. Records are stored in the private `classsync` schema in Supabase Postgres. The application no longer proxies API requests to another website. Vercel Authentication is enabled.

`server/` contains the native Vercel handler, database adapter and schema. `api/proxy.js` is the bundled native handler (the filename is retained for existing routes). Rebuild from the project root with `npm ci --prefix server` followed by `node server/build.mjs`.

## Configuration

Set `DATABASE_URL` to the scoped application-role Supabase connection string in Vercel. `CLASS_SYNC_TEACHER_SETUP_HASH` protects first-teacher setup; the private setup code is stored in the owner's Vercel environment. Never commit environment values.

Optional Supabase email codes use `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_OTP_ENABLED`. Email codes remain disabled until custom SMTP and code email templates are configured and tested. Password accounts remain available. Optional teacher email notifications use `BREVO_API_KEY` and `MAIL_FROM_EMAIL`.

## Features

Student and teacher portals, QR attendance, teacher approvals, face enrollment with motion challenges, PDF/class-list uploads, manual registration, attendance recovery plans and messages. Registration is in Face enrollment. Webcam motion checks are assistance rather than certified anti-spoof detection. All face submissions require teacher approval.

## Development

For a single-computer local demonstration: `npm install --prefix local-server`, then `node serve-local.mjs`. Live records are in Supabase; local demonstration data stays on the computer. Third-party assets retain their original licenses.
