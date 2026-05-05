# Jivara Backend

Ini adalah repositori layanan API (Backend) untuk platform Jivara. Backend ini dibangun menggunakan arsitektur modern berbasis **Node.js**, **Express.js**, dan berinteraksi dengan database **PostgreSQL** melalui **Drizzle ORM**.

---

## Teknologi Utama

- **Runtime:** Node.js (>= 22.13.0)
- **Framework:** Express.js 5.x
- **Database:** PostgreSQL (dihosting menggunakan **Supabase**)
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
*Perintah ini menggunakan `ts-node-dev` untuk auto-reload saat ada perubahan kode.*

Server secara default akan berjalan di `http://localhost:3001` (atau port lain yang ditentukan di `.env`).

---

## Kumpulan Skrip npm

| Perintah | Deskripsi |
| --- | --- |
| `npm run dev` | Menjalankan server dalam mode development dengan auto-reload. |
| `npm run build` | Mengompilasi kode TypeScript menjadi JavaScript di folder `dist/`. |
| `npm start` | Menjalankan server dari hasil kompilasi produksi (`dist/src/app.js`). |
| `npm run db:push` | Menerapkan skema Drizzle ORM ke database PostgreSQL. |
| `npm run seed` | Mengompilasi kode lalu menjalankan skrip seeder database. |
| `npm run lint` | Menjalankan ESLint untuk mengecek standar penulisan kode. |

---

## Struktur Direktori

```text
backend/
├── src/
│   ├── app.ts            # Entry point Express
│   ├── config/           # Konfigurasi app (db, env)
│   ├── controllers/      # Logika permintaan/respon (Controllers)
│   ├── middlewares/      # Middleware (Auth, Error handling)
│   ├── models/           # Skema Drizzle ORM
│   ├── routes/           # Definisi API routes
│   └── scripts/          # Skrip pendukung (seperti seed.ts)
├── drizzle.config.ts     # Konfigurasi Drizzle
├── package.json          # Dependensi & skrip backend
└── tsconfig.json         # Konfigurasi TypeScript
```

---

## Deploy (Production)

Backend ini telah disiapkan untuk berjalan pada platform seperti **Railway**, Render, atau VPS dengan mesin Node.js 22.

*Railway Config:* Jika men-deploy menggunakan Nixpacks (Railway), sistem secara otomatis membaca spesifikasi versi di `package.json` (`engines: { "node": ">=22.13.0" }`) dan/atau konfigurasi `nixpacks.toml` yang sudah diatur di dalam root atau folder ini. Perintah build yang berjalan di cloud adalah `npm run build` diikuti `npm start`.