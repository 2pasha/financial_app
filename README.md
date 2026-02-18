# Moneta

A modern financial management application built with React, TypeScript, and NestJS. Integrates with Monobank for automatic transaction syncing.

---

## Architecture

| Layer | Tech | Hosting |
|-------|------|---------|
| Frontend | React 18 + Vite + Tailwind CSS | Vercel |
| Backend | NestJS + Prisma | Render (Docker) |
| Database | PostgreSQL | Supabase |
| Auth | Clerk | Clerk Cloud |

This is a **monorepo** managed with `pnpm` workspaces:

```
moneta/
  api/          # NestJS backend
  web/          # React frontend
  packages/     # Shared packages (common-types)
```

---

## Prerequisites

- Node.js v20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL (local or Supabase)
- [Clerk](https://clerk.com/) account
- Monobank personal API token

---

## Local Development

### 1. Clone and install

```bash
git clone <repo-url>
cd financial_app
pnpm install
```

### 2. Set up environment variables

Copy the example files and fill in real values:

```bash
cp .env.example .env
cp api/.env.example api/.env
cp web/.env.example web/.env
```

### 3. Start development

**Docker database + API, local frontend**

```bash
docker compose up                # start PostgreSQL + API (with hot reload)
pnpm dev:web                     # start frontend locally (port 5173)
```

The API container automatically runs `prisma migrate deploy` on startup.

---

## Deployment

### Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings > Database** and copy the connection string
3. Format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

### Backend (Render)

1. Create a **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repository
3. Set **Runtime** to **Docker**
4. Set environment variables:
   - `DATABASE_URL` - Supabase connection string
   - `CLERK_SECRET_KEY` - from Clerk dashboard
   - `ALLOWED_ORIGINS` - your Vercel frontend URL (e.g. `https://moneta.vercel.app`)
   - `PORT` - `3000`
5. Set **Health Check Path** to `/health`
6. Deploy

The Dockerfile handles building, Prisma client generation, and runs `prisma migrate deploy` on startup.

> **Note:** Render's free tier spins down after 15 min of inactivity. Set up [UptimeRobot](https://uptimerobot.com) to ping `https://your-app.onrender.com/health` every 5 minutes to keep it warm (important for Monobank webhooks).

### Frontend (Vercel)

1. Import your GitHub repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `web`
3. Vercel will auto-detect Vite. The `vercel.json` handles SPA rewrites.
4. Set environment variables:
   - `VITE_API_URL` - your Render backend URL (e.g. `https://moneta-api.onrender.com`)
   - `VITE_CLERK_PUBLISHABLE_KEY` - from Clerk dashboard

### Post-deployment checklist

- [ ] Update `ALLOWED_ORIGINS` on Render with the Vercel URL
- [ ] Verify `/health` endpoint returns `200`
- [ ] Test Clerk authentication flow end-to-end
- [ ] Set up UptimeRobot for the Render health endpoint

---

## Tech Stack

### Frontend (`/web`)

- React 18, TypeScript, Vite
- Tailwind CSS, Radix UI (shadcn/ui)
- react-router-dom, react-hook-form
- Recharts for data visualization
- Clerk for authentication

### Backend (`/api`)

- NestJS 11, TypeScript
- Prisma ORM, PostgreSQL
- Clerk SDK for auth verification
- Axios for Monobank API calls

### Shared

- pnpm workspaces
- `@financial-app/common-types` shared type definitions
