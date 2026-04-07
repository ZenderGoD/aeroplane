import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AeroIntel — Aviation Intelligence Platform",
  description:
    "Real-time flight tracking, AI-powered analytics, and operational intelligence. Track every aircraft in the sky with live ADS-B data, weather, turbulence reports, and more.",
  keywords: [
    "flight tracker",
    "aviation",
    "ADS-B",
    "real-time",
    "aircraft tracking",
    "flight radar",
    "aviation intelligence",
  ],
  authors: [{ name: "AeroIntel" }],
  metadataBase: new URL("https://anuragair.com"),
  openGraph: {
    title: "AeroIntel — Aviation Intelligence Platform",
    description:
      "Real-time flight tracking, AI-powered analytics, and operational intelligence for aviation professionals.",
    url: "https://anuragair.com",
    siteName: "AeroIntel",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AeroIntel — Aviation Intelligence Platform",
    description:
      "Track every aircraft in real-time. AI-powered aviation analytics.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#94a3b8" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className={`${geist.variable} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
        <ThemeProvider>
          {/* @ts-expect-error - delayDuration prop type mismatch with shadcn version */}
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
