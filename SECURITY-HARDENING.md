# Must Be Viral V2 - Security Hardening Guide

## 🔒 Security Implementation Checklist

### Priority 1: Critical Security Fixes (MUST DO BEFORE LAUNCH)

#### Authentication & Sessions
- [ ] **Migrate JWT from localStorage to HTTP-only cookies**
  ```typescript
  // Current (INSECURE)
  localStorage.setItem('token', jwt);

  // Required (SECURE)
  res.cookie('auth_token', jwt, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
  ```

- [ ] **Implement refresh token rotation**
- [ ] **Add session invalidation on password change**
- [ ] **Implement account lockout after failed attempts**
- [ ] **Add two-factor authentication (2FA) support**

#### Input Validation & Sanitization
- [ ] **Implement comprehensive input validation**
  ```typescript
  // Required validation for all user inputs
  import { z } from 'zod';
  import DOMPurify from 'isomorphic-dompurify';

  const contentSchema = z.object({
    title: z.string().min(1).max(200).transform(val =>
      DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })
    ),
    body: z.string().min(10).max(50000).transform(val =>
      DOMPurify.sanitize(val, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: []
      })
    ),
    tags: z.array(z.string().regex(/^[a-zA-Z0-9-_]+$/)).max(10)
  });
  ```

- [ ] **SQL injection prevention using parameterized queries**
- [ ] **XSS prevention in all rendered content**
- [ ] **Path traversal prevention in file operations**
- [ ] **Command injection prevention in system calls**

#### Rate Limiting & DDoS Protection
- [ ] **Implement rate limiting on all endpoints**
  ```typescript
  // API rate limiting configuration
  const rateLimiter = {
    public: { window: 60000, max: 60 },      // 60 req/min
    authenticated: { window: 60000, max: 200 }, // 200 req/min
    ai_generation: { window: 60000, max: 10 },  // 10 req/min
    payment: { window: 60000, max: 5 }          // 5 req/min
  };
  ```

- [ ] **Add CAPTCHA for high-risk operations**
- [ ] **Implement request size limits**
- [ ] **Add connection throttling**

#### Headers & CORS
- [ ] **Configure security headers**
  ```typescript
  app.use((req, res, next) => {
    // Content Security Policy
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://api.mustbeviral.com"
    );

    // Other security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // HSTS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    next();
  });
  ```

- [ ] **Configure CORS properly**
  ```typescript
  const corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigins = [
        'https://mustbeviral.com',
        'https://www.mustbeviral.com',
        'https://api.mustbeviral.com'
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 hours
  };
  ```

### Priority 2: Data Protection

#### Encryption
- [ ] **Encrypt sensitive data at rest**
  ```typescript
  import crypto from 'crypto';

  class DataEncryption {
    private algorithm = 'aes-256-gcm';
    private key: Buffer;

    constructor(encryptionKey: string) {
      this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
    }

    encrypt(text: string): string {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    }

    decrypt(encryptedData: string): string {
      const parts = encryptedData.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    }
  }
  ```

- [ ] **Use TLS/SSL for all data in transit**
- [ ] **Implement field-level encryption for PII**
- [ ] **Secure API keys and credentials**

#### Access Control
- [ ] **Implement Role-Based Access Control (RBAC)**
  ```typescript
  enum UserRole {
    USER = 'user',
    CREATOR = 'creator',
    MODERATOR = 'moderator',
    ADMIN = 'admin'
  }

  const permissions = {
    [UserRole.USER]: ['read:content', 'create:content'],
    [UserRole.CREATOR]: ['read:content', 'create:content', 'edit:own_content', 'delete:own_content'],
    [UserRole.MODERATOR]: ['read:all', 'edit:all_content', 'moderate:content'],
    [UserRole.ADMIN]: ['*'] // All permissions
  };

  function hasPermission(userRole: UserRole, action: string): boolean {
    const userPermissions = permissions[userRole];
    return userPermissions.includes('*') || userPermissions.includes(action);
  }
  ```

- [ ] **Implement resource-level permissions**
- [ ] **Add audit logging for sensitive operations**
- [ ] **Implement principle of least privilege**

### Priority 3: API Security

#### API Authentication
- [ ] **Implement API key management**
- [ ] **Add OAuth 2.0 for third-party access**
- [ ] **Implement webhook signature verification**
  ```typescript
  function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
  ```

#### API Security Best Practices
- [ ] **Version your APIs**
- [ ] **Implement request/response validation**
- [ ] **Add API documentation with security guidelines**
- [ ] **Monitor API usage patterns**

### Priority 4: Infrastructure Security

#### Cloudflare Configuration
- [ ] **Enable Cloudflare WAF (Web Application Firewall)**
- [ ] **Configure DDoS protection settings**
- [ ] **Set up bot management rules**
- [ ] **Enable rate limiting rules**
- [ ] **Configure firewall rules for IP restrictions**

#### Container Security
- [ ] **Use minimal base images**
- [ ] **Run containers as non-root user**
- [ ] **Implement container scanning**
- [ ] **Use read-only filesystems where possible**

```dockerfile
# Secure Dockerfile example
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Priority 5: Monitoring & Incident Response

#### Security Monitoring
- [ ] **Set up intrusion detection**
- [ ] **Configure security alerts**
  ```typescript
  // Security event monitoring
  const securityEvents = {
    MULTIPLE_FAILED_LOGINS: 'multiple_failed_logins',
    SUSPICIOUS_API_PATTERN: 'suspicious_api_pattern',
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    DATA_EXFILTRATION_ATTEMPT: 'data_exfiltration_attempt',
    SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
    XSS_ATTEMPT: 'xss_attempt'
  };

  function logSecurityEvent(event: string, details: any) {
    // Log to security monitoring service
    console.error(`[SECURITY] ${event}:`, details);

    // Send alert for critical events
    if (isCriticalEvent(event)) {
      sendSecurityAlert(event, details);
    }
  }
  ```

- [ ] **Implement log aggregation and analysis**
- [ ] **Set up security dashboards**

#### Incident Response Plan
- [ ] **Create incident response procedures**
- [ ] **Set up security team contacts**
- [ ] **Implement automated incident response**
- [ ] **Regular security drills**

### Priority 6: Compliance & Privacy

#### GDPR Compliance
- [ ] **Implement data subject rights**
  - Right to access
  - Right to rectification
  - Right to erasure
  - Right to data portability

- [ ] **Add privacy controls**
- [ ] **Implement consent management**
- [ ] **Set up data retention policies**

#### Security Auditing
- [ ] **Regular security assessments**
- [ ] **Penetration testing**
- [ ] **Code security reviews**
- [ ] **Dependency scanning**

## 🛡️ Security Testing Commands

```bash
# Run security audit
npm audit
npm audit fix

# Check for known vulnerabilities
npx snyk test

# OWASP dependency check
npx owasp-dependency-check --scan ./

# Security headers test
npx security-headers https://mustbeviral.com

# SSL/TLS test
npx ssllabs-scan mustbeviral.com

# Content Security Policy test
npx csp-evaluator https://mustbeviral.com
```

## 📊 Security Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Failed Login Attempts | <5/min per IP | >10/min |
| API Error Rate | <1% | >5% |
| Response Time | <200ms | >1000ms |
| Suspicious Requests | <0.1% | >1% |
| Security Headers Score | A+ | B or below |
| SSL Labs Score | A+ | A- or below |

## 🔐 Secret Management

### Development
```bash
# Use .env files (never commit)
echo ".env*" >> .gitignore
```

### Production
```bash
# Use Cloudflare Secrets
wrangler secret put JWT_SECRET
wrangler secret put DATABASE_URL
wrangler secret put STRIPE_SECRET_KEY

# Or use environment variables in CI/CD
# GitHub Actions secrets
# Vercel environment variables
# AWS Secrets Manager
```

## 🚨 Emergency Response

### If Security Breach Detected:

1. **Immediate Actions**
   - Rotate all secrets and API keys
   - Enable maintenance mode
   - Review access logs
   - Notify security team

2. **Investigation**
   - Identify attack vector
   - Assess data impact
   - Document timeline

3. **Remediation**
   - Patch vulnerabilities
   - Update security rules
   - Deploy fixes

4. **Communication**
   - Notify affected users (if required)
   - Update status page
   - File required reports (GDPR, etc.)

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Cloudflare Security Best Practices](https://developers.cloudflare.com/fundamentals/security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Remember**: Security is not a one-time task but an ongoing process. Regular updates, monitoring, and testing are essential for maintaining a secure application.