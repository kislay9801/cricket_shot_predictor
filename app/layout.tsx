import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Navbar } from "@/components/Navbar";
import { ConfigBanner } from "@/components/ConfigBanner";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  weight: ["400", "500", "600", "700", "800"],
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "ShotSense — Elite Cricket AI",
  description:
    "AI-powered cricket shot recognition with biomechanical insights and an AI coach.",
};

export const viewport: Viewport = {
  themeColor: "#f7f9fb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${hanken.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-background font-body-md text-on-surface antialiased">
        <Providers>
          <ConfigBanner />
          <Navbar />
          <main className="relative min-h-[70vh]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="w-full border-t border-outline-variant bg-surface-container py-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-sm px-margin text-center md:flex-row md:text-left">
        <div className="font-headline-lg-mobile text-headline-lg-mobile font-extrabold text-primary">
          Shot<span className="text-secondary">Sense</span>
        </div>
        <p className="font-data-mono text-data-mono text-on-surface-variant">
          © 2026 ShotSense · AI cricket shot recognition
        </p>
      </div>
    </footer>
  );
}
