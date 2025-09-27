# Must Be Viral V2 - Security Documentation

## Security Overview

Must Be Viral V2 implements enterprise-grade security controls across all layers of the application. This document details authentication mechanisms, security headers, CSRF protection, input validation, and security monitoring.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Security Headers](#security-headers)
3. [CORS Configuration](#cors-configuration)
4. [Input Validation & Sanitization](#input-validation--sanitization)
5. [Rate Limiting](#rate-limiting)
6. [CSRF Protection](#csrf-protection)
7. [Security Monitoring](#security-monitoring)
8. [Encryption & Hashing](#encryption--hashing)
9. [Security Best Practices](#security-best-practices)
10. [Incident Response](#incident-response)

---

## Authentication & Authorization

### JWT Authentication

#### Token Structure
```typescript
interface JWTPayload {
  id: string;           // User ID
  email: string;        // User email
  username: string;     // Username
  role: 'creator' | 'influencer' | 'admin';
  iat: number;          // Issued at
  exp: number;          // Expires at
}
```

#### Token Generation
```typescript
// JWT Configuration
const JWT_EXPIRATION = '24h';
const ALGORITHM = 'HS256';

// Token generation with secure secret
const token = await new SignJWT(payload)
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('24h')
  .sign(jwtSecret);
```

#### Token Validation Process
1. **Header Extraction**: Extract `Authorization: Bearer <token>`
2. **Format Validation**: Verify token format and structure
3. **Signature Verification**: Validate using JWT secret
4. **Expiration Check**: Ensure token hasn't expired
5. **Payload Validation**: Verify required fields exist
6. **User Context**: Set user context in request

#### Password Security
```typescript
// Password hashing with bcrypt
const SALT_ROUNDS = 12;
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

// Password validation requirements
const passwordValidation = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbiddenPatterns: ['password', '123456', 'qwerty']
};
```

### Multi-Factor Authentication (MFA)

#### TOTP Implementation
```typescript
// MFA setup process
const secret = generateSecret();
const qrCode = generateQRCode(secret, userEmail);

// MFA verification
const isValidCode = verifyTOTP(userCode, userSecret, {
  window: 1,        // Allow 1 step window
  step: 30         // 30-second time step
});
```

### OAuth Integration

#### Supported Providers
- **Google OAuth 2.0**
- **GitHub OAuth**
- **Microsoft Azure AD**

#### OAuth Flow
1. Redirect to provider authorization URL
2. Receive authorization code
3. Exchange code for access token
4. Fetch user profile
5. Create or link user account
6. Generate internal JWT token

---

## Security Headers

### Content Security Policy (CSP)

#### Default CSP Configuration
```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{scriptNonce}' https://cdn.jsdelivr.net https://unpkg.com https://js.stripe.com 'strict-dynamic';
  style-src 'self' 'nonce-{styleNonce}' https://fonts.googleapis.com https://cdn.jsdelivr.net;
  font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://api.stripe.com https://api.mustbeviral.com wss://ws.mustbeviral.com;
  media-src 'self' https: data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
  manifest-src 'self';
  worker-src 'self' blob:;
  report-uri /api/csp-report
```

#### Dynamic Nonce Generation
```typescript
// Cryptographically secure nonce generation
function generateNonce(): string {
  const array = new Uint8Array(16);

  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    globalThis.crypto.getRandomValues(array);
  } else {
    throw new Error('Crypto API not available');
  }

  return btoa(String.fromCharCode(...array));
}
```

### Comprehensive Security Headers

```typescript
const securityHeaders = {
  // HTTP Strict Transport Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // XSS Protection
  'X-XSS-Protection': '1; mode=block',

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy
  'Permissions-Policy': [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=(self)',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'speaker=(self)',
    'vibrate=()',
    'fullscreen=(self)',
    'sync-xhr=()'
  ].join(', '),

  // Cross-Origin Policies
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};
```

---

## CORS Configuration

### Production CORS Settings
```typescript
const corsConfig = {
  allowedOrigins: [
    'https://mustbeviral.com',
    'https://www.mustbeviral.com',
    'https://app.mustbeviral.com',
    'https://admin.mustbeviral.com'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'User-Agent',
    'DNT',
    'Cache-Control',
    'X-Mx-ReqToken',
    'Keep-Alive'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Content-Length',
    'Content-Range'
  ],
  maxAge: 86400,
  credentials: true
};
```

### Development CORS Settings
```typescript
// Development allows localhost origins
const developmentOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];
```

### CORS Preflight Handling
```typescript
// Handle OPTIONS preflight requests
if (request.method === 'OPTIONS') {
  const origin = request.headers.get('Origin');

  if (!isOriginAllowed(origin)) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(origin)
  });
}
```

---

## Input Validation & Sanitization

### Request Validation Framework

#### Email Validation
```typescript
function validateEmail(email: string): boolean {
  // Multi-layer validation
  if (!email || typeof email !== 'string') return false;

  // Check for obvious invalid patterns
  if (email.includes('..') || email.startsWith('.') ||
      email.endsWith('.') || email.includes('@@') ||
      email.endsWith('@') || email.includes(' ') ||
      !email.includes('@')) {
    return false;
  }

  // Structure validation
  const parts = email.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domainPart] = parts;

  // Length checks
  if (!localPart || localPart.length === 0 || localPart.length > 64) {
    return false;
  }

  if (!domainPart || domainPart.length === 0 || !domainPart.includes('.')) {
    return false;
  }

  // Final regex validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email);
}
```

#### Content Type Validation
```typescript
function validateContentType(request: Request): boolean {
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');

    if (!contentType) return false;

    const allowedTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain'
    ];

    const baseType = contentType.split(';')[0].trim();
    return allowedTypes.some(allowed => baseType.startsWith(allowed));
  }

  return true;
}
```

#### Header Injection Detection
```typescript
function detectHeaderInjection(name: string, value: string): boolean {
  const injectionPatterns = [
    /[\r\n]/,                                    // CRLF injection
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/,        // Control characters
    /\x00/,                                      // Null bytes
    /%0[Aa]/,                                    // URL-encoded line feeds
    /%0[Dd]/,                                    // URL-encoded carriage returns
    /%00/                                        // URL-encoded null bytes
  ];

  const testString = name + value;
  return injectionPatterns.some(pattern => pattern.test(testString));
}
```

### User Agent Validation
```typescript
function validateUserAgent(userAgent: string): boolean {
  if (!userAgent) return false;

  // Check for malicious patterns
  const maliciousPatterns = [
    /sqlmap/i, /nikto/i, /nessus/i, /masscan/i,
    /nmap/i, /zap/i, /burp/i
  ];

  return !maliciousPatterns.some(pattern => pattern.test(userAgent));
}
```

---

## Rate Limiting

### Rate Limiting Configuration

#### Default Limits
```typescript
const rateLimits = {
  authentication: {
    login: { requests: 5, window: '15m', burst: 10 },
    register: { requests: 3, window: '1h', burst: 5 },
    passwordReset: { requests: 3, window: '1h', burst: 3 }
  },
  api: {
    general: { requests: 1000, window: '1h', burst: 100 },
    aiGeneration: { requests: 50, window: '1h', burst: 10 },
    upload: { requests: 20, window: '1h', burst: 5 }
  },
  websocket: {
    connections: { requests: 10, window: '1m', burst: 2 },
    messages: { requests: 100, window: '1m', burst: 20 }
  }
};
```

#### Rate Limiting Implementation
```typescript
class RateLimiter {
  async checkLimit(
    identifier: string,
    limit: number,
    window: number
  ): Promise<RateLimitResult> {
    const key = `rate_limit:${identifier}`;
    const current = await this.kv.get(key);
    const now = Date.now();

    if (!current) {
      await this.kv.put(key, JSON.stringify({
        count: 1,
        resetTime: now + window,
        firstRequest: now
      }), { expirationTtl: window / 1000 });

      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + window,
        retryAfter: 0
      };
    }

    const data = JSON.parse(current);

    if (now > data.resetTime) {
      // Window expired, reset counter
      await this.kv.put(key, JSON.stringify({
        count: 1,
        resetTime: now + window,
        firstRequest: now
      }), { expirationTtl: window / 1000 });

      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + window,
        retryAfter: 0
      };
    }

    if (data.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: data.resetTime,
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      };
    }

    // Increment counter
    data.count++;
    await this.kv.put(key, JSON.stringify(data), {
      expirationTtl: Math.ceil((data.resetTime - now) / 1000)
    });

    return {
      allowed: true,
      remaining: limit - data.count,
      resetTime: data.resetTime,
      retryAfter: 0
    };
  }
}
```

### Rate Limiting Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
Retry-After: 3600
```

---

## CSRF Protection

### CSRF Token Implementation

#### Token Generation
```typescript
class CSRFProtection {
  generateToken(sessionId: string): string {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const randomString = Array.from(randomBytes, byte =>
      byte.toString(16).padStart(2, '0')
    ).join('');

    const tokenData = `${sessionId}:${timestamp}:${randomString}`;
    const hash = this.hmacSHA256(tokenData, this.csrfSecret);

    return `${tokenData}:${hash}`;
  }

  validateToken(token: string, sessionId: string): boolean {
    try {
      const parts = token.split(':');
      if (parts.length !== 4) return false;

      const [tokenSessionId, timestamp, randomString, hash] = parts;

      // Validate session ID
      if (tokenSessionId !== sessionId) return false;

      // Check token age (max 1 hour)
      const tokenTime = parseInt(timestamp);
      const now = Date.now();
      if (now - tokenTime > 3600000) return false;

      // Validate hash
      const tokenData = `${tokenSessionId}:${timestamp}:${randomString}`;
      const expectedHash = this.hmacSHA256(tokenData, this.csrfSecret);

      return hash === expectedHash;
    } catch {
      return false;
    }
  }
}
```

#### CSRF Middleware
```typescript
async function csrfMiddleware(request: Request): Promise<Response | null> {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return null;
  }

  // Skip CSRF for API endpoints with proper authentication
  if (request.headers.get('content-type') === 'application/json' &&
      request.headers.get('authorization')?.startsWith('Bearer ')) {
    return null;
  }

  const csrfToken = request.headers.get('x-csrf-token') ||
                   await getCSRFFromBody(request);

  if (!csrfToken) {
    return new Response('CSRF token missing', { status: 403 });
  }

  const sessionId = getSessionId(request);
  if (!csrf.validateToken(csrfToken, sessionId)) {
    return new Response('Invalid CSRF token', { status: 403 });
  }

  return null; // Allow request
}
```

---

## Security Monitoring

### Security Event Logging

#### Event Types
```typescript
enum SecurityEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SECURITY_VIOLATION = 'security_violation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_ACCESS = 'data_access',
  ADMIN_ACTION = 'admin_action'
}
```

#### Security Logger
```typescript
class SecurityLogger {
  async logSecurityEvent(
    event: SecurityEventType,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: SecurityEventDetails
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details: {
        userId: details.userId,
        sessionId: details.sessionId,
        ipAddress: details.ipAddress,
        userAgent: details.userAgent,
        resource: details.resource,
        action: details.action,
        result: details.result,
        metadata: details.metadata
      },
      requestId: details.requestId,
      component: details.component
    };

    // Log to multiple destinations
    await Promise.all([
      this.logToKV(logEntry),
      this.logToQueue(logEntry),
      this.logToConsole(logEntry)
    ]);

    // Alert on high severity events
    if (['high', 'critical'].includes(severity)) {
      await this.sendAlert(logEntry);
    }
  }
}
```

### Intrusion Detection

#### Suspicious Activity Detection
```typescript
class IntrusionDetection {
  async detectSuspiciousActivity(request: Request): Promise<ThreatLevel> {
    const indicators = await Promise.all([
      this.checkFailedLogins(request),
      this.checkRapidRequests(request),
      this.checkSuspiciousPatterns(request),
      this.checkGeoAnomaly(request),
      this.checkUserAgentAnomalies(request)
    ]);

    const riskScore = indicators.reduce((sum, score) => sum + score, 0);

    if (riskScore >= 80) return 'CRITICAL';
    if (riskScore >= 60) return 'HIGH';
    if (riskScore >= 40) return 'MEDIUM';
    return 'LOW';
  }

  private async checkFailedLogins(request: Request): Promise<number> {
    const ip = getClientIP(request);
    const failedAttempts = await this.getFailedLoginCount(ip, '1h');

    if (failedAttempts >= 10) return 30;
    if (failedAttempts >= 5) return 15;
    return 0;
  }

  private async checkSuspiciousPatterns(request: Request): Promise<number> {
    const url = new URL(request.url);
    const suspiciousPatterns = [
      /admin/i,
      /wp-admin/i,
      /.env/i,
      /config/i,
      /backup/i,
      /dump/i,
      /../i,
      /%2e%2e/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern =>
      pattern.test(url.pathname)
    );

    return isSuspicious ? 25 : 0;
  }
}
```

---

## Encryption & Hashing

### Password Hashing
```typescript
// Using bcrypt with salt rounds 12
const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
```

### Data Encryption
```typescript
class DataEncryption {
  private encryptionKey: CryptoKey;

  async encryptData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt data
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      dataBuffer
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async decryptData(encryptedData: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Decrypt data
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }
}
```

---

## Security Best Practices

### Code Security

#### Input Sanitization
```typescript
// Always sanitize user inputs
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>\"']/g, '') // Remove dangerous characters
    .trim()
    .substring(0, 1000); // Limit length
}

// Use parameterized queries
async function getUserById(id: string): Promise<User | null> {
  // ✅ Good: Parameterized query
  const query = 'SELECT * FROM users WHERE id = ?';
  return await db.prepare(query).bind(id).first();

  // ❌ Bad: String interpolation
  // const query = `SELECT * FROM users WHERE id = '${id}'`;
}
```

#### Secure Configuration
```typescript
// Environment-specific security settings
const securityConfig = {
  production: {
    httpsOnly: true,
    secureHeaders: true,
    csrfProtection: true,
    rateLimiting: 'strict',
    logging: 'full'
  },
  development: {
    httpsOnly: false,
    secureHeaders: true,
    csrfProtection: true,
    rateLimiting: 'relaxed',
    logging: 'debug'
  }
};
```

### Deployment Security

#### Environment Variables
```bash
# Required security environment variables
JWT_SECRET=<256-bit-random-string>
CSRF_SECRET=<256-bit-random-string>
ENCRYPTION_KEY=<256-bit-random-string>
DATABASE_URL=<encrypted-connection-string>
ALLOWED_ORIGINS=https://mustbeviral.com,https://app.mustbeviral.com
```

#### CloudFlare Security Settings
```typescript
// CloudFlare security configuration
const cloudflareConfig = {
  ssl: 'strict',
  minTlsVersion: '1.2',
  alwaysUseHttps: true,
  botFightMode: true,
  ddosProtection: true,
  waf: {
    enabled: true,
    owasp: true,
    customRules: [
      'block_suspicious_user_agents',
      'rate_limit_api_endpoints',
      'block_sql_injection'
    ]
  }
};
```

---

## Incident Response

### Security Incident Classification

#### Severity Levels
- **Critical**: Data breach, system compromise, unauthorized admin access
- **High**: Authentication bypass, privilege escalation, significant data exposure
- **Medium**: Failed security controls, suspicious activity patterns
- **Low**: Policy violations, minor security issues

### Response Procedures

#### Immediate Response (0-1 hour)
1. **Assess Impact**: Determine scope and severity
2. **Contain Threat**: Block malicious IPs, disable compromised accounts
3. **Notify Team**: Alert security team and stakeholders
4. **Document**: Record all actions taken

#### Short-term Response (1-24 hours)
1. **Investigate**: Analyze logs and evidence
2. **Remediate**: Fix vulnerabilities and security gaps
3. **Communicate**: Update stakeholders and users if needed
4. **Monitor**: Increase monitoring for similar threats

#### Long-term Response (1-7 days)
1. **Post-mortem**: Conduct thorough incident analysis
2. **Improve**: Update security controls and procedures
3. **Test**: Validate fixes and improvements
4. **Report**: Document lessons learned

### Security Contacts

```typescript
const securityContacts = {
  primary: 'security@mustbeviral.com',
  escalation: 'cto@mustbeviral.com',
  external: {
    cloudflare: 'enterprise-support',
    authorities: 'local-cyber-crime-unit'
  }
};
```

---

## Security Checklist

### Pre-deployment Security Checklist

#### Code Security
- [ ] All user inputs validated and sanitized
- [ ] SQL injection protection in place
- [ ] XSS prevention implemented
- [ ] CSRF tokens implemented
- [ ] Authentication logic reviewed
- [ ] Authorization checks in place
- [ ] Sensitive data encrypted
- [ ] Error messages don't leak information

#### Configuration Security
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] Environment variables secured
- [ ] Debug mode disabled in production
- [ ] Default credentials changed
- [ ] Unnecessary services disabled

#### Infrastructure Security
- [ ] Firewall rules configured
- [ ] Access controls implemented
- [ ] Monitoring and logging enabled
- [ ] Backup encryption verified
- [ ] Network segmentation in place
- [ ] Vulnerability scanning completed
- [ ] Penetration testing performed
- [ ] Incident response plan tested

---

*Last Updated: January 2025*

**Security is everyone's responsibility. When in doubt, err on the side of caution and consult the security team.**