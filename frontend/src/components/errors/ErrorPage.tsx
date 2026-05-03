"use client";

import { SimpleFooter } from "@/components/landing/Footer";
import Link from "next/link";
import type { ReactNode } from "react";
import LogoHomeLink from "@/components/ui/LogoHomeLink";

export type ErrorVariant =
  | "400"
  | "401"
  | "402"
  | "403"
  | "404"
  | "405"
  | "408"
  | "409"
  | "410"
  | "422"
  | "429"
  | "500"
  | "502"
  | "503"
  | "504"
  | "offline"
  | "unknown";

const ERROR_CONTENT: Record<ErrorVariant, {
  eyebrow: string;
  title: string;
  description: string;
  codeLabel: string;
}> = {
  "400": {
    eyebrow: "Bad Request",
    title: "Permintaan tidak bisa diproses",
    description: "Ada format data atau parameter yang tidak sesuai. Periksa kembali tautan atau data yang dikirim.",
    codeLabel: "400",
  },
  "401": {
    eyebrow: "Unauthorized",
    title: "Sesi login diperlukan",
    description: "Kamu perlu masuk terlebih dahulu sebelum mengakses halaman atau data ini.",
    codeLabel: "401",
  },
  "402": {
    eyebrow: "Payment Required",
    title: "Akses pembayaran diperlukan",
    description: "Fitur atau halaman ini memerlukan aktivasi pembayaran sebelum bisa digunakan.",
    codeLabel: "402",
  },
  "403": {
    eyebrow: "Forbidden",
    title: "Akses halaman dibatasi",
    description: "Akun kamu tidak memiliki izin untuk membuka halaman ini. Hubungi admin jika ini tidak sesuai.",
    codeLabel: "403",
  },
  "404": {
    eyebrow: "Not Found",
    title: "Halaman tidak ditemukan",
    description: "Tautan mungkin sudah berubah, dihapus, atau alamat yang dimasukkan tidak tepat.",
    codeLabel: "404",
  },
  "405": {
    eyebrow: "Method Not Allowed",
    title: "Metode tidak didukung",
    description: "Aksi yang diminta tidak tersedia untuk halaman atau endpoint ini.",
    codeLabel: "405",
  },
  "408": {
    eyebrow: "Request Timeout",
    title: "Permintaan terlalu lama",
    description: "Koneksi atau proses memakan waktu terlalu lama. Coba ulangi beberapa saat lagi.",
    codeLabel: "408",
  },
  "409": {
    eyebrow: "Conflict",
    title: "Data sedang konflik",
    description: "Perubahan tidak bisa diproses karena ada data lain yang bertabrakan.",
    codeLabel: "409",
  },
  "410": {
    eyebrow: "Gone",
    title: "Halaman sudah tidak tersedia",
    description: "Konten ini sudah dihapus permanen atau tidak lagi tersedia di Jivara.",
    codeLabel: "410",
  },
  "422": {
    eyebrow: "Unprocessable Content",
    title: "Data belum valid",
    description: "Beberapa data yang dikirim belum sesuai. Periksa kembali isian atau formatnya.",
    codeLabel: "422",
  },
  "429": {
    eyebrow: "Too Many Requests",
    title: "Terlalu banyak permintaan",
    description: "Kamu mengirim terlalu banyak permintaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.",
    codeLabel: "429",
  },
  "500": {
    eyebrow: "Server Error",
    title: "Sistem sedang bermasalah",
    description: "Terjadi kendala di sisi server. Coba muat ulang halaman atau kembali beberapa saat lagi.",
    codeLabel: "500",
  },
  "502": {
    eyebrow: "Bad Gateway",
    title: "Gateway tidak merespons",
    description: "Server menerima respons yang tidak valid dari layanan lain. Coba lagi beberapa saat lagi.",
    codeLabel: "502",
  },
  "503": {
    eyebrow: "Service Unavailable",
    title: "Layanan sementara tidak tersedia",
    description: "Jivara sedang penuh atau dalam perawatan. Silakan coba kembali sebentar lagi.",
    codeLabel: "503",
  },
  "504": {
    eyebrow: "Gateway Timeout",
    title: "Layanan terlalu lama merespons",
    description: "Server membutuhkan waktu terlalu lama untuk menerima respons dari layanan lain.",
    codeLabel: "504",
  },
  offline: {
    eyebrow: "Offline",
    title: "Koneksi terputus",
    description: "Jivara tidak bisa memuat halaman karena perangkat sedang offline. Periksa koneksi internet lalu coba kembali.",
    codeLabel: "OFF",
  },
  unknown: {
    eyebrow: "Unexpected Error",
    title: "Terjadi kesalahan",
    description: "Aplikasi mengalami kendala yang tidak terduga. Coba muat ulang halaman ini.",
    codeLabel: "ERR",
  },
};

interface ErrorPageProps {
  readonly variant: ErrorVariant;
  readonly reset?: () => void;
  readonly children?: ReactNode;
}

export default function ErrorPage({ variant, reset, children }: ErrorPageProps) {
  const content = ERROR_CONTENT[variant];
  const backHref = variant === "401" ? "/login" : "/";
  const backLabel = variant === "401" ? "Masuk" : variant === "offline" ? "Coba Lagi" : "Kembali";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex flex-1 items-start justify-center px-5 pt-0 pb-28 text-center">
        <section className="flex w-full max-w-md flex-col items-center">
          <LogoHomeLink priority />

          <div className="mt-3 w-full px-6 py-10 sm:px-10">
            <p className="font-display text-[76px] font-extrabold leading-none tracking-[-0.08em] text-primary sm:text-[96px]">
              {content.codeLabel}
            </p>
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-[-0.04em] text-dark sm:text-4xl">
              {content.title}
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted sm:text-base">
              {content.description}
            </p>

            {children && <div className="mt-5 text-sm leading-6 text-muted">{children}</div>}

            <div className="mt-8 flex justify-center">
              <Link
                href={backHref}
                onClick={reset ? () => reset() : undefined}
                className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-sm font-extrabold uppercase tracking-[0.12em] !text-white transition-colors hover:bg-primary-hover"
              >
                {backLabel}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SimpleFooter />
    </div>
  );
}
