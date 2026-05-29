# Jivara Frontend

Frontend Jivara adalah aplikasi web/PWA untuk pasien, nurse, admin, dan super admin. Aplikasi ini memakai Next.js App Router, React 19, Tailwind CSS 4, Zustand, dan proxy API internal untuk berbicara dengan backend Jivara.

## Tech Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Zustand
- Axios
- Supabase SSR client
- SweetAlert2
- Chart.js
- Playwright/Vitest
- PWA manifest + service worker

## Prerequisites

- Node.js 22 atau lebih baru
- npm
- Backend Jivara berjalan lokal atau URL production API
- Supabase publishable key jika memakai Supabase client/session helper

## Quick Start

```bash
git clone https://github.com/jivara-capstone/jivara.git
cd jivara/frontend
npm install
cp .env.local.example .env.local
```

Untuk local development dengan backend lokal, isi `.env.local` seperti ini:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Untuk production frontend, gunakan:

```env
NEXT_PUBLIC_API_URL=https://api.jivara.web.id/api/v1
```

`NEXT_PUBLIC_API_URL` harus diset di environment frontend hosting, misalnya Vercel. Jangan set variable ini di Heroku backend.

## Run Locally

Start backend first in another terminal:

```bash
cd ../backend
npm run dev
```

Start frontend:

```bash
cd ../frontend
npm run dev
```

Frontend runs on `http://localhost:3000`.

## How API Calls Work

- Browser calls same-origin paths like `/api/v1/patients`.
- Next.js catches `/api/[...path]` and forwards to `NEXT_PUBLIC_API_URL`.
- Auth login/status/refresh/logout use dedicated Next routes under `/api/auth/*` to manage HTTP-only cookies.
- Backend production full API base is `https://api.jivara.web.id/api/v1`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build production app |
| `npm start` | Start production build locally |
| `npm run lint` | Run ESLint with zero warnings |
| `npm run test` | Run Vitest unit/feature tests |
| `npm run test:e2e` | Run Playwright tests |
| `npm run test:e2e:ui` | Run Playwright UI mode |
| `npm run doctor` | Run React Doctor |

## Verification

Before pushing frontend changes:

```bash
npm run lint
npm run build
npm run test
```

Production smoke checks:

```bash
curl -i https://www.jivara.web.id/login
curl -i -X POST https://api.jivara.web.id/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"superadmin@jivara.test","password":"Demo12345"}'
```

## Deployment To Vercel

Recommended Vercel project settings:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Install Command: `npm install`
- Output: Next.js default

Required environment variables:

```env
NEXT_PUBLIC_API_URL=https://api.jivara.web.id/api/v1
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

After changing any `NEXT_PUBLIC_*` variable, redeploy frontend so the new value is included in the build.

## Demo Credentials

When backend seed data is available:

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `superadmin@jivara.test` | `Demo12345` |
| Admin | `admin@jivara.test` | `Demo12345` |
| Nurse | `nurse1@jivara.test` | `Demo12345` |
| Patient | `patient1@jivara.test` | `Demo12345` |

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/login` | Login |
| `/register` | Admin registration |
| `/dashboard` | Role-aware dashboard |
| `/patients` | Patient management |
| `/nurses` | Nurse management |
| `/schedule` | Medication schedules |
| `/food-scan` | Food scan flow |
| `/activity-log` | Activity/audit timeline |
| `/settings` | Profile, password, notification preferences |
| `/offline` | PWA offline fallback |

## Directory Structure

```text
frontend/
├── public/
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── app/
│   ├── components/
│   ├── config/
│   ├── helpers/
│   ├── hooks/
│   ├── lib/
│   ├── providers/
│   ├── store/
│   ├── styles/
│   ├── types/
│   └── proxy.ts
├── tests/
├── next.config.ts
└── package.json
```
