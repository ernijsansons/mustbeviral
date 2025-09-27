# Must Be Viral V2 - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying Must Be Viral V2 to production using Cloudflare Workers, including security configuration, monitoring setup, and operational procedures.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Security Configuration](#security-configuration)
4. [Cloudflare Infrastructure](#cloudflare-infrastructure)
5. [Database Setup](#database-setup)
6. [Service Deployment](#service-deployment)
7. [Domain Configuration](#domain-configuration)
8. [Monitoring & Alerting](#monitoring--alerting)
9. [Backup & Recovery](#backup--recovery)
10. [Post-Deployment Verification](#post-deployment-verification)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- **Cloudflare Account** with Workers Paid plan ($5/month minimum)
- **Stripe Account** for payment processing
- **Email Service** (SendGrid or Resend)
- **Domain Registration** (can use Cloudflare Registrar)

### Required Tools
```bash
# Install required CLI tools
npm install -g wrangler@latest
npm install -g @cloudflare/next-on-pages

# Verify installations
wrangler --version
node --version
npm --version
```

### Local Development Setup
```bash
# Clone the repository
git clone https://github.com/your-org/must-be-viral-v2.git
cd must-be-viral-v2

# Install dependencies
npm install
cd mustbeviral && npm install

# Verify setup
npm run build
npm run test
```

---

## Environment Setup

### 1. Environment File Configuration

Create production environment file:
```bash
cp .env.production.template .env.production
```

### 2. Secret Generation

Generate secure secrets using OpenSSL:
```bash
# JWT Secret (64 bytes, base64 encoded)
openssl rand -base64 64

# Session Secret (64 bytes, base64 encoded)
openssl rand -base64 64

# CSRF Token Secret (32 bytes, base64 encoded)
openssl rand -base64 32

# Encryption Key for sensitive data (32 bytes, hex encoded)
openssl rand -hex 32
```

### 3. Environment Variables

**Critical Production Variables:**
```bash
# Core Application
NODE_ENV=production
API_BASE_URL=https://api.mustbeviral.com
WEB_APP_URL=https://mustbeviral.com

# JWT Configuration
JWT_SECRET=<generated-secret-64-bytes>
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=<generated-secret-64-bytes>
JWT_REFRESH_EXPIRES_IN=30d

# Session Security
SESSION_SECRET=<generated-secret-64-bytes>
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=strict

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://mustbeviral.com,https://www.mustbeviral.com
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_MAX_AGE=86400

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_PREMIUM_MULTIPLIER=5
```

---

## Security Configuration

### 1. SSL/TLS Configuration

**Cloudflare SSL Settings:**
```yaml
# Via Cloudflare Dashboard or API
ssl_mode: "strict"
min_tls_version: "1.2"
always_use_https: true
automatic_https_rewrites: true
opportunistic_encryption: true
tls_1_3: "on"
```

**Security Headers:**
```typescript
// Implemented in security middleware
const securityHeaders = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
};
```

### 2. API Security

**Rate Limiting Configuration:**
```typescript
// Per-endpoint rate limits
const rateLimits = {
  // Authentication endpoints
  "POST /api/auth/login": { requests: 5, window: "15m" },
  "POST /api/auth/register": { requests: 3, window: "1h" },
  "POST /api/auth/reset-password": { requests: 3, window: "1h" },

  // API endpoints
  "GET /api/*": { requests: 1000, window: "1h" },
  "POST /api/*": { requests: 100, window: "1h" },

  // AI generation endpoints
  "POST /api/ai/generate": { requests: 50, window: "1h" },
  "POST /api/ai/analyze": { requests: 100, window: "1h" }
};
```

**Input Validation Rules:**
```typescript
// Validation schemas
const validationRules = {
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    maxLength: 254
  },
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },
  content: {
    maxLength: 10000,
    forbiddenPatterns: [/<script/i, /javascript:/i, /vbscript:/i]
  }
};
```

### 3. Data Protection

**Encryption Configuration:**
```typescript
// Data encryption settings
const encryptionConfig = {
  algorithm: "AES-256-GCM",
  keyDerivation: "PBKDF2",
  iterations: 100000,
  saltLength: 32,
  ivLength: 16
};

// PII fields that must be encrypted
const encryptedFields = [
  "email",
  "phone",
  "address",
  "payment_method",
  "social_tokens"
];
```

---

## Cloudflare Infrastructure

### 1. Account Setup

**Create Cloudflare API Token:**
```bash
# Via Cloudflare Dashboard > My Profile > API Tokens
# Template: "Custom token"
# Permissions:
# - Account:Cloudflare Workers:Edit
# - Zone:Zone Settings:Edit
# - Zone:Zone:Edit
# - Zone:DNS:Edit
```

**Configure Wrangler:**
```bash
# Authenticate Wrangler
wrangler auth login

# Verify authentication
wrangler whoami

# Set default account
wrangler config set account_id <your-account-id>
```

### 2. Infrastructure Components

**Required Cloudflare Services:**
- **Workers**: Serverless compute platform
- **Pages**: Static site hosting
- **D1**: Serverless SQL database
- **KV**: Key-value storage
- **R2**: Object storage
- **Durable Objects**: Stateful coordination
- **Queues**: Message queuing
- **AI Gateway**: AI model access

### 3. Cost Estimation

**Monthly Costs (Production):**
```yaml
Cloudflare Workers: $5/month (base) + usage
D1 Database: $5/month + $1/GB storage
KV Storage: $0.50/GB + $0.05/million reads
R2 Storage: $0.015/GB + $4.50/million writes
Queues: $2/million messages
Domain: $8.57/year (varies by TLD)

Estimated Total: $25-50/month for moderate usage
```

---

## Database Setup

### 1. D1 Database Creation

**Create Databases:**
```bash
# Create production databases
wrangler d1 create mustbeviral-prod-auth
wrangler d1 create mustbeviral-prod-content
wrangler d1 create mustbeviral-prod-analytics

# Note the database IDs for wrangler.toml
```

**Configure Database Bindings:**
```toml
# wrangler.toml
[[d1_databases]]
binding = "AUTH_DB"
database_name = "mustbeviral-prod-auth"
database_id = "your-auth-db-id"

[[d1_databases]]
binding = "CONTENT_DB"
database_name = "mustbeviral-prod-content"
database_id = "your-content-db-id"

[[d1_databases]]
binding = "ANALYTICS_DB"
database_name = "mustbeviral-prod-analytics"
database_id = "your-analytics-db-id"
```

### 2. Database Migrations

**Run Initial Migrations:**
```bash
# Navigate to each worker directory and run migrations
cd workers/auth-worker
wrangler d1 migrations apply mustbeviral-prod-auth --env production

cd ../content-worker
wrangler d1 migrations apply mustbeviral-prod-content --env production

cd ../analytics-worker
wrangler d1 migrations apply mustbeviral-prod-analytics --env production
```

**Verify Database Schema:**
```sql
-- Check tables exist
.tables

-- Verify user table structure
.schema users

-- Check constraints and indexes
PRAGMA table_info(users);
PRAGMA index_list(users);
```

### 3. Database Security

**Connection Security:**
```typescript
// Database access patterns
class SecureDatabase {
  async query(sql: string, params: any[] = []): Promise<any> {
    // Always use parameterized queries
    const statement = this.db.prepare(sql);
    return await statement.bind(...params).all();
  }

  async transaction(operations: () => Promise<void>): Promise<void> {
    // Wrap operations in transaction
    await this.db.batch(operations);
  }
}
```

---

## Service Deployment

### 1. Automated Deployment

**Use Deployment Script:**
```bash
# Make script executable
chmod +x scripts/cloudflare-deploy.sh

# Deploy to staging first
./scripts/cloudflare-deploy.sh staging

# Deploy to production
./scripts/cloudflare-deploy.sh production

# Dry run to test
./scripts/cloudflare-deploy.sh production true
```

### 2. Manual Deployment Steps

**Deploy Workers Individually:**
```bash
# Deploy API Gateway
cd workers/api-gateway
wrangler deploy --env production

# Deploy Auth Service
cd ../auth-worker
wrangler deploy --env production

# Deploy Content Service
cd ../content-worker
wrangler deploy --env production

# Deploy Analytics Service
cd ../analytics-worker
wrangler deploy --env production

# Deploy WebSocket Service
cd ../websocket-worker
wrangler deploy --env production
```

**Deploy Frontend (Pages):**
```bash
# Build Next.js application
cd mustbeviral
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy out --project-name mustbeviral-production
```

### 3. Environment-Specific Configuration

**Production Wrangler.toml:**
```toml
name = "mustbeviral-api-gateway"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
vars = { ENVIRONMENT = "production" }
routes = [
  { pattern = "api.mustbeviral.com/*", zone_name = "mustbeviral.com" }
]

# KV Bindings
kv_namespaces = [
  { binding = "SESSIONS", id = "your-sessions-kv-id" },
  { binding = "CACHE", id = "your-cache-kv-id" },
  { binding = "RATE_LIMITS", id = "your-rate-limits-kv-id" }
]

# R2 Bindings
r2_buckets = [
  { binding = "ASSETS", bucket_name = "mustbeviral-assets" },
  { binding = "MEDIA", bucket_name = "mustbeviral-media" }
]

# Queue Bindings
queues = [
  { binding = "ANALYTICS_QUEUE", queue_name = "analytics-events" },
  { binding = "EMAIL_QUEUE", queue_name = "email-notifications" }
]

# Durable Object Bindings
durable_objects.bindings = [
  { name = "RATE_LIMITER", class_name = "RateLimiter" },
  { name = "WEBSOCKET_ROOM", class_name = "WebSocketRoom" }
]
```

---

## Domain Configuration

### 1. DNS Setup

**Configure DNS Records:**
```bash
# A Records (pointing to Cloudflare proxied)
mustbeviral.com A 192.0.2.1 (proxied)
www.mustbeviral.com CNAME mustbeviral.com (proxied)

# Subdomains for services
api.mustbeviral.com CNAME mustbeviral.com (proxied)
app.mustbeviral.com CNAME mustbeviral.com (proxied)
cdn.mustbeviral.com CNAME mustbeviral.com (proxied)

# Email records
mustbeviral.com MX 10 mail.mustbeviral.com
mustbeviral.com TXT "v=spf1 include:_spf.google.com ~all"
```

### 2. SSL Certificate

**Cloudflare SSL Configuration:**
```yaml
# Via Cloudflare Dashboard > SSL/TLS
ssl_mode: "Full (strict)"
edge_certificates: "Universal SSL"
client_certificates: "On"
authenticated_origin_pulls: "On"
minimum_tls_version: "1.2"
```

**HSTS Configuration:**
```typescript
// Implemented in security middleware
"Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload"

// Submit to HSTS preload list at hstspreload.org
```

### 3. Route Configuration

**Worker Routes:**
```yaml
# Configure in Cloudflare Dashboard > Workers & Pages > Routes
api.mustbeviral.com/* → mustbeviral-api-gateway
auth.mustbeviral.com/* → mustbeviral-auth-service
ws.mustbeviral.com/* → mustbeviral-websocket-service
```

---

## Monitoring & Alerting

### 1. Application Monitoring

**Health Check Endpoints:**
```typescript
// Health check configuration
const healthChecks = {
  "/health": {
    checks: [
      "database_connection",
      "external_apis",
      "memory_usage",
      "response_time"
    ],
    timeout: 5000
  },
  "/health/ready": {
    checks: ["service_dependencies"],
    timeout: 10000
  },
  "/health/live": {
    checks: ["basic_functionality"],
    timeout: 1000
  }
};
```

**Metrics Collection:**
```typescript
// Custom metrics for monitoring
class MetricsCollector {
  recordApiCall(endpoint: string, method: string, statusCode: number, duration: number) {
    this.metrics.increment(`api.calls.total`, {
      endpoint,
      method,
      status: statusCode.toString()
    });

    this.metrics.histogram(`api.duration`, duration, {
      endpoint,
      method
    });
  }

  recordError(error: Error, context: string) {
    this.metrics.increment(`errors.total`, {
      type: error.constructor.name,
      context
    });
  }
}
```

### 2. External Monitoring

**Cloudflare Analytics:**
```javascript
// Enable in Dashboard > Analytics & Logs
- Web Analytics
- Security Analytics
- Performance Analytics
- Worker Analytics
```

**Third-party Monitoring:**
```yaml
# Uptime monitoring services
uptimerobot:
  monitors:
    - url: https://api.mustbeviral.com/health
      interval: 60 # seconds
    - url: https://mustbeviral.com
      interval: 300 # seconds

pingdom:
  checks:
    - name: "API Health"
      url: https://api.mustbeviral.com/health
      interval: 60
    - name: "Website Availability"
      url: https://mustbeviral.com
      interval: 120
```

### 3. Alert Configuration

**Alert Rules:**
```yaml
alerts:
  critical:
    - name: "Service Down"
      condition: "health_check_failed for 2 minutes"
      channels: ["pagerduty", "slack-critical"]

    - name: "High Error Rate"
      condition: "error_rate > 5% for 5 minutes"
      channels: ["pagerduty", "email"]

  warning:
    - name: "Elevated Response Time"
      condition: "avg_response_time > 1000ms for 10 minutes"
      channels: ["slack-alerts"]

    - name: "High Memory Usage"
      condition: "memory_usage > 80% for 15 minutes"
      channels: ["slack-alerts", "email"]
```

---

## Backup & Recovery

### 1. Database Backup

**Automated Backup Strategy:**
```bash
#!/bin/bash
# Daily backup script (run via cron)

# Backup D1 databases
wrangler d1 export mustbeviral-prod-auth --output auth-backup-$(date +%Y%m%d).sql
wrangler d1 export mustbeviral-prod-content --output content-backup-$(date +%Y%m%d).sql
wrangler d1 export mustbeviral-prod-analytics --output analytics-backup-$(date +%Y%m%d).sql

# Upload to R2 storage
wrangler r2 object put mustbeviral-backups/auth-backup-$(date +%Y%m%d).sql --file auth-backup-$(date +%Y%m%d).sql
wrangler r2 object put mustbeviral-backups/content-backup-$(date +%Y%m%d).sql --file content-backup-$(date +%Y%m%d).sql
wrangler r2 object put mustbeviral-backups/analytics-backup-$(date +%Y%m%d).sql --file analytics-backup-$(date +%Y%m%d).sql

# Clean up local files
rm *-backup-$(date +%Y%m%d).sql
```

**Backup Verification:**
```bash
# Test backup restoration
wrangler d1 create mustbeviral-test-restore
wrangler d1 import mustbeviral-test-restore --file backup.sql

# Verify data integrity
wrangler d1 execute mustbeviral-test-restore --sql "SELECT COUNT(*) FROM users;"
```

### 2. Configuration Backup

**Infrastructure as Code:**
```yaml
# Store in version control
deployment/
├── wrangler.toml           # Worker configuration
├── dns-config.yaml         # DNS records
├── security-rules.yaml     # WAF rules
├── page-rules.yaml         # Page rules
└── ssl-config.yaml         # SSL configuration
```

### 3. Disaster Recovery

**Recovery Procedures:**
```markdown
1. **Database Recovery**
   - Restore from latest backup
   - Verify data integrity
   - Update connection strings

2. **Service Recovery**
   - Redeploy workers from source
   - Restore configuration
   - Verify health checks

3. **DNS Recovery**
   - Switch to backup provider
   - Update A records
   - Monitor propagation

4. **Communication**
   - Update status page
   - Notify users via email
   - Post on social media
```

---

## Post-Deployment Verification

### 1. Smoke Tests

**Automated Test Suite:**
```bash
#!/bin/bash
# Post-deployment smoke tests

echo "Running smoke tests..."

# Test API health
curl -f https://api.mustbeviral.com/health || exit 1

# Test authentication
curl -f -X POST https://api.mustbeviral.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"invalid"}' || exit 1

# Test content generation
curl -f -X POST https://api.mustbeviral.com/api/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"type":"social_post","topic":"test"}' || exit 1

echo "Smoke tests passed!"
```

### 2. Performance Testing

**Load Testing:**
```javascript
// Using Artillery.js
module.exports = {
  config: {
    target: 'https://api.mustbeviral.com',
    phases: [
      { duration: 60, arrivalRate: 10 }, // Warm up
      { duration: 300, arrivalRate: 50 }, // Load test
      { duration: 60, arrivalRate: 100 } // Spike test
    ]
  },
  scenarios: [
    {
      name: 'API Health Check',
      weight: 30,
      flow: [
        { get: { url: '/health' } }
      ]
    },
    {
      name: 'User Authentication',
      weight: 40,
      flow: [
        { post: {
          url: '/api/auth/login',
          json: { email: 'test@example.com', password: 'TestPass123!' }
        }}
      ]
    },
    {
      name: 'Content Generation',
      weight: 30,
      flow: [
        { post: {
          url: '/api/ai/generate',
          headers: { Authorization: 'Bearer {{ token }}' },
          json: { type: 'social_post', topic: 'AI trends' }
        }}
      ]
    }
  ]
};
```

### 3. Security Verification

**Security Test Checklist:**
```yaml
security_tests:
  ssl:
    - verify_certificate_validity
    - check_cipher_suites
    - test_hsts_headers

  headers:
    - verify_security_headers
    - check_csp_policy
    - test_xss_protection

  authentication:
    - test_jwt_validation
    - verify_rate_limiting
    - check_password_requirements

  authorization:
    - test_rbac_enforcement
    - verify_data_isolation
    - check_admin_access

  input_validation:
    - test_sql_injection
    - verify_xss_prevention
    - check_file_upload_security
```

---

## Troubleshooting

### 1. Common Issues

**Worker Deployment Failures:**
```bash
# Issue: "Module not found" error
# Solution: Check tsconfig.json and ensure all dependencies are installed
npm install
npm run build

# Issue: "Binding not found" error
# Solution: Verify wrangler.toml bindings match environment
wrangler kv:namespace list
wrangler d1 list

# Issue: "Route already exists" error
# Solution: Delete existing route or use different pattern
wrangler route delete <route-id>
```

**Database Connection Issues:**
```sql
-- Check database accessibility
wrangler d1 execute DB_NAME --sql "SELECT 1;"

-- Verify table existence
wrangler d1 execute DB_NAME --sql ".tables"

-- Check recent errors
wrangler d1 execute DB_NAME --sql "SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 10;"
```

**Performance Issues:**
```typescript
// Debug slow queries
class QueryProfiler {
  async profile<T>(query: () => Promise<T>): Promise<T> {
    const start = Date.now();
    const result = await query();
    const duration = Date.now() - start;

    if (duration > 1000) {
      console.warn(`Slow query detected: ${duration}ms`);
    }

    return result;
  }
}
```

### 2. Monitoring Dashboard

**Key Metrics to Monitor:**
```yaml
dashboard_metrics:
  uptime:
    - service_availability
    - response_time_p95
    - error_rate

  performance:
    - request_throughput
    - cpu_utilization
    - memory_usage

  business:
    - user_registrations
    - content_generated
    - revenue_metrics

  security:
    - failed_login_attempts
    - rate_limit_violations
    - suspicious_activities
```

### 3. Log Analysis

**Log Aggregation:**
```typescript
// Structured logging for analysis
class Logger {
  log(level: string, message: string, metadata: any = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'mustbeviral-api',
      environment: 'production',
      requestId: metadata.requestId,
      userId: metadata.userId,
      ...metadata
    };

    console.log(JSON.stringify(logEntry));
  }
}
```

---

## Maintenance Procedures

### 1. Regular Maintenance

**Weekly Tasks:**
- Review error logs and metrics
- Check SSL certificate expiration
- Verify backup integrity
- Update dependencies (security patches)
- Review and rotate API keys

**Monthly Tasks:**
- Analyze performance metrics
- Review and update rate limits
- Security audit and penetration testing
- Capacity planning and scaling review
- Documentation updates

### 2. Security Updates

**Security Patch Process:**
```bash
# 1. Review security advisories
npm audit

# 2. Update dependencies
npm update

# 3. Test in staging
npm run test
./scripts/cloudflare-deploy.sh staging

# 4. Deploy to production
./scripts/cloudflare-deploy.sh production

# 5. Verify deployment
curl -f https://api.mustbeviral.com/health
```

### 3. Scaling Procedures

**Horizontal Scaling:**
```yaml
# Auto-scaling triggers
scaling_rules:
  scale_up:
    - cpu_usage > 80% for 5 minutes
    - request_rate > 1000/minute
    - error_rate > 2%

  scale_down:
    - cpu_usage < 20% for 15 minutes
    - request_rate < 100/minute
    - error_rate < 0.1%
```

---

## Security Checklist

### Pre-Deployment Security Review

- [ ] All secrets generated and stored securely
- [ ] HTTPS enforced across all endpoints
- [ ] Security headers properly configured
- [ ] Rate limiting implemented and tested
- [ ] Input validation covers all endpoints
- [ ] Authentication and authorization working
- [ ] CORS policy restrictive and appropriate
- [ ] Error messages don't leak sensitive information
- [ ] Logging excludes sensitive data
- [ ] Backup encryption enabled
- [ ] Access controls properly configured
- [ ] Security monitoring and alerting active

### Post-Deployment Security Verification

- [ ] SSL/TLS configuration verified with SSL Labs
- [ ] Security headers checked with Security Headers
- [ ] Authentication flows tested thoroughly
- [ ] Authorization bypass attempts blocked
- [ ] Rate limiting functional under load
- [ ] Error handling doesn't expose internals
- [ ] Backup and recovery procedures tested
- [ ] Monitoring and alerting functional
- [ ] Incident response procedures documented
- [ ] Security documentation up to date

---

*Last Updated: January 2025*

**This deployment guide ensures a secure, scalable, and maintainable production deployment of Must Be Viral V2. Follow all steps carefully and verify each component before proceeding to the next.**