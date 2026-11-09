import { api } from "@/lib/api";
import type { Copy } from "@/lib/catalog";

export type ApiAuctionProduct = {
  id: number;
  slug: string;
  name: Copy;
  summary?: Copy;
  notes?: Copy;
  part_number: string | null;
  model: string | null;
  sku: string | null;
  condition: string | null;
  testing: string | null;
  manufacturer?: string | null;
  category_slug?: string | null;
};

export type ApiBid = {
  id: number;
  auction_id?: number;
  amount: number;
  amount_cents: number;
  is_proxy: boolean;
  bidder_label: string;
  created_at: string | null;
  auction?: { id: number; slug: string; status: string; product_name?: Copy } | null;
};

export type ApiApplication = {
  id: number;
  auction_id: number;
  user_id: number;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  reviewed_at: string | null;
  created_at?: string | null;
  user?: { id: number; name: string; email: string; account_type?: string | null; company_name?: string | null };
  auction?: { id: number; slug: string; status: string; product_name?: Copy };
};

export type ApiAuction = {
  id: number;
  slug: string;
  type: "live" | "scheduled" | "timed";
  status: "draft" | "scheduled" | "live" | "ended" | "cancelled";
  starts_at: string | null;
  ends_at: string | null;
  ends_in_seconds: number | null;
  starting_price: number;
  current_price: number;
  increment: number;
  buy_now: number | null;
  has_reserve: boolean;
  anti_snipe_window_sec: number;
  anti_snipe_extend_sec: number;
  quantity: number;
  version: number;
  seller: string;
  seller_name: string;
  ended_reason: string | null;
  winner_user_id: number | null;
  winner_order_id?: number | null;
  product?: ApiAuctionProduct | null;
  bids?: ApiBid[];
  my_application?: { id: number; status: string; note: string | null; reviewed_at: string | null } | null;
  applications_count?: number;
  bids_count?: number;
};

type Envelope<T> = { data: T };
type ListEnvelope<T> = { data: T[]; meta?: { current_page: number; last_page: number; per_page: number; total: number } };

function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const raw = search.toString();
  return raw ? `?${raw}` : "";
}

export async function fetchAuctions(filters: { status?: string; type?: string; q?: string; per_page?: number } = {}) {
  return api<ListEnvelope<ApiAuction>>(`/api/v1/auctions${qs(filters)}`, { auth: false });
}

export async function fetchAuction(slug: string) {
  return api<Envelope<ApiAuction>>(`/api/v1/auctions/${encodeURIComponent(slug)}`);
}

export async function applyToAuction(auctionId: number, note?: string) {
  return api<Envelope<ApiApplication>>(`/api/v1/auctions/${auctionId}/apply`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function placeBidRequest(auctionId: number, amount: number) {
  return api<Envelope<{ bid: ApiBid; auction: ApiAuction }>>(`/api/v1/auctions/${auctionId}/bids`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

export async function setProxyRequest(auctionId: number, max_amount: number) {
  return api<Envelope<{ max_amount: number; is_active: boolean; auction: ApiAuction }>>(`/api/v1/auctions/${auctionId}/proxy`, {
    method: "PUT",
    body: JSON.stringify({ max_amount }),
  });
}

export async function cancelProxyRequest(auctionId: number) {
  return api<Envelope<{ ok: boolean }>>(`/api/v1/auctions/${auctionId}/proxy`, { method: "DELETE" });
}

export async function buyNowRequest(auctionId: number) {
  return api<Envelope<{ bid: ApiBid; auction: ApiAuction }>>(`/api/v1/auctions/${auctionId}/buy-now`, {
    method: "POST",
  });
}

export async function fetchMyApplications() {
  return api<Envelope<ApiApplication[]>>("/api/v1/me/auction-applications");
}

export async function fetchMyBids() {
  return api<Envelope<ApiBid[]>>("/api/v1/me/bids");
}

export async function fetchAdminAuctions() {
  return api<ListEnvelope<ApiAuction>>("/api/v1/admin/auctions?per_page=100");
}

export async function fetchAdminApplications(status?: string) {
  return api<Envelope<ApiApplication[]>>(`/api/v1/admin/auction-applications${qs({ status })}`);
}

export async function approveApplicationRequest(id: number) {
  return api<Envelope<ApiApplication>>(`/api/v1/admin/auction-applications/${id}/approve`, { method: "POST" });
}

export async function rejectApplicationRequest(id: number, note?: string) {
  return api<Envelope<ApiApplication>>(`/api/v1/admin/auction-applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function createAuctionRequest(payload: Record<string, unknown>) {
  return api<Envelope<ApiAuction>>("/api/v1/admin/auctions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAuctionRequest(id: number, payload: Record<string, unknown>) {
  return api<Envelope<ApiAuction>>(`/api/v1/admin/auctions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function goLiveAuctionRequest(id: number) {
  return api<Envelope<ApiAuction>>(`/api/v1/admin/auctions/${id}/live`, { method: "POST" });
}

export async function endAuctionRequest(id: number) {
  return api<Envelope<ApiAuction>>(`/api/v1/admin/auctions/${id}/end`, { method: "POST" });
}

export async function cancelAuctionRequest(id: number) {
  return api<Envelope<ApiAuction>>(`/api/v1/admin/auctions/${id}/cancel`, { method: "POST" });
}

export function formatEndsIn(seconds: number | null | undefined, locale: "de" | "en") {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return locale === "de" ? `${h} Std. ${m % 60} Min.` : `${h}h ${m % 60}m`;
  return locale === "de" ? `${m} Min.` : `${m} min`;
}
