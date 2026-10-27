import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PT-Coach", template: "%s · PT-Coach" },
  description: "Training, Pläne, Ziele und Fortschritt mit deinem Coach",
  applicationName: "PT-Coach",
  appleWebApp: { capable: true, title: "PT-Coach", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1f5bc4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de">
      <body className="min-h-dvh antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
