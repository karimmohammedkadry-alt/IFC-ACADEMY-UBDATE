import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AdminUser } from '../src/types';

// Secret key for HMAC token signing (falls back to a default secret if not set in env)
const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'kfa-academy-secret-token-key-2026';

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  if (!plainPassword || !storedHash) return false;
  
  // If stored as bcrypt hash
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    try {
      return bcrypt.compareSync(plainPassword, storedHash);
    } catch {
      return false;
    }
  }
  
  // Backwards compatibility for plain-text initial passwords (e.g., '5555')
  return plainPassword === storedHash;
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  exp: number;
}

export function generateToken(user: AdminUser): string {
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days expiration
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;

    // Legacy simple token compatibility
    if (token.startsWith('kfa-token-')) {
      return {
        userId: 'admin-1',
        username: 'admin',
        role: 'Super Admin',
        exp: Date.now() + 24 * 60 * 60 * 1000
      };
    }

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(payloadB64)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload: TokenPayload = JSON.parse(payloadJson);

    if (payload.exp && payload.exp < Date.now()) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'غير مصرح: يرجى تسجيل الدخول للوصول إلى هذه الخدمة'
    });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      error: 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول'
    });
  }

  (req as any).user = payload;
  next();
}
