import { api, setToken } from "@/lib/api";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  is_active: boolean;
  account_type?: string | null;
  company_name?: string | null;
  vat_id?: string | null;
  country?: string | null;
  roles: string[];
  permissions: string[];
};

type Envelope<T> = { data: T };

export async function registerRequest(payload: {
  name: string;
  email: string;
  password: string;
  account_type: "private" | "business";
  phone?: string;
  company_name?: string;
  vat_id?: string;
  country?: string;
}) {
  const response = await api<Envelope<{ token: string; token_type: string; user: AuthUser }>>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false,
  });
  setToken(response.data.token);
  return response.data;
}

export async function loginRequest(email: string, password: string) {
  const response = await api<Envelope<{ token: string; token_type: string; user: AuthUser }>>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  });
  setToken(response.data.token);
  return response.data;
}

export async function meRequest() {
  return api<Envelope<AuthUser>>("/api/v1/auth/me");
}

export async function logoutRequest() {
  try {
    await api<Envelope<{ ok: boolean }>>("/api/v1/auth/logout", { method: "POST" });
  } finally {
    setToken(null);
  }
}

export async function updateProfileRequest(payload: { name: string; email: string; phone?: string }) {
  return api<Envelope<AuthUser>>("/api/v1/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function uploadAvatarRequest(file: File) {
  const body = new FormData();
  body.append("avatar", file);
  return api<Envelope<AuthUser>>("/api/v1/profile/avatar", {
    method: "POST",
    body,
    formData: true,
  });
}

export async function removeAvatarRequest() {
  return api<Envelope<AuthUser>>("/api/v1/profile/avatar", { method: "DELETE" });
}

export async function fetchStaff() {
  return api<Envelope<AuthUser[]>>("/api/v1/admin/staff");
}

export async function createStaffRequest(payload: {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
}) {
  return api<Envelope<AuthUser>>("/api/v1/admin/staff", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStaffRequest(
  id: number,
  payload: Partial<{ name: string; email: string; phone: string; role: string; is_active: boolean; password: string }>,
) {
  return api<Envelope<AuthUser>>(`/api/v1/admin/staff/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function fetchRoles() {
  return api<Envelope<{ roles: { id: string; name: string; permissions: string[] }[]; permissions: string[] }>>("/api/v1/admin/roles");
}

export async function updateRolePermissionsRequest(role: string, permissions: string[]) {
  return api<Envelope<{ id: string; name: string; permissions: string[] }>>(`/api/v1/admin/roles/${role}`, {
    method: "PUT",
    body: JSON.stringify({ permissions }),
  });
}

export function isAdminUser(user: AuthUser | null | undefined) {
  if (!user) return false;
  return user.roles.some((role) => ["super_admin", "ops", "catalog", "support"].includes(role));
}

export function isCustomerUser(user: AuthUser | null | undefined) {
  return Boolean(user?.roles.includes("customer"));
}

export function roleFromUser(user: AuthUser): "admin" | "customer" | "seller" | null {
  if (isAdminUser(user)) return "admin";
  if (isCustomerUser(user)) return "customer";
  return null;
}

export function can(user: AuthUser | null | undefined, permission: string) {
  return Boolean(user?.permissions.includes(permission));
}
