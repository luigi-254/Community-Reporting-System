# MTAA Fix — Production Deployment Guide (Zero-Cost Strategy)

This document explains how to deploy MTAA Fix using free-tier services wherever
technically possible. No actual credentials are committed here — fill in the
values marked `<YOUR_VALUE>` when you have them.

---

## 1. Architecture Overview

| Component | Technology | Free-tier hosting option | Notes |
|-----------|------------|--------------------------|-------|
| Citizen Frontend | Next.js 16 (App Router) | **Vercel** (free) | `http://localhost:3000` locally |
| Admin Dashboard | Next.js 16 (App Router) | **Vercel** (free) | `http://localhost:3001` locally |
| Government Frontend | Next.js 16 (App Router) | **Vercel** (free) | `http://localhost:3002` locally |
| Backend | Node.js / Express | **Render** free web service or **Koyeb** free | `http://localhost:5000` locally |
| Database | PostgreSQL 18 + Prisma ORM | **Neon** free (0.5 GB) or **Supabase** free (500 MB) | Live data, all roles seeded |
| Image storage | Cloudinary | **Cloudinary** free (~25 GB/mo) | Report evidence uploads |
| Email | Resend | **Resend** free (100 emails/day) | Verification & password reset |

---

## 2. Credentials You Need to Provide

Create a `.env` file in each application directory. **Never commit `.env`.**

### Backend (`backend/.env`)

| Variable | Where to get it | Example |
|----------|-----------------|---------|
| `PORT` | Choose any | `5000` |
| `NODE_ENV` | Set to `production` | `production` |
| `DATABASE_URL` | Neon / Supabase dashboard → connection string | `postgresql://postgres:[YOUR-PASSWORD]@db.[project].supabase.co:5432/postgres?schema=public` |
| `JWT_SECRET` | Generate a strong random string | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Generate a strong random string | `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `CLIENT_URL` | Your deployed frontend origins (comma-separated) | `https://citizen.vercel.app,https://gov.vercel.app` |
| `RESEND_API_KEY` | Resend dashboard → API Keys | `re_xxxxxxxxxxxx` (optional) |
| `EMAIL_FROM` | Verified sender in Resend | `noreply@yourdomain.org` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary dashboard | `1234567890` |
| `CLOUDINARY_API_SECRET` | Cloudinary dashboard | `your_secret` |

### Citizen Frontend (`citizen-frontend/.env`)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com` |
| `NEXT_PUBLIC_CITIZEN_APP_URL` | `https://citizen.vercel.app` |
| `NEXT_PUBLIC_ADMIN_APP_URL` | `https://admin.vercel.app` |
| `NEXT_PUBLIC_GOVERNMENT_APP_URL` | `https://gov.vercel.app` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Optional support email |

### Government Frontend (`government-frontend/.env`)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com` |
| `NEXT_PUBLIC_CITIZEN_APP_URL` | `https://citizen.vercel.app` |

### Admin Dashboard (`admin-dashboard/.env`)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com` |
| `NEXT_PUBLIC_CITIZEN_APP_URL` | `https://citizen.vercel.app` |

---

## 3. Deployment Steps (in order)

### 3.1 Database (PostgreSQL) — do first

**Supabase (recommended):**
1. Create a free project at https://supabase.com
2. Copy the connection string → `DATABASE_URL` in `backend/.env`
3. **Important:** If using Supabase's connection pooler (port 6543), update
   `backend/repositories/client.js` to use explicit PG* config instead of
   `DATABASE_URL` (see the code comments in that file for the pattern).
4. Run migrations: `cd backend && npx prisma migrate deploy`
5. Seed: `cd backend && npm run db:seed` and `cd backend && node prisma/dev-seed.js`

**Neon (alternative):**
1. Create a free project at https://neon.tech
2. Copy the connection string → `DATABASE_URL`
3. Run migrations and seed as above

### 3.2 Backend

**Render (free web service):**
1. Connect your GitHub repo to Render
2. Create a "Web Service" pointing to the `backend/` directory
3. Build command: `npm install && npx prisma generate`
4. Start command: `npm start`
5. Add all `backend/.env` environment variables in the Render dashboard
6. Set `NODE_ENV=production`

**Koyeb (alternative):**
1. Deploy from GitHub, set build/start commands same as above

### 3.3 Frontends (Vercel free)

For each of citizen-frontend, government-frontend, admin-dashboard:
1. Connect the folder to Vercel
2. Build command: `npm install && npm run build`
3. Add the `NEXT_PUBLIC_*` environment variables from section 2
4. Deploy

### 3.4 Cloudinary (image uploads)

1. Create a free account at https://cloudinary.com
2. Copy Cloud Name, API Key, API Secret → `backend/.env`
3. Report evidence uploads (`/api/uploads`) will store images there

### 3.5 Resend (email — optional)

1. Create a free account at https://resend.com
2. Add and verify a sender domain
3. Copy API Key → `backend/.env`
4. Without this, verification/reset codes are logged to the backend console (dev fallback)

---

## 4. Free-tier Limitations (Honest)

| Service | Free limit | Impact |
|---------|------------|--------|
| Render web service | Spins down after ~15 min inactivity | First request after idle is slow (~30s cold start) |
| Neon free | 0.5 GB storage, auto-suspends after 5 min idle | Fine for MVP county data |
| Supabase free | 500 MB database | Fine for MVP |
| Vercel free | 100 GB bandwidth/mo, hobby subdomain | Fine for MVP; no custom domain |
| Cloudinary free | ~25 GB storage + 25 GB bandwidth/mo | Plenty for evidence photos |
| Resend free | 100 emails/day | Enough for verification/reset; bulk notifications need paid |

**No custom domain on free tiers** — you'll use `.onrender.com`, `.vercel.app`, etc.
**Spin-down:** Backend and database sleep after inactivity. This is acceptable for a county-government MVP but not for high-availability production.

---

## 5. Database Initialization (production)

After deploying the backend with `DATABASE_URL` set:

```bash
cd backend
npx prisma migrate deploy     # Apply schema migrations
npm run db:seed               # Seed counties, departments, roles, categories
node prisma/dev-seed.js       # Seed test government/citizen accounts
```

The seed creates:
- Kisii County + 46 other Kenyan counties
- 9 Kisii sub-counties, 45 wards
- 7 departments (Infrastructure, Water, Public Service, Trade, Youth, Disaster, Enforcement)
- 7 categories + 130 subcategories
- All 14 government roles + citizen accounts
- Test users (all passwords: `TestPassword123!`)

**Test accounts (all use password `TestPassword123!`):**
- `citizen.alice@example.com`, `citizen.bob@example.com` (CITIZEN)
- `governor.kisii@example.com` (GOVERNOR)
- `cecm.infrastructure@example.com` (CECM)
- `chief.officer.infra@example.com` (CHIEF_OFFICER)
- `tech.head.infra@example.com` (TECHNICAL_HEAD)
- `tech.supervisor.infra@example.com` (TECHNICAL_SUPERVISOR)
- `ward.admin.bassicentral@example.com` (WARD_ADMIN)
- `subcounty.admin.bobasi@example.com` (SUBCOUNTY_ADMIN)
- `field.officer.1@example.com` (FIELD_OFFICER)
- `disaster.manager@example.com` (DISASTER_MANAGER)
- `enforcement.officer@example.com` (ENFORCEMENT_OFFICER)
- `officer.general@example.com` (OFFICER)
- `dept.admin.infra@example.com` (DEPARTMENTAL_ADMIN)
- `admin.platform@example.com` (SUPER_ADMIN)
- `admin.county@example.com` (ADMIN)

---

## 6. Verification Checklist (after deployment)

- [ ] Backend `/health` returns 200
- [ ] Citizen can register, log in, submit a report, upload evidence, track it
- [ ] Each of the 14 government roles can log in and see its role-specific dashboard
- [ ] Cross-ward/department access is rejected (403)
- [ ] Password reset flow works (Resend configured or console-log fallback)
- [ ] Report assignment works across roles
- [ ] No `.env` files committed to git

---

## 7. Rollback

- Frontend: Vercel instant rollback from the dashboard
- Backend: Render rollback to previous deploy
- Database: `prisma migrate deploy` is transactional; take a Neon/Supabase backup before major changes

---

## 8. What I Need From You (when ready)

Provide these values and I (or you) can wire them into `.env`:

1. **Neon/Supabase** `DATABASE_URL`
2. **Backend** public URL (for `CLIENT_URL` and frontend `NEXT_PUBLIC_API_URL`)
3. **Vercel** frontend project URLs
4. **Resend** API key (optional — email works in dev fallback without it)
5. **Cloudinary** credentials (optional — needed for image uploads in production)

Do not send secrets over chat. Paste them directly into each `.env` file locally, then deploy.
