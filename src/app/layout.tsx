import type { Metadata, Viewport } from "next";
import "./globals.css";
import SessionProviderClient from "@/components/SessionProviderClient";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "MultiPoster",
  description: "Planlegg og publiser innlegg til Instagram, X (Twitter) og TikTok fra én app.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MultiPoster",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#5b6cff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body>
        <SessionProviderClient>
          <NavBar />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </SessionProviderClient>
      </body>
    </html>
  );
}
