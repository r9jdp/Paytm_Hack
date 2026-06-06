import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Paytm Vision PWA",
  description: "A Google-authenticated Paytm PWA for buyers, merchants, and future realtime vision workflows.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Paytm Vision"
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <PwaRegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}
