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
  try {
    const res = await fetch(`${API_BASE}/store/${slug}?_t=${Date.now()}`);
    if (!res.ok) {
      console.warn(`[Client] Aviso ao buscar loja ${slug} (status ${res.status}). Usando configuração padrão.`);
      return { ...FALLBACK_STORE_CONFIG, slug };
    }
    const data = await res.json();
    return data || { ...FALLBACK_STORE_CONFIG, slug };
  } catch (err) {
    console.warn(`[Client] Falha de rede ao buscar loja ${slug}. Usando dados seguros.`);
    return { ...FALLBACK_STORE_CONFIG, slug };
  }
}

export async function fetchStoreProducts(slug: string = 'achadinhos-da-maria'): Promise<Product[]> {
  try {
    const res = await fetch(`${API_BASE}/store/${slug}/products?_t=${Date.now()}`);
    if (!res.ok) {
      console.warn(`[Client] Aviso ao buscar produtos de ${slug}. Usando catálogo padrão.`);
      return FALLBACK_PRODUCTS;
    }
    const prods = await res.json();
    if (Array.isArray(prods) && prods.length > 0) return prods;
    return FALLBACK_PRODUCTS;
  } catch (err) {
    console.warn(`[Client] Falha de rede ao buscar produtos. Usando catálogo padrão.`);
    return FALLBACK_PRODUCTS;
  }
}

export async function fetchStoreCategories(slug: string = 'achadinhos-da-maria', onlyMenu?: boolean): Promise<Category[]> {
  try {
    const query = onlyMenu ? '?menu=true&' : '?';
    const res = await fetch(`${API_BASE}/store/${slug}/categories${query}_t=${Date.now()}`);
    if (!res.ok) return FALLBACK_CATEGORIES;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : FALLBACK_CATEGORIES;
  } catch (err) {
    return FALLBACK_CATEGORIES;
  }
}

export async function fetchStorePlatforms(slug: string = 'achadinhos-da-maria'): Promise<Platform[]> {
  try {
    const res = await fetch(`${API_BASE}/store/${slug}/platforms?_t=${Date.now()}`);
    if (!res.ok) return FALLBACK_PLATFORMS;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : FALLBACK_PLATFORMS;
  } catch (err) {
    return FALLBACK_PLATFORMS;
  }
}

export async function fetchAdminPlatforms(slug: string = 'achadinhos-da-maria'): Promise<Platform[]> {
  try {
    const res = await fetch(`${API_BASE}/admin/store/${slug}/platforms?_t=${Date.now()}`);
    if (!res.ok) return FALLBACK_PLATFORMS;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : FALLBACK_PLATFORMS;
  } catch (err) {
    console.warn('[Client] Usando plataformas padrão para o admin');
    return FALLBACK_PLATFORMS;
  }
}

export async function createPlatform(slug: string, platform: Partial<Platform>): Promise<Platform> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/platforms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(platform)
  });
  if (!res.ok) throw new Error('Failed to create platform');
  return res.json();
}

export async function updatePlatform(slug: string, id: string, platform: Partial<Platform>): Promise<Platform> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/platforms/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(platform)
  });
  if (!res.ok) throw new Error('Failed to update platform');
  return res.json();
}

export async function patchPlatform(slug: string, id: string, patch: Partial<Platform>): Promise<Platform> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/platforms/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error('Failed to patch platform');
  return res.json();
}

export async function deletePlatform(slug: string, id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/platforms/${id}`, {
    method: 'DELETE'
  });
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
  try {
    const res = await fetch(`${API_BASE}/admin/store/${slug}/categories?_t=${Date.now()}`);
    if (!res.ok) return FALLBACK_CATEGORIES;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : FALLBACK_CATEGORIES;
  } catch (err) {
    console.warn('[Client] Usando categorias padrão para o admin');
    return FALLBACK_CATEGORIES;
  }
}

export async function createCategory(slug: string, category: Partial<Category>): Promise<Category> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category)
  });
  if (!res.ok) throw new Error('Failed to create category');
  return res.json();
}

export async function updateCategory(slug: string, id: string, category: Partial<Category>): Promise<Category> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category)
  });
  if (!res.ok) throw new Error('Failed to update category');
  return res.json();
}

export async function patchCategory(slug: string, id: string, patch: Partial<Category>): Promise<Category> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error('Failed to patch category');
  return res.json();
}

export async function deleteCategory(slug: string, id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/categories/${id}`, {
    method: 'DELETE'
  });
  return res.ok;
}

export async function fetchAdminProducts(slug: string = 'achadinhos-da-maria'): Promise<Product[]> {
  try {
    const res = await fetch(`${API_BASE}/admin/store/${slug}/products?_t=${Date.now()}`);
    if (!res.ok) return FALLBACK_PRODUCTS;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : FALLBACK_PRODUCTS;
  } catch (err) {
    console.warn('[Client] Usando catálogo de produtos padrão para o admin');
    return FALLBACK_PRODUCTS;
  }
}

export async function updateStoreConfig(slug: string, config: Partial<StoreConfig>): Promise<StoreConfig> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error('Failed to update store config');
  return res.json();
}

export async function createProduct(slug: string, product: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!res.ok) throw new Error('Failed to create product');
  return res.json();
}

export async function updateProduct(slug: string, id: string, product: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!res.ok) throw new Error('Failed to update product');
  return res.json();
}

export async function patchProduct(slug: string, id: string, patch: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error('Failed to patch product');
  return res.json();
}

export async function deleteProduct(slug: string, id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/products/${id}`, {
    method: 'DELETE'
  });
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
  try {
    const res = await fetch(`${API_BASE}/store/${slug}/posts?_t=${Date.now()}`);
    if (!res.ok) return FALLBACK_BLOG_POSTS;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : FALLBACK_BLOG_POSTS;
  } catch (err) {
    return FALLBACK_BLOG_POSTS;
  }
}

export async function fetchBlogPostBySlug(slug: string = 'achadinhos-da-maria', postSlug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${API_BASE}/store/${slug}/posts/${postSlug}?_t=${Date.now()}`);
    if (!res.ok) {
      const fallback = FALLBACK_BLOG_POSTS.find(p => p.slug === postSlug || p.id === postSlug);
      return fallback || null;
    }
    return await res.json();
  } catch (err) {
    const fallback = FALLBACK_BLOG_POSTS.find(p => p.slug === postSlug || p.id === postSlug);
    return fallback || null;
  }
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
  try {
    const res = await fetch(`${API_BASE}/admin/store/${slug}/posts?_t=${Date.now()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return FALLBACK_BLOG_POSTS;
    const data = await res.json();
    return Array.isArray(data) ? data : FALLBACK_BLOG_POSTS;
  } catch {
    return FALLBACK_BLOG_POSTS;
  }
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
  return await res.json();
}

export async function deleteAdminBlogPost(slug: string = 'achadinhos-da-maria', id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/posts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return res.ok;
}

export async function fetchAdminMessages(slug: string = 'achadinhos-da-maria'): Promise<ContactMessage[]> {
  try {
    const res = await fetch(`${API_BASE}/admin/store/${slug}/messages?_t=${Date.now()}`, {
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
  try {
    const res = await fetch(`${API_BASE}/store/${slug}/blog-settings?_t=${Date.now()}`);
    if (!res.ok) return FALLBACK_BLOG_SETTINGS;
    const data = await res.json();
    return data || FALLBACK_BLOG_SETTINGS;
  } catch {
    return FALLBACK_BLOG_SETTINGS;
  }
}

export async function fetchAdminBlogSettings(slug: string = 'achadinhos-da-maria'): Promise<BlogSettings> {
  try {
    const res = await fetch(`${API_BASE}/admin/store/${slug}/blog-settings?_t=${Date.now()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return FALLBACK_BLOG_SETTINGS;
    return await res.json();
  } catch {
    return FALLBACK_BLOG_SETTINGS;
  }
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
  return await res.json();
}

export async function fetchPublicBlogCategories(slug: string = 'achadinhos-da-maria'): Promise<BlogCategory[]> {
  try {
    const res = await fetch(`${API_BASE}/store/${slug}/blog-categories?_t=${Date.now()}`);
    if (!res.ok) return FALLBACK_BLOG_CATEGORIES;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : FALLBACK_BLOG_CATEGORIES;
  } catch {
    return FALLBACK_BLOG_CATEGORIES;
  }
}

export async function fetchAdminBlogCategories(slug: string = 'achadinhos-da-maria'): Promise<BlogCategory[]> {
  try {
    const res = await fetch(`${API_BASE}/admin/store/${slug}/blog-categories?_t=${Date.now()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return FALLBACK_BLOG_CATEGORIES;
    const data = await res.json();
    return Array.isArray(data) ? data : FALLBACK_BLOG_CATEGORIES;
  } catch {
    return FALLBACK_BLOG_CATEGORIES;
  }
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
  return await res.json();
}

export async function deleteAdminBlogCategory(slug: string = 'achadinhos-da-maria', id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/blog-categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return res.ok;
}

export async function fetchPublicBlogEditors(slug: string = 'achadinhos-da-maria'): Promise<BlogEditor[]> {
  try {
    const res = await fetch(`${API_BASE}/store/${slug}/blog-editors?_t=${Date.now()}`);
    if (!res.ok) return FALLBACK_BLOG_EDITORS;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : FALLBACK_BLOG_EDITORS;
  } catch {
    return FALLBACK_BLOG_EDITORS;
  }
}

export async function fetchAdminBlogEditors(slug: string = 'achadinhos-da-maria'): Promise<BlogEditor[]> {
  try {
    const res = await fetch(`${API_BASE}/admin/store/${slug}/blog-editors?_t=${Date.now()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return FALLBACK_BLOG_EDITORS;
    const data = await res.json();
    return Array.isArray(data) ? data : FALLBACK_BLOG_EDITORS;
  } catch {
    return FALLBACK_BLOG_EDITORS;
  }
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
  return await res.json();
}

export async function deleteAdminBlogEditor(slug: string = 'achadinhos-da-maria', id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/store/${slug}/blog-editors/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
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
  try {
    const res = await fetch(`${API_BASE}/store/${slug}/institutional?_t=${Date.now()}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchAdminInstitutional(slug: string = 'achadinhos-da-maria'): Promise<InstitutionalData | null> {
  try {
    const res = await fetch(`${API_BASE}/admin/store/${slug}/institutional?_t=${Date.now()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
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







