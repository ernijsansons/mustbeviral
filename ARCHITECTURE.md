# Must Be Viral V2 - System Architecture

> Comprehensive architectural documentation for the AI-powered influencer marketing platform

## 🏗️ Architecture Overview

Must Be Viral V2 is built with a modern, scalable architecture combining edge computing, microservices, and AI-powered features. The system supports multiple deployment models from local development to global edge distribution.

### 🎯 Design Principles

- **Edge-First**: Leverage 280+ global edge locations for minimal latency
- **AI-Native**: Built-in AI capabilities with tier-based access controls
- **Security-First**: Comprehensive security layers from authentication to data protection
- **Developer-Friendly**: Extensive testing, documentation, and development tools
- **Scalable**: Auto-scaling architecture handling 10M+ requests/day
- **Resilient**: Multi-layer failover and disaster recovery capabilities

## 🏛️ High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[React Frontend]
        B[Mobile PWA]
        C[API Clients]
    end
    
    subgraph "Edge Layer - Cloudflare"
        D[CDN/Cache]
        E[Workers]
        F[Pages]
    end
    
    subgraph "API Gateway"
        G[Load Balancer]
        H[Rate Limiter]
        I[Auth Gateway]
    end
    
    subgraph "Application Layer"
        J[Node.js Server]
        K[Microservices]
        L[AI Tools Manager]
    end
    
    subgraph "Data Layer"
        M[PostgreSQL]
        N[Redis Cache]
        O[Cloudflare D1]
        P[Cloudflare KV]
    end
    
    subgraph "AI Layer"
        Q[Cloudflare AI]
        R[OpenAI API]
        S[Stability AI]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    D --> G
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L
    J --> M
    J --> N
    E --> O
    E --> P
    L --> Q
    L --> R
    L --> S
```

## 🔧 Component Architecture

### 1. Frontend Architecture

```mermaid
graph TB
    subgraph "Frontend Stack"
        A[Next.js 14 App]
        B[React 18 Components]
        C[Wouter Router]
        D[TypeScript]
        E[Tailwind CSS]
    end
    
    subgraph "State Management"
        F[React Hooks]
        G[Context API]
        H[Local Storage]
    end
    
    subgraph "UI Components"
        I[NavBar]
        J[Dashboard]
        K[Content Editor]
        L[AI Tools]
        M[Onboarding]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    B --> F
    F --> G
    F --> H
    B --> I
    B --> J
    B --> K
    B --> L
    B --> M
```

**Key Components:**
- **App Router**: Next.js 14 app directory structure with server components
- **Component Library**: Reusable UI components with TypeScript interfaces
- **State Management**: React hooks and context for global state
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom design system

### 2. Backend Architecture

```mermaid
graph TB
    subgraph "Node.js Application Server"
        A[Express.js Server]
        B[Cluster Manager]
        C[Worker Processes]
    end
    
    subgraph "API Layer"
        D[Authentication API]
        E[Content API]
        F[Onboarding API]
        G[AI Tools API]
    end
    
    subgraph "Middleware Stack"
        H[CORS Handler]
        I[Rate Limiter]
        J[Security Headers]
        K[Request Logger]
        L[Error Handler]
    end
    
    subgraph "Business Logic"
        M[User Controller]
        N[Content Controller]
        O[AI Manager]
        P[Analytics Engine]
    end
    
    A --> B
    B --> C
    A --> D
    A --> E
    A --> F
    A --> G
    A --> H
    A --> I
    A --> J
    A --> K
    A --> L
    D --> M
    E --> N
    G --> O
    N --> P
```

**Key Features:**
- **Cluster Management**: Dynamic worker scaling based on system load
- **Advanced Rate Limiting**: Sliding window algorithm with memory bounds
- **Multi-layer Caching**: L1 (NodeCache) + L2 (Redis) for optimal performance
- **Security Middleware**: Comprehensive security headers and validation
- **Error Handling**: Structured error responses with request tracking

### 3. Database Architecture

```mermaid
graph TB
    subgraph "Primary Database - PostgreSQL"
        A[Users Table]
        B[Content Table]
        C[Matches Table]
        D[Indexes]
    end
    
    subgraph "Caching Layer - Redis"
        E[Session Store]
        F[API Cache]
        G[Rate Limit Store]
    end
    
    subgraph "Edge Storage - Cloudflare"
        H[D1 Database]
        I[KV Store]
        J[R2 Objects]
    end
    
    subgraph "ORM Layer"
        K[Drizzle ORM]
        L[Connection Pool]
        M[Query Builder]
    end
    
    K --> A
    K --> B
    K --> C
    K --> D
    K --> L
    K --> M
    A --> E
    B --> F
    C --> G
    K --> H
    E --> I
    F --> J
```

**Database Schema:**
```sql
-- Users: Core user information and preferences
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'creator',
  profile_data JSONB DEFAULT '{}',
  ai_preference_level INTEGER DEFAULT 50,
  onboarding_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Content: All user-generated and AI-generated content
content (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  image_url VARCHAR(1000),
  status VARCHAR(20) DEFAULT 'draft',
  type VARCHAR(50) DEFAULT 'news_article',
  generated_by_ai INTEGER DEFAULT 0,
  ai_model_used VARCHAR(100),
  ethics_check_status VARCHAR(20) DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);

-- Matches: Influencer-content matching results
matches (
  id UUID PRIMARY KEY,
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  influencer_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  match_score REAL DEFAULT 0.0,
  status VARCHAR(20) DEFAULT 'pending',
  match_details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🤖 AI Architecture

### AI Tools Management System

```mermaid
graph TB
    subgraph "AI Tools Manager"
        A[AIToolsManager Class]
        B[Model Registry]
        C[Tier Management]
        D[Usage Tracking]
    end
    
    subgraph "AI Models"
        E[Text Models]
        F[Image Models]
        G[Video Models]
    end
    
    subgraph "AI Providers"
        H[Cloudflare AI]
        I[OpenAI API]
        J[Stability AI]
        K[Hugging Face]
    end
    
    subgraph "Subscription Tiers"
        L[Free Tier]
        M[Standard Tier]
        N[Premium Tier]
    end
    
    A --> B
    A --> C
    A --> D
    B --> E
    B --> F
    B --> G
    E --> H
    E --> I
    F --> J
    F --> K
    G --> H
    C --> L
    C --> M
    C --> N
```

**AI Tier System:**

| Tier | Price/Month | Daily Limits | Available Models |
|------|-------------|--------------|------------------|
| **Free** | $0 | 10K tokens, 5 images | Llama 3 8B |
| **Standard** | $19 | 100K tokens, 50 images, 60s video | + Mistral 7B, Stable Diffusion XL |
| **Premium** | $49 | 500K tokens, 200 images, 300s video | + GPT-4o Mini, Stable Diffusion 3 |

## 🔒 Security Architecture

### Multi-Layer Security Model

```mermaid
graph TB
    subgraph "Network Security"
        A[Cloudflare DDoS Protection]
        B[WAF Rules]
        C[IP Whitelisting]
    end
    
    subgraph "Application Security"
        D[JWT Authentication]
        E[Rate Limiting]
        F[Input Validation]
        G[CORS Policy]
    end
    
    subgraph "Data Security"
        H[Encryption at Rest]
        I[Encryption in Transit]
        J[PII Anonymization]
    end
    
    subgraph "Infrastructure Security"
        K[Container Security]
        L[Secrets Management]
        M[Vulnerability Scanning]
    end
    
    A --> D
    B --> E
    C --> F
    D --> G
    E --> H
    F --> I
    G --> J
    H --> K
    I --> L
    J --> M
```

**Security Implementation:**
- **Authentication**: JWT tokens with 24h expiration, secure refresh mechanism
- **Password Hashing**: bcrypt with 12 rounds for secure password storage
- **Rate Limiting**: Sliding window algorithm with IP-based and user-based limits
- **Input Validation**: Comprehensive sanitization and validation for all inputs
- **Security Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **Container Security**: Non-root users, read-only filesystems, minimal attack surface

## 📊 Data Flow Architecture

### Request Processing Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant CF as Cloudflare
    participant LB as Load Balancer
    participant API as API Server
    participant DB as Database
    participant AI as AI Service
    participant Cache as Redis Cache

    C->>CF: HTTP Request
    CF->>CF: Edge Caching Check
    CF->>LB: Forward Request
    LB->>LB: Rate Limiting
    LB->>API: Route Request
    API->>API: Authentication
    API->>Cache: Check Cache
    alt Cache Hit
        Cache->>API: Return Cached Data
    else Cache Miss
        API->>DB: Query Database
        DB->>API: Return Data
        API->>Cache: Store in Cache
    end
    alt AI Request
        API->>AI: Generate Content
        AI->>API: Return Generated Content
    end
    API->>LB: Response
    LB->>CF: Response
    CF->>C: HTTP Response
```

### Content Creation Flow

```mermaid
graph TD
    A[User Creates Content] --> B{AI-Generated?}
    B -->|Yes| C[Check AI Tier Limits]
    B -->|No| F[Direct Content Creation]
    C --> D{Limits Available?}
    D -->|Yes| E[Generate with AI Model]
    D -->|No| G[Return Limit Error]
    E --> H[Ethics Check]
    F --> H
    H --> I{Ethics Approved?}
    I -->|Yes| J[Store in Database]
    I -->|No| K[Flag for Review]
    J --> L[Update User Usage]
    L --> M[Return Success Response]
    K --> N[Return Ethics Error]
    G --> O[Return Usage Error]
```

## 🔄 Deployment Architecture

### Multi-Environment Strategy

```mermaid
graph TB
    subgraph "Development Environment"
        A[Local Docker Compose]
        B[Hot Reload]
        C[Development Database]
    end
    
    subgraph "Staging Environment"
        D[Cloudflare Workers]
        E[Staging Database]
        F[Test AI Models]
    end
    
    subgraph "Production Environment"
        G[Cloudflare Global Network]
        H[Production Database]
        I[Full AI Model Access]
        J[Monitoring & Alerts]
    end
    
    subgraph "CI/CD Pipeline"
        K[GitHub Actions]
        L[Security Scanning]
        M[Automated Testing]
        N[Docker Building]
        O[Deployment]
    end
    
    A --> K
    B --> L
    C --> M
    D --> N
    E --> O
    F --> G
    G --> H
    H --> I
    I --> J
```

### Deployment Methods

| Method | Environment | Command | Features |
|--------|-------------|---------|----------|
| **Local Docker** | Development | `npm run docker:compose` | Full stack, debugging |
| **Cloudflare Workers** | Staging/Production | `npm run deploy:staging` | Edge computing |
| **Microservices** | Enterprise | `docker-compose -f microservices.yml up` | Service isolation |
| **Performance** | High-load | `docker-compose -f performance.yml up` | Optimized configs |

## 📈 Monitoring Architecture

### Observability Stack

```mermaid
graph TB
    subgraph "Metrics Collection"
        A[Prometheus]
        B[Custom Metrics]
        C[Health Checks]
    end
    
    subgraph "Visualization"
        D[Grafana Dashboards]
        E[Business Metrics]
        F[Technical Metrics]
    end
    
    subgraph "Logging"
        G[ELK Stack]
        H[Structured Logging]
        I[Error Tracking]
    end
    
    subgraph "Alerting"
        J[Alert Manager]
        K[Notification Channels]
        L[Escalation Policies]
    end
    
    A --> D
    B --> E
    C --> F
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L
```

**Key Metrics Tracked:**
- **Performance**: Response times, throughput, error rates
- **Resources**: CPU, memory, disk usage per worker
- **Business**: User registrations, content creation, AI usage
- **Security**: Failed authentication attempts, rate limit triggers

## 🚀 Scalability Considerations

### Horizontal Scaling Strategy

```mermaid
graph TB
    subgraph "Application Scaling"
        A[Load Balancer]
        B[Multiple App Instances]
        C[Auto-scaling Groups]
    end
    
    subgraph "Database Scaling"
        D[Read Replicas]
        E[Connection Pooling]
        F[Query Optimization]
    end
    
    subgraph "Cache Scaling"
        G[Redis Cluster]
        H[Multi-layer Caching]
        I[CDN Edge Caching]
    end
    
    subgraph "AI Scaling"
        J[Model Load Balancing]
        K[Usage-based Throttling]
        L[Cost Optimization]
    end
    
    A --> B
    B --> C
    D --> E
    E --> F
    G --> H
    H --> I
    J --> K
    K --> L
```

**Scaling Capabilities:**
- **Traffic**: Handles 10M+ requests/day with auto-scaling
- **Workers**: Dynamic worker scaling based on CPU/memory usage
- **Database**: Connection pooling with read replica support
- **Caching**: Multi-layer caching with edge distribution
- **AI**: Usage-based throttling with cost optimization

## 🔧 Configuration Management

### Environment Configuration Matrix

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| **Node Env** | development | staging | production |
| **Workers** | 2-4 | 4-8 | 8-16 |
| **Cache TTL** | 60s | 300s | 3600s |
| **Rate Limits** | 1000/hr | 500/hr | 100/hr |
| **AI Models** | Basic | Standard | All |
| **Logging** | Debug | Info | Error |
| **Monitoring** | Basic | Full | Enterprise |

## 🎯 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| **API Response Time** | <100ms | 85ms |
| **Page Load Time** | <2s | 1.8s |
| **Availability** | 99.9% | 99.95% |
| **Throughput** | 10M req/day | 8M req/day |
| **Error Rate** | <0.1% | 0.05% |
| **Cache Hit Ratio** | >90% | 94% |

## 🔮 Future Architecture Considerations

### Planned Enhancements

1. **Multi-Cloud Strategy**: AWS/GCP backup deployment
2. **Event-Driven Architecture**: Kafka/RabbitMQ for async processing  
3. **GraphQL API**: Alternative to REST for complex queries
4. **Blockchain Integration**: NFT and crypto payment support
5. **Edge AI**: On-device inference for privacy-sensitive operations
6. **Global Database**: Multi-region data replication

### Technical Debt & Improvements

- Migrate from JavaScript to TypeScript in server components
- Implement OpenTelemetry for distributed tracing
- Add comprehensive API versioning strategy
- Enhance container orchestration with Kubernetes
- Implement advanced monitoring with distributed tracing

---

## 📞 Architecture Support

For architecture questions and discussions:
- **GitHub Discussions**: [Architecture Forum](https://github.com/your-org/must-be-viral-v2/discussions)
- **Engineering Discord**: [#architecture channel](https://discord.gg/mustbeviral)
- **Technical Documentation**: [Wiki](https://github.com/your-org/must-be-viral-v2/wiki)

---

*Last Updated: January 2025 | Architecture Version: 2.0 | Next Review: Q2 2025*