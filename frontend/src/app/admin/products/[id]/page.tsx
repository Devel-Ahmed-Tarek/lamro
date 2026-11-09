"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { AdminProductForm } from "@/components/admin-product-form";
import { AdminShell } from "@/components/admin-shell";
import { ApiError } from "@/lib/api";
import { fetchAdminProduct, type ApiProduct } from "@/lib/catalog-api";
import { useStore } from "@/lib/store";

export default function AdminProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useStore();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const numericId = Number(id);
    if (!numericId) {
      setError(t({ de: "Ungültige ID.", en: "Invalid id." }));
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAdminProduct(numericId)
      .then((response) => setProduct(response.data))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t({ de: "Laden fehlgeschlagen.", en: "Failed to load." }));
      })
      .finally(() => setLoading(false));
  }, [id, t]);

  return (
    <AdminShell>
      <AdminGate permission="admin.products">
        {loading ? <p className="text-sm text-muted">Loading…</p> : null}
        {error ? <p className="text-sm text-copper">{error}</p> : null}
        {product ? <AdminProductForm product={product} /> : null}
      </AdminGate>
    </AdminShell>
  );
}
