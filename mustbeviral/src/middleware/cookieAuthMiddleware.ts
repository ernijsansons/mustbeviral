/**
 * Cookie Authentication Middleware
 * Handles secure cookie-based authentication for all protected routes
 */

import { SecureCookieAuth} from '../lib/auth/secureCookieAuth';
import type { Context, Next } from 'hono';

export interface AuthenticatedContext extends Context {
  user?: {
    userId: string;
    email: string;
    username: string;
    role: string;
  };
}

/**
 * Authentication middleware for protected routes
 */
export async function cookieAuthMiddleware(c: AuthenticatedContext, next: Next) {
  try {
    // Extract cookies from request
    const cookieHeader = c.req.header('Cookie');
    const { accessToken, refreshToken, csrfToken} = SecureCookieAuth.extractTokenFromCookies(cookieHeader);

    // Check CSRF token for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.req.method)) {
      const headerCsrfToken = c.req.header('X-CSRF-Token');

      if (!SecureCookieAuth.validateCsrfToken(csrfToken, headerCsrfToken)) {
        return c.json({ error: 'Invalid CSRF token' }, 403);
      }
    }

    // Try to verify access token
    let user = null;

    if (accessToken) {
      const payload = await SecureCookieAuth.verifyToken(accessToken);

      if (payload && payload.type === 'access') {
        user = {
          userId: payload.userId,
          email: payload.email!,
          username: payload.username!,
          role: payload.role!
        };
      }
    }

    // If access token is invalid/expired, try refresh token
    if (!user && refreshToken) {
      const refreshResult = await SecureCookieAuth.refreshAccessToken(refreshToken);

      if (refreshResult) {
        // Set new access token cookie
        const headers = new Headers();
        const isProduction = c.env?.ENVIRONMENT === 'production';
        const cookieOptions = SecureCookieAuth.getCookieOptions(isProduction);

        headers.append('Set-Cookie', `authtoken=${refreshResult.accessToken}; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`);
        c.header('Set-Cookie', headers.get('Set-Cookie')!);

        // Verify the new token to get user info
        const payload = await SecureCookieAuth.verifyToken(refreshResult.accessToken);

        if (payload) {
          // Fetch user details from database if needed
          user = {
            userId: payload.userId,
            email: payload.email ?? '',
            username: payload.username ?? '',
            role: payload.role ?? 'user'
          };
        }
      }
    }

    // Attach user to context if authenticated
    if (user) {
      c.user = user;
    }

    await next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return c.json({ error: 'Authentication failed' }, 401);
  }
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(c: AuthenticatedContext, next: Next) {
  // Run cookie auth middleware first
  await cookieAuthMiddleware(c, async() => {
    // Check if user is authenticated
    if (!c.user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    await next();
  });
}

/**
 * Middleware to require specific role
 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: AuthenticatedContext, next: Next) => {
    await requireAuth(c, async() => {
      if (!c.user  ?? !allowedRoles.includes(c.user.role)) {
        return c.json({ error: 'Insufficient permissions' }, 403);
      }

      await next();
    });
  };
}

/**
 * Optional authentication middleware (doesn't fail if not authenticated)
 */
export async function optionalAuth(c: AuthenticatedContext, next: Next) {
  try {
    await cookieAuthMiddleware(c, next);
  } catch {
    // Continue without authentication
    await next();
  }
}