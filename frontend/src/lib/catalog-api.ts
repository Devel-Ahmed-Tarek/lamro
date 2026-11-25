import { api } from "@/lib/api";
import type { Condition, Copy, Locale, Product, Testing } from "@/lib/catalog";
import { emptyCopy } from "@/lib/catalog";

export type ApiCategory = {
  id: number;
  slug: string;
  name: Copy;
  is_active: boolean;
  sort: number;
  count?: number;
  created_at?: string | null;
};

export type ApiBrand = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  count?: number;
  created_at?: string | null;
};

export type ApiSpec = {
  id?: number;
  label: Copy;
  value: string;
  sort?: number;
};

export type ApiMedia = {
  id: number;
  type: "image" | "video" | "document";
  path: string;
  url: string;
  original_name: string | null;
  sort: number;
};

export type ApiProduct = {
  id: number;
  slug: string;
  name: Copy;
  summary: Copy;
  notes: Copy;
  part_number: string | null;
  model: string | null;
  sku: string | null;
  serial: string | null;
  condition: Condition | null;
  testing: Testing | null;
  price: number;
  price_cents: number;
  total_stock: number;
  reserved_auction: number;
  reserved_order: number;
  available_stock: number;
  weight: string | null;
  dimensions: string | null;
  status: "draft" | "published" | "archived";
  allow_cart: boolean;
  allow_buy_now: boolean;
  allow_offer: boolean;
  allow_quote: boolean;
  allow_inquiry: boolean;
  category_id: number | null;
  brand_id: number | null;
  manufacturer?: string | null;
  category_slug?: string | null;
  category?: ApiCategory | null;
  brand?: ApiBrand | null;
  specs?: ApiSpec[];
  media?: ApiMedia[];
  created_at?: string | null;
};

type Envelope<T> = { data: T };
type ListEnvelope<T> = { data: T[]; meta?: { current_page: number; last_page: number; per_page: number; total: number } };

export type ProductFilters = {
  q?: string;
  category?: string;
  brand?: string;
  condition?: string;
  sort?: string;
  status?: string;
  per_page?: number;
};

function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const raw = search.toString();
  return raw ? `?${raw}` : "";
}

export function toCatalogProduct(product: ApiProduct): Product {
  return {
    slug: product.slug,
    name: product.name,
    summary: product.summary ?? { de: "", en: "" },
    manufacturer: product.manufacturer ?? product.brand?.name ?? "",
    partNumber: product.part_number ?? "",
    model: product.model ?? "",
    sku: product.sku ?? "",
    serial: product.serial ?? "",
    condition: (product.condition ?? "used") as Condition,
    testing: (product.testing ?? "unknown") as Testing,
    price: product.price,
    stock: product.available_stock,
    category: product.category_slug ?? product.category?.slug ?? "",
    weight: product.weight ?? "",
    dimensions: product.dimensions ?? "",
    notes: product.notes ?? emptyCopy(),
    specs: (product.specs ?? []).map((spec) => ({
      label: spec.label ?? emptyCopy(),
      value: spec.value,
    })),
  };
}

export async function fetchCategories() {
  return api<Envelope<ApiCategory[]>>("/api/v1/categories", { auth: false });
}

export async function fetchBrands() {
  return api<Envelope<ApiBrand[]>>("/api/v1/brands", { auth: false });
}

export async function fetchProducts(filters: ProductFilters = {}) {
  return api<ListEnvelope<ApiProduct>>(`/api/v1/products${qs(filters)}`, { auth: false });
}

export async function fetchProduct(slug: string) {
  return api<Envelope<ApiProduct>>(`/api/v1/products/${encodeURIComponent(slug)}`, { auth: false });
}

export async function fetchAdminCategories() {
  return api<Envelope<ApiCategory[]>>("/api/v1/admin/categories");
}

export async function createCategoryRequest(payload: { name: Copy; slug?: string; is_active?: boolean; sort?: number }) {
  return api<Envelope<ApiCategory>>("/api/v1/admin/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCategoryRequest(id: number, payload: Partial<{ name: Copy; slug: string; is_active: boolean; sort: number }>) {
  return api<Envelope<ApiCategory>>(`/api/v1/admin/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function hideCategoryRequest(id: number) {
  return api<Envelope<ApiCategory>>(`/api/v1/admin/categories/${id}`, { method: "DELETE" });
}

export async function bulkDeleteCategoriesRequest(ids: number[]) {
  return api<Envelope<{ ok: boolean; count: number }>>("/api/v1/admin/categories/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function fetchAdminBrands() {
  return api<Envelope<ApiBrand[]>>("/api/v1/admin/brands");
}

export async function createBrandRequest(payload: { name: string; slug?: string; is_active?: boolean }) {
  return api<Envelope<ApiBrand>>("/api/v1/admin/brands", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBrandRequest(id: number, payload: Partial<{ name: string; slug: string; is_active: boolean }>) {
  return api<Envelope<ApiBrand>>(`/api/v1/admin/brands/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function hideBrandRequest(id: number) {
  return api<Envelope<ApiBrand>>(`/api/v1/admin/brands/${id}`, { method: "DELETE" });
}

export async function bulkDeleteBrandsRequest(ids: number[]) {
  return api<Envelope<{ ok: boolean; count: number }>>("/api/v1/admin/brands/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function fetchAdminProducts(filters: ProductFilters = {}) {
  return api<ListEnvelope<ApiProduct>>(`/api/v1/admin/products${qs(filters)}`);
}

export async function fetchAdminProduct(id: number) {
  return api<Envelope<ApiProduct>>(`/api/v1/admin/products/${id}`);
}

export type ProductPayload = {
  category_id?: number | null;
  brand_id?: number | null;
  slug?: string;
  name?: Copy;
  summary?: Copy;
  notes?: Copy;
  part_number?: string | null;
  model?: string | null;
  sku?: string | null;
  serial?: string | null;
  condition?: string | null;
  testing?: string | null;
  price?: number | null;
  total_stock?: number;
  reserved_auction?: number;
  reserved_order?: number;
  weight?: string | null;
  dimensions?: string | null;
  status?: "draft" | "published" | "archived";
  allow_cart?: boolean;
  allow_buy_now?: boolean;
  allow_offer?: boolean;
  allow_quote?: boolean;
  allow_inquiry?: boolean;
  specs?: { label: Copy; value: string }[];
  auto_translate?: boolean;
  source_locale?: Locale;
};

export type AiProductDraft = {
  source_locale: Locale;
  name: Copy;
  summary: Copy;
  notes: Copy;
  part_number?: string | null;
  model?: string | null;
  sku?: string | null;
  condition?: string;
  testing?: string;
  weight?: string | null;
  dimensions?: string | null;
  specs?: { label: Copy; value: string }[];
  provider: string;
};

export async function fetchAiProductConfig() {
  return api<Envelope<{ provider: string; demo: boolean; locales: Locale[]; labels: Record<string, string> }>>(
    "/api/v1/admin/ai/products/config",
  );
}

export async function aiProductDraftRequest(description: string, source_locale: Locale) {
  return api<Envelope<AiProductDraft>>("/api/v1/admin/ai/products/draft", {
    method: "POST",
    body: JSON.stringify({ description, source_locale }),
  });
}

export async function aiProductTranslateRequest(payload: {
  source_locale: Locale;
  name?: Copy;
  summary?: Copy;
  notes?: Copy;
  specs?: { label: Copy; value: string }[];
}) {
  return api<Envelope<{ name: Copy; summary: Copy; notes: Copy; specs: { label: Copy; value: string }[]; provider: string }>>(
    "/api/v1/admin/ai/products/translate",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function createProductRequest(payload: ProductPayload) {
  return api<Envelope<ApiProduct>>("/api/v1/admin/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProductRequest(id: number, payload: ProductPayload) {
  return api<Envelope<ApiProduct>>(`/api/v1/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function publishProductRequest(id: number) {
  return api<Envelope<ApiProduct>>(`/api/v1/admin/products/${id}/publish`, { method: "POST" });
}

export async function unpublishProductRequest(id: number) {
  return api<Envelope<ApiProduct>>(`/api/v1/admin/products/${id}/unpublish`, { method: "POST" });
}

export async function archiveProductRequest(id: number) {
  return api<Envelope<ApiProduct>>(`/api/v1/admin/products/${id}/archive`, { method: "POST" });
}

export async function deleteProductRequest(id: number) {
  return api<Envelope<ApiProduct>>(`/api/v1/admin/products/${id}`, { method: "DELETE" });
}

export async function bulkDeleteProductsRequest(ids: number[]) {
  return api<Envelope<{ ok: boolean; count: number }>>("/api/v1/admin/products/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function uploadProductMediaRequest(id: number, file: File, type?: string) {
  const body = new FormData();
  body.append("file", file);
  if (type) body.append("type", type);
  return api<Envelope<ApiMedia>>(`/api/v1/admin/products/${id}/media`, {
    method: "POST",
    body,
    formData: true,
  });
}

export async function deleteProductMediaRequest(productId: number, mediaId: number) {
  return api<Envelope<{ ok: boolean }>>(`/api/v1/admin/products/${productId}/media/${mediaId}`, {
    method: "DELETE",
  });
}
