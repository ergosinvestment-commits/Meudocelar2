import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'meudocelar_jwt_seguro_2026_x89a7sdf78b4c2e1f9a';

// Rate Limiter for Login (Protects against brute-force attacks)
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Muitas tentativas de login. Aguarde 15 minutos antes de tentar novamente.'
  }
});

// General API Rate Limiter
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Limite de requisições excedido. Reduza a frequência.'
  }
});

// Hash password with bcrypt
export function hashPassword(plainText: string): string {
  try {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(plainText, salt);
  } catch (e) {
    // Fallback sha256
    return crypto.createHash('sha256').update(plainText).digest('hex');
  }
}

// Verify password with bcrypt (returns match and needsRehash status)
export function verifyPassword(plainText: string, hashed: string | undefined | null): { match: boolean; needsRehash: boolean } {
  if (!plainText || !hashed) return { match: false, needsRehash: false };
  try {
    if (hashed.startsWith('$2a$') || hashed.startsWith('$2b$') || hashed.startsWith('$2y$')) {
      const match = bcrypt.compareSync(plainText, hashed);
      return { match, needsRehash: false };
    }
    // Fallback direct or sha256 check
    const sha256 = crypto.createHash('sha256').update(plainText).digest('hex');
    const match = hashed === sha256 || hashed === plainText;
    return { match, needsRehash: match }; // Needs upgrade to bcrypt if plain/sha256 matched
  } catch (e) {
    const match = plainText === hashed;
    return { match, needsRehash: match };
  }
}

// Flexible JWT generation supporting both object payload or (slug, username, email, hours) signature
export function generateAdminToken(
  slugOrPayload: string | { id?: string; username: string; role?: string; slug?: string; email?: string },
  username?: string,
  email?: string,
  hours: number = 72
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);

  let payloadObj: any = {};
  if (typeof slugOrPayload === 'string') {
    payloadObj = {
      slug: slugOrPayload,
      username: username || 'admin',
      email: email || '',
      role: 'ADMIN',
      iat: now,
      exp: now + 60 * 60 * (hours || 72)
    };
  } else {
    payloadObj = {
      ...slugOrPayload,
      iat: now,
      exp: now + 60 * 60 * (hours || 720)
    };
  }

  const data = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${data}`)
    .digest('base64url');

  return `${header}.${data}.${signature}`;
}

// Verify Admin Token
export function verifyAdminToken(token: string): any | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, data, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${data}`)
    .digest('base64url');

  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // expired
    }
    return payload;
  } catch (e) {
    return null;
  }
}

// Express middleware to protect sensitive admin endpoints
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login para continuar.' });
  }

  const token = authHeader.substring(7);
  const payload = verifyAdminToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
  }

  (req as any).user = payload;
  next();
}
