import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Scan Makanan",
  description: "Scan makanan dengan AI Computer Vision untuk mendeteksi interaksi berbahaya antara makanan dan obat yang sedang dikonsumsi.",
  robots: { index: false, follow: false },
};

export default function FoodScanLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
