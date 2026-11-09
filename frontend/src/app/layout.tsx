import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { Suspense } from "react";
import { Shell } from "@/components/shell";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title: "Jala",
  description: "Industrial electronics storefront and auctions",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <StoreProvider>
          <Suspense fallback={null}>
            <Shell>{children}</Shell>
          </Suspense>
        </StoreProvider>
      </body>
    </html>
  );
}
