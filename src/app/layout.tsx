import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boxyland Manager",
  description: "Gestione punti vendita e aperture Boxyland",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Boxyland", statusBarStyle: "default" },
  icons: { apple: "/icons/icon-192.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
