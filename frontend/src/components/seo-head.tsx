"use client";

import { useEffect } from "react";

type SeoHeadProps = {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  path?: string;
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  if (!content) return;
  let node = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attr, key);
    document.head.appendChild(node);
  }
  node.content = content;
}

export function SeoHead({ title, description, keywords, image, path }: SeoHeadProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} · Jala` : "Jala";
    document.title = fullTitle;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = path ? `${origin}${path}` : window.location.href;
    const ogImage = image?.startsWith("http") ? image : image ? `${origin}${image}` : `${origin}/hero-auction.jpg`;

    upsertMeta("name", "description", description ?? "");
    upsertMeta("name", "keywords", keywords ?? "");
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description ?? "");
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description ?? "");
    upsertMeta("name", "twitter:image", ogImage);
  }, [title, description, keywords, image, path]);

  return null;
}
