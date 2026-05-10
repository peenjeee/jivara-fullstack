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
| `npm run lint` |

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
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```