# MtaaFix Citizen Portal

This Next.js app hosts the public MtaaFix landing page and shared sign-in and
citizen registration pages. The existing citizen reporting workspace is at
`/dashboard`; successful sign-in routes each account to the correct dashboard.

## Local apps

Run each app from its own directory in a separate terminal:

| App | Local URL |
| --- | --- |
| Admin dashboard | `http://localhost:3000` |
| Government dashboard | `http://localhost:3001` |
| Citizen portal | `http://localhost:3002` |
| Backend API | `http://localhost:5000` |

Run a Next.js app on its assigned port with:

```powershell
npm run dev -- --port 3002
```

Copy `.env.example` to `.env.local` and set the public API and dashboard URLs
for your environment. `NEXT_PUBLIC_SUPPORT_EMAIL` is optional. These values
are public browser configuration, not secrets.

## Authentication database migration

The backend uses the existing PostgreSQL database. The auth handoff adds an
append-only, short-lived token table; it does not replace or delete user data.
Before deploying the updated backend, run these commands from `backend`:

```powershell
npx prisma generate
npx prisma migrate deploy
```

Set the backend `CLIENT_URL` to the comma-separated origins of the deployed
portal and dashboards. Set each app's `NEXT_PUBLIC_API_URL` and
`NEXT_PUBLIC_CITIZEN_APP_URL`; set the portal's `NEXT_PUBLIC_ADMIN_APP_URL`
and `NEXT_PUBLIC_GOVERNMENT_APP_URL` to the actual dashboard URLs.

The single-use handoff code is placed in a URL fragment, exchanged with the
backend, expires after one minute, and is stored only as a hash on the server.
Public registration always creates a citizen account. Administrator-created
officer accounts continue to use the existing backend management workflow.

## Checks

```powershell
npm run lint
npm run build
```
