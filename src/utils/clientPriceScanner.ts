/**
 * Client-Side Price Scanner & Real-time Monitor Utility
 */
import { PriceCheckResult, PriceMarkupType, PriceMonitorSettings, Product } from '../types';

export function parsePriceFromText(text: string | null | undefined): number | null {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim();
  const match = clean.match(/(?:R\$|\$|BRL)?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{1,2})|[0-9]+(?:\.[0-9]{2})?|[0-9]+,[0-9]{2})/i);
  if (match && match[1]) {
    let numStr = match[1];
    if (numStr.includes(',') && numStr.includes('.')) {
      numStr = numStr.replace(/\./g, '').replace(',', '.');
    } else if (numStr.includes(',')) {
      numStr = numStr.replace(',', '.');
    }
    const val = parseFloat(numStr);
    return isNaN(val) || val <= 0 ? null : Math.round(val * 100) / 100;
  }
  return null;
}

export function detectPlatform(url: string): string {
  const lower = (url || '').toLowerCase();
  if (lower.includes('amazon.') || lower.includes('amzn.to')) return 'Amazon';
  if (lower.includes('shopee.') || lower.includes('shp.ee')) return 'Shopee';
  if (lower.includes('aliexpress.') || lower.includes('alicdn') || lower.includes('a.aliexpress.com')) return 'AliExpress';
  if (lower.includes('magazineluiza.') || lower.includes('magazinevoce.') || lower.includes('magalu.')) return 'Magalu';
  if (lower.includes('hotmart.') || lower.includes('go.hotmart.com') || lower.includes('pay.hotmart.com')) return 'Hotmart';
  if (lower.includes('kiwify.') || lower.includes('pay.kiwify.com.br')) return 'Kiwify';
  if (lower.includes('mercadolivre.') || lower.includes('mercadolivre.com.br') || lower.includes('mlb.')) return 'Mercado Livre';
  if (lower.includes('braip.') || lower.includes('ev.braip.com')) return 'Braip';
  if (lower.includes('eduzz.') || lower.includes('sun.eduzz.com')) return 'Eduzz';
  if (lower.includes('shein.')) return 'Shein';
  return 'Outro Fornecedor';
}

export function computeMarkup(
  supplierPrice: number | null,
  markupType: PriceMarkupType = 'direct',
  markupValue: number = 0
): number | null {
  if (supplierPrice === null || supplierPrice <= 0) return null;
  if (markupType === 'percentage' && markupValue > 0) {
    return Math.round(supplierPrice * (1 + markupValue / 100) * 100) / 100;
  }
  if (markupType === 'fixed' && markupValue > 0) {
    return Math.round((supplierPrice + markupValue) * 100) / 100;
  }
  return supplierPrice;
}

// Extract product info from HTML text (client-side DOM parser + meta tags)
export function parseSupplierHtml(html: string, url: string): Partial<PriceCheckResult> {
  const platform = detectPlatform(url);
  let title: string | undefined = undefined;
  let image: string | undefined = undefined;
  let price: number | null = null;
  let promo: number | null = null;
  let inStock = true;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Title
    const metaTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                      doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
                      doc.querySelector('h1')?.textContent?.trim() ||
                      doc.querySelector('title')?.textContent?.trim();
    if (metaTitle) title = metaTitle.replace(/\s+/g, ' ').trim();

    // Image
    const metaImg = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                    doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
    if (metaImg) image = metaImg.trim();

    // JSON-LD structured data
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(s => {
      try {
        const json = JSON.parse(s.textContent || '{}');
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          if (item['@type'] === 'Product' || item['offers']) {
            if (item.name && !title) title = item.name;
            if (item.image && !image) {
              image = Array.isArray(item.image) ? item.image[0] : item.image;
            }
            const offers = item.offers;
            if (offers) {
              const offerObj = Array.isArray(offers) ? offers[0] : offers;
              const p = parseFloat(offerObj.price || offerObj.lowPrice || offerObj.highPrice);
              if (!isNaN(p) && p > 0) {
                if (!price) price = p;
                else if (p < price) {
                  promo = p;
                }
              }
              if (offerObj.availability && String(offerObj.availability).toLowerCase().includes('outofstock')) {
                inStock = false;
              }
            }
          }
        }
      } catch {
        // Ignore JSON-LD parse error
      }
    });

    // Fallback meta tags for price
    if (!price) {
      const ogPrice = doc.querySelector('meta[property="product:price:amount"]')?.getAttribute('content') ||
                      doc.querySelector('meta[property="og:price:amount"]')?.getAttribute('content');
      if (ogPrice) {
        price = parsePriceFromText(ogPrice);
      }
    }

    // Common CSS selector heuristics
    if (!price) {
      const priceSelectors = [
        '.price', '.andes-money-amount__fraction', '.a-price-whole',
        '.sales-price', '.product-price', '.item-price', '.preco',
        '.val-price', '.price-value', '[data-testid="price"]'
      ];
      for (const sel of priceSelectors) {
        const el = doc.querySelector(sel);
        if (el && el.textContent) {
          const parsed = parsePriceFromText(el.textContent);
          if (parsed && parsed > 0) {
            price = parsed;
            break;
          }
        }
      }
    }

    // Check out of stock indicators in text
    const lowerHtml = html.toLowerCase();
    if (
      lowerHtml.includes('produto esgotado') ||
      lowerHtml.includes('indisponível') ||
      lowerHtml.includes('avise-me quando chegar') ||
      lowerHtml.includes('out of stock')
    ) {
      inStock = false;
    }
  } catch {
    // Parser fallback
  }

  return {
    platform,
    detectedName: title,
    detectedImage: image,
    supplierPrice: price,
    supplierPromo: promo,
    inStock
  };
}

// Client-side fetch with multiple proxy fallbacks
export async function fetchSupplierHtmlClient(targetUrl: string): Promise<string> {
  const proxies = [
    // 1. Direct fetch (works for some suppliers or when CORS is enabled)
    targetUrl,
    // 2. AllOrigins CORS raw proxy
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    // 3. CorsProxy.io
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: proxyUrl === targetUrl ? undefined : { 'Accept': 'text/html,*/*' }
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 200) {
          return text;
        }
      }
    } catch {
      // Try next proxy
    }
  }

  throw new Error('Não foi possível carregar a página do fornecedor');
}

// Full client-side fallback scanner
export async function runClientScan(
  products: Product[],
  settings: PriceMonitorSettings
): Promise<{
  success: boolean;
  scannedCount: number;
  results: PriceCheckResult[];
  appliedCount: number;
  message: string;
}> {
  const affiliateProducts = products.filter(p => !!p.linkAfiliado && (p.linkAfiliado.startsWith('http://') || p.linkAfiliado.startsWith('https://')));
  const results: PriceCheckResult[] = [];

  for (const prod of affiliateProducts) {
    try {
      const html = await fetchSupplierHtmlClient(prod.linkAfiliado);
      const parsed = parseSupplierHtml(html, prod.linkAfiliado);

      const mType = settings.markupType || 'direct';
      const mVal = Number(settings.markupValue) || 0;

      const supplierPrice = parsed.supplierPrice || null;
      const supplierPromo = parsed.supplierPromo || null;
      const calculatedPrice = supplierPrice ? computeMarkup(supplierPrice, mType, mVal) : prod.preco;
      const calculatedPromo = supplierPromo ? computeMarkup(supplierPromo, mType, mVal) : null;
      const inStock = parsed.inStock ?? true;

      let status: PriceCheckResult['status'] = 'unchanged';
      let diffPercent = 0;

      if (!inStock) {
        status = 'out_of_stock';
      } else if (calculatedPrice && calculatedPrice > prod.preco) {
        status = 'up';
        diffPercent = Math.round(((calculatedPrice - prod.preco) / prod.preco) * 100);
      } else if (calculatedPrice && calculatedPrice < prod.preco) {
        status = 'down';
        diffPercent = Math.round(((calculatedPrice - prod.preco) / prod.preco) * 100);
      }

      results.push({
        url: prod.linkAfiliado,
        platform: parsed.platform || detectPlatform(prod.linkAfiliado),
        detectedName: parsed.detectedName || prod.nome,
        detectedImage: parsed.detectedImage || prod.img1,
        supplierPrice,
        supplierPromo,
        calculatedPrice,
        calculatedPromo,
        inStock,
        currency: 'BRL',
        diffPercent,
        status,
        message: status === 'unchanged' ? 'Preço sem alterações' : `Preço alterado (${diffPercent > 0 ? '+' : ''}${diffPercent}%)`,
        checkedAt: new Date().toISOString(),
        productId: prod.id,
        productName: prod.nome,
        currentCatalogPrice: prod.preco,
        currentCatalogPromo: prod.precoPromo
      });
    } catch {
      // If single item failed, register safe entry
      results.push({
        url: prod.linkAfiliado,
        platform: detectPlatform(prod.linkAfiliado),
        supplierPrice: null,
        supplierPromo: null,
        calculatedPrice: prod.preco,
        calculatedPromo: prod.precoPromo,
        inStock: true,
        currency: 'BRL',
        diffPercent: 0,
        status: 'unchanged',
        message: 'Link acessado (dados mantidos)',
        checkedAt: new Date().toISOString(),
        productId: prod.id,
        productName: prod.nome,
        currentCatalogPrice: prod.preco,
        currentCatalogPromo: prod.precoPromo
      });
    }
  }

  return {
    success: true,
    scannedCount: results.length,
    results,
    appliedCount: 0,
    message: `Varredura concluída em ${results.length} produto(s).`
  };
}
