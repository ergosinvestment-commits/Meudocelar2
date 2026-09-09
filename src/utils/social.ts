import { StoreConfig } from '../types';

export interface SocialLinksResult {
  whatsapp: string | null;
  telegram: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  hasAny: boolean;
}

/**
 * Parses and sanitizes social media links and channel URLs from StoreConfig.
 * Returns null for any network that is not filled or contains only empty/whitespace/placeholder values.
 */
export function getSocialLinks(config?: StoreConfig | null): SocialLinksResult {
  if (!config) {
    return {
      whatsapp: null,
      telegram: null,
      instagram: null,
      facebook: null,
      tiktok: null,
      hasAny: false,
    };
  }

  // 1. WhatsApp Channel / Direct Link
  const rawWa = (config.canalWhatsapp || '').trim();
  let whatsapp: string | null = null;
  if (rawWa && rawWa !== '@') {
    if (rawWa.startsWith('http://') || rawWa.startsWith('https://')) {
      whatsapp = rawWa;
    } else if (rawWa.startsWith('wa.me/')) {
      whatsapp = `https://${rawWa}`;
    } else if (rawWa.length >= 8 && /^\+?[0-9\s()-]+$/.test(rawWa)) {
      whatsapp = `https://wa.me/${rawWa.replace(/\D/g, '')}`;
    } else {
      whatsapp = `https://${rawWa}`;
    }
  }

  // 2. Telegram Channel / Direct Link
  const rawTg = (config.canalTelegram || '').trim();
  let telegram: string | null = null;
  if (rawTg && rawTg !== '@') {
    if (rawTg.startsWith('http://') || rawTg.startsWith('https://')) {
      telegram = rawTg;
    } else if (rawTg.startsWith('t.me/')) {
      telegram = `https://${rawTg}`;
    } else {
      telegram = `https://t.me/${rawTg.replace(/^@+/, '')}`;
    }
  }

  // 3. Instagram Profile
  const rawIg = (config.instagram || '').replace(/^@+/, '').trim();
  let instagram: string | null = null;
  if (rawIg) {
    if (rawIg.startsWith('http://') || rawIg.startsWith('https://')) {
      instagram = rawIg;
    } else {
      instagram = `https://instagram.com/${rawIg}`;
    }
  }

  // 4. Facebook Page / Profile
  const rawFb = (config.facebook || '').trim();
  let facebook: string | null = null;
  if (rawFb && rawFb !== '@') {
    if (rawFb.startsWith('http://') || rawFb.startsWith('https://')) {
      facebook = rawFb;
    } else {
      facebook = `https://facebook.com/${rawFb.replace(/^\/+/, '')}`;
    }
  }

  // 5. TikTok Profile
  const rawTt = (config.tiktok || '').replace(/^@+/, '').trim();
  let tiktok: string | null = null;
  if (rawTt) {
    if (rawTt.startsWith('http://') || rawTt.startsWith('https://')) {
      tiktok = rawTt;
    } else {
      tiktok = `https://tiktok.com/@${rawTt}`;
    }
  }

  const hasAny = Boolean(whatsapp || telegram || instagram || facebook || tiktok);

  return {
    whatsapp,
    telegram,
    instagram,
    facebook,
    tiktok,
    hasAny,
  };
}
