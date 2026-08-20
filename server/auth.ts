import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AdminUser } from '../src/types';
import { getSupabase } from './supabase';

// Secret key for HMAC token signing
const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'ifc-academy-secure-auth-secret-key-prod-2026';

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(12);
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
  
  // Strict check
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

// In-memory fallback rate limiting map for serverless instances
interface LoginAttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const memoryLoginAttempts = new Map<string, LoginAttemptRecord>();

export async function checkLoginRateLimit(identifier: string, ipAddress?: string): Promise<{ allowed: boolean; remainingMinutes?: number }> {
  const key = identifier.toLowerCase().trim();
  const now = Date.now();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('identifier', key)
        .single();

      if (!error && data) {
        if (data.lockedUntil && new Date(data.lockedUntil).getTime() > now) {
          const remainingMinutes = Math.ceil((new Date(data.lockedUntil).getTime() - now) / (60 * 1000));
          return { allowed: false, remainingMinutes };
        }
      }
    } catch {
      // Fallback to memory check
    }
  }

  const record = memoryLoginAttempts.get(key);
  if (!record) return { allowed: true };

  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingMinutes = Math.ceil((record.lockedUntil - now) / (60 * 1000));
    return { allowed: false, remainingMinutes };
  }

  if (now - record.firstAttemptAt > 15 * 60 * 1000) {
    memoryLoginAttempts.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

export async function recordFailedLogin(identifier: string, ipAddress?: string): Promise<{ locked: boolean; remainingMinutes?: number }> {
  const key = identifier.toLowerCase().trim();
  const now = Date.now();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('identifier', key)
        .single();

      if (data) {
        const newCount = (data.attemptsCount || 0) + 1;
        const lockedUntil = newCount >= 5 ? new Date(now + 15 * 60 * 1000).toISOString() : null;
        await supabase
          .from('login_attempts')
          .update({
            attemptsCount: newCount,
            lockedUntil,
            lastAttemptAt: new Date().toISOString(),
            ipAddress: ipAddress || data.ipAddress
          })
          .eq('identifier', key);

        if (newCount >= 5) {
          return { locked: true, remainingMinutes: 15 };
        }
      } else {
        await supabase.from('login_attempts').insert({
          identifier: key,
          attemptsCount: 1,
          ipAddress: ipAddress || null,
          lastAttemptAt: new Date().toISOString()
        });
      }
    } catch {
      // Fallback to memory
    }
  }

  const record = memoryLoginAttempts.get(key);
  if (!record || (now - record.firstAttemptAt > 15 * 60 * 1000)) {
    memoryLoginAttempts.set(key, { count: 1, firstAttemptAt: now });
    return { locked: false };
  }

  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000;
    return { locked: true, remainingMinutes: 15 };
  }

  return { locked: false };
}

export async function resetLoginAttempts(identifier: string): Promise<void> {
  const key = identifier.toLowerCase().trim();
  memoryLoginAttempts.delete(key);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('login_attempts').delete().eq('identifier', key);
    } catch {
      // Ignore
    }
  }
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;

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
      return null;
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
