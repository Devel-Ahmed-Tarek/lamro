"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getToken, setToken } from "@/lib/api";
import {
  isAdminUser,
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
  roleFromUser,
  type AuthUser,
} from "@/lib/auth-api";
import type { Locale } from "@/lib/catalog";
import { clearCartRequest, fetchCart, syncCart, upsertCartItem } from "@/lib/commerce-api";

export type Role = "customer" | "seller" | "admin";

export type CartLine = { slug: string; qty: number };

export type UserProfile = {
  name: string;
  email: string;
  phone: string;
  avatar: string;
};

type FeatureKey =
  | "store"
  | "auctions"
  | "buyNow"
  | "makeOffer"
  | "quote"
  | "inquiry"
  | "coupons"
  | "quantityDiscounts";

type Features = Record<FeatureKey, boolean>;

const defaultFeatures: Features = {
  store: true,
  auctions: true,
  buyNow: true,
  makeOffer: true,
  quote: true,
  inquiry: true,
  coupons: true,
  quantityDiscounts: true,
};

const emptyProfile: UserProfile = { name: "", email: "", phone: "", avatar: "" };

function profileFromUser(user: AuthUser): UserProfile {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    avatar: user.avatar ?? "",
  };
}

function cartFromApi(items: { slug: string; quantity: number }[]): CartLine[] {
  return items.filter((item) => item.slug).map((item) => ({ slug: item.slug, qty: item.quantity }));
}

type StoreValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (copy: Record<Locale, string>) => string;
  role: Role | null;
  setRole: (role: Role | null) => void;
  authUser: AuthUser | null;
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  loginAdmin: (email: string, password: string) => Promise<AuthUser>;
  loginAuth: (email: string, password: string) => Promise<AuthUser>;
  registerAuth: (payload: {
    name: string;
    email: string;
    password: string;
    account_type: "private" | "business";
    phone?: string;
    company_name?: string;
    vat_id?: string;
    country?: string;
  }) => Promise<AuthUser>;
  logoutAuth: () => Promise<void>;
  refreshMe: () => Promise<AuthUser | null>;
  can: (permission: string) => boolean;
  cart: CartLine[];
  addToCart: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
  watch: string[];
  toggleWatch: (slug: string) => void;
  features: Features;
  toggleFeature: (key: FeatureKey) => void;
  ready: boolean;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("de");
  const [role, setRoleState] = useState<Role | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfileState] = useState<UserProfile>(emptyProfile);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [watch, setWatch] = useState<string[]>([]);
  const [features, setFeatures] = useState<Features>(defaultFeatures);
  const [ready, setReady] = useState(false);
  const cartRef = useRef<CartLine[]>([]);
  cartRef.current = cart;

  const pullServerCart = useCallback(async () => {
    if (!getToken()) return;
    const response = await fetchCart();
    setCart(cartFromApi(response.data.items));
  }, []);

  const pushLocalThenPull = useCallback(async (local: CartLine[]) => {
    if (!getToken()) return;
    if (local.length > 0) {
      await syncCart(local.map((line) => ({ slug: line.slug, quantity: line.qty })));
    }
    await pullServerCart();
  }, [pullServerCart]);

  useEffect(() => {
    const saved = localStorage.getItem("jala-ui");
    let localCart: CartLine[] = [];
    if (saved) {
      const parsed = JSON.parse(saved) as {
        locale?: Locale;
        role?: Role | null;
        profile?: UserProfile;
        cart?: CartLine[];
        watch?: string[];
        features?: Features;
      };
      if (parsed.locale) setLocaleState(parsed.locale);
      if (parsed.role !== undefined) setRoleState(parsed.role);
      if (parsed.profile) setProfileState({ ...emptyProfile, ...parsed.profile });
      if (parsed.cart) {
        localCart = parsed.cart;
        setCart(parsed.cart);
      }
      if (parsed.watch) setWatch(parsed.watch);
      if (parsed.features) setFeatures({ ...defaultFeatures, ...parsed.features });
    }

    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }

    meRequest()
      .then(async (response) => {
        const user = response.data;
        setAuthUser(user);
        setProfileState(profileFromUser(user));
        const mapped = roleFromUser(user);
        if (mapped) setRoleState(mapped);
        if (!isAdminUser(user)) {
          try {
            await pushLocalThenPull(localCart);
          } catch {
            /* keep local cart */
          }
        }
      })
      .catch(() => {
        setToken(null);
        setAuthUser(null);
      })
      .finally(() => setReady(true));
  }, [pushLocalThenPull]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("jala-ui", JSON.stringify({ locale, role, profile, cart, watch, features }));
  }, [ready, locale, role, profile, cart, watch, features]);

  const applyAuthUser = useCallback(async (user: AuthUser) => {
    setAuthUser(user);
    setProfileState(profileFromUser(user));
    const mapped = roleFromUser(user);
    if (mapped) setRoleState(mapped);
    if (!isAdminUser(user)) {
      try {
        await pushLocalThenPull(cartRef.current);
      } catch {
        /* ignore */
      }
    }
    return user;
  }, [pushLocalThenPull]);

  const loginAdmin = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password);
    if (!isAdminUser(data.user)) {
      setToken(null);
      throw new Error("Not an admin account");
    }
    return applyAuthUser(data.user);
  }, [applyAuthUser]);

  const loginAuth = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password);
    return applyAuthUser(data.user);
  }, [applyAuthUser]);

  const registerAuth = useCallback(async (payload: {
    name: string;
    email: string;
    password: string;
    account_type: "private" | "business";
    phone?: string;
    company_name?: string;
    vat_id?: string;
    country?: string;
  }) => {
    const data = await registerRequest(payload);
    return applyAuthUser(data.user);
  }, [applyAuthUser]);

  const logoutAuth = useCallback(async () => {
    await logoutRequest();
    setAuthUser(null);
    setRoleState(null);
    setProfileState(emptyProfile);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!getToken()) return null;
    const response = await meRequest();
    return applyAuthUser(response.data);
  }, [applyAuthUser]);

  const addToCart = useCallback((slug: string, qty = 1) => {
    setCart((current) => {
      const line = current.find((item) => item.slug === slug);
      const nextQty = (line?.qty ?? 0) + qty;
      const next = line
        ? current.map((item) => (item.slug === slug ? { ...item, qty: nextQty } : item))
        : [...current, { slug, qty }];
      if (getToken() && authUser && !isAdminUser(authUser)) {
        void upsertCartItem({ slug, quantity: nextQty }).catch(() => undefined);
      }
      return next;
    });
  }, [authUser]);

  const setQty = useCallback((slug: string, qty: number) => {
    setCart((current) => {
      const next = qty <= 0
        ? current.filter((item) => item.slug !== slug)
        : current.map((item) => (item.slug === slug ? { ...item, qty } : item));
      if (getToken() && authUser && !isAdminUser(authUser)) {
        void upsertCartItem({ slug, quantity: Math.max(0, qty) }).catch(() => undefined);
      }
      return next;
    });
  }, [authUser]);

  const clearCart = useCallback(() => {
    setCart([]);
    if (getToken() && authUser && !isAdminUser(authUser)) {
      void clearCartRequest().catch(() => undefined);
    }
  }, [authUser]);

  const value = useMemo<StoreValue>(() => ({
    locale,
    setLocale: setLocaleState,
    t: (copy) => copy[locale],
    role,
    setRole: setRoleState,
    authUser,
    profile,
    setProfile: setProfileState,
    updateProfile: (patch) => setProfileState((current) => ({ ...current, ...patch })),
    loginAdmin,
    loginAuth,
    registerAuth,
    logoutAuth,
    refreshMe,
    can: (permission) => Boolean(authUser?.permissions.includes(permission)),
    cart,
    addToCart,
    setQty,
    clearCart,
    refreshCart: pullServerCart,
    watch,
    toggleWatch: (slug) => {
      setWatch((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]));
    },
    features,
    toggleFeature: (key) => setFeatures((current) => ({ ...current, [key]: !current[key] })),
    ready,
  }), [locale, role, authUser, profile, loginAdmin, loginAuth, registerAuth, logoutAuth, refreshMe, cart, addToCart, setQty, clearCart, pullServerCart, watch, features, ready]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
