import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { FinanceProvider } from "@/context/FinanceContext";
import GlobalModalWrapper from "@/components/GlobalModalWrapper";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "GFE ERP",
  description: "Advanced Personal Finance Cockpit",
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
        <FinanceProvider>
          <div className="bg-layer" />
          <div className="bg-orb orb-1" />
          <div className="bg-orb orb-2" />
          <div className="bg-orb orb-3" />

          <div className="min-h-screen flex gap-[18px] max-w-[1200px] mx-auto md:p-5 lg:p-6">
            <Sidebar />
            <main className="flex-1 flex flex-col gap-4 px-4 pb-28 pt-0 md:p-0">{children}</main>
          </div>

          <MobileNav />
          <GlobalModalWrapper />
        </FinanceProvider>
      </body>
    </html>
  );
}
