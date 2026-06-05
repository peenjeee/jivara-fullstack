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
- React Doctor
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

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base with `/api/v1`, contoh `http://localhost:3001/api/v1` |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase project URL for Supabase client/session helper |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional | Supabase publishable key for browser-safe client usage |

Semua variable yang dibaca browser harus memakai prefix `NEXT_PUBLIC_` dan membutuhkan rebuild/redeploy frontend setelah nilainya berubah.

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
- Browser Network bisa menampilkan request `OPTIONS` preflight untuk CORS. Preflight bukan eksekusi controller; request XHR/fetch setelahnya adalah API call yang membuat detections, interactions, atau nutrition estimates.

## Food Scan Flow

- Scan makanan tetap dimulai dari YOLO/Jivara Food Detection melalui backend `POST /food-scans/{scanId}/detections`.
- Analisis interaksi diminta melalui backend `POST /food-scans/{scanId}/interactions`. Frontend tidak memanggil `POST /food-scans/{scanId}/recommendations` pada flow scan saat ini.
- Estimasi nutrisi tetap berjalan lewat `POST /nutrition-estimates` dan ditampilkan sebagai estimasi per 100 gram secara default.
- Durasi deteksi ditampilkan dalam detik.
- `FoodScanAnalysisView` dipakai ulang oleh halaman hasil scan dan `FoodScanDetailModal`, sehingga keduanya menampilkan deteksi, reasoning interaksi, nutrisi, rekomendasi keseluruhan, dan card rekomendasi AI yang sama.
- Setiap pasangan makanan-obat menampilkan reasoning dari backend berdasarkan Jivara Interaction Check plus OpenRouter. Ini juga berlaku untuk pasangan low/ringan/sedang; `sedang` tidak lagi dinaikkan menjadi UI `High Risk`.
- UI `High Risk` hanya muncul saat overall scan atau minimal satu pasangan makanan-obat benar-benar high risk (`tinggi`, `kritis`, `high`, `critical`, atau `high risk`).
- `Rekomendasi AI` hanya muncul untuk scan High Risk dan hanya jika response interaction berisi array rekomendasi. Saat datanya ada, UI menampilkan dua card: `Makanan Aman` dari `recommended_foods` dan `Perlu Dibatasi` dari `foods_to_avoid`.
- Saat modal detail scan dibuka, frontend memakai snapshot scan yang tersimpan dan tidak memanggil endpoint rekomendasi AI lagi.

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
npx tsc --noEmit
npm run lint
npm run doctor
npm run test
npm run test:e2e
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
