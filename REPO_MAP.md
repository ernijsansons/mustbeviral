# Repository Map - Must Be Viral V2
**Generated:** 2025-09-26
**Purpose:** Comprehensive overview of repository structure, dependencies, and entry points

## Repository Structure Overview

```
Must Be Viral V2/
├── .github/                    # GitHub Actions CI/CD workflows
│   └── workflows/              # Automated deployment and testing
├── .githooks/                  # Git hooks for pre-commit/push validation
├── architecture/               # Architecture documentation
├── database/                   # Database migrations and schemas
│   └── migrations/            # SQL migration files
├── load-tests/                # Load testing scripts (DUPLICATE - remove)
├── monitoring/                 # Monitoring and observability configs
│   ├── grafana/               # Grafana dashboards
│   ├── logstash/              # Log processing
│   └── prometheus/            # Metrics collection
├── mustbeviral/               # Main application directory
│   ├── .storybook/            # Storybook configuration
│   ├── __mocks__/             # Test mocks
│   ├── __tests__/             # Old test structure (TO REMOVE)
│   ├── app/                   # Next.js app directory
│   ├── docs/                  # Structured documentation
│   ├── e2e/                   # Modern E2E tests (Playwright)
│   ├── load-tests/            # Comprehensive load tests
│   ├── migrations/            # App-specific D1 migrations
│   ├── public/                # Static assets
│   ├── scripts/               # Build and utility scripts
│   ├── security-tests/        # Security testing suite
│   ├── server/                # Server-side code
│   ├── src/                   # Source code
│   │   ├── agents/            # AI agent implementations
│   │   ├── components/        # React components
│   │   ├── controllers/       # Business logic controllers
│   │   ├── core/              # Core domain logic
│   │   ├── hooks/             # React hooks
│   │   ├── lib/               # Utility libraries
│   │   ├── middleware/        # Express/Worker middleware
│   │   ├── pages/             # Page components
│   │   ├── providers/         # React context providers
│   │   ├── styles/            # CSS and styling
│   │   ├── types/             # TypeScript definitions
│   │   └── worker/            # Cloudflare Worker code
│   ├── supabase/              # Supabase-specific migrations
│   └── workers/               # Microservice workers
│       ├── analytics-worker/  # Analytics processing
│       ├── api-gateway/       # API gateway service
│       ├── auth-worker/       # Authentication service
│       ├── content-worker/    # Content management
│       ├── shared/            # Shared worker utilities
│       ├── user-service/      # User management
│       └── websocket-worker/  # Real-time communications
├── nginx/                     # Nginx configuration
├── node_modules/              # Dependencies (ignored in git)
└── scripts/                   # Root-level deployment scripts
```

## Entry Points and Runtime Files

### Primary Cloudflare Workers Entry Points
| Worker | Entry Point | Config | Purpose |
|--------|------------|--------|---------|
| Main App | `mustbeviral/src/worker.ts` | `mustbeviral/wrangler.toml` | Main application worker |
| Analytics | `mustbeviral/workers/analytics-worker/src/index.ts` | `../wrangler.toml` | Analytics processing |
| API Gateway | `mustbeviral/workers/api-gateway/src/index.ts` | `../wrangler.toml` | API routing |
| Auth | `mustbeviral/workers/auth-worker/src/index.ts` | `../wrangler.toml` | Authentication |
| Content | `mustbeviral/workers/content-worker/src/index.ts` | `../wrangler.toml` | Content management |
| User Service | `mustbeviral/workers/user-service/src/index.ts` | `../wrangler.toml` | User operations |
| WebSocket | `mustbeviral/workers/websocket-worker/src/index.ts` | `../wrangler.toml` | Real-time features |

### Frontend Entry Points
- **Vite Dev Server:** `mustbeviral/index.html` → `mustbeviral/src/main.tsx`
- **Next.js App:** `mustbeviral/app/layout.tsx` → `mustbeviral/app/page.tsx`
- **Build Output:** `mustbeviral/dist/` (gitignored)

### Server Entry Points
- **Node Server:** `server.js` (root) - Express server for local development
- **Worker Router:** `mustbeviral/src/worker/router.ts` - Request routing

## Dependency Graph

### Build Dependencies Flow
```
package.json (root)
    ├── npm run build
    │   ├── npm run build:workers → mustbeviral/workers/*/build
    │   └── npm run build:app → mustbeviral/vite build
    ├── npm run test
    │   ├── test:unit → Jest unit tests
    │   ├── test:integration → Jest integration
    │   └── test:e2e → Playwright E2E
    └── npm run deploy
        ├── cloudflare:deploy → wrangler deploy
        └── cloudflare:pages:deploy → wrangler pages deploy
```

### Module Dependencies (Key Libraries)
```
mustbeviral/package.json
    ├── Runtime Dependencies
    │   ├── @cloudflare/workers-types  # Cloudflare Workers TypeScript
    │   ├── @tanstack/react-query      # Data fetching
    │   ├── drizzle-orm                # Database ORM
    │   ├── next                       # Next.js framework
    │   ├── react & react-dom          # UI framework
    │   ├── stripe                     # Payment processing
    │   └── wrangler                   # Cloudflare CLI
    └── Dev Dependencies
        ├── @playwright/test           # E2E testing
        ├── @typescript-eslint/*       # TypeScript linting
        ├── jest                       # Unit testing
        ├── vite                       # Build tool
        └── storybook                  # Component development
```

## Cloudflare Resources and Bindings

### D1 Database
- **Binding:** `DB`
- **Database:** `must-be-viral-db`
- **Migrations:** `mustbeviral/migrations/`

### KV Namespaces
- **TRENDS_CACHE:** Trending data cache
- **Configuration:** In each worker's wrangler.toml

### R2 Buckets
- **ASSETS_STORAGE:** Media and file storage
- **Bucket:** `must-be-viral-assets`

### Durable Objects
- **WebSocket Rooms:** `mustbeviral/workers/websocket-worker/src/durable-objects/`
- **Collaboration:** Real-time collaboration state

### Environment Variables
```
Required Secrets (via wrangler secret put):
- JWT_SECRET
- STRIPE_SECRET_KEY
- CLOUDFLARE_API_TOKEN
- Database URLs
- API Keys
```

## Asset Reference Map

### Static Assets
- **Public Assets:** `mustbeviral/public/` → Served directly
- **Manifest:** `mustbeviral/public/manifest.json` → PWA config
- **Service Worker:** `mustbeviral/public/sw.js` → Offline support

### Generated Assets (Gitignored)
- `mustbeviral/dist/` - Vite build output
- `mustbeviral/.next/` - Next.js build
- `mustbeviral/out/` - Static export
- `mustbeviral/storybook-static/` - Storybook build
- `mustbeviral/coverage/` - Test coverage reports

## Script Reachability Analysis

### Production Scripts (KEEP)
```bash
# Deployment
scripts/cloudflare-deploy.sh      # Main deployment
scripts/deploy-microservices.sh   # Service deployment
scripts/deploy.sh                 # Generic deploy

# Monitoring
scripts/monitor.sh                # System monitoring
scripts/performance-monitor.js    # Performance tracking
scripts/health-check.js           # Health checks

# Security
scripts/security-checker.js       # Security validation
scripts/input-sanitizer.js       # Input validation
```

### Development Scripts (KEEP)
```bash
# Setup
scripts/setup-dev-environment.sh  # Dev environment
mustbeviral/scripts/d1-migrate.ts # Database migrations

# Testing
mustbeviral/scripts/test-performance.js
mustbeviral/scripts/test-security.ts
```

### Temporary Scripts (REMOVE)
```bash
# One-off fixes (22 files)
mustbeviral/scripts/fix-*.cjs    # All fix scripts
mustbeviral/scripts/*-unused-*.cjs # Cleanup scripts
mustbeviral/scripts/count-errors.cjs
mustbeviral/scripts/export-project.cjs
```

## File Size Distribution

### Large File Categories
1. **Documentation:** ~50 .md files (many duplicates)
2. **Reports:** 9 XML/JSON report files
3. **Test Files:** ~200 test files across multiple directories
4. **Scripts:** ~60 script files (22 temporary)
5. **Archive:** 1 ZIP file (183KB)

### Directory Size Estimates
- `node_modules/`: Multiple GB (properly gitignored)
- `mustbeviral/`: Main app code (~50MB excluding node_modules)
- `monitoring/`: Configuration files (<1MB)
- `scripts/`: Utility scripts (~2MB)

## Orphan Detection Summary

### Confirmed Orphans (No References)
1. All `fix-*.cjs` scripts - No package.json references
2. Root documentation .md files - Duplicated in docs/
3. Report files (XML/JSON) - One-time generated
4. `must-be-viral-export-*.zip` - Archive file

### Potential Orphans (Need Verification)
1. Some unit tests in `__tests__/` - May have unique coverage
2. Migration files with similar names - May be environment-specific
3. Example files - May be useful templates

### Critical Files (Never Remove)
1. All `wrangler.toml` files
2. Worker entry points (`index.ts`, `worker.ts`)
3. Package.json files
4. CI/CD workflows (`.github/workflows/`)
5. Database migrations (until verified obsolete)

## Recommendations

### Immediate Actions
1. Remove all confirmed orphan files (~50 files)
2. Consolidate documentation into `mustbeviral/docs/`
3. Remove duplicate test structures
4. Clean up temporary scripts

### Future Improvements
1. Consolidate migration strategies
2. Implement stricter .gitignore patterns
3. Add pre-commit hooks to prevent bloat
4. Set up automated cleanup CI job

## Validation Checklist

Before removing any files, ensure:
- [ ] All builds pass (`npm run build`)
- [ ] All tests pass (`npm run test`)
- [ ] Cloudflare deployment works (`wrangler deploy --dry-run`)
- [ ] No broken imports or references
- [ ] Documentation is preserved in consolidated location