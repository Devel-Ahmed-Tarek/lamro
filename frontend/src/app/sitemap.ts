import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lamro.de";
const apiUrl = (process.env.NEXT_PUBLIC_API_URL || siteUrl).replace(/\/$/, "");

type ListResponse<T> = { data: T[] };

async function safeList<T>(path: string): Promise<T[]> {
  try {
    const response = await fetch(`${apiUrl}${path}`, { next: { revalidate: 3600 } });
    if (!response.ok) return [];
    const json = (await response.json()) as ListResponse<T>;
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/store",
    "/auctions",
    "/about",
    "/services",
    "/contact",
    "/brands",
    "/categories",
    "/company-stock",
    "/legal/impressum",
    "/legal/privacy",
    "/legal/terms",
    "/legal/cookies",
    "/legal/auctions",
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const [products, brands, categories, auctions] = await Promise.all([
    safeList<{ slug: string }>("/api/v1/products?per_page=200"),
    safeList<{ slug: string }>("/api/v1/brands"),
    safeList<{ slug: string }>("/api/v1/categories"),
    safeList<{ slug: string }>("/api/v1/auctions?per_page=100"),
  ]);

  return [
    ...staticRoutes,
    ...products.map((item) => ({ url: `${siteUrl}/store/${item.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...brands.map((item) => ({ url: `${siteUrl}/brands/${item.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...categories.map((item) => ({ url: `${siteUrl}/categories/${item.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...auctions.map((item) => ({ url: `${siteUrl}/auctions/${item.slug}`, changeFrequency: "hourly" as const, priority: 0.8 })),
  ];
}
