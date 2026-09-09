import * as cheerio from 'cheerio';
import { PriceCheckResult, PriceMarkupType } from '../types';

export function detectPlatformFromUrl(url: string): string {
  if (!url || typeof url !== 'string') return 'Outro';
  const lower = url.toLowerCase();
  if (lower.includes('amazon.')) return 'Amazon';
  if (lower.includes('shopee.')) return 'Shopee';
  if (lower.includes('mercadolivre.') || lower.includes('mercadolibre.')) return 'Mercado Livre';
  if (lower.includes('magazineluiza.') || lower.includes('magalu.')) return 'Magalu';
  if (lower.includes('aliexpress.')) return 'AliExpress';
  if (lower.includes('shein.')) return 'SHEIN';
  if (lower.includes('hotmart.')) return 'Hotmart';
  if (lower.includes('kiwify.')) return 'Kiwify';
  if (lower.includes('eduzz.')) return 'Eduzz';
  if (lower.includes('braip.')) return 'Braip';
  return 'Geral';
}

export function parsePriceFromText(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[\n\r\t]/g, ' ').trim();
  const match = cleaned.match(/R\$\s*([\d\.,]+)/i) || cleaned.match(/([\d\.,]+)/);
  if (!match) return null;

  let rawNum = match[1].trim();
  if (rawNum.includes(',') && rawNum.includes('.')) {
    rawNum = rawNum.replace(/\./g, '').replace(',', '.');
  } else if (rawNum.includes(',')) {
    rawNum = rawNum.replace(',', '.');
  }

  const parsed = parseFloat(rawNum);
  return isNaN(parsed) || parsed <= 0 ? null : Math.round(parsed * 100) / 100;
}

export function calculateMarkupPrice(
  basePrice: number | null | undefined,
  markupType: PriceMarkupType | string = 'none',
  markupValue: number = 0
): number | null {
  if (basePrice === null || basePrice === undefined || isNaN(basePrice) || basePrice <= 0) {
    return null;
  }

  const val = Number(markupValue) || 0;
  let finalPrice = basePrice;

  if (markupType === 'percentage') {
    finalPrice = basePrice * (1 + val / 100);
  } else if (markupType === 'fixed_value' || markupType === 'fixed') {
    finalPrice = basePrice + val;
  }

  return Math.round(finalPrice * 100) / 100;
}

export async function fetchSupplierData(url: string, options?: { timeoutMs?: number }): Promise<PriceCheckResult> {
  const platform = detectPlatformFromUrl(url);
  const result: PriceCheckResult = {
    url,
    platform,
    supplierPrice: null,
    supplierPromo: null,
    inStock: true,
    checkedAt: new Date().toISOString()
  };

  try {
    const timeout = options?.timeoutMs || 12000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      result.status = 'error';
      return result;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Look for JSON-LD Structured Data
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).html();
        if (!text) return;
        const json = JSON.parse(text);
        const data = Array.isArray(json) ? json[0] : json;

        if (data['@type'] === 'Product' || data.offers) {
          const offers = Array.isArray(data.offers) ? data.offers[0] : data.offers;
          if (offers) {
            if (offers.price) {
              const p = parseFloat(offers.price);
              if (!isNaN(p) && p > 0) result.supplierPrice = p;
            }
            if (offers.availability) {
              const avail = String(offers.availability).toLowerCase();
              if (avail.includes('outofstock') || avail.includes('soldout')) {
                result.inStock = false;
              }
            }
          }
        }
      } catch (_) {}
    });

    // Fallback: Check common CSS Selectors for Prices
    if (!result.supplierPrice) {
      const priceSelectors = [
        '.a-price .a-offscreen',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '.price-current',
        '.andes-money-amount__fraction',
        '[data-testid="price-value"]',
        '.ui-pdp-price__second-line .andes-money-amount__fraction',
        '.sales-price',
        '.product-price'
      ];

      for (const sel of priceSelectors) {
        const text = $(sel).first().text();
        const p = parsePriceFromText(text);
        if (p) {
          result.supplierPrice = p;
          break;
        }
      }
    }

    // Check Out of Stock Indicators
    const pageText = $('body').text().toLowerCase();
    if (
      pageText.includes('não disponível') ||
      pageText.includes('indisponível') ||
      pageText.includes('esgotado') ||
      pageText.includes('fora de estoque') ||
      pageText.includes('currently unavailable') ||
      pageText.includes('out of stock')
    ) {
      result.inStock = false;
    }

    result.status = result.inStock ? 'unchanged' : 'out_of_stock';
    return result;
  } catch (err: any) {
    result.error = err?.message || 'Falha ao consultar fornecedor';
    result.status = 'error';
    return result;
  }
}
