# System Map - Must Be Viral V2

## High-Level Architecture Overview

Must Be Viral V2 is built on a modern, edge-first architecture leveraging Cloudflare's global network for maximum performance and scalability. The system follows a microservices pattern with clear separation of concerns across frontend, edge computing, storage, and external integrations.

![Architecture Diagram](diagrams/architecture.mmd)

## Core Components

### Frontend Layer
- **React 18 Application** (`src/App.tsx:1-100`)
  - TypeScript-based with modern React patterns
  - Vite build system for optimized bundling
  - TailwindCSS for utility-first styling
  - Responsive design with mobile-first approach

- **Progressive Web App** (`vite.config.ts:1-50`)
  - Service worker for offline capability
  - App manifest for installable experience
  - Push notification support

### Edge Computing Layer
- **Cloudflare Workers** (`src/worker.ts:1-200`)
  - Serverless functions running at 280+ global edge locations
  - Zero cold start with V8 isolates
  - Node.js compatibility for npm packages
  - Automatic scaling based on traffic

- **AI Workers** (`wrangler.toml:57-58`)
  - Dedicated AI processing at the edge
  - Content generation and optimization
  - Vector embedding processing

### Core Services Architecture

#### Authentication Service (`src/lib/auth.ts:1-100`)
- JWT-based stateless authentication
- OAuth integrations (Google, GitHub)
- Role-based access control (RBAC)
- Session management via KV storage

#### Content Generation Service (`src/lib/ai/*`)
- AI-powered content creation
- Multi-modal content support (text, images, video)
- Trend-aware optimization
- Brand voice customization

#### Analytics Engine (`src/lib/analytics/*`)
- Real-time event tracking
- Campaign performance metrics
- User behavior analysis
- Custom dashboard generation

#### Campaign Management (`src/components/Dashboard.tsx:1-300`)
- Workflow automation
- Project collaboration tools
- Asset organization
- Performance tracking

#### Influencer Matching (`src/lib/ml/*`)
- Machine learning algorithms
- Audience overlap analysis
- Engagement prediction
- Compatibility scoring

#### Trend Analysis (`src/lib/api.ts:1-100`)
- Social media API integrations
- Google Trends integration
- Predictive analytics
- Real-time trend monitoring

### Data Storage Layer

#### Cloudflare D1 Database (`src/lib/db.ts:1-50`)
- SQLite-based with global replication
- ACID transactions
- SQL query interface
- Automatic backups

#### KV Storage (`wrangler.toml:24-43`)
- **USER_SESSIONS**: Session data and auth tokens
- **TRENDS_CACHE**: Cached trend data for performance
- **RATE_LIMITS**: API rate limiting counters
- **KV_NAMESPACE**: OAuth state and temporary data

#### R2 Object Storage (`wrangler.toml:45-54`)
- **ASSETS_STORAGE**: User-uploaded media assets
- **CONTENT_STORAGE**: Generated content and templates
- CDN integration for global delivery
- Lifecycle policies for cost optimization

#### Vectorize Database (`wrangler.toml:61-65`)
- Content embeddings for similarity search
- 1536-dimensional vectors (OpenAI compatible)
- Cosine similarity matching
- Real-time embedding updates

## External Integrations

### Payment Processing
- **Stripe Integration** (`src/lib/stripe/*`)
  - Subscription management
  - Webhook processing
  - PCI-compliant payment handling
  - Usage-based billing

### Social Media APIs
- **Twitter API**: Tweet analysis and posting
- **Instagram API**: Content creation and analytics
- **TikTok API**: Trend analysis and video optimization
- **Google Trends API**: Trending topic discovery

### Authentication Providers
- **Google OAuth**: Gmail and workspace integration
- **GitHub OAuth**: Developer community access
- **Custom JWT**: Platform-native authentication

## Deployment Architecture

### Environment Strategy
```
Development → Staging → Production
     ↓           ↓         ↓
  Local Dev   Cloudflare  Cloudflare
    + KV       Workers     Workers
              Preview     Production
```

### Multi-Region Deployment
- **Primary**: Global edge network via Cloudflare
- **Database**: Multi-region D1 with read replicas
- **Storage**: Distributed R2 with edge caching
- **CDN**: Automatic geographic optimization

### CI/CD Pipeline
1. **Code Commit** → GitHub repository
2. **Automated Testing** → Jest + Playwright
3. **Build Process** → Vite bundling + optimization
4. **Security Scanning** → Dependency audit + SAST
5. **Deployment** → Wrangler CLI to Cloudflare
6. **Health Checks** → Automated verification
7. **Rollback** → Instant rollback capability

## Performance Characteristics

### Latency Targets
- **API Response Time**: <100ms (edge caching)
- **Page Load Time**: <2s initial, <500ms cached
- **Database Queries**: <50ms average
- **AI Generation**: <3s for text, <10s for images

### Scalability Design
- **Horizontal Scaling**: Auto-scaling Workers
- **Database Scaling**: Read replicas + connection pooling
- **Cache Strategy**: Multi-layer caching (browser, CDN, KV)
- **Rate Limiting**: Per-user and per-IP limits

### Availability Design
- **SLA Target**: 99.9% uptime
- **Fault Tolerance**: Multi-region failover
- **Circuit Breakers**: External API protection
- **Graceful Degradation**: Core features always available

## Security Architecture

### Defense in Depth
1. **Edge Security**: Cloudflare WAF + DDoS protection
2. **Application Security**: Input validation + output encoding
3. **API Security**: Rate limiting + authentication
4. **Data Security**: Encryption at rest + in transit
5. **Access Control**: RBAC + principle of least privilege

### Compliance Framework
- **Data Protection**: GDPR-compliant data handling
- **Payment Security**: PCI DSS via Stripe
- **Infrastructure**: SOC 2 Type II (Cloudflare)
- **Audit Trail**: Comprehensive logging + monitoring

## Monitoring & Observability

### Telemetry Stack (`src/lib/monitoring/*`)
- **OpenTelemetry**: Distributed tracing
- **Cloudflare Analytics**: Application metrics
- **Custom Metrics**: Business KPIs
- **Real-time Alerts**: Performance + error monitoring

### Health Monitoring
- **Service Health**: Endpoint availability checks
- **Database Health**: Connection + query performance
- **External API Health**: Third-party service status
- **User Experience**: Real user monitoring (RUM)

## Technology Decision Rationale

### Why Cloudflare Workers?
1. **Global Performance**: 280+ edge locations
2. **Zero Cold Starts**: V8 isolates vs containers
3. **Integrated Ecosystem**: D1, KV, R2, AI all native
4. **Cost Efficiency**: Pay-per-request pricing
5. **Developer Experience**: Simple deployment + monitoring

### Why React + TypeScript?
1. **Developer Productivity**: Large talent pool + tooling
2. **Type Safety**: Reduced runtime errors
3. **Component Reusability**: Modular architecture
4. **Performance**: Virtual DOM + modern optimizations
5. **Ecosystem**: Rich library ecosystem

### Why SQLite (D1)?
1. **Simplicity**: No complex clustering setup
2. **Performance**: Fast queries with proper indexing
3. **Global Replication**: Cloudflare handles distribution
4. **ACID Transactions**: Data consistency guarantees
5. **SQL Compatibility**: Standard query language

---

*Reference: Architecture diagram available at `docs/diagrams/architecture.mmd`*
*Evidence: Configuration files at `wrangler.toml:1-108`, `package.json:1-111`*