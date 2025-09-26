# Domain Architecture Guide

> Comprehensive guide to the Domain-Driven Design (DDD) architecture of Must Be Viral V2

## 📋 Overview

Must Be Viral V2 implements a clean architecture based on Domain-Driven Design (DDD) principles. This guide explains the domain structure, business logic organization, and how different layers interact.

### 🎯 Architecture Principles

- **Domain-Driven Design**: Business logic is encapsulated in rich domain objects
- **Clean Architecture**: Dependencies point inward toward the domain
- **CQRS Pattern**: Command and Query responsibility separation
- **Event-Driven**: Domain events for cross-cutting concerns
- **Immutable State**: All domain objects are immutable

## 🏗️ Domain Structure

```
src/
├── core/
│   └── domains/
│       ├── content/           # Content management domain
│       │   ├── entities/      # Domain entities and aggregates
│       │   ├── services/      # Domain services
│       │   ├── repositories/  # Repository interfaces
│       │   └── events/        # Domain events
│       ├── payment/           # Subscription and billing domain
│       └── user/              # User management domain
├── application/
│   └── services/              # Application services (orchestration)
└── infrastructure/
    ├── repositories/          # Repository implementations
    ├── events/               # Event bus implementation
    ├── cache/                # Caching infrastructure
    └── api/                  # HTTP API layer
```

## 📝 Content Domain Deep Dive

### Core Entities

#### ContentAggregate
The main aggregate root for all content-related operations:

```typescript
interface ContentAggregate {
  readonly id: ContentId;
  readonly userId: UserId;
  readonly title: string;
  readonly body: string;
  readonly type: ContentType;
  readonly platforms: Platform[];
  readonly status: ContentStatus;
  readonly viralityScore: ViralityScore;
  readonly metadata: ContentMetadata;
  
  // Business methods
  updateContent(title: string, body: string): ContentAggregate;
  changeStatus(newStatus: ContentStatus): ContentAggregate;
  publish(): ContentAggregate;
  calculateViralityScore(): ViralityScore;
}
```

#### Value Objects

**ContentId & UserId**: Type-safe identifiers preventing primitive obsession
```typescript
interface ContentId { readonly value: string; }
interface UserId { readonly value: string; }
```

**ViralityScore**: Complex value object with scoring factors
```typescript
interface ViralityScore {
  readonly value: number; // 0-100
  readonly factors: {
    engagement_potential: number;
    trend_alignment: number;
    platform_optimization: number;
    timing_score: number;
  };
}
```

### Business Rules

#### Content Lifecycle Rules
1. **Draft → Review**: Content must have title and minimum body length
2. **Review → Approved**: Manual approval process (future: automated)
3. **Approved → Published**: Content must pass validation rules
4. **Published → Archived**: Published content cannot be edited

#### Platform-Specific Rules
- **Twitter**: 280 character limit enforcement
- **LinkedIn**: Professional hashtag suggestions
- **Instagram**: Minimum hashtag requirements
- **Blog Posts**: SEO optimization requirements

### Domain Services

#### ContentService
Orchestrates complex business operations:

```typescript
class ContentService {
  async createContent(request: ContentGenerationRequest): Promise<ContentAggregate>
  async optimizeContent(request: ContentOptimizationRequest): Promise<ContentAggregate>
  async validateContent(contentId: ContentId): Promise<ValidationResult>
  async getContentAnalytics(contentId: ContentId): Promise<AnalyticsResult>
}
```

**Key Capabilities:**
- AI-powered content generation
- Platform-specific optimization
- Virality score calculation
- Content validation and analytics

## 🔄 Application Layer

### ContentApplicationService
Handles cross-cutting concerns and orchestration:

```typescript
class ContentApplicationService {
  async createContent(command: CreateContentCommand): Promise<Result>
  async updateContent(command: UpdateContentCommand): Promise<Result>
  async publishContent(command: PublishContentCommand): Promise<Result>
}
```

**Responsibilities:**
- Authentication and authorization
- Subscription limit enforcement
- Event publishing
- Cache management
- Transaction coordination

### Command/Query Separation

#### Commands (Write Operations)
```typescript
interface CreateContentCommand {
  userId: string;
  topic: string;
  title?: string;
  type: string;
  platforms: string[];
}

interface PublishContentCommand {
  contentId: string;
  userId: string;
  scheduleAt?: Date;
}
```

#### Queries (Read Operations)
```typescript
interface ContentAnalyticsQuery {
  userId: string;
  contentId?: string;
  timeRange?: '1d' | '7d' | '30d';
  platform?: string;
}
```

## 🎯 Business Logic Examples

### Virality Score Calculation

The `calculateViralityScore()` method demonstrates rich domain logic:

```typescript
calculateViralityScore(): ViralityScore {
  const wordCount = this.body.split(' ').length;
  const hasHashtags = this.metadata.hashtags?.length ?? 0;
  const platformOptimization = this.platforms.length * 10;
  
  // Individual factor calculations
  const engagement_potential = Math.min(100, wordCount * 0.1 + hasHashtags * 5);
  const platform_optimization = Math.min(100, platformOptimization);
  
  // Composite score
  const overall = (engagement_potential + trend_alignment + platform_optimization + timing_score) / 4;
  
  return { value: Math.round(overall), factors: {...} };
}
```

### Platform Optimization Logic

Content optimization adapts to each platform's unique requirements:

```typescript
optimizeForPlatform(platform: Platform): ContentAggregate {
  let optimizedBody = this.body;
  let optimizedMetadata = { ...this.metadata };
  
  switch (platform) {
    case Platform.TWITTER:
      if (optimizedBody.length > 280) {
        optimizedBody = optimizedBody.substring(0, 277) + '...';
      }
      break;
    case Platform.LINKEDIN:
      optimizedMetadata.hashtags = [
        ...(this.metadata.hashtags || []), 
        '#professional', '#business'
      ];
      break;
  }
  
  return new Content(/* updated properties */);
}
```

### Business Rule Enforcement

Status transitions are governed by business rules:

```typescript
changeStatus(newStatus: ContentStatus): ContentAggregate {
  // Business rule: Content must be approved before publishing
  if (newStatus === ContentStatus.PUBLISHED && this.status !== ContentStatus.APPROVED) {
    throw new Error('Content must be approved before publishing');
  }
  
  return new Content(/* updated with new status */);
}
```

## 🔗 Integration Patterns

### Repository Pattern
Domain services depend on repository interfaces, not implementations:

```typescript
interface ContentRepository {
  save(content: ContentAggregate): Promise<void>;
  findById(id: ContentId): Promise<ContentAggregate | null>;
  findByUserId(userId: UserId): Promise<ContentAggregate[]>;
  search(criteria: ContentSearchCriteria): Promise<ContentAggregate[]>;
}
```

### Event-Driven Architecture
Domain operations publish events for cross-cutting concerns:

```typescript
// In ContentApplicationService
await this.eventBus.publish({
  type: 'ContentCreated',
  data: {
    contentId: content.id.value,
    userId: command.userId,
    platforms: command.platforms
  },
  timestamp: new Date()
});
```

### Dependency Injection
Services are composed through constructor injection:

```typescript
class ContentApplicationService {
  constructor(
    private contentService: ContentService,
    private subscriptionService: SubscriptionService,
    private eventBus: EventBus,
    private logger: Logger,
    private cache: CacheService
  ) {}
}
```

## 📊 Performance Considerations

### Immutability Benefits
- Thread-safe operations
- Predictable state changes
- Easy testing and debugging
- Event sourcing compatibility

### Caching Strategy
```typescript
// Application service caches frequently accessed data
const cacheKey = `user:${userId}:content:page:${page}`;
const cached = await this.cache.get(cacheKey);
if (cached) return cached;

// Domain logic remains pure
const result = await this.contentService.searchContent(criteria);
await this.cache.set(cacheKey, result, 300);
```

### Event Sourcing Ready
Domain events can be persisted for full audit trails:

```typescript
interface DomainEvent {
  type: string;
  aggregateId: string;
  data: any;
  timestamp: Date;
  version: number;
}
```

## 🧪 Testing Strategy

### Unit Testing Domain Logic
```typescript
describe('Content Domain', () => {
  it('should calculate virality score correctly', () => {
    const content = Content.create(/* ... */);
    const score = content.calculateViralityScore();
    
    expect(score.value).toBeGreaterThan(0);
    expect(score.factors.engagement_potential).toBeDefined();
  });
  
  it('should enforce business rules', () => {
    const publishedContent = content.publish();
    
    expect(() => publishedContent.updateContent('new', 'body'))
      .toThrow('Cannot update published content');
  });
});
```

### Integration Testing Services
```typescript
describe('ContentApplicationService', () => {
  it('should create content with subscription limits', async () => {
    const result = await service.createContent({
      userId: 'user123',
      topic: 'AI trends'
    });
    
    expect(result.success).toBe(true);
    expect(mockSubscriptionService.recordUsage).toHaveBeenCalled();
  });
});
```

## 🚀 Extension Points

### Adding New Content Types
1. Add enum value to `ContentType`
2. Implement type-specific optimization in `optimizeForPlatform`
3. Add validation rules in `validateContent`

### New Social Platforms
1. Add platform to `Platform` enum
2. Implement platform-specific optimization logic
3. Add character limits and formatting rules

### AI Model Integration
Extend the `AIContentGenerationService` interface:
```typescript
interface AIContentGenerationService {
  generateContent(request: ContentGenerationRequest): Promise<GenerationResult>;
  optimizeForPlatform(content: string, platform: Platform): Promise<OptimizationResult>;
  analyzeViralPotential(content: ContentAggregate): Promise<AnalysisResult>;
  // New: generateImagePrompt, analyzeTopics, etc.
}
```

## 📚 Further Reading

- [Domain-Driven Design by Eric Evans](https://domainlanguage.com/ddd/)
- [Clean Architecture by Robert Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)

---

*Last Updated: January 2025 | Version: 2.0.0 | Next Review: Q2 2025*