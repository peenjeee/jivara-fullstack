# Jivara Backend

Backend Jivara adalah REST API untuk autentikasi, RBAC, manajemen pasien/perawat, jadwal obat, adherence, food scan, audit log, dan Web Push notification. Service ini dibangun dengan Express.js, TypeScript, Drizzle ORM, dan PostgreSQL/Supabase.

## Tech Stack

- Node.js `>=22.13.0`
- Express.js 5
- TypeScript
- PostgreSQL/Supabase
- Drizzle ORM
- JWT + refresh token
- Web Push VAPID
- Scalar API Reference
- Reasoning Food AI via OpenRouter

## Prerequisites

- Node.js 22 atau lebih baru
- npm
- PostgreSQL database, disarankan Supabase
- Supabase Storage bucket untuk upload food scan production
- Optional AI services untuk food detection, interaction check, OpenRouter reasoning, dan nutrition estimate

## Quick Start

```bash
git clone https://github.com/jivara-capstone/jivara.git
cd jivara/backend
npm install
cp .env.example .env
```

Isi `.env` minimal:

```env
PORT=3001
NODE_ENV=development
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=replace_with_strong_secret
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

Untuk scan makanan, isi juga konfigurasi Food AI berikut jika ingin memakai service production:

```env
FOOD_AI_INFERENCE_URL=https://food-detection.jivara.web.id/detect
FOOD_REASONING_API_URL=https://ai.jivara.web.id
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_REASONING_MODEL=moonshotai/kimi-k2.6:free
```

Generate VAPID key jika ingin mencoba Web Push:

```bash
npm run vapid:generate
```

Lalu isi:

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@jivara.app
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Local server port, default `3001` |
| `NODE_ENV` | Yes | `development` atau `production` |
| `API_URL` | Yes | Public backend origin, contoh `http://localhost:3001` atau `https://api.jivara.web.id` |
| `FRONTEND_URL` | Yes | Allowed frontend origin, contoh `http://localhost:3000` |
| `JWT_SECRET` | Yes | Secret untuk access token |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SUPABASE_POOLER_URL` | Optional production | Supabase Session Pooler URL for IPv4-only hosts |
| `DATABASE_MAX_CONNECTIONS` | Optional | Maximum Postgres.js connections, default `10` |
| `AUTH_USER_CACHE_TTL_MS` | Optional | Authenticated user validation cache, default `5000` |
| `ACCESS_SCOPE_CACHE_TTL_MS` | Optional | Access-scope lookup cache, default `5000` |
| `ADHERENCE_CACHE_TTL_MS` | Optional | Expensive adherence calculation cache, default `10000` |
| `DASHBOARD_CACHE_TTL_MS` | Optional | Admin and nurse dashboard response cache, default `10000` |
| `API_RATE_LIMIT_MAX` | Optional | Global production API request limit per window, default `600` |
| `API_RATE_LIMIT_WINDOW_MS` | Optional | Global production API rate-limit window, default `900000` |
| `FOOD_AI_INFERENCE_URL` | Optional | Endpoint YOLO/Jivara Food Detection, biasanya `/detect` |
| `FOOD_AI_TIMEOUT_MS` | Optional | Timeout detection service, default `25000` |
| `FOOD_AI_IMAGE_MAX_SIZE` | Optional | Maximum image dimension before upload to detection service, default `1280` |
| `FOOD_AI_IMAGE_QUALITY` | Optional | JPEG quality for resized food image, default `75` |
| `FOOD_AI_ALLOW_LOCAL_FALLBACK` | Optional | `true` hanya untuk local fallback jika detection service gagal |
| `FOOD_REASONING_API_URL` | Optional | Base URL Jivara Interaction Check service, contoh `https://ai.jivara.web.id` |
| `FOOD_REASONING_TIMEOUT_MS` | Optional | Timeout Jivara Interaction Check service, default `10000` |
| `OPENROUTER_API_KEY` | Optional, recommended for Food AI | API key OpenRouter untuk reasoning per pasangan makanan-obat dan rekomendasi keseluruhan |
| `OPENROUTER_API_URL` | Optional | Base URL OpenRouter, default `https://openrouter.ai/api/v1` |
| `OPENROUTER_REASONING_MODEL` | Optional | Primary OpenRouter model, default `moonshotai/kimi-k2.6:free` |
| `OPENROUTER_REASONING_FALLBACK_MODELS` | Optional | Comma-separated fallback models jika primary model limit/error |
| `OPENROUTER_TIMEOUT_MS` | Optional | Timeout OpenRouter, default `15000` |
| `OPENROUTER_HTTP_REFERER` | Optional | Referer header OpenRouter, biasanya frontend origin |
| `OPENROUTER_APP_TITLE` | Optional | Title header OpenRouter, default `Jivara` |
| `VAPID_PUBLIC_KEY` | Required for push | Public key Web Push |
| `VAPID_PRIVATE_KEY` | Required for push | Private key Web Push |
| `VAPID_SUBJECT` | Required for push | Mailto/contact VAPID subject |
| `ENABLE_REMINDER_SCHEDULER` | Optional | Enable medication reminder scheduler |
| `REMINDER_SCHEDULER_RUN_IN_WEB` | Optional | Run scheduler inside web dyno. Keep `false` in production when using a separate worker |
| `REMINDER_SCHEDULER_INTERVAL_MS` | Optional | Scheduler interval, default `60000` |
| `REMINDER_LOOKBACK_MINUTES` | Optional | Reminder lookback window |
| `SUPABASE_URL` | Optional local, recommended production | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional local, recommended production | Service role for Storage upload |
| `SUPABASE_STORAGE_BUCKET` | Optional local, recommended production | Food scan bucket name |
| `SUPABASE_STORAGE_PUBLIC_URL` | Optional | Public/CDN bucket URL override |

Do not commit `.env` or service role keys.

## Database Setup

Push the Drizzle schema:

```bash
npm run db:push
```

If `drizzle-kit push` fails in your environment, apply SQL files in `backend/drizzle/` in numeric order to the target PostgreSQL database.

Optional seed data:

```bash
npm run seed
```

Seed demo credentials:

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `superadmin@jivara.test` | `Demo12345` |
| Admin | `admin@jivara.test` | `Demo12345` |
| Nurse | `nurse1@jivara.test` | `Demo12345` |
| Patient | `patient1@jivara.test` | `Demo12345` |

## Run Locally

```bash
npm run dev
```

The API runs on `http://localhost:3001` by default.

Useful URLs:

- API root: `http://localhost:3001/`
- API docs: `http://localhost:3001/api-docs`
- OpenAPI JSON: `http://localhost:3001/openapi.json`
- Versioned API prefix: `http://localhost:3001/api/v1`

## Food AI Flow

Alur analisis scan makanan saat ini dimiliki backend, sehingga frontend bisa menampilkan hasil yang sama setelah scan dan di modal detail scan.

1. Upload gambar membuat record food scan dan menyimpan gambar.
2. Deteksi makanan tetap memakai YOLO/Jivara Food Detection melalui `FOOD_AI_INFERENCE_URL`.
3. Untuk setiap makanan terdeteksi x setiap obat aktif pasien, backend memanggil `FOOD_REASONING_API_URL/interaction-check` satu per satu:

```json
{
  "yolo_class": "tumis-kangkung",
  "patient_medications": ["WARFARIN"]
}
```

4. `interaction_description` untuk setiap pasangan makanan-obat dibuat di backend via OpenRouter. Primary model memakai `OPENROUTER_REASONING_MODEL`, default `moonshotai/kimi-k2.6:free`; jika limit atau gagal, backend mencoba `OPENROUTER_REASONING_FALLBACK_MODELS`.
5. `overall_recommendation` juga dibuat via OpenRouter dari seluruh analisis pasangan makanan-obat dan disimpan sebagai snapshot scan.
6. Rekomendasi makanan hanya berasal dari response Jivara Interaction Check (`recommended_foods` dan `foods_to_avoid`). Flow scan saat ini tidak memanggil AI `/recommend`; route backend `/food-scans/:scanId/recommendations` hanya tersisa untuk kompatibilitas client lama dan sengaja tidak didokumentasikan di Swagger.
7. Estimasi nutrisi tetap berjalan terpisah lewat `/nutrition-estimates`, default per 100 gram untuk setiap makanan terdeteksi jika serving tidak dikirim.
8. Backend bisa mengembalikan `aman`, `ringan`, atau `sedang` sebagai level perhatian, tetapi label UI `High Risk` hanya untuk `tinggi`, `kritis`, `high`, `critical`, atau `high risk`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run start:reminder-worker` | Run medication reminder worker separately |
| `npm run db:push` | Push Drizzle schema |
| `npm run seed` | Build and seed demo data |
| `npm run backfill:patient-assignments` | Dry-run patient assignment backfill |
| `npm run backfill:patient-assignments -- --apply` | Apply patient assignment backfill |
| `npm run vapid:generate` | Generate Web Push VAPID keys |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest |
| `npm run test:coverage` | Run tests with coverage |

## Verification

Before pushing backend changes:

```bash
npm run db:push
npx tsc --noEmit
npm run lint
npm run test
```

Production smoke test examples:

```bash
curl -i https://api.jivara.web.id/
curl -i https://api.jivara.web.id/api/v1/notifications/public-key
```

## Deployment To Heroku

Backend is deployed from the `backend` folder using Git subtree:

```bash
git subtree push --prefix backend heroku main
```

If Heroku reports the same commit was already built, split and push explicitly:

```bash
git push heroku `git subtree split --prefix backend main`:main --force
```

Required Heroku config examples:

```bash
heroku config:set API_URL="https://api.jivara.web.id" -a jivara-api
heroku config:set FRONTEND_URL="https://jivara.web.id,https://www.jivara.web.id" -a jivara-api
heroku config:set REMINDER_SCHEDULER_RUN_IN_WEB=false -a jivara-api
heroku ps:scale web=1 worker=1 -a jivara-api
```

Use Heroku config vars for all secrets. Do not commit production `.env`.

## Production Notes

- API utama memakai `/api/v1`.
- Legacy `/api` alias may exist for compatibility, but new clients should use `/api/v1`.
- `API_URL` should be the backend origin only, for example `https://api.jivara.web.id`, not `/api/v1`.
- Web Push needs HTTPS/secure context on frontend PWA.
- Food scan uploads should use Supabase Storage in production, not local `uploads/`.
- Food AI reasoning requires `OPENROUTER_API_KEY`; without it, backend returns local fallback text so scan upload does not fail completely.
- Do not call `/food-scans/:scanId/recommendations` from new clients. Use `/food-scans/:scanId/interactions` and display recommendation arrays returned there.
- In production, run `npm run start:reminder-worker` as a separate worker and keep `REMINDER_SCHEDULER_RUN_IN_WEB=false`.
- Patient created by a nurse is auto-assigned to that nurse.

## Directory Structure

```text
backend/
├── drizzle/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── db/
│   ├── middleware/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── types/
│   ├── validators/
│   └── app.ts
├── tests/
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```
