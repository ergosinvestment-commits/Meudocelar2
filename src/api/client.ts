import React, { useState, useEffect } from 'react';
import {
  StoreConfig,
  Product,
  Category,
  Platform,
  StoreMetrics,
  PriceMonitorSettings,
  PriceCheckResult,
  PriceLogRecord,
  BlogPost,
  ContactMessage,
  BlogCategory,
  BlogEditor,
  BlogSettings,
  InstitutionalData
} from '../types';
import {
  FALLBACK_STORE_CONFIG,
  FALLBACK_PRODUCTS,
  FALLBACK_CATEGORIES,
  FALLBACK_PLATFORMS,
  FALLBACK_BLOG_POSTS,
  FALLBACK_BLOG_CATEGORIES,
  FALLBACK_BLOG_EDITORS,
  FALLBACK_BLOG_SETTINGS
} from '../data/defaultData';

export const API_BASE = '/api';

// Resilient memory + sessionStorage cache with Stale-While-Revalidate
const apiCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

/**
 * Synchronously retrieves cached data from memory or sessionStorage.
 * Allows components to mount instantly with existing data, eliminating all loading flashes.
 */
export function getCachedData<T>(cacheKey: string): T | null {
  const now = Date.now();
  if (apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey)!;
    // Return data even if slightly expired to allow immediate instant render
    if (cached.data) {
      return cached.data as T;
    }
  }

  try {
    const raw = sessionStorage.getItem(`apicache_${cacheKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.data) {
        apiCache.set(cacheKey, { data: parsed.data, expiry: parsed.expiry || (now + CACHE_TTL) });
        return parsed.data as T;
      }
    }
  } catch {}

  return null;
}

export function clearApiCache() {
  apiCache.clear();
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('apicache_')) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {}
}

export function invalidateCache(pattern?: string) {
  if (!pattern) {
    clearApiCache();
    return;
  }
  for (const key of Array.from(apiCache.keys())) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  }
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('apicache_') && key.includes(pattern)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {}
}

async function cachedFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_TTL,
  allowStale: boolean = true
): Promise<T> {
  const now = Date.now();

  // 1. Check in-memory cache
  if (apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey)!;
    if (cached.expiry > now) {
      return cached.data;
    }
    // Stale-While-Revalidate: Return stale cached data immediately and refresh silently in background
    if (allowStale && cached.data) {
      fetchFn().then(fresh => {
        if (fresh !== undefined && fresh !== null) {
          apiCache.set(cacheKey, { data: fresh, expiry: Date.now() + ttl });
          try {
            sessionStorage.setItem(`apicache_${cacheKey}`, JSON.stringify({ data: fresh, expiry: Date.now() + ttl }));
          } catch {}
        }
      }).catch(() => {});
      return cached.data;
    }
  }

  // 2. Check sessionStorage
  try {
    const raw = sessionStorage.getItem(`apicache_${cacheKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.expiry > now) {
        apiCache.set(cacheKey, { data: parsed.data, expiry: parsed.expiry });
        return parsed.data;
      }
      if (allowStale && parsed.data) {
        apiCache.set(cacheKey, { data: parsed.data, expiry: parsed.expiry });
        fetchFn().then(fresh => {
          if (fresh !== undefined && fresh !== null) {
            apiCache.set(cacheKey, { data: fresh, expiry: Date.now() + ttl });
            try {
              sessionStorage.setItem(`apicache_${cacheKey}`, JSON.stringify({ data: fresh, expiry: Date.now() + ttl }));
            } catch {}
          }
        }).catch(() => {});
        return parsed.data;
      }
    }
  } catch {}

  // 3. Perform network fetch
  const data = await fetchFn();
  const expiry = now + ttl;
  apiCache.set(cacheKey, { data, expiry });
  try {
    sessionStorage.setItem(`apicache_${cacheKey}`, JSON.stringify({ data, expiry }));
  } catch {}

  return data;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  try {
    const raw = localStorage.getItem('planiloja_admin_session') || sessionStorage.getItem('planiloja_admin_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token) {
        headers['Authorization'] = `Bearer ${parsed.token}`;
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return headers;
}

export async function fetchStoreConfig(slug: string = 'achadinhos-da-maria'): Promise<StoreConfig> {
  return cachedFetch(`store_config_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/store/${slug}`);
      if (!res.ok) {
        return { ...FALLBACK_STORE_CONFIG, slug };
      }
      const data = await res.json();
      return data || { ...FALLBACK_STORE_CONFIG, slug };
    } catch (err) {
      return { ...FALLBACK_STORE_CONFIG, slug };
    }
  });
}

export async function fetchStoreProducts(slug: string = 'achadinhos-da-maria'): Promise<Product[]> {
  return cachedFetch(`store_products_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/store/${slug}/products`);
      if (!res.ok) return [];
      const prods = await res.json();
      return Array.isArray(prods) ? prods : [];
    } catch (err) {
      return [];
    }
  });
}

export async function fetchStoreCategories(slug: string = 'achadinhos-da-maria', onlyMenu?: boolean): Promise<Category[]> {
  return cachedFetch(`store_categories_${slug}_${onlyMenu ? 'menu' : 'all'}`, async () => {
    try {
      const query = onlyMenu ? '?menu=true' : '';
      const res = await fetch(`${API_BASE}/store/${slug}/categories${query}`);
      if (!res.ok) return FALLBACK_CATEGORIES;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : FALLBACK_CATEGORIES;
    } catch (err) {
      return FALLBACK_CATEGORIES;
    }
  });
}

export async function fetchStorePlatforms(slug: string = 'achadinhos-da-maria'): Promise<Platform[]> {
  return cachedFetch(`store_platforms_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/store/${slug}/platforms`);
      if (!res.ok) return FALLBACK_PLATFORMS;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : FALLBACK_PLATFORMS;
    } catch (err) {
      return FALLBACK_PLATFORMS;
    }
  });
}

export async function fetchAdminPlatforms(slug: string = 'achadinhos-da-maria'): Promise<Platform[]> {
  return cachedFetch(`admin_platforms_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/store/${slug}/platforms`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return FALLBACK_PLATFORMS;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : FALLBACK_PLATFORMS;
    } catch (err) {
      return FALLBACK_PLATFORMS;
    }
  });
}

export async function createPlatform(slug: string, platform: Partial<Platform>): Promise<Platform> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/platforms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(platform)
  });
  if (!res.ok) throw new Error('Failed to create platform');
  clearApiCache();
  return res.json();
}

export async function updatePlatform(slug: string, id: string, platform: Partial<Platform>): Promise<Platform> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/platforms/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(platform)
  });
  if (!res.ok) throw new Error('Failed to update platform');
  clearApiCache();
  return res.json();
}

export async function patchPlatform(slug: string, id: string, patch: Partial<Platform>): Promise<Platform> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/platforms/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error('Failed to patch platform');
  clearApiCache();
  return res.json();
}

export async function deletePlatform(slug: string, id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/platforms/${id}`, {
    method: 'DELETE'
  });
  if (res.ok) clearApiCache();
  return res.ok;
}

export async function loginAdmin(slug: string, login: string, password: string): Promise<{ success: boolean; user?: { email: string; name: string }; error?: string; token?: string }> {
  const res = await fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, login, password })
  });
  return res.json();
}

export async function changeAdminCredentials(slug: string, newEmail: string, newPassword?: string, newUser?: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/admin/auth/change-credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, newEmail, newPassword, newUser })
  });
  return res.json();
}

export async function fetchAdminCategories(slug: string = 'achadinhos-da-maria'): Promise<Category[]> {
  return cachedFetch(`admin_categories_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/store/${slug}/categories`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return FALLBACK_CATEGORIES;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : FALLBACK_CATEGORIES;
    } catch (err) {
      return FALLBACK_CATEGORIES;
    }
  });
}

export async function createCategory(slug: string, category: Partial<Category>): Promise<Category> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category)
  });
  if (!res.ok) throw new Error('Failed to create category');
  clearApiCache();
  return res.json();
}

export async function updateCategory(slug: string, id: string, category: Partial<Category>): Promise<Category> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category)
  });
  if (!res.ok) throw new Error('Failed to update category');
  clearApiCache();
  return res.json();
}

export async function patchCategory(slug: string, id: string, patch: Partial<Category>): Promise<Category> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error('Failed to patch category');
  clearApiCache();
  return res.json();
}

export async function deleteCategory(slug: string, id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/categories/${id}`, {
    method: 'DELETE'
  });
  if (res.ok) clearApiCache();
  return res.ok;
}

export async function fetchAdminProducts(slug: string = 'achadinhos-da-maria'): Promise<Product[]> {
  return cachedFetch(`admin_products_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/store/${slug}/products`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return [];
    }
  });
}

export async function updateStoreConfig(slug: string, config: Partial<StoreConfig>): Promise<StoreConfig> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error('Failed to update store config');
  clearApiCache();
  return res.json();
}

export async function createProduct(slug: string, product: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!res.ok) throw new Error('Failed to create product');
  clearApiCache();
  return res.json();
}

export async function updateProduct(slug: string, id: string, product: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!res.ok) throw new Error('Failed to update product');
  clearApiCache();
  return res.json();
}

export async function patchProduct(slug: string, id: string, patch: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error('Failed to patch product');
  clearApiCache();
  return res.json();
}

export async function deleteProduct(slug: string, id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/products/${id}`, {
    method: 'DELETE'
  });
  if (res.ok) clearApiCache();
  return res.ok;
}

export async function fetchStoreMetrics(slug: string, days?: number): Promise<StoreMetrics> {
  const query = days ? `?days=${days}` : '';
  const res = await fetch(`${API_BASE}/admin/store/${slug}/metrics${query}`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export async function recordProductClick(slug: string, product: Product, origin?: string) {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm_source = params.get('utm_source') || undefined;
    const utm_medium = params.get('utm_medium') || undefined;
    const utm_campaign = params.get('utm_campaign') || undefined;

    await fetch(`${API_BASE}/store/${slug}/clicks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        produto: product.nome,
        plataforma: product.plataforma,
        tipo: product.tipo,
        categoria: product.categoria,
        origem: origin || document.referrer || 'Direto',
        utm_source,
        utm_medium,
        utm_campaign
      })
    });
  } catch (err) {
    console.error('Error logging click:', err);
  }
}

export async function recordStoreView(slug: string) {
  try {
    await fetch(`${API_BASE}/store/${slug}/view`, { method: 'POST' });
  } catch (err) {
    // Silent
  }
}

export interface UploadImageResult {
  url: string;
  originalSize?: number;
  newSize?: number;
  savedBytes?: number;
  format?: string;
  success: boolean;
}

export async function uploadImageToServer(dataUrl: string, fileName?: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/admin/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, fileName })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('[Upload Image Server Warning]', err);
  }
  return dataUrl;
}

export async function uploadImageToServerDetailed(dataUrl: string, fileName?: string): Promise<UploadImageResult> {
  try {
    const res = await fetch(`${API_BASE}/admin/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, fileName })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        return {
          url: data.url,
          originalSize: data.originalSize,
          newSize: data.newSize,
          savedBytes: data.savedBytes,
          format: data.format || 'webp',
          success: true
        };
      }
    }
  } catch (err) {
    console.warn('[Upload Image Server Detailed Warning]', err);
  }
  return { url: dataUrl, success: false };
}

// ============================================
// PRICE MONITOR & SUPPLIER SYNC CLIENT
// ============================================

import {
  parseSupplierHtml,
  fetchSupplierHtmlClient,
  computeMarkup,
  detectPlatform,
  runClientScan
} from '../utils';

export async function fetchPriceMonitorSettings(slug: string = 'achadinhos-da-maria'): Promise<PriceMonitorSettings> {
  try {
    const res = await fetch(`${API_BASE}/price-monitor/settings?slug=${slug}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to local storage or defaults
  }
  
  // Return safe defaults if server route is not ready
  return {
    storeId: slug,
    enabled: true,
    frequencyHours: 6,
    autoApply: false,
    markupType: 'direct',
    markupValue: 0,
    outOfStockAction: 'keep',
    notifyPriceChanges: false,
    lastSyncAt: undefined
  };
}

export async function savePriceMonitorSettings(slug: string, settings: Partial<PriceMonitorSettings>): Promise<PriceMonitorSettings> {
  try {
    const res = await fetch(`${API_BASE}/price-monitor/settings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ slug, ...settings })
    });
    if (res.ok) {
      const data = await res.json();
      return data.settings || settings;
    }
  } catch {
    // Continue with local return
  }
  return settings as PriceMonitorSettings;
}

export async function checkSupplierUrl(url: string, markupType: string = 'direct', markupValue: number = 0): Promise<PriceCheckResult> {
  try {
    const res = await fetch(`${API_BASE}/price-monitor/check-url`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ url, markupType, markupValue })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Try client-side extraction fallback
  }

  // Client-side fallback extraction
  try {
    const html = await fetchSupplierHtmlClient(url);
    const parsed = parseSupplierHtml(html, url);
    const supplierPrice = parsed.supplierPrice || null;
    const supplierPromo = parsed.supplierPromo || null;
    const calculatedPrice = computeMarkup(supplierPrice, markupType as any, markupValue);
    const calculatedPromo = supplierPromo ? computeMarkup(supplierPromo, markupType as any, markupValue) : null;

    return {
      url,
      platform: parsed.platform || detectPlatform(url),
      detectedName: parsed.detectedName,
      detectedImage: parsed.detectedImage,
      supplierPrice,
      supplierPromo,
      calculatedPrice,
      calculatedPromo,
      inStock: parsed.inStock ?? true,
      currency: 'BRL',
      diffPercent: 0,
      status: 'unchanged',
      message: 'Dados obtidos com sucesso via cliente',
      checkedAt: new Date().toISOString()
    };
  } catch (err: any) {
    throw new Error('Não foi possível obter dados do fornecedor: ' + (err?.message || 'Link inacessível'));
  }
}

export async function scanCatalogPrices(slug: string = 'achadinhos-da-maria', productIds?: string[], autoApply: boolean = false): Promise<{
  success: boolean;
  scannedCount: number;
  results: PriceCheckResult[];
  appliedCount: number;
  disabled404Count?: number;
  message: string;
}> {
  // 1. Try server endpoint first
  try {
    const res = await fetch(`${API_BASE}/price-monitor/scan-catalog`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ slug, productIds, autoApply })
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Proceed to client-side fallback
  }

  // 2. Client-side fallback scanning if server route returns 404 or fails
  const products = await fetchStoreProducts(slug);
  const targetProducts = Array.isArray(productIds) && productIds.length > 0
    ? products.filter(p => productIds.includes(p.id))
    : products;

  const settings = await fetchPriceMonitorSettings(slug);
  return await runClientScan(targetProducts, settings);
}

export async function applyPriceUpdates(
  slug: string,
  updates: {
    productId: string;
    newPrice?: number;
    newPromo?: number | null;
    ativo?: boolean;
    newSupplierPrice?: number;
    newSupplierPromo?: number | null;
    stockStatus?: 'in_stock' | 'out_of_stock';
  }[]
): Promise<{ success: boolean; updatedCount: number; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/price-monitor/apply-updates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ slug, updates })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Try updating products one by one
  }

  // Fallback: apply updates individually via updateProduct API
  let count = 0;
  for (const update of updates) {
    try {
      await updateProduct(slug, update.productId, {
        ...(update.newPrice ? { preco: update.newPrice } : {}),
        ...(update.newPromo !== undefined ? { precoPromo: update.newPromo } : {}),
        ...(update.ativo !== undefined ? { ativo: update.ativo } : {})
      });
      count++;
    } catch {
      // Continue
    }
  }

  return {
    success: true,
    updatedCount: count,
    message: `${count} produto(s) atualizados com sucesso!`
  };
}

export async function fetchPriceLogs(slug: string = 'achadinhos-da-maria', limit: number = 50): Promise<PriceLogRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/price-monitor/logs?slug=${slug}&limit=${limit}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Ignore error and return empty array
  }
  return [];
}

// ============================================
// PUBLIC BLOG & CONTACT API
// ============================================

export async function fetchPublicBlogPosts(slug: string = 'achadinhos-da-maria'): Promise<BlogPost[]> {
  return cachedFetch(`public_blog_posts_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/store/${slug}/posts`);
      if (!res.ok) return FALLBACK_BLOG_POSTS;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : FALLBACK_BLOG_POSTS;
    } catch (err) {
      return FALLBACK_BLOG_POSTS;
    }
  });
}

export async function fetchBlogPostBySlug(slug: string = 'achadinhos-da-maria', postSlug: string): Promise<BlogPost | null> {
  return cachedFetch(`blog_post_${slug}_${postSlug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/store/${slug}/posts/${postSlug}`);
      if (!res.ok) {
        const fallback = FALLBACK_BLOG_POSTS.find(p => p.slug === postSlug || p.id === postSlug);
        return fallback || null;
      }
      return await res.json();
    } catch (err) {
      const fallback = FALLBACK_BLOG_POSTS.find(p => p.slug === postSlug || p.id === postSlug);
      return fallback || null;
    }
  });
}

export async function recordBlogPostView(slug: string = 'achadinhos-da-maria', id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/store/${slug}/posts/${id}/view`, {
      method: 'POST'
    });
  } catch {
    // Non-blocking
  }
}

export async function submitContactMessage(
  slug: string = 'achadinhos-da-maria',
  data: Partial<ContactMessage>
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/store/${slug}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      return { success: false, message: 'Erro ao enviar mensagem. Tente novamente.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Falha na conexão.' };
  }
}

// ============================================
// ADMIN BLOG & CONTACT API
// ============================================

export async function fetchAdminBlogPosts(slug: string = 'achadinhos-da-maria'): Promise<BlogPost[]> {
  return cachedFetch(`admin_blog_posts_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/store/${slug}/posts`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return FALLBACK_BLOG_POSTS;
      const data = await res.json();
      return Array.isArray(data) ? data : FALLBACK_BLOG_POSTS;
    } catch {
      return FALLBACK_BLOG_POSTS;
    }
  });
}

export async function saveAdminBlogPost(slug: string = 'achadinhos-da-maria', post: Partial<BlogPost>): Promise<BlogPost> {
  const url = post.id
    ? `${API_BASE}/admin/store/${slug}/posts/${post.id}`
    : `${API_BASE}/admin/store/${slug}/posts`;
  const method = post.id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: JSON.stringify(post)
  });

  if (!res.ok) {
    throw new Error('Falha ao salvar artigo');
  }
  clearApiCache();
  return await res.json();
}

export async function deleteAdminBlogPost(slug: string = 'achadinhos-da-maria', id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/posts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (res.ok) clearApiCache();
  return res.ok;
}

export async function fetchAdminMessages(slug: string = 'achadinhos-da-maria'): Promise<ContactMessage[]> {
  try {
    const res = await fetch(`${API_BASE}/admin/store/${slug}/messages`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function deleteAdminMessage(slug: string = 'achadinhos-da-maria', id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/messages/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return res.ok;
}

// ============================================
// BLOG SETTINGS, CATEGORIES & EDITORS API
// ============================================

export async function fetchPublicBlogSettings(slug: string = 'achadinhos-da-maria'): Promise<BlogSettings> {
  return cachedFetch(`public_blog_settings_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/store/${slug}/blog-settings`);
      if (!res.ok) return FALLBACK_BLOG_SETTINGS;
      const data = await res.json();
      return data || FALLBACK_BLOG_SETTINGS;
    } catch {
      return FALLBACK_BLOG_SETTINGS;
    }
  });
}

export async function fetchAdminBlogSettings(slug: string = 'achadinhos-da-maria'): Promise<BlogSettings> {
  return cachedFetch(`admin_blog_settings_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/store/${slug}/blog-settings`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return FALLBACK_BLOG_SETTINGS;
      return await res.json();
    } catch {
      return FALLBACK_BLOG_SETTINGS;
    }
  });
}

export async function saveAdminBlogSettings(slug: string = 'achadinhos-da-maria', settings: Partial<BlogSettings>): Promise<BlogSettings> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/blog-settings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(settings)
  });
  if (!res.ok) {
    throw new Error('Falha ao salvar configurações do blog');
  }
  clearApiCache();
  return await res.json();
}

export async function fetchPublicBlogCategories(slug: string = 'achadinhos-da-maria'): Promise<BlogCategory[]> {
  return cachedFetch(`public_blog_categories_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/store/${slug}/blog-categories`);
      if (!res.ok) return FALLBACK_BLOG_CATEGORIES;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : FALLBACK_BLOG_CATEGORIES;
    } catch {
      return FALLBACK_BLOG_CATEGORIES;
    }
  });
}

export async function fetchAdminBlogCategories(slug: string = 'achadinhos-da-maria'): Promise<BlogCategory[]> {
  return cachedFetch(`admin_blog_categories_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/store/${slug}/blog-categories`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return FALLBACK_BLOG_CATEGORIES;
      const data = await res.json();
      return Array.isArray(data) ? data : FALLBACK_BLOG_CATEGORIES;
    } catch {
      return FALLBACK_BLOG_CATEGORIES;
    }
  });
}

export async function saveAdminBlogCategory(slug: string = 'achadinhos-da-maria', cat: Partial<BlogCategory>): Promise<BlogCategory> {
  const url = cat.id
    ? `${API_BASE}/admin/store/${slug}/blog-categories/${cat.id}`
    : `${API_BASE}/admin/store/${slug}/blog-categories`;
  const method = cat.id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: JSON.stringify(cat)
  });
  if (!res.ok) {
    throw new Error('Falha ao salvar categoria do blog');
  }
  clearApiCache();
  return await res.json();
}

export async function deleteAdminBlogCategory(slug: string = 'achadinhos-da-maria', id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/blog-categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (res.ok) clearApiCache();
  return res.ok;
}

export async function fetchPublicBlogEditors(slug: string = 'achadinhos-da-maria'): Promise<BlogEditor[]> {
  return cachedFetch(`public_blog_editors_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/store/${slug}/blog-editors`);
      if (!res.ok) return FALLBACK_BLOG_EDITORS;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : FALLBACK_BLOG_EDITORS;
    } catch {
      return FALLBACK_BLOG_EDITORS;
    }
  });
}

export async function fetchAdminBlogEditors(slug: string = 'achadinhos-da-maria'): Promise<BlogEditor[]> {
  return cachedFetch(`admin_blog_editors_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/store/${slug}/blog-editors`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return FALLBACK_BLOG_EDITORS;
      const data = await res.json();
      return Array.isArray(data) ? data : FALLBACK_BLOG_EDITORS;
    } catch {
      return FALLBACK_BLOG_EDITORS;
    }
  });
}

export async function saveAdminBlogEditor(slug: string = 'achadinhos-da-maria', editor: Partial<BlogEditor>): Promise<BlogEditor> {
  const url = editor.id
    ? `${API_BASE}/admin/store/${slug}/blog-editors/${editor.id}`
    : `${API_BASE}/admin/store/${slug}/blog-editors`;
  const method = editor.id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: JSON.stringify(editor)
  });
  if (!res.ok) {
    throw new Error('Falha ao salvar perfil do editor');
  }
  clearApiCache();
  return await res.json();
}

export async function deleteAdminBlogEditor(slug: string = 'achadinhos-da-maria', id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/blog-editors/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (res.ok) clearApiCache();
  return res.ok;
}

export async function ensureBlogTablesInMySql(slug: string = 'achadinhos-da-maria'): Promise<{
  success: boolean;
  message: string;
  tablesResult?: any;
  syncResult?: any;
  diagnostics?: any;
}> {
  const res = await fetch(`${API_BASE}/admin/database/ensure-blog-tables`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ slug })
  });
  return await res.json();
}

export async function fetchBlogSqlScript(slug: string = 'achadinhos-da-maria'): Promise<string> {
  const res = await fetch(`${API_BASE}/admin/database/sql-blog-script?slug=${encodeURIComponent(slug)}`, {
    headers: getAuthHeaders()
  });
  return await res.text();
}

// ============================================
// INSTITUTIONAL PAGES & LEGAL INFO API
// ============================================

export async function fetchPublicInstitutional(slug: string = 'achadinhos-da-maria'): Promise<InstitutionalData | null> {
  return cachedFetch(`public_institutional_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/store/${slug}/institutional`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  });
}

export async function fetchAdminInstitutional(slug: string = 'achadinhos-da-maria'): Promise<InstitutionalData | null> {
  return cachedFetch(`admin_institutional_${slug}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/store/${slug}/institutional`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  });
}

export async function saveAdminInstitutional(
  slug: string = 'achadinhos-da-maria',
  data: Partial<InstitutionalData>
): Promise<{ success: boolean; data: InstitutionalData; mysqlSaved: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/institutional`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error || 'Falha ao salvar dados institucionais no servidor');
  }
  clearApiCache();
  return await res.json();
}

export async function ensureInstitutionalTableInMySql(slug: string = 'achadinhos-da-maria'): Promise<{
  success: boolean;
  message: string;
  tableResult?: any;
  syncSaved?: boolean;
  diagnostics?: any;
}> {
  const res = await fetch(`${API_BASE}/admin/database/ensure-institutional-table`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ slug })
  });
  return await res.json();
}







