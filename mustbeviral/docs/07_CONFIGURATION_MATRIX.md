# Configuration Matrix - Must Be Viral V2

## Environment Configuration Overview

Must Be Viral V2 uses a multi-environment deployment strategy with environment-specific configurations managed through Cloudflare Workers environment variables and secrets.

## Environment Definitions

### Development Environment
- **Purpose**: Local development and testing
- **Characteristics**: Debug logging, relaxed security, test data
- **Access**: Developer workstations only

### Staging Environment
- **Purpose**: Pre-production testing and QA
- **Characteristics**: Production-like setup, synthetic data
- **Access**: QA team and stakeholders

### Production Environment
- **Purpose**: Live user-facing application
- **Characteristics**: Maximum security, real user data, monitoring
- **Access**: Operations team only

## Configuration Sources

### 1. Wrangler Configuration (`wrangler.toml`)

```toml
# Base configuration
name = "must-be-viral"
main = "src/worker/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# Environment-specific names
[env.development]
name = "must-be-viral-dev"

[env.staging]
name = "must-be-viral-staging"

[env.production]
name = "must-be-viral-prod"
```

### 2. Cloudflare Workers Secrets
**Security Level**: Encrypted at rest, accessible only to Workers
**Management**: `wrangler secret put <SECRET_NAME>`

### 3. Environment Variables
**Security Level**: Plain text, visible in dashboard
**Management**: Set in `wrangler.toml` or Cloudflare dashboard

## Configuration Matrix

| Configuration | Development | Staging | Production | Required | Default | Purpose |
|---------------|-------------|---------|------------|----------|---------|---------|
| **Environment Settings** | | | | | | |
| `ENVIRONMENT` | development | staging | production | ✅ | development | Environment identifier |
| `NODE_ENV` | development | production | production | ✅ | development | Node.js environment |
| `DEBUG_MODE` | true | false | false | ❌ | false | Enable debug logging |
| `LOG_LEVEL` | debug | info | warn | ❌ | info | Logging verbosity |
| **Authentication Secrets** | | | | | | |
| `JWT_SECRET` | dev_secret_32chars | secure_staging_secret | prod_secret_256bit | ✅ | - | JWT signing key |
| `JWT_REFRESH_SECRET` | dev_refresh_32chars | staging_refresh_secret | prod_refresh_256bit | ✅ | - | Refresh token signing |
| `JWT_ISSUER` | must-be-viral-dev | must-be-viral-staging | must-be-viral | ❌ | must-be-viral | JWT issuer claim |
| `JWT_AUDIENCE` | dev.mustbeviral.com | staging.mustbeviral.com | mustbeviral.com | ❌ | mustbeviral.com | JWT audience claim |
| `JWT_EXPIRY` | 24h | 15m | 15m | ❌ | 15m | Access token expiry |
| `JWT_REFRESH_EXPIRY` | 30d | 7d | 7d | ❌ | 7d | Refresh token expiry |
| **Encryption & Security** | | | | | | |
| `ENCRYPTION_KEY` | dev_encryption_key | staging_enc_key_32b | prod_enc_key_256bit | ✅ | - | AES-256 encryption key |
| `HASH_ROUNDS` | 4 | 12 | 12 | ❌ | 12 | PBKDF2 cost factor |
| `SESSION_SECRET` | dev_session_secret | staging_session_32b | prod_session_256bit | ✅ | - | Session encryption |
| **Payment Processing** | | | | | | |
| `STRIPE_SECRET_KEY` | sk_test_... | sk_test_... | sk_live_... | ✅ | - | Stripe API secret |
| `STRIPE_WEBHOOK_SECRET` | whsec_dev... | whsec_staging... | whsec_prod... | ✅ | - | Stripe webhook secret |
| `STRIPE_PUBLIC_KEY` | pk_test_... | pk_test_... | pk_live_... | ❌ | - | Stripe public key |
| **OAuth Providers** | | | | | | |
| `GOOGLE_CLIENT_ID` | dev_google_id | staging_google_id | prod_google_id | ❌ | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | dev_google_secret | staging_google_secret | prod_google_secret | ❌ | - | Google OAuth secret |
| `GITHUB_CLIENT_ID` | dev_github_id | staging_github_id | prod_github_id | ❌ | - | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | dev_github_secret | staging_github_secret | prod_github_secret | ❌ | - | GitHub OAuth secret |
| **Database Configuration** | | | | | | |
| `DATABASE_URL` | Local D1 | Staging D1 | Production D1 | ❌ | - | External DB connection |
| `DB_POOL_SIZE` | 5 | 20 | 50 | ❌ | 10 | Connection pool size |
| `DB_TIMEOUT` | 30000 | 10000 | 5000 | ❌ | 10000 | Query timeout (ms) |
| **AI & ML Services** | | | | | | |
| `OPENAI_API_KEY` | dev_openai_key | staging_openai_key | prod_openai_key | ❌ | - | OpenAI API access |
| `AI_MODEL_VERSION` | gpt-3.5-turbo | gpt-4-turbo | gpt-4-turbo | ❌ | gpt-3.5-turbo | Default AI model |
| `AI_MAX_TOKENS` | 2000 | 1500 | 1000 | ❌ | 1500 | AI response limit |
| `AI_TEMPERATURE` | 0.9 | 0.7 | 0.7 | ❌ | 0.7 | AI creativity level |
| **CORS & Security** | | | | | | |
| `ALLOWED_ORIGINS` | localhost:*,127.0.0.1:* | staging.mustbeviral.com | mustbeviral.com,www.mustbeviral.com | ✅ | localhost:3000 | CORS allowed origins |
| `CORS_CREDENTIALS` | true | true | true | ❌ | true | Allow credentials |
| `CSP_POLICY` | permissive | strict | strict | ❌ | strict | Content Security Policy |
| **Rate Limiting** | | | | | | |
| `RATE_LIMIT_GLOBAL` | 10000 | 5000 | 1000 | ❌ | 1000 | Global requests/hour |
| `RATE_LIMIT_AUTH` | 100 | 50 | 10 | ❌ | 10 | Auth requests/hour |
| `RATE_LIMIT_API` | 5000 | 2000 | 500 | ❌ | 500 | API requests/hour |
| `RATE_LIMIT_AI` | 500 | 200 | 100 | ❌ | 100 | AI requests/hour |
| **Feature Flags** | | | | | | |
| `FEATURE_AI_GENERATION` | true | true | true | ❌ | true | Enable AI content generation |
| `FEATURE_INFLUENCER_MATCHING` | true | true | true | ❌ | true | Enable influencer matching |
| `FEATURE_ANALYTICS` | true | true | true | ❌ | true | Enable analytics tracking |
| `FEATURE_PAYMENTS` | false | true | true | ❌ | false | Enable payment processing |
| `FEATURE_OAUTH` | true | true | true | ❌ | true | Enable OAuth login |
| `FEATURE_CONTENT_MODERATION` | false | true | true | ❌ | false | Enable content moderation |
| **Monitoring & Observability** | | | | | | |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | - | staging-otel.com | prod-otel.com | ❌ | - | OpenTelemetry endpoint |
| `SENTRY_DSN` | - | staging_sentry_dsn | prod_sentry_dsn | ❌ | - | Error tracking |
| `LOG_RETENTION_DAYS` | 7 | 30 | 90 | ❌ | 30 | Log retention period |
| `METRICS_ENABLED` | false | true | true | ❌ | false | Enable metrics collection |
| **Performance Tuning** | | | | | | |
| `CACHE_TTL_DEFAULT` | 300 | 900 | 3600 | ❌ | 900 | Default cache TTL (seconds) |
| `CACHE_TTL_AUTH` | 60 | 300 | 900 | ❌ | 300 | Auth cache TTL |
| `CACHE_TTL_CONTENT` | 600 | 1800 | 3600 | ❌ | 1800 | Content cache TTL |
| `MAX_REQUEST_SIZE` | 10MB | 5MB | 2MB | ❌ | 5MB | Maximum request size |
| **External Services** | | | | | | |
| `GOOGLE_TRENDS_API_KEY` | dev_trends_key | staging_trends_key | prod_trends_key | ❌ | - | Google Trends API |
| `TWITTER_API_KEY` | dev_twitter_key | staging_twitter_key | prod_twitter_key | ❌ | - | Twitter API access |
| `INSTAGRAM_API_KEY` | dev_ig_key | staging_ig_key | prod_ig_key | ❌ | - | Instagram API access |
| `CLOUDFLARE_API_TOKEN` | dev_cf_token | staging_cf_token | prod_cf_token | ❌ | - | Cloudflare API access |
| **Deployment Settings** | | | | | | |
| `BUILD_ENVIRONMENT` | development | staging | production | ✅ | development | Build target |
| `MINIFY_CODE` | false | true | true | ❌ | false | Code minification |
| `ENABLE_SOURCEMAPS` | true | true | false | ❌ | true | Source map generation |
| `BUNDLE_ANALYZER` | false | false | false | ❌ | false | Bundle analysis |

## Cloudflare Workers Bindings

### D1 Database Bindings
```toml
[[d1_databases]]
binding = "DB"
database_name = "must-be-viral-db"
database_id = "14bdc6aa-5ddb-4340-bfb2-59dc68d2c520"
migrations_dir = "migrations"
```

### KV Namespace Bindings
```toml
# Session Storage
[[kv_namespaces]]
binding = "USER_SESSIONS"
id = "90539d0783594456999e031d18801638"

# Trends Cache
[[kv_namespaces]]
binding = "TRENDS_CACHE"
id = "f589a1dbb2c5457c9737375f0e0640d9"

# Rate Limiting
[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "f589a1dbb2c5457c9737375f0e0640d9"

# OAuth State
[[kv_namespaces]]
binding = "KV_NAMESPACE"
id = "f94e5d4b68a840ac9f83b9f277044a50"
```

### R2 Storage Bindings
```toml
# Asset Storage
[[r2_buckets]]
binding = "ASSETS_STORAGE"
bucket_name = "must-be-viral-assets"

# Content Storage
[[r2_buckets]]
binding = "CONTENT_STORAGE"
bucket_name = "content-storage"
```

### AI Bindings
```toml
[ai]
binding = "AI"

[[vectorize]]
binding = "CONTENT_EMBEDDINGS"
index_name = "content-embeddings"
dimensions = 1536
metric = "cosine"
```

## Secret Management Strategy

### Secret Rotation Schedule
| Secret Type | Rotation Frequency | Automation | Backup |
|-------------|-------------------|------------|---------|
| JWT Secrets | 90 days | Manual | KV Storage |
| Encryption Keys | 365 days | Manual | Secure Vault |
| API Keys | 180 days | Auto (where supported) | Encrypted Config |
| OAuth Secrets | As needed | Manual | Provider Dashboard |
| Database Credentials | 180 days | Manual | Secure Backup |

### Secret Access Control
- **Development**: Developer access to dev secrets only
- **Staging**: QA team + senior developers
- **Production**: Operations team + platform administrators

### Secret Generation Commands
```bash
# Generate JWT secrets
openssl rand -base64 32

# Generate encryption keys
openssl rand -base64 32

# Generate session secrets
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Store secrets in Cloudflare Workers
wrangler secret put JWT_SECRET --env production
wrangler secret put ENCRYPTION_KEY --env production
```

## Environment Validation

### Startup Validation
```typescript
// Environment validation schema
const envSchema = z.object({
  ENVIRONMENT: z.enum(['development', 'staging', 'production']),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),
  ALLOWED_ORIGINS: z.string(),
  // ... other required variables
});

// Validate on startup
export function validateEnvironment(env: any) {
  try {
    return envSchema.parse(env);
  } catch (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }
}
```

### Runtime Configuration Access
```typescript
// Type-safe environment access
interface Environment {
  DB: D1Database;
  USER_SESSIONS: KVNamespace;
  TRENDS_CACHE: KVNamespace;
  RATE_LIMITS: KVNamespace;
  ASSETS_STORAGE: R2Bucket;
  AI: Ai;

  // Secrets
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  STRIPE_SECRET_KEY?: string;

  // Variables
  ENVIRONMENT: 'development' | 'staging' | 'production';
  ALLOWED_ORIGINS: string;
  DEBUG_MODE?: string;
}

// Environment-specific logic
export function getConfig(env: Environment) {
  const isDevelopment = env.ENVIRONMENT === 'development';
  const isProduction = env.ENVIRONMENT === 'production';

  return {
    jwtExpiry: isDevelopment ? '24h' : '15m',
    logLevel: isDevelopment ? 'debug' : 'warn',
    rateLimits: {
      global: isDevelopment ? 10000 : 1000,
      auth: isDevelopment ? 100 : 10,
    },
    features: {
      payments: !isDevelopment,
      moderation: isProduction,
    },
  };
}
```

## Configuration Best Practices

### 1. Security Guidelines
- ✅ All secrets stored in Cloudflare Workers secrets (encrypted)
- ✅ No secrets in code, logs, or version control
- ✅ Environment-specific secret values
- ✅ Regular secret rotation schedule
- ✅ Principle of least privilege for secret access

### 2. Environment Isolation
- ✅ Separate Cloudflare accounts/zones per environment
- ✅ No cross-environment data access
- ✅ Independent CI/CD pipelines
- ✅ Environment-specific monitoring and alerts

### 3. Configuration Management
- ✅ Infrastructure as Code (Wrangler configuration)
- ✅ Version-controlled configuration templates
- ✅ Automated environment provisioning
- ✅ Configuration drift detection

### 4. Disaster Recovery
- ✅ Encrypted configuration backups
- ✅ Secret recovery procedures
- ✅ Environment rebuild automation
- ✅ Cross-region failover capabilities

---

*Configuration matrix maintained in sync with deployment automation*
*Secret rotation schedule enforced through monitoring alerts*
*Environment validation prevents deployment of misconfigured services*