import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Map UMKM MBD | Peta dan Data Desa",
  description: "Jelajahi peta sebaran, data UMKM, dan informasi ekonomi desa Kabupaten Maluku Barat Daya.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
