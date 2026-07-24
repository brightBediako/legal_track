# LegalTrack — Production Deployment (Phase 13)

Deploy **backend** (NestJS + Prisma + PostgreSQL) and **app** (Next.js) for evaluation. Proposal target: **Render**.

---

## Prerequisites

1. Render account
2. Strong secrets ready:
   - `JWT_SECRET` (long random string)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` (admin portal login; password ≥ 8 chars)
3. Object storage keys if you enable Cloudinary/S3 (optional; local provider works for demos)

---

## Environment variables

### Backend (`legaltrack-api`)

| Variable | Required | Notes |
|----------|----------|--------|
| `NODE_ENV` | yes | `production` |
| `DATABASE_URL` | yes | Render Postgres connection string |
| `JWT_SECRET` | yes | Must not be the placeholder `change-me-in-production` |
| `ADMIN_EMAIL` | yes | Bootstrap admin created on boot if missing |
| `ADMIN_PASSWORD` | yes | Used only when creating admin (or when `ADMIN_FORCE_RESET=true`) |
| `ADMIN_FORCE_RESET` | no | `true` once to reset admin password from env, then set `false` |
| `CORS_ORIGINS` | yes | Comma-separated frontend URLs, e.g. `https://legaltrack-app.onrender.com` |
| `JWT_EXPIRES_IN` | no | Default `3600s` |
| `JWT_REFRESH_DAYS` | no | Default `7` |
| Cloudinary / AWS | no | Only if uploads use those providers |

Admin bootstrap also runs via CLI:

```bash
cd backend
npm run db:seed:admin
```

That command removes legacy demo accounts (`*@legaltrack.local`, Portal Demo Client) when safe.

### Frontend (`legaltrack-app`)

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | yes | Public API URL, no trailing slash |

Copy from `app/.env.example`.

---

## Option A — Render Blueprint

1. Push this repo to GitHub.
2. In Render: **New → Blueprint** → select the repo (`render.yaml`).
3. Set sync:false env vars when prompted:
   - API: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CORS_ORIGINS`
   - App: `NEXT_PUBLIC_API_BASE_URL` (use the API service URL after it exists)
4. Deploy. API start command runs migrations then `node dist/main.js`.
5. Open the app URL → `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## Option B — Manual Render services

### 1. PostgreSQL

Create a Render PostgreSQL instance. Copy the **Internal** (or External) `DATABASE_URL`.

### 2. API web service

- **Root directory:** repository root (npm workspaces)
- **Build:**  
  `npm install && npm run db:generate --workspace=@legal-track/backend && npm run build --workspace=@legal-track/backend`
- **Start:**  
  `npm run db:migrate --workspace=@legal-track/backend && npm run start --workspace=@legal-track/backend`
- Set env vars from the table above.
- Health check path: `/`

### 3. Frontend web service

- **Build:** `npm install && npm run build --workspace=app`
- **Start:** `npm run start --workspace=app`
- Set `NEXT_PUBLIC_API_BASE_URL` to the API public URL.
- Set API `CORS_ORIGINS` to the frontend public URL and redeploy the API.

### 4. Custom domain / DNS (optional)

In each Render service → **Settings → Custom Domains**. Point DNS as Render instructs (CNAME/A). Update `CORS_ORIGINS` and `NEXT_PUBLIC_API_BASE_URL` to the custom hosts.

---

## Local production-like check

```bash
# Backend
cd backend
cp .env.example .env   # fill DATABASE_URL, JWT_SECRET, ADMIN_*, CORS_ORIGINS
npm run db:migrate
npm run db:seed:admin
npm run build
npm run start

# Frontend (other terminal)
cd app
cp .env.example .env.local
npm run build
npm run start
```

---

## PostgreSQL backup guidance

- Prefer Render’s automatic backups on paid Postgres plans.
- Manual dump:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=legaltrack-$(date +%Y%m%d).dump
```

- Restore:

```bash
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" legaltrack-YYYYMMDD.dump
```

Schedule dumps before schema migrations or major releases.

---

## Post-deploy checklist

- [ ] API `/` responds
- [ ] Login with `ADMIN_EMAIL` works
- [ ] Create a clerk/lawyer user from `/users/new`
- [ ] Register a client (portal email + phone temp password)
- [ ] CORS allows the frontend origin (no browser CORS errors)
- [ ] `JWT_SECRET` is unique and not the example placeholder
- [ ] `ADMIN_FORCE_RESET` is `false` after any intentional reset
