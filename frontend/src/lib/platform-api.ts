import { api } from "@/lib/api";

type Envelope<T> = { data: T };
type ListEnvelope<T> = { data: T[]; meta?: Record<string, number> };

export async function fetchFeatures() {
  return api<Envelope<Record<string, boolean>>>("/api/v1/features", { auth: false });
}

export async function fetchShippingMethods() {
  return api<Envelope<Array<{ id: number; code: string; name: { de: string; en: string }; price: number }>>>("/api/v1/shipping-methods", { auth: false });
}

export async function fetchCmsPage(slug: string) {
  return api<Envelope<{ slug: string; title: { de: string; en: string }; body: { de: string; en: string } }>>(`/api/v1/cms/pages/${slug}`, { auth: false });
}

export async function sendContact(payload: { name: string; email: string; subject?: string; message: string }) {
  return api<Envelope<{ id: number }>>("/api/v1/contact", { method: "POST", body: JSON.stringify(payload), auth: false });
}

export async function applyCoupon(code: string | null) {
  return api("/api/v1/cart/coupon", { method: "POST", body: JSON.stringify({ code }) });
}

export async function cancelOrder(orderId: number) {
  return api(`/api/v1/orders/${orderId}/cancel`, { method: "POST" });
}

export async function requestReturn(orderId: number, reason: string, message?: string) {
  return api(`/api/v1/orders/${orderId}/returns`, { method: "POST", body: JSON.stringify({ reason, message }) });
}

export async function forgotPassword(email: string) {
  return api("/api/v1/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }), auth: false });
}

export async function resetPassword(payload: { email: string; token: string; password: string }) {
  return api("/api/v1/auth/reset-password", { method: "POST", body: JSON.stringify(payload), auth: false });
}

export async function changePassword(current_password: string, password: string) {
  return api("/api/v1/auth/change-password", { method: "POST", body: JSON.stringify({ current_password, password }) });
}

export async function fetchAddresses() {
  return api<ListEnvelope<Record<string, unknown>>>("/api/v1/addresses");
}

export async function saveAddress(payload: Record<string, unknown>, id?: number) {
  if (id) return api(`/api/v1/addresses/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  return api("/api/v1/addresses", { method: "POST", body: JSON.stringify(payload) });
}

export async function deleteAddress(id: number) {
  return api(`/api/v1/addresses/${id}`, { method: "DELETE" });
}

export async function adminGet<T>(path: string) {
  return api<Envelope<T> | ListEnvelope<T>>(path);
}

export async function adminPut(path: string, body: unknown) {
  return api(path, { method: "PUT", body: JSON.stringify(body) });
}

export async function adminPost(path: string, body: unknown = {}) {
  return api(path, { method: "POST", body: JSON.stringify(body) });
}
