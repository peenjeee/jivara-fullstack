# Jivara Frontend

Ini adalah antarmuka pengguna (Frontend) untuk platform Jivara. Dibangun menggunakan fitur terbaru dari ekosistem React untuk memberikan pengalaman yang super cepat, interaktif, dan responsif baik di desktop maupun perangkat mobile (PWA ready).

---

## Teknologi Utama

- **Framework Utama:** Next.js 16.x (App Router)
- **Library UI:** React 19.x
- **Styling:** Tailwind CSS 4.x
- **State Management:** Zustand
- **Animasi & Interaksi:** Motion (Framer Motion)
- **Smooth Scrolling:** Lenis Scroll
- **Charting / Grafik:** Chart.js & react-chartjs-2
- **Alert & Dialogs:** SweetAlert2
- **Icon:** Lucide React

---

## Fitur Unggulan

- **Role-Aware Architecture:** Aplikasi mampu membedakan antarmuka (UI) antara pasien dan tenaga kesehatan (Nurse/Admin).
- **Patient Dashboard & Heatmap:** Komponen kalender dinamis dan *heatmap adherence* interaktif untuk melacak riwayat kepatuhan hingga 12 bulan terakhir.
- **Food Scan Flow:** Integrasi UI untuk mensimulasikan pemindaian makanan (YOLOv11 AI detection) yang mencocokkan interaksi makanan dengan obat yang sedang dikonsumsi.
- **PWA (Progressive Web App):** Konfigurasi via `@ducanh2912/next-pwa` memungkinkan aplikasi diinstal selayaknya aplikasi *native* di perangkat seluler pengguna.
- **Client-Side Storage:** Penggunaan Zustand dan JS Cookies untuk menyimpan *state* secara lokal.

---

## Persyaratan (Prerequisites)

- Node.js versi 22 atau lebih baru.
- Layanan API backend Jivara yang sudah berjalan secara lokal (atau di-mock) untuk integrasi data penuh.

---

## Instalasi & Konfigurasi

1. **Instal Dependensi**
   Masuk ke direktori `frontend` dan jalankan:
   ```bash
   npm install
   ```

2. **Konfigurasi Environment**
   Salin file contoh konfigurasi dan sesuaikan isinya:
   ```bash
   cp .env.local.example .env.local
   ```
   *Pastikan untuk mengatur `NEXT_PUBLIC_API_URL` agar mengarah ke API Backend (biasanya `http://localhost:3001` di lokal).*

---

## Menjalankan Aplikasi Lokal

Untuk memulai *development server*:
```bash
npm run dev
```

Aplikasi akan tersedia di `http://localhost:3000`. Coba buka URL tersebut di peramban web (browser) Anda.

---

## Kumpulan Skrip npm

| Perintah | Deskripsi |
| --- | --- |
| `npm run dev` | Menjalankan server dalam mode development dengan Fast Refresh. |
| `npm run build` | Melakukan proses build aplikasi untuk lingkungan produksi (Production). |
| `npm start` | Menjalankan aplikasi dari hasil *build* (`npm run build` harus dijalankan dulu). |
| `npm run lint` | Menjalankan ESLint untuk memastikan kode sesuai dengan standar. |
| `npm run test` | Menjalankan *test runner* menggunakan Vitest. |

---

## Struktur Direktori

```text
frontend/
├── public/                 # Aset statis (ikon, gambar, manifest PWA)
├── src/
│   ├── app/                # Next.js App Router (Halaman dan Layout)
│   ├── components/         # Komponen UI React (Modular & Reusable)
│   │   ├── dashboard/      # Layout dashboard & header
│   │   ├── patient-dashboard/ # Tampilan khusus pasien (Heatmap, dll)
│   │   ├── schedule/       # Logika jadwal kalender obat interaktif
│   │   ├── food-scan/      # Antarmuka pemindai dan analisis makanan
│   │   ├── settings/       # Halaman pengaturan profil pasien & admin
│   │   └── ui/             # Komponen dasar (Button, Modal, Input)
│   ├── helpers/            # Fungsi bantuan murni (logic format date, dll)
│   ├── lib/                # Konfigurasi library (Axios, SweetAlert2)
│   ├── providers/          # Context Providers (seperti ScrollProvider/Lenis)
│   └── store/              # Global state management menggunakan Zustand
├── next.config.ts          # Konfigurasi PWA dan Next.js
├── tailwind.config.ts      # (atau postcss.config) Konfigurasi Tailwind 4
└── package.json            # Dependensi frontend
```

## Deployment (Production)

Frontend Jivara dikonfigurasi untuk di-deploy dengan mudah menggunakan **Vercel**.

1. Hubungkan repositori GitHub Anda ke Vercel.
2. Vercel akan mendeteksi proyek Next.js secara otomatis.
3. Pastikan untuk mengatur semua *Environment Variables* (seperti `NEXT_PUBLIC_API_URL`) di dashboard Vercel sebelum melakukan *deploy*.

---

## Catatan Scroll / Interaktivitas

Frontend Jivara menggunakan **Lenis** untuk mendapatkan efek *smooth scroll*. Jika Anda mengembangkan komponen dengan fungsi *horizontal scroll* native (seperti *heatmap*), pastikan komponen tersebut menggunakan atribut `data-lenis-prevent` agar gesture *touch/pan* di perangkat *mobile* tidak terkunci oleh provider scroll global.