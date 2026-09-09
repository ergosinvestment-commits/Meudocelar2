/**
 * Utility for client-side image compression, normalization, and WebP / AVIF conversion.
 * Production-ready module for Meu Doce Lar.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/webp' | 'image/avif' | 'image/jpeg';
}

/**
 * Normalizes any external image URL (Google Drive, Google Images, AliExpress, Shopee,
 * Mercado Livre, Amazon, Dropbox, Imgur, Unsplash, etc.) into a clean, direct raw image URL.
 */
export function normalizeImageUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string') return '';
  let cleanUrl = url.trim();
  if (!cleanUrl) return '';

  // Data URLs (base64) are already direct image payloads
  if (cleanUrl.startsWith('data:image/')) return cleanUrl;

  // Protocol-relative URLs (e.g. //ae01.alicdn.com/...)
  if (cleanUrl.startsWith('//')) {
    cleanUrl = `https:${cleanUrl}`;
  }

  // Force HTTPS if starting with HTTP to avoid Mixed Content blocks
  if (cleanUrl.startsWith('http://')) {
    cleanUrl = cleanUrl.replace('http://', 'https://');
  }

  // Google Images URL extraction (when copying link from Google search results)
  if (cleanUrl.includes('google.com/') && (cleanUrl.includes('imgurl=') || cleanUrl.includes('imgrefurl='))) {
    try {
      const urlObj = new URL(cleanUrl);
      const extractedImg = urlObj.searchParams.get('imgurl');
      if (extractedImg) {
        cleanUrl = decodeURIComponent(extractedImg);
      }
    } catch {
      const match = cleanUrl.match(/[?&]imgurl=([^&]+)/i);
      if (match && match[1]) {
        cleanUrl = decodeURIComponent(match[1]);
      }
    }
  }

  // Google Drive direct image links
  const gDriveMatch = cleanUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=view&)?id=)([a-zA-Z0-9_-]+)/i);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gDriveMatch[1]}`;
  }

  // Dropbox preview to direct raw image
  if (cleanUrl.includes('dropbox.com')) {
    cleanUrl = cleanUrl.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
    if (!cleanUrl.includes('raw=1') && !cleanUrl.includes('dl=1')) {
      cleanUrl += cleanUrl.includes('?') ? '&raw=1' : '?raw=1';
    }
    return cleanUrl;
  }

  // Imgur page to direct image
  if (cleanUrl.includes('imgur.com') && !cleanUrl.includes('i.imgur.com')) {
    const imgurMatch = cleanUrl.match(/imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]+)$/i);
    if (imgurMatch && imgurMatch[1]) {
      return `https://i.imgur.com/${imgurMatch[1]}.jpg`;
    }
  }

  // AliExpress image URL cleanup (remove double extensions that break)
  if (cleanUrl.includes('alicdn.com') || cleanUrl.includes('aliexpress-media.com')) {
    // Clean trailing broken extensions like .jpg_640x640.png_.webp -> .jpg
    cleanUrl = cleanUrl.replace(/(\.(?:jpg|jpeg|png|webp))_[0-9x]+(?:\.[a-z]+)?(?:_\.[a-z]+)?$/i, '$1');
  }

  // Fix unescaped spaces
  if (cleanUrl.includes(' ')) {
    cleanUrl = cleanUrl.replace(/ /g, '%20');
  }

  // Unsplash optimization
  if (cleanUrl.includes('images.unsplash.com') && !cleanUrl.includes('auto=format')) {
    const separator = cleanUrl.includes('?') ? '&' : '?';
    cleanUrl = `${cleanUrl}${separator}auto=format&fit=crop&q=80`;
  }

  return cleanUrl;
}

/**
 * Returns a fallback proxy URL for remote images that fail due to CORS or Hotlink restrictions.
 */
export function getProxiedImageUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const clean = normalizeImageUrl(url);
  if (!clean || clean.startsWith('data:image/') || clean.startsWith('/api/proxy-image')) {
    return clean;
  }
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return `/api/proxy-image?url=${encodeURIComponent(clean)}`;
  }
  return clean;
}

export const FALLBACK_PRODUCT_IMAGE = '';

/**
 * Checks if the current browser environment supports AVIF canvas export.
 */
function isAvifSupported(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL('image/avif');
    return dataUrl.startsWith('data:image/avif');
  } catch {
    return false;
  }
}

/**
 * Reads a File or Blob directly to base64 DataURL (Universal fallback).
 */
export function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image File, Blob, or DataURL into a high-performance WebP/JPEG base64 string.
 * Uses robust Image loading with intrinsic natural dimensions and multi-tier fallbacks,
 * ensuring smartphone photos, screenshots, and local computer uploads NEVER produce blank images.
 */
export async function compressImageToWebP(
  source: File | Blob | string,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.88,
    format = 'image/webp'
  } = options;

  if (!source) return '';

  // Get raw DataURL or normalized URL
  let rawSource = '';
  if (typeof source === 'string') {
    rawSource = normalizeImageUrl(source);
  } else {
    rawSource = await readFileAsDataUrl(source);
  }

  if (!rawSource) return '';

  return new Promise((resolve) => {
    const img = new Image();
    if (rawSource.startsWith('http://') || rawSource.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }

    let finished = false;
    const safeResolve = (res: string) => {
      if (finished) return;
      finished = true;
      resolve(res || rawSource);
    };

    // Safety timeout: if canvas takes >2s, return rawSource directly
    const timer = setTimeout(() => {
      safeResolve(rawSource);
    }, 2000);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;

        if (width <= 0 || height <= 0) {
          return safeResolve(rawSource);
        }

        // Calculate scaled dimensions maintaining aspect ratio
        let targetW = width;
        let targetH = height;
        if (targetW > maxWidth || targetH > maxHeight) {
          const ratio = Math.min(maxWidth / targetW, maxHeight / targetH);
          targetW = Math.max(1, Math.round(targetW * ratio));
          targetH = Math.max(1, Math.round(targetH * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
          return safeResolve(rawSource);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);

        let targetFormat = format;
        let resultDataUrl = '';

        // If AVIF is supported and requested or defaulting, test if AVIF gives a smaller payload than WebP
        if (isAvifSupported()) {
          try {
            const avifData = canvas.toDataURL('image/avif', quality);
            const webpData = canvas.toDataURL('image/webp', quality);
            if (avifData && avifData.startsWith('data:image/avif') && avifData.length > 300) {
              if (webpData && webpData.startsWith('data:image/webp') && webpData.length > 300) {
                // Pick whichever is more compact (AVIF vs WebP)
                resultDataUrl = avifData.length <= webpData.length ? avifData : webpData;
              } else {
                resultDataUrl = avifData;
              }
            }
          } catch {
            resultDataUrl = '';
          }
        }

        // Default or fallback to WebP
        if (!resultDataUrl) {
          try {
            resultDataUrl = canvas.toDataURL('image/webp', quality);
          } catch {
            resultDataUrl = '';
          }
        }

        // If WebP export failed or produced invalid header, try JPEG/PNG
        if (!resultDataUrl || !resultDataUrl.startsWith('data:image/')) {
          try {
            resultDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          } catch {
            try {
              resultDataUrl = canvas.toDataURL('image/png');
            } catch {
              resultDataUrl = '';
            }
          }
        }

        // Validate result is not a blank 1x1 dummy string
        if (resultDataUrl && resultDataUrl.startsWith('data:image/') && resultDataUrl.length > 300) {
          return safeResolve(resultDataUrl);
        }

        return safeResolve(rawSource);
      } catch (err) {
        return safeResolve(rawSource);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      safeResolve(rawSource);
    };

    img.src = rawSource;
  });
}

/**
 * Formats any external image URL (Unsplash, CDNs) to enforce WebP/responsive size.
 */
export function formatToWebPUrl(url: string | undefined, width = 600): string {
  if (!url || typeof url !== 'string') return '';
  const clean = normalizeImageUrl(url);
  if (clean.startsWith('data:image/')) return clean;

  if (clean.includes('images.unsplash.com')) {
    const baseUrl = clean.split('?')[0];
    return `${baseUrl}?w=${width}&auto=format&fit=crop&q=80&fm=webp`;
  }

  return clean;
}

