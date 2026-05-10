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
- **PWA (Progressive Web App):** Memungkinkan aplikasi diinstal selayaknya aplikasi *native* di perangkat seluler pengguna.
- **Client-Side Storage:** Penggunaan Zustand dan JS Cookies untuk menyimpan *state* secara lokal.

---

## Persyaratan (Prerequisites)

- Node.js versi 22 atau lebih baru.

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

Aplikasi berjalan di `http://localhost:3000`.

---

## Menjalankan Perintah 

| Perintah |
| --- |
| `npm run dev` |
| `npm run build` |
| `npm start` |
| `npm run lint` |
| `npm run test` |

---

## Struktur Direktori

```text
frontend/
├── public/
├── src/
│   ├── app/
│   ├── components/
│   ├── helpers/
│   ├── hooks/
│   ├── lib/
│   ├── providers/
│   ├── store/
│   ├── styles/
│   ├── types/
│   ├── proxy.ts
├── tests/
├── next.config.ts
└── package.json
