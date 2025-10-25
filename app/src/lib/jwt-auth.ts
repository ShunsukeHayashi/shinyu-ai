/**
 * JWT Authentication Utilities for WebSocket Connections
 * AI Girlfriend Platform
 */

import * as jwt from 'jsonwebtoken';

/**
 * JWT Payload structure
 */
export interface JWTPayload {
  userId: string;
  conversationId: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT configuration
 */
interface JWTConfig {
  secret: string;
  expiresIn: string | number;
  issuer?: string;
  audience?: string;
}

/**
 * Get JWT configuration from environment
 */
function getJWTConfig(): JWTConfig {
  return {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: process.env.JWT_ISSUER || 'shinyu-ai',
    audience: process.env.JWT_AUDIENCE || 'shinyu-ai-client',
  };
}

/**
 * Generate JWT token for WebSocket authentication
 */
export function generateToken(userId: string, conversationId: string): string {
  const config = getJWTConfig();

  const payload: JWTPayload = {
    userId,
    conversationId,
  };

  return jwt.sign(payload, config.secret, {
    expiresIn: config.expiresIn,
    issuer: config.issuer,
    audience: config.audience,
  });
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  const config = getJWTConfig();

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      config.secret,
      {
        issuer: config.issuer,
        audience: config.audience,
      },
      (err, decoded) => {
        if (err) {
          reject(new Error(`Token verification failed: ${err.message}`));
        } else {
          resolve(decoded as JWTPayload);
        }
      }
    );
  });
}

/**
 * Decode JWT token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

/**
 * Refresh token (generate new token with same payload)
 */
export function refreshToken(token: string): string | null {
  try {
    const decoded = decodeToken(token);
    if (!decoded) {
      return null;
    }

    return generateToken(decoded.userId, decoded.conversationId);
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Validate token structure
 */
export function validateTokenStructure(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.userId || !decoded.conversationId) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Extract user ID from token
 */
export function extractUserId(token: string): string | null {
  const decoded = decodeToken(token);
  return decoded?.userId || null;
}

/**
 * Extract conversation ID from token
 */
export function extractConversationId(token: string): string | null {
  const decoded = decodeToken(token);
  return decoded?.conversationId || null;
}
