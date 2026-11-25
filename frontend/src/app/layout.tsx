import type { Metadata, Viewport } from "next";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lamro.de";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Jala",
    template: "%s · Jala",
  },
  description: "Industrial electronics storefront and auctions",
  applicationName: "Jala",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Jala",
    title: "Jala",
    description: "Industrial electronics storefront and auctions",
    images: [{ url: "/hero-auction.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jala",
    description: "Industrial electronics storefront and auctions",
    images: ["/hero-auction.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#121212",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
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
