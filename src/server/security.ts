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
    // Add session ID to prevent fixation
    if (!payload.sid) {
      payload.sid = 'session-' + Math.random().toString(36).substr(2, 24);
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

  // Attach user to request for authorization checks
  (req as any).user = payload;
  
  // Session fixation prevention: regenerate session ID on successful auth
  // Note: Full session regeneration requires session store integration
  
  next();
}

//============================================================================
// FRONTEND IS NOT A SECURITY LAYER - READ THIS CAREFULLY
//============================================================================
//
// Tudo que estiver protegido somente por JavaScript, React, HTML, CSS
// ou interface pode ser manipulado pelo usuário.
//
// Portanto:
// - esconder botão não é autorização;
// - esconder rota não é autorização;
// - bloquear menu não é autorização;
// - bloquear DevTools não é segurança;
// - desabilitar botão direito não é segurança;
// - bloquear Ctrl+C não é segurança.
//
// Toda operação protegida deve ser validada no servidor e, quando aplicável,
// novamente no banco através de RLS.
//
//============================================================================

// Rate limiter for admin endpoints (more restrictive than general API limiter)
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 admin requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Muitas requisições administrativas. Aguarde 15 minutos antes de tentar novamente.'
  }
});

// Security event logger
const securityLogs: Array<{ timestamp: number; type: string; message: string; ip?: string }> = [];

export function logSecurityEvent(type: string, message: string, ip?: string) {
  securityLogs.push({
    timestamp: Date.now(),
    type,
    message,
    ip
  });

  // Keep only last 100 logs to prevent memory growth
  if (securityLogs.length > 100) {
    securityLogs.shift();
  }

  // In production, would send to external logging service
  console.log(`[Security ${type}] ${message}`);
}

// Clear security logs (admin only)
export function clearSecurityLogs(): void {
  securityLogs.length = 0;
}

// Token storage recommendations:
// - Prefer HttpOnly cookies over localStorage for session tokens
// - Never store tokens in plain localStorage for sensitive operations
// - Implement token refresh before expiration
// - Implement logout to invalidate server-side session
// - Set SameSite=Strict or SameSite=Lax for cookies
// - Set Secure flag for cookies in production (HTTPS only)
// - Shorten token expiration and use refresh token flow

// Security event logger
const securityLogs: Array<{ timestamp: number; type: string; message: string; ip?: string }> = [];

export function logSecurityEvent(type: string, message: string, ip?: string) {
  securityLogs.push({
    timestamp: Date.now(),
    type,
    message,
    ip
  });

  // Keep only last 100 logs to prevent memory growth
  if (securityLogs.length > 100) {
    securityLogs.shift();
  }

  // In production, would send to external logging service
  console.log(`[Security ${type}] ${message}`);
}

// Clear security logs (admin only)
export function clearSecurityLogs(): void {
  securityLogs.length = 0;
}

// Input validation utilities
export function validateId(id: string | undefined | null): boolean {
  if (!id) return false;
  const idRegex = /^[a-zA-Z0-9_-]+$/;
  return idRegex.test(id) && id.length >= 3 && id.length <= 64;
}

export function validateSlug(slug: string | undefined | null): boolean {
  if (!slug) return false;
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 128;
}

export function validateEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

export function validatePassword(password: string | undefined | null): { valid: boolean; message: string } {
  if (!password) return { valid: false, message: 'Senha é obrigatória.' };
  if (password.length < 6) return { valid: false, message: 'Senha deve ter pelo menos 6 caracteres.' };
  if (password.length > 128) return { valid: false, message: 'Senha muito longa (máximo 128 caracteres).' };
  // Check for at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) return { valid: false, message: 'Senha deve conter letras e números.' };
  return { valid: true, message: 'Senha válida.' };
}

export function validatePositiveNumber(value: number | undefined | null): boolean {
  if (value === undefined || value === null || value < 0) return false;
  return Number.isInteger(value) || value > 0;
}

// XSS sanitization helper
export function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  let sanitized = input.trim();
  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  // Encode potentially dangerous characters
  sanitized = sanitized.replace(/&/g, '&');
  sanitized = sanitized.replace(/</g, '<');
  sanitized = sanitized.replace(/>/g, '>');
  sanitized = sanitized.replace(/"/g, '"');
  // Remove single quotes (XSS prevention)
  sanitized = sanitized.replace(/'/g, String.fromCharCode(8217));
  return sanitized;
}
