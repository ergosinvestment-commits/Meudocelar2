import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export function getUploadsDir(): string {
  if (fs.existsSync('/home/u566136191')) {
    return '/home/u566136191/domains/meudocelar.com.br/uploads';
  }
  return process.env.UPLOAD_DIR || process.env.UPLOADS_DIR || path.join(process.cwd(), 'data', 'uploads');
}

export const UPLOADS_DIR = getUploadsDir();

export interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'avif';
}

/**
 * Optimizes an image buffer into WebP or AVIF with high-efficiency compression.
 * Uses smart subsampling and auto-orientation.
 */
export async function optimizeBuffer(
  inputBuffer: Buffer,
  options: OptimizeOptions = {}
): Promise<{ buffer: Buffer; mimeType: string; extension: string; originalSize: number; newSize: number }> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 82,
    format = 'webp'
  } = options;

  const originalSize = inputBuffer.length;
  let pipeline = sharp(inputBuffer, { failOn: 'none' }).rotate();

  // Scale down if larger than maximum bounds, without upscaling
  pipeline = pipeline.resize({
    width: maxWidth,
    height: maxHeight,
    fit: 'inside',
    withoutEnlargement: true
  });

  let outputBuffer: Buffer;
  let mimeType = 'image/webp';
  let extension = 'webp';

  if (format === 'avif') {
    outputBuffer = await pipeline
      .avif({
        quality: Math.min(quality, 80),
        effort: 4
      })
      .toBuffer();
    mimeType = 'image/avif';
    extension = 'avif';
  } else {
    outputBuffer = await pipeline
      .webp({
        quality,
        effort: 4,
        smartSubsample: true
      })
      .toBuffer();
    mimeType = 'image/webp';
    extension = 'webp';
  }

  return {
    buffer: outputBuffer,
    mimeType,
    extension,
    originalSize,
    newSize: outputBuffer.length
  };
}

/**
 * Optimizes a base64 DataURL (PNG, JPG, HEIC, etc.) into a lightweight WebP or AVIF DataURL.
 */
export async function optimizeBase64(
  dataUrl: string,
  options: OptimizeOptions = {}
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  try {
    const match = dataUrl.match(/^data:image\/([A-Za-z-+.]+);base64,(.+)$/);
    if (!match || match.length < 3) {
      return dataUrl;
    }

    const base64Data = match[2];
    const inputBuf = Buffer.from(base64Data, 'base64');
    const { buffer, mimeType } = await optimizeBuffer(inputBuf, options);

    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn('[imageOptimizer] optimizeBase64 fallback:', err);
    return dataUrl;
  }
}

/**
 * Ensures any external image URL (Unsplash, CDNs, etc.) is configured to request WebP/AVIF format.
 */
export function optimizeImageUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (!clean) return '';

  // Data URLs handled separately
  if (clean.startsWith('data:image/')) return clean;

  // Force HTTPS if protocol-relative
  if (clean.startsWith('//')) {
    clean = `https:${clean}`;
  } else if (clean.startsWith('http://')) {
    clean = clean.replace('http://', 'https://');
  }

  // Google Images URL extraction
  if (clean.includes('google.com/') && (clean.includes('imgurl=') || clean.includes('imgrefurl='))) {
    try {
      const urlObj = new URL(clean);
      const extractedImg = urlObj.searchParams.get('imgurl');
      if (extractedImg) {
        clean = decodeURIComponent(extractedImg);
      }
    } catch {
      const match = clean.match(/[?&]imgurl=([^&]+)/i);
      if (match && match[1]) {
        clean = decodeURIComponent(match[1]);
      }
    }
  }

  // Google Drive direct image links
  const gDriveMatch = clean.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=view&)?id=)([a-zA-Z0-9_-]+)/i);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gDriveMatch[1]}`;
  }

  // Dropbox
  if (clean.includes('dropbox.com')) {
    clean = clean.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
    if (!clean.includes('raw=1') && !clean.includes('dl=1')) {
      clean += clean.includes('?') ? '&raw=1' : '?raw=1';
    }
    return clean;
  }

  // Imgur
  if (clean.includes('imgur.com') && !clean.includes('i.imgur.com')) {
    const imgurMatch = clean.match(/imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]+)$/i);
    if (imgurMatch && imgurMatch[1]) {
      return `https://i.imgur.com/${imgurMatch[1]}.webp`;
    }
  }

  // AliExpress image URL cleanup
  if (clean.includes('alicdn.com') || clean.includes('aliexpress-media.com')) {
    clean = clean.replace(/(\.(?:jpg|jpeg|png|webp))_[0-9x]+(?:\.[a-z]+)?(?:_\.[a-z]+)?$/i, '$1');
  }

  // Unsplash: enforce modern WebP / AVIF format parameters
  if (clean.includes('images.unsplash.com')) {
    const baseUrl = clean.split('?')[0];
    return `${baseUrl}?w=800&auto=format&fit=crop&q=80&fm=webp`;
  }

  return clean;
}

/**
 * Saves an uploaded image buffer or base64 DataURL directly to disk as an optimized WebP file.
 */
export async function saveOptimizedUpload(
  source: Buffer | string,
  uploadsDir?: string,
  options: OptimizeOptions = {}
): Promise<{ publicUrl: string; originalSize: number; newSize: number }> {
  // Define destination dinamicamente na Hostinger (/home/u566136191/files/uploads)
  const destination = uploadsDir || getUploadsDir();

  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  let inputBuffer: Buffer;
  if (typeof source === 'string') {
    const match = source.match(/^data:image\/[A-Za-z-+.]+;base64,(.+)$/);
    if (match && match[1]) {
      inputBuffer = Buffer.from(match[1], 'base64');
    } else {
      inputBuffer = Buffer.from(source.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    }
  } else {
    inputBuffer = source;
  }

  const { buffer, extension, originalSize, newSize } = await optimizeBuffer(inputBuffer, {
    format: options.format || 'webp',
    quality: options.quality || 82,
    ...options
  });

  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;
  const filePath = path.join(destination, fileName);
  await fs.promises.writeFile(filePath, buffer);

  const publicUrl = destination.includes('files/uploads') ? `/files/uploads/${fileName}` : `/uploads/${fileName}`;

  return {
    publicUrl,
    originalSize,
    newSize
  };
}