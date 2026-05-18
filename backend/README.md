# Jivara Backend

Ini adalah repositori layanan API (Backend) untuk platform Jivara. Backend ini dibangun menggunakan arsitektur modern berbasis **Node.js**, **Express.js**, dan berinteraksi dengan database **PostgreSQL** melalui **Drizzle ORM**.

---

## Teknologi Utama

- **Runtime:** Node.js (>= 22.13.0)
- **Framework:** Express.js 5.x
- **Database:** PostgreSQL (menggunakan **Supabase**)
- **ORM:** Drizzle ORM
- **Bahasa:** TypeScript
- **Keamanan:** Helmet, Express Rate Limit, bcryptjs, JWT (JSON Web Token)
- **Dokumentasi API:** Swagger UI Express

---

## Persyaratan (Prerequisites)

- Node.js versi 22 atau lebih baru.
- Database PostgreSQL yang sudah berjalan (Disarankan menggunakan **Supabase**).

---

## Instalasi & Konfigurasi

1. **Instal Dependensi**
   Masuk ke direktori `backend` dan jalankan:
   ```bash
   npm install
   ```

2. **Konfigurasi Environment**
   Salin file contoh konfigurasi dan sesuaikan isinya:
   ```bash
   cp .env.example .env
   ```
   *Pastikan Anda mengisi variabel koneksi database (seperti `DATABASE_URL`) dan `JWT_SECRET` di dalam file `.env`.*

   Variabel penting tambahan:

   | Variabel | Fungsi |
   | --- | --- |
   | `FOOD_AI_INFERENCE_URL` | Endpoint YOLO detection yang menerima `scanId`, `patientId`, dan `imageUrl` |
   | `FOOD_REASONING_API_URL` | Base URL AI reasoning untuk `/interaction-check`, `/nutrition`, dan `/recommend` |
   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push Notification PWA |
   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Upload foto scan makanan ke Supabase Storage production |
   | `SUPABASE_STORAGE_PUBLIC_URL` | Opsional, public URL/CDN bucket storage |
   | `ENABLE_REMINDER_SCHEDULER` | Mengaktifkan scheduler reminder obat |

3. **Sinkronisasi Skema Database (Drizzle)**
   Push skema yang ada di kode ke dalam database PostgreSQL Anda:
   ```bash
   npm run db:push
   ```

4. **Menjalankan Seeder (Opsional)**
   Untuk mengisi database dengan data awal (dummy/mock data):
   ```bash
   npm run seed
   ```

---

## Menjalankan Server Lokal

Untuk tahap pengembangan (development), jalankan:
```bash
npm run dev
```

Server secara default akan berjalan di `http://localhost:3001`.

---

## Menjalankan Perintah

| Perintah |
| --- |
| `npm run dev` |
| `npm run build` |
| `npm start` |
| `npm run db:push` |
| `npm run seed` |
| `npm run backfill:patient-assignments` |
| `npm run vapid:generate` |
| `npm run lint` |

---

## Endpoint Penting

Dokumentasi interaktif tersedia melalui Swagger UI saat server berjalan. Endpoint yang perlu diperhatikan untuk integrasi terbaru:

API utama tersedia dengan prefix versioning `/api/v1`. Prefix lama `/api` masih tersedia sebagai alias kompatibilitas.

| Endpoint | Fungsi |
| --- | --- |
| `PATCH /api/auth/me` | Menyimpan perubahan profil user saat ini |
| `PUT /api/auth/change-password` | Ganti password normal dengan verifikasi password lama |
| `GET /api/notifications/preferences` | Membaca status push notification pasien |
| `PATCH /api/notifications/preferences` | Enable/disable push notification pasien |
| `POST /api/notifications/events` | Tracking klik/open Web Push dari service worker |
| `GET /api/notifications/analytics` | Open rate, CTR, dan rata-rata TTO notifikasi |

---

## Catatan Production

- Untuk Web Push di HP/PWA, frontend harus berjalan pada HTTPS atau secure context.
- Endpoint `GET /api/v1/notifications/public-key` membutuhkan env `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, dan `VAPID_SUBJECT`; generate key dengan `npm run vapid:generate`, lalu set di Railway/backend production.
- Untuk Railway/production, jangan mengandalkan filesystem lokal `uploads/`; gunakan Supabase Storage dengan env storage di atas.
- Endpoint `/api/notifications/events` sengaja tidak membutuhkan bearer token karena dipanggil dari service worker saat user mengklik notifikasi.
- Pasien yang dibuat oleh role `nurse` otomatis dibuatkan assignment aktif ke nurse pembuat agar tetap muncul setelah refresh.
- Untuk data lama yang sudah terlanjur dibuat tanpa assignment, jalankan `npm run backfill:patient-assignments` untuk dry-run, lalu `npm run backfill:patient-assignments -- --apply` untuk insert assignment aktif.

---

## Struktur Direktori

```text
backend/
├── drizzle/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── db/
│   ├── middleware/
│   ├── routers/
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
