import { api, apiUrl, getToken } from "@/lib/api";
import type { Copy } from "@/lib/catalog";

export type ApiCartItem = {
  id: number;
  product_id: number;
  quantity: number;
  slug: string;
  name: Copy;
  part_number: string | null;
  sku: string | null;
  price: number;
  price_cents: number;
  available_stock: number;
  line_total: number;
  brand?: string | null;
};

export type ApiCart = {
  id: number;
  items: ApiCartItem[];
  subtotal: number;
  item_count: number;
  coupon_code?: string | null;
};

export type ApiOrderItem = {
  id: number;
  product_id: number | null;
  sku: string | null;
  part_number: string | null;
  name: Copy;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type ApiPayment = {
  id: number;
  order_id: number;
  method: string;
  status: string;
  amount: number;
  amount_cents?: number;
  refunded?: number;
  refunded_cents?: number;
  currency: string;
  reference: string | null;
  refund_provider_id?: string | null;
  refunded_at?: string | null;
  note?: string | null;
  created_at?: string | null;
  order?: ApiOrder;
};

export type ApiOrderReturn = {
  id: number;
  order_id: number;
  user_id: number;
  status: string;
  reason: string;
  message?: string | null;
  admin_note?: string | null;
  handled_at?: string | null;
  created_at?: string | null;
  order?: ApiOrder | null;
  user?: { id: number; name: string; email: string } | null;
};

export type ApiInvoice = {
  id: number;
  order_id: number;
  number: string;
  subtotal: number;
  tax: number;
  total: number;
  tax_rate_bps: number;
  snapshot?: Record<string, unknown>;
  issued_at: string | null;
  order?: ApiOrder;
};

export type ApiOrder = {
  id: number;
  number: string;
  source: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  shipping_name?: string | null;
  shipping_line1?: string | null;
  shipping_city?: string | null;
  shipping_postcode?: string | null;
  shipping_country?: string | null;
  notes?: string | null;
  auction_id?: number | null;
  tracking_number?: string | null;
  discount?: number;
  shipping?: number;
  coupon_code?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  items?: ApiOrderItem[];
  payment?: ApiPayment | null;
  invoice?: ApiInvoice | null;
  user?: { id: number; name: string; email: string; company_name?: string | null };
};

export type ApiInquiry = {
  id: number;
  type: string;
  status: string;
  guest_name?: string | null;
  guest_email?: string | null;
  offer_amount?: number | null;
  quantity?: number | null;
  message: string;
  admin_reply?: string | null;
  handled_at?: string | null;
  created_at?: string | null;
  product?: { id: number; slug: string; name: Copy; part_number?: string | null; sku?: string | null } | null;
  user?: { id: number; name: string; email: string } | null;
};

export type ApiWonAuction = {
  id: number;
  slug: string;
  status: string;
  ended_reason: string | null;
  current_price: number;
  quantity: number;
  winner_order_id: number | null;
  payment_pending: boolean;
  ends_at: string | null;
  product?: { id: number; slug: string; name: Copy; part_number?: string | null } | null;
};

export type ShippingPayload = {
  shipping_name?: string;
  shipping_line1?: string;
  shipping_city?: string;
  shipping_postcode?: string;
  shipping_country?: string;
  shipping_method_id?: number;
  payment_method?: "bank_transfer" | "stripe";
  notes?: string;
};

type Envelope<T> = { data: T };
type ListEnvelope<T> = { data: T[]; meta?: { current_page: number; last_page: number; per_page: number; total: number } };

export async function fetchCart() {
  return api<Envelope<ApiCart>>("/api/v1/cart");
}

export async function upsertCartItem(payload: { slug?: string; product_id?: number; quantity: number }) {
  return api<Envelope<ApiCart>>("/api/v1/cart/items", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function syncCart(items: { slug: string; quantity: number }[]) {
  return api<Envelope<ApiCart>>("/api/v1/cart/sync", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function clearCartRequest() {
  return api<Envelope<ApiCart>>("/api/v1/cart", { method: "DELETE" });
}

export type CheckoutResponse = Envelope<ApiOrder> & { checkout_url?: string | null };

export async function checkoutCart(shipping: ShippingPayload) {
  return api<CheckoutResponse>("/api/v1/checkout", {
    method: "POST",
    body: JSON.stringify(shipping),
  });
}

export async function checkoutAuctionWin(auctionId: number, shipping: ShippingPayload = {}) {
  return api<CheckoutResponse>(`/api/v1/auctions/${auctionId}/checkout`, {
    method: "POST",
    body: JSON.stringify(shipping),
  });
}

export async function fetchStripeConfig() {
  return api<Envelope<{ enabled: boolean; demo: boolean; publishable_key: string | null }>>("/api/v1/payments/stripe/config", {
    auth: false,
  });
}

export async function startStripeCheckout(orderId: number) {
  return api<Envelope<{ checkout_url: string; demo: boolean; payment: ApiPayment; order: ApiOrder }>>(
    `/api/v1/orders/${orderId}/stripe/checkout`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function completeStripeDemo(paymentId: number, token: string) {
  return api<Envelope<ApiOrder>>(`/api/v1/payments/${paymentId}/stripe/demo-complete`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function syncStripeSession(sessionId: string) {
  return api<Envelope<ApiOrder>>("/api/v1/payments/stripe/sync", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function fetchMyOrders() {
  return api<ListEnvelope<ApiOrder>>("/api/v1/orders");
}

export async function fetchMyInvoices() {
  return api<ListEnvelope<ApiInvoice>>("/api/v1/invoices");
}

export async function fetchMyInquiries() {
  return api<Envelope<ApiInquiry[]>>("/api/v1/me/inquiries");
}

export async function fetchWonAuctions() {
  return api<Envelope<ApiWonAuction[]>>("/api/v1/me/won-auctions");
}

export async function createInquiry(payload: {
  type: "inquiry" | "offer" | "quote" | "contact";
  slug?: string;
  product_id?: number;
  guest_name?: string;
  guest_email?: string;
  offer_amount?: number;
  quantity?: number;
  message: string;
}) {
  return api<Envelope<ApiInquiry>>("/api/v1/inquiries", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: Boolean(getToken()),
  });
}

export function invoiceDownloadUrl(invoiceId: number) {
  return `${apiUrl()}/api/v1/invoices/${invoiceId}/download`;
}

export async function downloadInvoice(invoiceId: number) {
  const token = getToken();
  const response = await fetch(invoiceDownloadUrl(invoiceId), {
    headers: {
      Accept: "text/plain",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error("Download failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${invoiceId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function adminFetchOrders(params: { status?: string } = {}) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  const qs = search.toString();
  return api<ListEnvelope<ApiOrder>>(`/api/v1/admin/orders${qs ? `?${qs}` : ""}`);
}

export async function adminUpdateOrderStatus(orderId: number, status: string) {
  return api<Envelope<ApiOrder>>(`/api/v1/admin/orders/${orderId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function adminFetchPayments(params: { status?: string } = {}) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  const qs = search.toString();
  return api<ListEnvelope<ApiPayment>>(`/api/v1/admin/payments${qs ? `?${qs}` : ""}`);
}

export async function adminMarkPaymentReceived(paymentId: number, note?: string) {
  return api<Envelope<ApiOrder>>(`/api/v1/admin/payments/${paymentId}/mark-received`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function adminMarkPaymentFailed(paymentId: number, note?: string) {
  return api<Envelope<ApiOrder>>(`/api/v1/admin/payments/${paymentId}/mark-failed`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function adminFetchInvoices() {
  return api<ListEnvelope<ApiInvoice>>("/api/v1/admin/invoices");
}

export async function adminFetchInquiries(params: { status?: string; type?: string } = {}) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.type) search.set("type", params.type);
  const qs = search.toString();
  return api<ListEnvelope<ApiInquiry>>(`/api/v1/admin/inquiries${qs ? `?${qs}` : ""}`);
}

export async function adminReplyInquiry(id: number, admin_reply: string, status?: string) {
  return api<Envelope<ApiInquiry>>(`/api/v1/admin/inquiries/${id}/reply`, {
    method: "POST",
    body: JSON.stringify({ admin_reply, status }),
  });
}

export async function adminUpdateInquiryStatus(id: number, status: string) {
  return api<Envelope<ApiInquiry>>(`/api/v1/admin/inquiries/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function adminFetchInventory(q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return api<ListEnvelope<{
    id: number;
    slug: string;
    name: Copy;
    total_stock: number;
    reserved_auction: number;
    reserved_order: number;
    available_stock: number;
    sold_quantity: number;
    part_number?: string | null;
    sku?: string | null;
  }>>(`/api/v1/admin/inventory${qs}`);
}

export async function adminAdjustStock(productId: number, total_stock: number) {
  return api<Envelope<{ id: number; total_stock: number; available_stock: number }>>(`/api/v1/admin/inventory/${productId}`, {
    method: "PUT",
    body: JSON.stringify({ total_stock }),
  });
}

export async function fetchMyReturns() {
  return api<Envelope<ApiOrderReturn[]>>("/api/v1/me/returns");
}

export async function adminFetchReturns() {
  return api<Envelope<ApiOrderReturn[]>>("/api/v1/admin/returns");
}

export async function adminUpdateReturnStatus(
  returnId: number,
  status: string,
  admin_note?: string,
  auto_refund?: boolean,
) {
  return api<Envelope<ApiOrderReturn>>(`/api/v1/admin/returns/${returnId}/status`, {
    method: "POST",
    body: JSON.stringify({ status, admin_note, auto_refund }),
  });
}

export async function adminRefundOrder(
  orderId: number,
  payload: { amount?: number; reason?: string; restock?: boolean } = {},
) {
  return api<Envelope<{ order: ApiOrder; credit_note: { id: number; number: string; amount_cents: number }; payment: ApiPayment }>>(
    `/api/v1/admin/orders/${orderId}/refund`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}
