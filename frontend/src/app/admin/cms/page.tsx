"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { fieldClass } from "@/components/ui";
import { adminGet, adminPut } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

type Page = { id: number; slug: string; title: { de: string; en: string }; body: { de: string; en: string }; status: string };

export default function AdminCmsPage() {
  const { t, can } = useStore();
  const [items, setItems] = useState<Page[]>([]);
  const [selected, setSelected] = useState<Page | null>(null);

  async function load() {
    const response = await adminGet<Page[]>("/api/v1/admin/cms/pages");
    setItems((response as { data: Page[] }).data);
  }

  useEffect(() => {
    if (can("admin.cms")) void load().catch(() => undefined);
  }, [can]);

  if (!can("admin.cms")) return <AdminShell><p className="text-sm text-muted">No access</p></AdminShell>;

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">CMS</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <ul className="rounded-3xl border border-line bg-white p-3 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className="w-full rounded-lg px-3 py-2 text-left hover:bg-paper" onClick={() => setSelected(item)}>
                {item.slug}
              </button>
            </li>
          ))}
        </ul>
        {selected ? (
          <form
            className="space-y-3 rounded-3xl border border-line bg-white p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void adminPut(`/api/v1/admin/cms/pages/${selected.id}`, selected).then(load);
            }}
          >
            <p className="font-mono text-xs text-muted">{selected.slug}</p>
            <input className={fieldClass} value={selected.title.en} onChange={(e) => setSelected({ ...selected, title: { ...selected.title, en: e.target.value } })} placeholder="Title EN" />
            <input className={fieldClass} value={selected.title.de} onChange={(e) => setSelected({ ...selected, title: { ...selected.title, de: e.target.value } })} placeholder="Title DE" />
            <textarea className={fieldClass} rows={6} value={selected.body.en} onChange={(e) => setSelected({ ...selected, body: { ...selected.body, en: e.target.value } })} />
            <textarea className={fieldClass} rows={6} value={selected.body.de} onChange={(e) => setSelected({ ...selected, body: { ...selected.body, de: e.target.value } })} />
            <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper">{t({ de: "Speichern", en: "Save" })}</button>
          </form>
        ) : null}
      </div>
    </AdminShell>
  );
}
