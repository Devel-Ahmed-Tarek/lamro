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
import { pickCopy, type Copy, type Locale } from "@/lib/catalog";
import { clearCartRequest, fetchCart, syncCart, upsertCartItem } from "@/lib/commerce-api";
import { enrichCopy } from "@/lib/i18n/public-dict";
import { fetchFeatures, fetchWatchlist, toggleWatchlist } from "@/lib/platform-api";

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

const FEATURE_KEY_MAP: Record<string, FeatureKey> = {
  store: "store",
  auctions: "auctions",
  buy_now: "buyNow",
  buyNow: "buyNow",
  make_offer: "makeOffer",
  makeOffer: "makeOffer",
  quote: "quote",
  inquiry: "inquiry",
  coupons: "coupons",
  quantity_discounts: "quantityDiscounts",
  quantityDiscounts: "quantityDiscounts",
};

function featuresFromApi(raw: Record<string, boolean> | undefined): Features {
  const next = { ...defaultFeatures };
  if (!raw) return next;
  for (const [key, enabled] of Object.entries(raw)) {
    const mapped = FEATURE_KEY_MAP[key];
    if (mapped) next[mapped] = Boolean(enabled);
  }
  return next;
}

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
  t: (copy: Copy | Record<string, string | undefined>) => string;
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
  cartNotice: string;
  clearCartNotice: () => void;
  maintenance: boolean;
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
  const [maintenance, setMaintenance] = useState(false);
  const [cartNotice, setCartNotice] = useState("");
  const [ready, setReady] = useState(false);
  const cartRef = useRef<CartLine[]>([]);
  cartRef.current = cart;
  const watchRef = useRef<string[]>([]);
  watchRef.current = watch;

  const hydrateFeatures = useCallback(async () => {
    try {
      const response = await fetchFeatures();
      const raw = response.data ?? {};
      setFeatures(featuresFromApi(raw));
      setMaintenance(Boolean(raw.maintenance_mode));
    } catch {
      /* keep defaults */
    }
  }, []);

  const pullServerCart = useCallback(async () => {
    if (!getToken()) return;
    const response = await fetchCart();
    setCart(cartFromApi(response.data.items));
  }, []);

  const pullServerWatch = useCallback(async () => {
    if (!getToken()) return;
    const response = await fetchWatchlist();
    const slugs = response.data
      .map((row) => row.product?.slug)
      .filter((slug): slug is string => Boolean(slug));
    setWatch(slugs);
  }, []);

  const pushLocalWatchThenPull = useCallback(async (local: string[]) => {
    if (!getToken()) return;
    for (const slug of local) {
      try {
        await toggleWatchlist(slug);
      } catch {
        /* ignore missing products */
      }
    }
    await pullServerWatch();
  }, [pullServerWatch]);

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
    let localWatch: string[] = [];
    if (saved) {
      const parsed = JSON.parse(saved) as {
        locale?: Locale;
        role?: Role | null;
        profile?: UserProfile;
        cart?: CartLine[];
        watch?: string[];
      };
      if (parsed.locale) setLocaleState(parsed.locale);
      if (parsed.role !== undefined) setRoleState(parsed.role);
      if (parsed.profile) setProfileState({ ...emptyProfile, ...parsed.profile });
      if (parsed.cart) {
        localCart = parsed.cart;
        setCart(parsed.cart);
      }
      if (parsed.watch) {
        localWatch = parsed.watch;
        setWatch(parsed.watch);
      }
    }

    void hydrateFeatures();

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
          try {
            const server = await fetchWatchlist();
            const serverSlugs = server.data
              .map((row) => row.product?.slug)
              .filter((slug): slug is string => Boolean(slug));
            const missing = localWatch.filter((slug) => !serverSlugs.includes(slug));
            if (missing.length) await pushLocalWatchThenPull(missing);
            else setWatch(serverSlugs.length ? serverSlugs : localWatch);
          } catch {
            /* keep local watch */
          }
        }
      })
      .catch(() => {
        setToken(null);
        setAuthUser(null);
      })
      .finally(() => setReady(true));
  }, [pushLocalThenPull, pushLocalWatchThenPull, hydrateFeatures]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("jala-ui", JSON.stringify({ locale, role, profile, cart, watch }));
  }, [ready, locale, role, profile, cart, watch]);

  useEffect(() => {
    if (!ready) return;
    const onChange = () => {
      void hydrateFeatures();
    };
    window.addEventListener('jala-features-changed', onChange);
    const timer = window.setInterval(onChange, 60_000);
    return () => {
      window.removeEventListener('jala-features-changed', onChange);
      window.clearInterval(timer);
    };
  }, [ready, hydrateFeatures]);

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
      try {
        const local = watchRef.current;
        const server = await fetchWatchlist();
        const serverSlugs = server.data
          .map((row) => row.product?.slug)
          .filter((slug): slug is string => Boolean(slug));
        const missing = local.filter((slug) => !serverSlugs.includes(slug));
        if (missing.length) await pushLocalWatchThenPull(missing);
        else setWatch(serverSlugs.length ? serverSlugs : local);
      } catch {
        /* keep local watch */
      }
    }
    return user;
  }, [pushLocalThenPull, pushLocalWatchThenPull]);

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
    const previous = cartRef.current;
    const line = previous.find((item) => item.slug === slug);
    const nextQty = (line?.qty ?? 0) + qty;
    const next = line
      ? previous.map((item) => (item.slug === slug ? { ...item, qty: nextQty } : item))
      : [...previous, { slug, qty }];
    setCart(next);
    setCartNotice("");
    if (getToken() && authUser && !isAdminUser(authUser)) {
      void upsertCartItem({ slug, quantity: nextQty })
        .then(() => pullServerCart())
        .catch(async () => {
          setCart(previous);
          setCartNotice("Could not update cart. Please try again.");
          try {
            await pullServerCart();
          } catch {
            /* keep rolled-back local cart */
          }
        });
    }
  }, [authUser, pullServerCart]);

  const setQty = useCallback((slug: string, qty: number) => {
    const previous = cartRef.current;
    const next = qty <= 0
      ? previous.filter((item) => item.slug !== slug)
      : previous.map((item) => (item.slug === slug ? { ...item, qty } : item));
    setCart(next);
    setCartNotice("");
    if (getToken() && authUser && !isAdminUser(authUser)) {
      void upsertCartItem({ slug, quantity: Math.max(0, qty) })
        .then(() => pullServerCart())
        .catch(async () => {
          setCart(previous);
          setCartNotice("Could not update cart. Please try again.");
          try {
            await pullServerCart();
          } catch {
            /* keep rolled-back local cart */
          }
        });
    }
  }, [authUser, pullServerCart]);

  const clearCart = useCallback(() => {
    const previous = cartRef.current;
    setCart([]);
    setCartNotice("");
    if (getToken() && authUser && !isAdminUser(authUser)) {
      void clearCartRequest().catch(async () => {
        setCart(previous);
        setCartNotice("Could not clear cart. Please try again.");
        try {
          await pullServerCart();
        } catch {
          /* keep previous */
        }
      });
    }
  }, [authUser, pullServerCart]);

  const value = useMemo<StoreValue>(() => ({
    locale,
    setLocale: setLocaleState,
    t: (copy) => pickCopy(enrichCopy(copy), locale),
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
      setWatch((current) => {
        const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
        if (getToken() && authUser && !isAdminUser(authUser)) {
          void toggleWatchlist(slug)
            .then(async () => {
              try {
                const response = await fetchWatchlist();
                setWatch(
                  response.data
                    .map((row) => row.product?.slug)
                    .filter((value): value is string => Boolean(value)),
                );
              } catch {
                /* keep optimistic */
              }
            })
            .catch(() => setWatch(current));
        }
        return next;
      });
    },
    features,
    toggleFeature: (key) => setFeatures((current) => ({ ...current, [key]: !current[key] })),
    cartNotice,
    clearCartNotice: () => setCartNotice(""),
    maintenance,
    ready,
  }), [locale, role, authUser, profile, loginAdmin, loginAuth, registerAuth, logoutAuth, refreshMe, cart, addToCart, setQty, clearCart, pullServerCart, watch, features, cartNotice, maintenance, ready]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
