# Project Capstone : Jivara

### Stay on Track, Stay Healthy

---

[![Next.js](https://img.shields.io/badge/Next.js-16+-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19+-61DAFB?style=flat-square&logo=react&logoColor=white)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4+-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-5+-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45+-C5F74F?style=flat-square&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18+-316192?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

---

## Ringkasan Proyek

Jivara adalah platform kesehatan berbasis kecerdasan buatan (AI) yang dirancang untuk membantu pasien menjaga kepatuhan konsumsi obat, meningkatkan pemahaman mengenai interaksi makanan-obat, dan memberikan analisis gizi serta pengingat waktu konsumsi obat secara cerdas. Platform ini juga memfasilitasi tenaga kesehatan (Nurse/Admin) untuk memantau pasien secara jarak jauh melalui dashboard web interaktif.

Proyek ini dibangun menggunakan arsitektur *monorepo* yang memisahkan antara frontend (Next.js) dan backend (Express.js + Drizzle ORM).

---

## Fitur Utama

### **Untuk Pasien**
- **Dashboard Pasien:** Ringkasan obat aktif, pengingat, dan riwayat kepatuhan (Heatmap 12 bulan).
- **Jadwal Obat Interaktif:** Kalender harian untuk melihat, mengonfirmasi, dan melacak status minum obat (Belum, Selesai, Terlewat).
- **Food Scan (AI Deteksi Makanan):** Kemampuan untuk mengunggah atau memindai makanan guna mendeteksi interaksi dengan obat yang sedang dikonsumsi, lengkap dengan rekomendasi AI terkait risiko dan gizi.
- **Notifikasi Pintar (PWA):** Pengingat otomatis untuk konsumsi obat.

### **Untuk Tenaga Kesehatan (Nurse/Admin)**
- **Pemantauan Real-Time:** Melihat progres dan metrik pasien melalui grafik dan analitik interaktif.
- **Manajemen Pasien & Jadwal:** Mengatur jadwal obat pasien, memantau *adherence* (kepatuhan), dan mendapatkan notifikasi peringatan jika terdapat ketidakpatuhan atau risiko.

---

## Struktur Repositori

Proyek ini dibagi menjadi dua bagian utama:

- `/frontend` - ([Lihat README Frontend](./frontend/README.md))
- `/backend` - ([Lihat README Backend](./backend/README.md))

---

## Persiapan (Prerequisites)

Sebelum memulai, pastikan Anda telah menginstal:
- [Node.js](https://nodejs.org/en)
- [npm](https://www.npmjs.com/)
- [Supabase](https://supabase.com/)
- [Vercel](https://vercel.com/)

---

## Memulai Proyek Secara Lokal

Karena proyek ini menggunakan dua direktori terpisah, Anda harus menjalankan *frontend* dan *backend* secara terpisah (di dua terminal berbeda).

### 1. Menjalankan Backend
[Backend README](./backend/README.md).

```bash
cd backend
npm install
cp .env.example .env
npm run db:push
npm run dev
```

### 2. Menjalankan Frontend
[Frontend README](./frontend/README.md)

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

---

## License

Jivara - Copyright © 2026. All Rights Reserved.

---

<p align="center">
 <b>Jivara Development Team</b>
</p>
