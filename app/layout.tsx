import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { FinanceProvider } from "@/context/FinanceContext";
import AuthGuard from "@/components/AuthGuard";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "GFE ERP",
  description: "Advanced Personal Finance & Business Management",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GFE ERP",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full" suppressHydrationWarning>
        <AuthProvider>
          <FinanceProvider>
            <div className="bg-layer" />
            <div className="bg-orb orb-1" />
            <div className="bg-orb orb-2" />
            <div className="bg-orb orb-3" />

            <AuthGuard>{children}</AuthGuard>
          </FinanceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
