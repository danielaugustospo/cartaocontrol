import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { DueNotificationRunner } from "@/components/notifications/due-notification-runner";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CartãoControl",
    template: "%s | CartãoControl",
  },
  description: "Controle pessoal de cartões, faturas, parcelas, recorrências e limites.",
  manifest: "/manifest.webmanifest",
  applicationName: "CartãoControl",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CartãoControl",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <ServiceWorkerRegistration />
        <DueNotificationRunner />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
