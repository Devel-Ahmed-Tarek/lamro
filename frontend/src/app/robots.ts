import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lamro.de";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || siteUrl;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/account", "/checkout"],
      },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, `${apiUrl.replace(/\/$/, "")}/api/v1/sitemap.xml`],
  };
}
