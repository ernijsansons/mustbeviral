# Claude.md

## 1. Project Purpose & Vision

**Must Be Viral V2** is an enterprise-level AI-powered influencer marketing and content creation platform designed for the modern creator economy. The platform solves the challenge of creating viral content and connecting brands with influencers through intelligent automation and data-driven insights.

### Mission Statement
Democratize viral marketing by providing creators, brands, and agencies with AI-powered tools to generate engaging content, predict viral potential, and optimize campaign performance across social media platforms.

### Target Audience
- **Content Creators**: Individual creators seeking to increase engagement and monetize content
- **Brands & Agencies**: Companies looking to leverage influencer marketing at scale
- **Enterprises**: Large organizations requiring white-label marketing automation solutions

### Core Value Proposition
Transform content creation from guesswork to data-driven strategy using advanced AI, real-time trend analysis, and predictive analytics to maximize viral potential and ROI.

## 2. System Overview

Must Be Viral V2 is a comprehensive viral marketing platform that combines AI-powered content generation with intelligent influencer matching and real-time performance analytics. The system operates as a multi-tenant SaaS platform with tiered subscription models.

### Key Capabilities
- **AI Content Generation**: Multi-provider AI system (Cloudflare AI, OpenAI) for automated content creation
- **Viral Prediction Engine**: Machine learning algorithms to predict content viral potential
- **Influencer Matching**: Intelligent brand-influencer pairing based on audience overlap and engagement metrics
- **Real-Time Analytics**: Live performance tracking with predictive insights
- **Collaboration Tools**: Real-time content editing and campaign management
- **Subscription Management**: Tiered access with Stripe integration

### End-to-End Operation
Users authenticate through JWT-based auth, create content using AI tools, receive viral predictions and optimization suggestions, collaborate with team members in real-time, and track performance through comprehensive analytics dashboards.

## 3. Tech Stack

### Frontend
- **Framework**: Next.js 15 with React 18
- **Language**: TypeScript 5.5
- **Styling**: Tailwind CSS 3.4
- **Routing**: Wouter 3.7
- **State Management**: @tanstack/react-query 5.90
- **UI Components**: Custom component library with Lucide React icons
- **Build Tool**: Vite 7.1 with advanced optimization

### Backend
- **Runtime**: Cloudflare Workers with Node.js 20 compatibility
- **Framework**: Express 5.1 (main server) + Hono (Workers)
- **Authentication**: JWT with JOSE 6.0, bcryptjs 3.0
- **Database ORM**: Drizzle ORM 0.44 with Drizzle Kit 0.18

### Databases & Storage
- **Primary Database**: Cloudflare D1 (SQLite) for edge computing
- **Cache Layer**: Cloudflare KV for distributed caching
- **Object Storage**: Cloudflare R2 for asset storage
- **Traditional Database**: PostgreSQL with connection pooling
- **In-Memory Cache**: Redis with ioredis 5.8

### AI & Integrations
- **AI Framework**: LangChain Community 0.3.53
- **Payment Processing**: Stripe 18.4
- **Trend Analysis**: Google Trends API 4.9
- **Real-time Communication**: WebSocket (ws 8.18)

### Infrastructure & Deployment
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose with multiple configurations
- **CDN**: Cloudflare global edge network (280+ locations)
- **CI/CD**: GitHub Actions with Wrangler CLI 4.36
- **Monitoring**: Custom monitoring stack with health checks

### Testing & Quality
- **Unit Testing**: Jest 29.7 with @testing-library/react 16.3
- **E2E Testing**: Playwright 1.55 with accessibility testing
- **Code Quality**: ESLint 9.9, Prettier 3.6, TypeScript strict mode
- **Coverage**: 95%+ across unit, integration, and E2E tests

## 4. Architecture

### High-Level Architecture
Must Be Viral V2 follows a microservices architecture deployed on Cloudflare's edge computing platform, ensuring global performance and scalability.

```mermaid
graph TB
    subgraph "Client Layer"
        A[Next.js Frontend]
        B[Mobile PWA]
        C[Admin Dashboard]
    end

    subgraph "Cloudflare Edge"
        D[API Gateway Worker]
        E[Rate Limiting]
        F[Authentication]
        G[Load Balancer]
    end

    subgraph "Core Workers"
        H[Auth Worker]
        I[Content Worker]
        J[Analytics Worker]
        K[WebSocket Worker]
        L[AI Processing Worker]
    end

    subgraph "Data Layer"
        M[Cloudflare D1]
        N[Cloudflare KV]
        O[Cloudflare R2]
        P[PostgreSQL]
        Q[Redis Cache]
    end

    subgraph "External Services"
        R[Stripe API]
        S[AI Providers]
        T[Social Media APIs]
        U[Monitoring Services]
    end

    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    G --> I
    G --> J
    G --> K
    G --> L
    H --> M
    I --> N
    J --> M
    K --> O
    L --> S
    I --> P
    J --> Q
    H --> R
    L --> T
    J --> U
```

### Microservices Breakdown
- **API Gateway**: Central entry point with rate limiting and request routing
- **Auth Worker**: User authentication, JWT management, session handling
- **Content Worker**: Content CRUD operations, AI integration, media processing
- **Analytics Worker**: Real-time metrics, event processing, reporting
- **WebSocket Worker**: Real-time collaboration, live notifications

### Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant G as API Gateway
    participant A as Auth Worker
    participant C as Content Worker
    participant D as Database
    participant AI as AI Service

    U->>F: Create Content Request
    F->>G: POST /api/content
    G->>A: Validate JWT Token
    A-->>G: Token Valid
    G->>C: Forward Request
    C->>AI: Generate Content
    AI-->>C: AI Response
    C->>D: Store Content
    D-->>C: Success
    C-->>G: Content Created
    G-->>F: Response
    F-->>U: Display Result
```

## 5. Core Features

### AI-Powered Content Generation
- **Multi-Provider Support**: Cloudflare AI, OpenAI integration with fallback mechanisms
- **Content Types**: Social media posts, captions, hashtags, video scripts
- **Optimization**: SEO optimization, platform-specific formatting
- **Quality Assurance**: Automated plagiarism detection and ethics checking

### Subscription Tiers
- **Free Tier**: Basic AI tools (10K tokens/day, 5 images/day)
- **Standard Tier**: Enhanced AI (100K tokens/day, Stable Diffusion access)
- **Premium Tier**: All models (500K tokens/day, GPT-4, advanced features)
- **Enterprise**: Custom limits, white-label options, dedicated support

### Real-Time Analytics
- **Performance Metrics**: Engagement rates, reach, conversion tracking
- **Viral Prediction**: ML-powered viral potential scoring
- **Trend Analysis**: Live social media trend monitoring
- **Competitive Intelligence**: Competitor performance benchmarking

### Collaboration Features
- **Real-Time Editing**: Collaborative content creation with WebSocket
- **Campaign Management**: Multi-user campaign planning and execution
- **Asset Sharing**: Centralized media library with version control
- **Approval Workflows**: Content review and approval processes

### Security & Compliance
- **Authentication**: JWT-based auth with 24h expiration, bcrypt hashing
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: GDPR compliance, data encryption at rest and in transit
- **Rate Limiting**: Sliding window algorithm, DDoS protection

## 6. Configuration

### Environment Variables

| Variable | Service | Required | Description |
|----------|---------|----------|-------------|
| `JWT_SECRET` | All Workers | ✅ | JWT signing secret |
| `STRIPE_SECRET_KEY` | API Gateway | ✅ | Stripe payment processing |
| `CLOUDFLARE_API_TOKEN` | Deployment | ✅ | Cloudflare API access |
| `DATABASE_URL` | Content/Analytics | ✅ | PostgreSQL connection string |
| `REDIS_URL` | All Workers | ✅ | Redis cache connection |
| `AI_API_KEY` | Content Worker | ✅ | AI service API keys |
| `ENCRYPTION_KEY` | All Workers | ✅ | Data encryption key |
| `NODE_ENV` | All Services | ✅ | Environment (development/production) |
| `LOG_LEVEL` | All Services | ❌ | Logging level (DEBUG/INFO/WARN) |
| `RATE_LIMIT_REQUESTS` | API Gateway | ❌ | Requests per window (default: 1000) |
| `CACHE_TTL` | All Workers | ❌ | Cache expiration seconds (default: 300) |

### Cloudflare Bindings

#### D1 Databases
- **`DB`**: Main application database
- **`ANALYTICS_DB`**: Analytics and metrics data
- **`AUDIT_DB`**: Security and compliance logs

#### KV Namespaces
- **`TRENDS_CACHE`**: Social media trends cache
- **`RATE_LIMITER`**: Rate limiting counters
- **`API_CACHE`**: API response cache
- **`SESSION_STORE`**: User session data

#### R2 Buckets
- **`ASSETS_STORAGE`**: User-generated content
- **`ANALYTICS_EXPORTS`**: Report exports
- **`BACKUP_STORAGE`**: Database backups

#### Durable Objects
- **`RATE_LIMITER_DO`**: Distributed rate limiting
- **`WEBSOCKET_ROOM`**: Real-time collaboration
- **`EVENT_PROCESSOR`**: Analytics event processing

## 7. Deployment Guide (Cloudflare)

### Prerequisites
- Node.js 20+ with npm 9+
- Cloudflare account with Workers Paid plan
- Wrangler CLI 4.36+ installed globally
- Git 2.30+

### Build & Development

```bash
# Install dependencies
npm install

# Setup environment and git hooks
npm run setup

# Development server (local)
npm run dev

# Development with Cloudflare Workers
npm run cloudflare:workers:dev
```

### Local Preview

```bash
# Start full development stack
npm run dev  # Runs frontend, backend, and workers

# Individual services
npm run dev:server    # Express server only
npm run dev:workers   # Cloudflare Workers only
npm run dev:app       # Frontend only
```

### Production Deployment

```bash
# Build and deploy to staging
npm run deploy:staging

# Build and deploy to production
npm run deploy:production

# Deploy specific services
npm run cloudflare:workers:deploy  # Workers only
npm run cloudflare:pages:deploy    # Pages only
```

### Environment-Specific Deployment

```bash
# Staging deployment with dry-run validation
npm run cloudflare:deploy:dry-run

# Production deployment with confirmation
npm run cloudflare:deploy:production

# Rollback if needed
npm run rollback:production
```

### Verification Steps

```bash
# Health checks
npm run health:staging
npm run health:production

# Performance monitoring
npm run perf:monitor

# Security validation
npm run security:gate
```

### Database Migrations

```bash
# Run D1 migrations
cd mustbeviral
npx wrangler d1 migrations apply must-be-viral-db --env production

# Validate migration
npm run health:production
```

## 8. Security & Compliance

### Authentication & Authorization
- **JWT Tokens**: 24-hour expiration with secure signing
- **Password Security**: bcrypt hashing with 12 rounds
- **Role-Based Access**: Creator, Influencer, Admin, Enterprise roles
- **Session Management**: Secure cookie handling with HttpOnly flags

### API Security
- **Rate Limiting**: Sliding window algorithm (1000 req/hour/IP)
- **Input Validation**: Comprehensive sanitization and validation
- **CORS**: Strict origin validation
- **Security Headers**: CSP, HSTS, X-Frame-Options, XSS protection

### Data Protection
- **Encryption**: AES-256 encryption for sensitive data
- **PII Handling**: GDPR-compliant data processing
- **Data Retention**: Automated cleanup policies
- **Audit Logging**: Comprehensive security event logging

### Compliance Status
- ✅ **GDPR**: Data subject rights, consent management
- ✅ **SOC 2 Type II**: Cloudflare infrastructure compliance
- ✅ **PCI DSS**: Stripe handles payment processing
- 🔄 **CCPA**: California privacy compliance (90% complete)
- 📋 **ISO 27001**: Information security management (planned)

### Security Monitoring
- **Vulnerability Scanning**: Automated Snyk + npm audit in CI/CD
- **Dependency Monitoring**: Real-time security updates
- **Penetration Testing**: Quarterly security assessments
- **Incident Response**: 24/7 monitoring with automated alerts

### Security Scripts
```bash
# Security audit
npm run security:audit

# Full security scan
npm run security:scan:full

# Deployment security gate
npm run security:gate
```

## 9. Performance & Scalability

### Performance Metrics
- **Response Times**: <100ms median (edge caching), <2s initial page load
- **Throughput**: 10M+ requests/day with auto-scaling
- **Availability**: 99.9% SLA (Cloudflare Workers uptime)
- **Geographic Coverage**: 280+ global edge locations

### Caching Strategy
- **L1 Cache**: In-memory caching with NodeCache (30s TTL)
- **L2 Cache**: Redis distributed cache (5min TTL)
- **L3 Cache**: Cloudflare KV edge cache (1hr TTL)
- **CDN**: Cloudflare CDN with intelligent caching

### Scalability Architecture
- **Horizontal Scaling**: Cloudflare Workers auto-scale based on demand
- **Database Scaling**: Connection pooling with automatic failover
- **Edge Computing**: Distributed processing across global edge network
- **Load Balancing**: Intelligent request routing with health checks

### Performance Optimizations
- **Bundle Optimization**: Advanced Vite chunking strategy
- **Code Splitting**: Lazy loading with dynamic imports
- **Image Optimization**: WebP conversion, progressive loading
- **Database Optimization**: Query optimization, connection pooling

### Monitoring Stack
```bash
# Real-time performance monitoring
npm run perf:monitor

# Lighthouse performance audit
npm run perf:lighthouse

# Bundle analysis
npm run build:analyze
```

### Performance Budget
- **Initial Bundle**: <200KB gzipped
- **Route Chunks**: <100KB per route
- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1

## 10. Maintenance & Ops

### CI/CD Pipeline (GitHub Actions)
```yaml
Development → Security Scan → Tests → Build → Deploy Staging
Production → Security Scan → Tests → Build → Deploy Production → Health Check
Pull Request → Security Scan → Tests → Report → Review
```

### Testing Strategy
- **Unit Tests**: Jest with 95%+ coverage (38+ test files)
- **Integration Tests**: API and service interaction testing
- **E2E Tests**: Playwright with accessibility testing
- **Performance Tests**: Lighthouse CI and custom performance monitoring
- **Security Tests**: Automated vulnerability scanning

### Testing Commands
```bash
# All tests
npm test

# Specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests
npm run test:performance  # Performance tests
npm run test:a11y         # Accessibility tests

# Coverage report
npm run test:coverage
```

### Health Monitoring
```bash
# Application health
npm run health

# All services health
npm run health:all

# Monitoring report
npm run monitor:report
```

### Maintenance Scripts
```bash
# Dependency management
npm run deps:check    # Check outdated packages
npm run deps:update   # Update dependencies

# Security maintenance
npm run security:check
npm run security:fix

# System cleanup
npm run clean         # Clean build artifacts
npm run docker:clean  # Clean Docker system
```

### Logging & Error Handling
- **Production Logger**: Pino with structured logging
- **Error Tracking**: Comprehensive error boundaries
- **Distributed Tracing**: Request correlation across services
- **Metrics Collection**: Custom business metrics and KPIs

### Alerting & Notifications
- **Error Rate Alerts**: >1% error rate triggers alerts
- **Performance Alerts**: >500ms response time warnings
- **Security Alerts**: Suspicious activity detection
- **Health Checks**: Automated service health monitoring

## 11. Appendix

### Project File Structure
```
must-be-viral-v2/
├── mustbeviral/                    # Main application
│   ├── src/
│   │   ├── components/             # React components (60+ files)
│   │   │   ├── ui/                 # Reusable UI components
│   │   │   ├── analytics/          # Analytics dashboards
│   │   │   ├── collaboration/      # Real-time collaboration
│   │   │   └── layouts/            # Layout components
│   │   ├── lib/                    # Core libraries (100+ files)
│   │   │   ├── ai/                 # AI service integration
│   │   │   ├── auth/               # Authentication logic
│   │   │   ├── database/           # Database utilities
│   │   │   ├── security/           # Security middleware
│   │   │   └── monitoring/         # Performance monitoring
│   │   ├── pages/                  # Next.js pages
│   │   └── styles/                 # CSS and styling
│   ├── workers/                    # Cloudflare Workers
│   │   ├── api-gateway/            # Central API gateway
│   │   ├── auth-worker/            # Authentication service
│   │   ├── content-worker/         # Content management
│   │   ├── analytics-worker/       # Analytics processing
│   │   └── websocket-worker/       # Real-time communication
│   ├── __tests__/                  # Test suite (95% coverage)
│   │   ├── unit/                   # Unit tests
│   │   ├── integration/            # Integration tests
│   │   └── e2e/                    # End-to-end tests
│   ├── package.json                # Frontend dependencies
│   ├── vite.config.ts              # Vite configuration
│   └── wrangler.toml               # Cloudflare Workers config
├── scripts/                        # Build and deployment scripts
├── docker-compose.yml              # Docker orchestration
├── Dockerfile                      # Container configuration
├── package.json                    # Root project configuration
└── README.md                       # Project documentation
```

### Key Scripts Reference

#### Development
```bash
npm run dev                  # Full development environment
npm run dev:server          # Backend server only
npm run dev:workers         # Cloudflare Workers only
npm run cloudflare:workers:dev  # Local worker development
```

#### Building & Testing
```bash
npm run build               # Build all components
npm test                    # Run all tests
npm run lint                # Code quality check
npm run typecheck           # TypeScript validation
```

#### Deployment
```bash
npm run deploy:staging      # Deploy to staging
npm run deploy:production   # Deploy to production
npm run cloudflare:deploy   # Cloudflare-specific deployment
```

#### Maintenance
```bash
npm run security:audit      # Security vulnerability scan
npm run health:check        # Application health status
npm run monitor            # Performance monitoring
npm run clean              # Clean build artifacts
```

### Environment Configuration Example

#### `.env.production` (Template)
```env
# Core Application
NODE_ENV=production
LOG_LEVEL=warn

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://user:pass@host:6379/0

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-here
ENCRYPTION_KEY=your-32-character-encryption-key

# Payment Processing
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key
CLOUDFLARE_AI_TOKEN=your-cloudflare-ai-token

# Cloudflare
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ZONE_ID=your-zone-id
CLOUDFLARE_ACCOUNT_ID=your-account-id

# External Services
GOOGLE_TRENDS_API_KEY=your-google-trends-key
SOCIAL_MEDIA_API_KEYS=your-social-media-keys

# Performance
CACHE_TTL=600
RATE_LIMIT_REQUESTS=10000
MEMORY_THRESHOLD=3221225472
```

### Docker Deployment Commands

#### Standard Deployment
```bash
# Start full stack
docker-compose up -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale app=3
```

#### Specialized Deployments
```bash
# Cloudflare-optimized stack
docker-compose -f docker-compose.cloudflare.yml up -d

# Performance-optimized stack
docker-compose -f docker-compose.performance.yml up -d

# Microservices architecture
docker-compose -f docker-compose.microservices.yml up -d
```

### Wrangler Configuration Examples

#### Basic Worker Deployment
```bash
# Deploy all workers
wrangler deploy

# Deploy specific worker
cd mustbeviral/workers/auth-worker && wrangler deploy

# Deploy with environment
wrangler deploy --env production
```

#### Database Operations
```bash
# Create D1 database
wrangler d1 create must-be-viral-db

# Run migrations
wrangler d1 migrations apply must-be-viral-db --env production

# Execute SQL
wrangler d1 execute must-be-viral-db --command "SELECT * FROM users LIMIT 5"
```

### Performance Monitoring Commands

```bash
# Real-time performance monitoring
npm run perf:monitor

# Lighthouse audit
npm run perf:lighthouse

# Bundle size analysis
npm run build:analyze

# Memory usage monitoring
npm run monitor:memory
```

---

**Documentation Version**: 2.0.0
**Last Updated**: January 2025
**Coverage**: 100% of core features
**Maintained By**: Must Be Viral Team

For support: [support@mustbeviral.com](mailto:support@mustbeviral.com)
For documentation issues: [GitHub Issues](https://github.com/ernijsansons/mustbeviral/issues)