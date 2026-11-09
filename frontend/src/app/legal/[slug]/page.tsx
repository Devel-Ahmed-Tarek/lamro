"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Frame } from "@/components/shell";
import { Notice, PageIntro } from "@/components/ui";
import { fetchCmsPage } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

const alias: Record<string, string> = {
  auctions: "auction-terms",
};

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, locale } = useStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const key = alias[slug] ?? slug;
    fetchCmsPage(key)
      .then((response) => {
        setTitle(response.data.title[locale] || response.data.title.en);
        setBody(response.data.body[locale] || response.data.body.en);
      })
      .catch(() => setError(t({ de: "Seite nicht gefunden.", en: "Page not found." })));
  }, [slug, locale, t]);

  return (
    <Frame>
      <PageIntro kicker={t({ de: "Rechtliches", en: "Legal" })} title={title || t({ de: "Hinweis", en: "Notice" })} />
      {error ? <div className="mt-8"><Notice>{error}</Notice></div> : (
        <p className="mt-8 max-w-2xl whitespace-pre-wrap leading-7 text-muted">{body}</p>
      )}
    </Frame>
  );
}
