/**
 * Token Blacklist Service
 * Manages blacklisted JWT tokens using Cloudflare KV
 */

import { CloudflareEnv } from '../cloudflare';
import { ValidationError } from '../../middleware/validation';

export interface BlacklistEntry {
  jti: string; // JWT ID
  reason: string;
  blacklistedAt: string;
  expiresAt: string;
  userId?: string;
  sessionId?: string;
}

export class TokenBlacklist {
  private kv: KVNamespace;

  constructor(env: CloudflareEnv) {
    this.kv = env.TRENDS_CACHE; // Using existing KV namespace
  }

  /**
   * Add a token to the blacklist
   */
  async blacklistToken(
    jti: string,
    expiresAt: Date,
    reason: string = 'logout',
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      const entry: BlacklistEntry = { _jti,
        reason,
        blacklistedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        userId,
        sessionId
      };

      const key = `blacklist:${jti}`;
      const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

      // Store in KV with TTL matching token expiry
      await this.kv.put(key, JSON.stringify(entry), {
        expirationTtl: Math.max(ttl, 60) // Minimum 60 seconds
      });

      console.log(`LOG: BLACKLIST-1 - Token blacklisted: ${jti}, reason: ${reason}`);
    } catch (error: unknown) {
      console.error('LOG: BLACKLIST-ERROR-1 - Failed to blacklist token:', error);
      throw new ValidationError(
        [{ field: 'blacklist', message: 'Failed to blacklist token' }],
        'Token blacklist operation failed'
      );
    }
  }

  /**
   * Check if a token is blacklisted
   */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    try {
      const key = `blacklist:${jti}`;
      const entry = await this.kv.get(key);

      return entry !== null;
    } catch (error: unknown) {
      console.error('LOG: BLACKLIST-ERROR-2 - Failed to check blacklist:', error);
      // Fail open - if we can't check blacklist, allow the request
      // This prevents KV outages from blocking all authentication
      return false;
    }
  }

  /**
   * Get blacklist entry details
   */
  async getBlacklistEntry(jti: string): Promise<BlacklistEntry | null> {
    try {
      const key = `blacklist:${jti}`;
      const entryJson = await this.kv.get(key);

      if (!entryJson) {
        return null;
      }

      return JSON.parse(entryJson) as BlacklistEntry;
    } catch (error: unknown) {
      console.error('LOG: BLACKLIST-ERROR-3 - Failed to get blacklist entry:', error);
      return null;
    }
  }

  /**
   * Blacklist all tokens for a user (e.g., on password change)
   */
  async blacklistUserTokens(userId: string, reason: string = 'password_change'): Promise<void> {
    try {
      // Store a user-level blacklist entry
      const key = `user_blacklist:${userId}`;
      const entry = { _userId,
        reason,
        blacklistedAt: new Date().toISOString()
      };

      // Store for 7 days (longer than refresh token lifetime)
      await this.kv.put(key, JSON.stringify(entry), {
        expirationTtl: 604800 // 7 days
      });

      console.log(`LOG: BLACKLIST-2 - All tokens blacklisted for user: ${userId}, reason: ${reason}`);
    } catch (error: unknown) {
      console.error('LOG: BLACKLIST-ERROR-4 - Failed to blacklist user tokens:', error);
      throw new ValidationError(
        [{ field: 'userBlacklist', message: 'Failed to blacklist user tokens' }],
        'User token blacklist operation failed'
      );
    }
  }

  /**
   * Check if all tokens for a user are blacklisted
   */
  async areUserTokensBlacklisted(userId: string): Promise<boolean> {
    try {
      const key = `user_blacklist:${userId}`;
      const entry = await this.kv.get(key);

      return entry !== null;
    } catch (error: unknown) {
      console.error('LOG: BLACKLIST-ERROR-5 - Failed to check user blacklist:', error);
      return false;
    }
  }

  /**
   * Blacklist all tokens for a session
   */
  async blacklistSessionTokens(sessionId: string, reason: string = 'session_invalidated'): Promise<void> {
    try {
      const key = `session_blacklist:${sessionId}`;
      const entry = { _sessionId,
        reason,
        blacklistedAt: new Date().toISOString()
      };

      // Store for 7 days
      await this.kv.put(key, JSON.stringify(entry), {
        expirationTtl: 604800 // 7 days
      });

      console.log(`LOG: BLACKLIST-3 - Session tokens blacklisted: ${sessionId}, reason: ${reason}`);
    } catch (error: unknown) {
      console.error('LOG: BLACKLIST-ERROR-6 - Failed to blacklist session tokens:', error);
      throw new ValidationError(
        [{ field: 'sessionBlacklist', message: 'Failed to blacklist session tokens' }],
        'Session token blacklist operation failed'
      );
    }
  }

  /**
   * Check if session tokens are blacklisted
   */
  async areSessionTokensBlacklisted(sessionId: string): Promise<boolean> {
    try {
      const key = `session_blacklist:${sessionId}`;
      const entry = await this.kv.get(key);

      return entry !== null;
    } catch (error: unknown) {
      console.error('LOG: BLACKLIST-ERROR-7 - Failed to check session blacklist:', error);
      return false;
    }
  }

  /**
   * Comprehensive blacklist check
   */
  async isTokenFullyBlacklisted(jti: string, userId?: string, sessionId?: string): Promise<{
    blacklisted: boolean;
    reason?: string;
    type?: 'token' | 'user' | 'session';
  }> {
    try {
      // Check token-specific blacklist
      if (await this.isTokenBlacklisted(jti)) {
        const entry = await this.getBlacklistEntry(jti);
        return {
          blacklisted: true,
          reason: entry?.reason,
          type: 'token'
        };
      }

      // Check user-level blacklist
      if (userId && await this.areUserTokensBlacklisted(userId)) {
        return {
          blacklisted: true,
          reason: 'User tokens invalidated',
          type: 'user'
        };
      }

      // Check session-level blacklist
      if (sessionId && await this.areSessionTokensBlacklisted(sessionId)) {
        return {
          blacklisted: true,
          reason: 'Session invalidated',
          type: 'session'
        };
      }

      return { blacklisted: false };
    } catch (error: unknown) {
      console.error('LOG: BLACKLIST-ERROR-8 - Failed comprehensive blacklist check:', error);
      return { blacklisted: false };
    }
  }

  /**
   * Clean up expired blacklist entries (maintenance function)
   */
  async cleanupExpiredEntries(): Promise<{ cleaned: number }> {
    try {
      const keys = await this.kv.list({ prefix: 'blacklist:' });
      let cleaned = 0;

      for (const key of keys.keys) {
        try {
          const entryJson = await this.kv.get(key.name);
          if (entryJson) {
            const entry = JSON.parse(entryJson) as BlacklistEntry;
            const expiresAt = new Date(entry.expiresAt);

            // If token has expired, KV will auto-delete it, but we can force cleanup
            if (expiresAt.getTime() < Date.now()) {
              await this.kv.delete(key.name);
              cleaned++;
            }
          }
        } catch (error: unknown) {
          // Skip invalid entries
          console.warn(`LOG: BLACKLIST-WARN-1 - Invalid blacklist entry: ${key.name}`);
        }
      }

      console.log(`LOG: BLACKLIST-4 - Cleaned up ${cleaned} expired blacklist entries`);
      return { cleaned };
    } catch (error: unknown) {
      console.error('LOG: BLACKLIST-ERROR-9 - Failed to cleanup blacklist:', error);
      return { cleaned: 0 };
    }
  }

  /**
   * Get blacklist statistics
   */
  async getBlacklistStats(): Promise<{
    totalEntries: number;
    tokenEntries: number;
    userEntries: number;
    sessionEntries: number;
  }> {
    try {
      const [tokenList, userList, sessionList] = await Promise.all([
        this.kv.list({ prefix: 'blacklist:' }),
        this.kv.list({ prefix: 'user_blacklist:' }),
        this.kv.list({ prefix: 'session_blacklist:' })
      ]);

      return {
        totalEntries: tokenList.keys.length + userList.keys.length + sessionList.keys.length,
        tokenEntries: tokenList.keys.length,
        userEntries: userList.keys.length,
        sessionEntries: sessionList.keys.length
      };
    } catch (error: unknown) {
      console.error('LOG: BLACKLIST-ERROR-10 - Failed to get blacklist stats:', error);
      return {
        totalEntries: 0,
        tokenEntries: 0,
        userEntries: 0,
        sessionEntries: 0
      };
    }
  }
}

// Helper function to extract JTI from JWT payload
export function extractJTI(token: string): string {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload.jti || `${payload.sub}_${payload.iat}`;
  } catch (error: unknown) {
    throw new ValidationError(
      [{ field: 'token', message: 'Failed to extract token identifier' }],
      'Token parsing failed'
    );
  }
}