import { api } from "@/lib/api";

export type CompanyStockListing = {
  id: number;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  city?: string | null;
  country?: string | null;
  inventory_type?: string | null;
  description: string;
  photos: string[];
  status: "new" | "contacted" | "closed" | string;
  admin_note?: string | null;
  created_at?: string | null;
  handled_at?: string | null;
};

type Envelope<T> = { data: T };
type ListEnvelope<T> = {
  data: T[];
  meta?: { current_page: number; last_page: number; per_page: number; total: number };
};

export async function submitCompanyStockListing(form: FormData) {
  return api<Envelope<CompanyStockListing>>("/api/v1/company-stock-listings", {
    method: "POST",
    body: form,
    formData: true,
    auth: false,
  });
}

export async function fetchAdminCompanyStockListings() {
  return api<ListEnvelope<CompanyStockListing>>("/api/v1/admin/company-stock-listings?per_page=100");
}

export async function updateCompanyStockListing(
  id: number,
  payload: Partial<{ status: string; admin_note: string }>,
) {
  return api<Envelope<CompanyStockListing>>(`/api/v1/admin/company-stock-listings/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteCompanyStockListing(id: number) {
  return api<Envelope<{ ok: boolean }>>(`/api/v1/admin/company-stock-listings/${id}`, {
    method: "DELETE",
  });
}

export async function bulkDeleteCompanyStockListings(ids: number[]) {
  return api<Envelope<{ ok: boolean; count: number }>>("/api/v1/admin/company-stock-listings/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}
