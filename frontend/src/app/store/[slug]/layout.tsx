import type { Metadata } from "next";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

async function fetchProductMeta(slug: string) {
  const api = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!api) return null;
  try {
    const response = await fetch(`${api}/api/v1/products/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      data?: { name?: Record<string, string>; summary?: Record<string, string> };
    };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductMeta(slug);
  const title = product?.name?.en || product?.name?.de || slug;
  const description = product?.summary?.en || product?.summary?.de || "Jala industrial electronics";
  return {
    title,
    description,
    openGraph: {
      title: `${title} · Jala`,
      description,
    },
  };
}

export default function StoreProductLayout({ children }: Props) {
  return children;
}
