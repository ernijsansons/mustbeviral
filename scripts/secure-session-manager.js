#!/usr/bin/env node

/**
 * Secure Session Management System
 * Enterprise-grade session security for Must Be Viral V2
 * Features: JWT with refresh tokens, session validation, security monitoring
 */

const crypto = require('crypto');
const fs = require('fs');

class SecureSessionManager {
  constructor(options = {}) {
    this.options = {
      jwtSecret: options.jwtSecret || this.generateSecret(),
      refreshSecret: options.refreshSecret || this.generateSecret(),
      accessTokenTTL: options.accessTokenTTL || 15 * 60, // 15 minutes
      refreshTokenTTL: options.refreshTokenTTL || 7 * 24 * 60 * 60, // 7 days
      maxSessions: options.maxSessions || 5, // Max concurrent sessions per user
      sessionTimeout: options.sessionTimeout || 30 * 60, // 30 minutes inactivity
      securityLogging: options.securityLogging || true,
      strictSecurityMode: options.strictSecurityMode || true,
      ...options
    };

    // In-memory session store (replace with Redis in production)
    this.sessions = new Map();
    this.refreshTokens = new Map();
    this.securityEvents = [];
    
    console.log('🔐 Secure Session Manager initialized');
    console.log(`   Access Token TTL: ${this.options.accessTokenTTL}s`);
    console.log(`   Refresh Token TTL: ${this.options.refreshTokenTTL}s`);
    console.log(`   Max Sessions per User: ${this.options.maxSessions}`);
  }

  /**
   * Generate cryptographically secure random secret
   */
  generateSecret(length = 32) {
    return crypto.randomBytes(length).toString('base64');
  }

  /**
   * Create secure session for user
   */
  createSession(userId, metadata = {}) {
    try {
      const sessionId = this.generateSessionId();
      const now = Math.floor(Date.now() / 1000);
      
      // Check if user exceeds max sessions
      this.enforceMaxSessions(userId);

      // Create session data
      const session = {
        sessionId,
        userId,
        createdAt: now,
        lastActivity: now,
        ipAddress: metadata.ipAddress || 'unknown',
        userAgent: metadata.userAgent || 'unknown',
        isActive: true,
        securityFlags: {
          suspicious: false,
          mfaVerified: metadata.mfaVerified || false,
          deviceTrusted: metadata.deviceTrusted || false
        },
        metadata: {
          loginMethod: metadata.loginMethod || 'password',
          deviceFingerprint: this.generateDeviceFingerprint(metadata),
          ...metadata
        }
      };

      // Generate tokens
      const accessToken = this.generateAccessToken(session);
      const refreshToken = this.generateRefreshToken(session);

      // Store session
      this.sessions.set(sessionId, session);
      this.refreshTokens.set(refreshToken, sessionId);

      this.logSecurityEvent('SESSION_CREATED', userId, { sessionId, ipAddress: metadata.ipAddress });

      return {
        sessionId,
        accessToken,
        refreshToken,
        expiresIn: this.options.accessTokenTTL,
        tokenType: 'Bearer'
      };

    } catch (error) {
      this.logSecurityEvent('SESSION_CREATE_ERROR', userId, { error: error.message });
      throw new Error('Failed to create secure session');
    }
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(metadata) {
    const fingerprint = [
      metadata.userAgent || '',
      metadata.acceptLanguage || '',
      metadata.screenResolution || '',
      metadata.timezone || ''
    ].join('|');
    
    return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 16);
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(session) {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload = {
      sub: session.userId,
      sid: session.sessionId,
      iat: session.createdAt,
      exp: session.lastActivity + this.options.accessTokenTTL,
      aud: 'mustbeviral-api',
      iss: 'mustbeviral-auth',
      jti: crypto.randomBytes(16).toString('hex')
    };

    return this.signJWT(header, payload, this.options.jwtSecret);
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(session) {
    const payload = {
      sub: session.userId,
      sid: session.sessionId,
      iat: session.createdAt,
      exp: session.createdAt + this.options.refreshTokenTTL,
      type: 'refresh'
    };

    return this.signJWT({ alg: 'HS256', typ: 'JWT' }, payload, this.options.refreshSecret);
  }

  /**
   * Sign JWT token
   */
  signJWT(header, payload, secret) {
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verify JWT token
   */
  verifyJWT(token, secret) {
    try {
      const [header, payload, signature] = token.split('.');
      
      if (!header || !payload || !signature) {
        throw new Error('Invalid token format');
      }

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        throw new Error('Invalid token signature');
      }

      // Decode payload
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
      
      // Check expiration
      if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }

      return decodedPayload;

    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Validate session
   */
  validateSession(token, metadata = {}) {
    try {
      // Verify access token
      const payload = this.verifyJWT(token, this.options.jwtSecret);
      const session = this.sessions.get(payload.sid);

      if (!session || !session.isActive) {
        throw new Error('Session not found or inactive');
      }

      // Check session timeout
      const now = Math.floor(Date.now() / 1000);
      if (now - session.lastActivity > this.options.sessionTimeout) {
        this.terminateSession(session.sessionId);
        throw new Error('Session timed out');
      }

      // Security checks
      this.performSecurityChecks(session, metadata);

      // Update last activity
      session.lastActivity = now;
      
      return {
        userId: session.userId,
        sessionId: session.sessionId,
        isValid: true,
        securityFlags: session.securityFlags
      };

    } catch (error) {
      this.logSecurityEvent('SESSION_VALIDATION_FAILED', 'unknown', { 
        error: error.message,
        token: token.substring(0, 20) + '...'
      });
      
      return {
        userId: null,
        sessionId: null,
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Refresh access token
   */
  refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const payload = this.verifyJWT(refreshToken, this.options.refreshSecret);
      const sessionId = this.refreshTokens.get(refreshToken);
      const session = this.sessions.get(sessionId);

      if (!session || !session.isActive || session.userId !== payload.sub) {
        throw new Error('Invalid refresh token');
      }

      // Generate new access token
      session.lastActivity = Math.floor(Date.now() / 1000);
      const newAccessToken = this.generateAccessToken(session);

      this.logSecurityEvent('TOKEN_REFRESHED', session.userId, { sessionId });

      return {
        accessToken: newAccessToken,
        expiresIn: this.options.accessTokenTTL,
        tokenType: 'Bearer'
      };

    } catch (error) {
      this.logSecurityEvent('TOKEN_REFRESH_FAILED', 'unknown', { error: error.message });
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Perform security checks on session
   */
  performSecurityChecks(session, metadata) {
    let suspicious = false;

    // Check for IP address changes
    if (metadata.ipAddress && metadata.ipAddress !== session.ipAddress) {
      if (this.options.strictSecurityMode) {
        throw new Error('IP address changed - security violation');
      }
      suspicious = true;
      this.logSecurityEvent('IP_ADDRESS_CHANGED', session.userId, {
        sessionId: session.sessionId,
        oldIP: session.ipAddress,
        newIP: metadata.ipAddress
      });
    }

    // Check for user agent changes
    if (metadata.userAgent && metadata.userAgent !== session.userAgent) {
      suspicious = true;
      this.logSecurityEvent('USER_AGENT_CHANGED', session.userId, {
        sessionId: session.sessionId
      });
    }

    session.securityFlags.suspicious = suspicious;
  }

  /**
   * Enforce maximum sessions per user
   */
  enforceMaxSessions(userId) {
    const userSessions = Array.from(this.sessions.values())
      .filter(session => session.userId === userId && session.isActive)
      .sort((a, b) => b.lastActivity - a.lastActivity);

    // Remove oldest sessions if exceeding limit
    if (userSessions.length >= this.options.maxSessions) {
      const sessionsToRemove = userSessions.slice(this.options.maxSessions - 1);
      sessionsToRemove.forEach(session => {
        this.terminateSession(session.sessionId);
      });
    }
  }

  /**
   * Terminate session
   */
  terminateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.logSecurityEvent('SESSION_TERMINATED', session.userId, { sessionId });
      
      // Remove refresh tokens
      for (const [token, id] of this.refreshTokens.entries()) {
        if (id === sessionId) {
          this.refreshTokens.delete(token);
        }
      }
    }
  }

  /**
   * Terminate all user sessions
   */
  terminateAllUserSessions(userId) {
    const userSessions = Array.from(this.sessions.values())
      .filter(session => session.userId === userId);

    userSessions.forEach(session => {
      this.terminateSession(session.sessionId);
    });

    this.logSecurityEvent('ALL_SESSIONS_TERMINATED', userId, { 
      count: userSessions.length 
    });
  }

  /**
   * Get user sessions
   */
  getUserSessions(userId) {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId && session.isActive)
      .map(session => ({
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent.substring(0, 100),
        securityFlags: session.securityFlags
      }));
  }

  /**
   * Log security events
   */
  logSecurityEvent(eventType, userId, details = {}) {
    if (!this.options.securityLogging) return;

    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      userId,
      ...details
    };

    this.securityEvents.push(event);
    console.warn(`🚨 SECURITY EVENT: ${eventType}`, JSON.stringify(event));

    // Limit security events in memory
    if (this.securityEvents.length > 1000) {
      this.securityEvents.shift();
    }
  }

  /**
   * Get security summary
   */
  getSecuritySummary() {
    const activeSessions = Array.from(this.sessions.values())
      .filter(session => session.isActive);

    const suspiciousSessions = activeSessions
      .filter(session => session.securityFlags.suspicious);

    const recentEvents = this.securityEvents
      .filter(event => Date.now() - new Date(event.timestamp).getTime() < 24 * 60 * 60 * 1000)
      .reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {});

    return {
      activeSessions: activeSessions.length,
      suspiciousSessions: suspiciousSessions.length,
      totalSecurityEvents: this.securityEvents.length,
      recentEvents,
      systemHealth: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
  }

  /**
   * Cleanup expired sessions
   */
  cleanup() {
    const now = Math.floor(Date.now() / 1000);
    let cleaned = 0;

    // Cleanup expired sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.options.sessionTimeout) {
        this.terminateSession(sessionId);
        cleaned++;
      }
    }

    // Cleanup expired refresh tokens
    for (const [token, sessionId] of this.refreshTokens.entries()) {
      if (!this.sessions.has(sessionId)) {
        this.refreshTokens.delete(token);
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
    }

    return cleaned;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecureSessionManager };
}

// CLI usage and testing
if (require.main === module) {
  console.log('🔐 Secure Session Manager Test Suite');
  console.log('=' .repeat(50));

  const sessionManager = new SecureSessionManager({
    accessTokenTTL: 60, // 1 minute for testing
    refreshTokenTTL: 300, // 5 minutes for testing
    securityLogging: true
  });

  // Test session creation
  console.log('\n1. Creating test session...');
  const session = sessionManager.createSession('user123', {
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 Test Browser',
    loginMethod: 'password',
    mfaVerified: true
  });

  console.log('   Session created:', {
    sessionId: session.sessionId.substring(0, 16) + '...',
    accessToken: session.accessToken.substring(0, 50) + '...',
    expiresIn: session.expiresIn
  });

  // Test session validation
  console.log('\n2. Validating session...');
  const validation = sessionManager.validateSession(session.accessToken, {
    ipAddress: '192.168.1.100'
  });
  console.log('   Validation result:', validation);

  // Test token refresh
  console.log('\n3. Refreshing token...');
  try {
    const refreshResult = sessionManager.refreshAccessToken(session.refreshToken);
    console.log('   Token refreshed successfully');
  } catch (error) {
    console.log('   Refresh error:', error.message);
  }

  // Test security summary
  console.log('\n4. Security summary:');
  const summary = sessionManager.getSecuritySummary();
  console.log('   ', JSON.stringify(summary, null, 2));

  console.log('\n✅ Session manager test completed');
}