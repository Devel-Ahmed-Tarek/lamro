"use client";

import { useEffect, useState } from "react";
import {
  fetchBrands,
  fetchCategories,
  fetchProducts,
  toCatalogProduct,
  type ApiBrand,
  type ApiCategory,
  type ApiProduct,
} from "@/lib/catalog-api";
import type { Product } from "@/lib/catalog";

export function usePublicCategories() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchCategories()
      .then((response) => {
        if (alive) setCategories(response.data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { categories, loading };
}

export function usePublicBrands() {
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchBrands()
      .then((response) => {
        if (alive) setBrands(response.data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { brands, loading };
}

export function usePublicProducts(filters: {
  q?: string;
  category?: string;
  brand?: string;
  condition?: string;
  sort?: string;
} = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [raw, setRaw] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchProducts({ ...filters, per_page: 100 })
      .then((response) => {
        if (!alive) return;
        setRaw(response.data);
        setProducts(response.data.map(toCatalogProduct));
      })
      .catch(() => {
        if (!alive) return;
        setRaw([]);
        setProducts([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [filters.q, filters.category, filters.brand, filters.condition, filters.sort]);

  return { products, raw, loading };
}
