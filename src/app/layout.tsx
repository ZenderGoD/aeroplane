import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AeroIntel — Aviation Intelligence Platform",
  description:
    "Real-time aviation intelligence powered by ADS-B data. Flight tracking, anomaly detection, corridor health, and airport pressure analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} antialiased`}>
        {/* @ts-expect-error - delayDuration prop type mismatch with shadcn version */}
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
