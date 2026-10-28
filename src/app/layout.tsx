import type { Metadata, Viewport } from "next";
import type React from "react";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SerwistProvider } from "@serwist/turbopack/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Taskraft Management", template: "%s · Taskraft" },
  description: "Boards, items and automations for a small team working together in real time.",
  applicationName: "Taskraft Management",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111318" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === "development"}>
          <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
            <Providers>
              <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
            </Providers>
            <Toaster position="bottom-left" />
          </ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
