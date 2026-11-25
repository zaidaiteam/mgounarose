import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rose Care Hub | M’Gouna Rose",
  description: "Espace de relation client et de suivi des commandes M’Gouna Rose.",
  robots: { index: false, follow: false, noarchive: true },
  appleWebApp: { capable: true, title: "Rose Care Hub" },
  icons: { apple: "/icon-192.png" },
};
export const viewport: Viewport = { themeColor: "#F7F4ED" };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
