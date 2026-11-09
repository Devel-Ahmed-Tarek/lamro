"use client";

import { AdminGate } from "@/components/admin-gate";
import { AdminProductForm } from "@/components/admin-product-form";
import { AdminShell } from "@/components/admin-shell";

export default function AdminProductNewPage() {
  return (
    <AdminShell>
      <AdminGate permission="admin.products">
        <AdminProductForm />
      </AdminGate>
    </AdminShell>
  );
}
