import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./hud-menu.css";
import "./equipment-panel.css";
import "./storage-panel.css";
import "./capture-panel.css";
import "./pet-panel.css";
import "./menu-overrides.css";
import "../features/multiplayer/multiplayer-overlay.css";
import "../features/multiplayer/chat-panel.css";

export const metadata: Metadata = {
  title: "PalPalWorld",
  description: "2D multiplayer creature survival RPG",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#111827",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
