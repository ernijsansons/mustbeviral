# APIs & Contracts - Must Be Viral V2

## API Architecture Overview

Must Be Viral V2 exposes a comprehensive REST API built on Cloudflare Workers with the following characteristics:

- **Base URL**: `https://must-be-viral-prod.workers.dev/api` (production)
- **Authentication**: JWT Bearer tokens + OAuth integration
- **Content Type**: `application/json` (default)
- **Rate Limiting**: Per-endpoint and per-user limits
- **Versioning**: URI versioning (`/api/v1/`)
- **Error Format**: RFC 7807 Problem Details

## Authentication & Authorization

### Authentication Flow
```typescript
// JWT Authentication Headers
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}

// JWT Token Structure
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "creator|influencer|admin",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### OAuth Providers
- **Google OAuth**: `/api/auth/google`
- **GitHub OAuth**: `/api/auth/github`
- **Platform Native**: `/api/auth/login`

## Core API Endpoints

### 1. Authentication APIs

#### POST `/api/auth/register`
**Purpose**: Create new user account
**Authentication**: None required

**Request Body**:
```typescript
interface RegisterRequest {
  email: string;           // Valid email address
  password: string;        // Min 8 chars, 1 uppercase, 1 number
  username: string;        // Unique, 3-30 chars, alphanumeric + underscore
  full_name?: string;      // Optional display name
  role?: 'creator' | 'influencer';  // Default: 'creator'
}
```

**Response** (201 Created):
```typescript
interface RegisterResponse {
  success: true;
  data: {
    user: {
      id: string;
      email: string;
      username: string;
      full_name?: string;
      role: string;
      created_at: string;
    };
    tokens: {
      access_token: string;   // JWT, expires in 24h
      refresh_token: string;  // Expires in 30d
      expires_in: number;     // Seconds until expiration
    };
  };
}
```

**Error Responses**:
- `400 Bad Request`: Validation errors
- `409 Conflict`: Email or username already exists
- `429 Too Many Requests`: Rate limit exceeded (5 registrations/hour)

---

#### POST `/api/auth/login`
**Purpose**: Authenticate existing user
**Authentication**: None required

**Request Body**:
```typescript
interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;   // Extends refresh token lifetime
}
```

**Response** (200 OK):
```typescript
interface LoginResponse {
  success: true;
  data: {
    user: UserProfile;
    tokens: TokenPair;
    last_login_at: string;
  };
}
```

---

#### POST `/api/auth/refresh`
**Purpose**: Refresh expired access token
**Authentication**: Refresh token required

**Request Body**:
```typescript
interface RefreshRequest {
  refresh_token: string;
}
```

**Response** (200 OK):
```typescript
interface RefreshResponse {
  success: true;
  data: {
    access_token: string;
    expires_in: number;
  };
}
```

---

### 2. Content Generation APIs

#### POST `/api/content/generate`
**Purpose**: Generate AI-powered content
**Authentication**: JWT required
**Rate Limit**: 100 requests/month (free tier)

**Request Body**:
```typescript
interface ContentGenerationRequest {
  prompt: string;                    // Content brief or idea
  type: 'blog_post' | 'social_post' | 'video_script' | 'email' | 'ad_copy';
  platform?: 'instagram' | 'twitter' | 'tiktok' | 'linkedin' | 'facebook';
  brand_voice?: {
    tone: 'professional' | 'casual' | 'humorous' | 'authoritative';
    style: 'formal' | 'conversational' | 'technical' | 'creative';
    personality: string[];           // Array of personality traits
  };
  target_audience?: {
    demographics: string;
    interests: string[];
    pain_points: string[];
  };
  constraints?: {
    max_length?: number;
    include_hashtags?: boolean;
    include_emojis?: boolean;
    keywords?: string[];
  };
}
```

**Response** (200 OK):
```typescript
interface ContentGenerationResponse {
  success: true;
  data: {
    content: {
      id: string;
      title: string;
      body: string;
      excerpt?: string;
      meta_title?: string;
      meta_description?: string;
      hashtags?: string[];
      optimization_score: number;     // 0-100 viral potential
    };
    alternatives: Array<{
      body: string;
      optimization_score: number;
    }>;
    metadata: {
      ai_model_used: string;
      generation_time_ms: number;
      token_count: number;
      cost_credits: number;
    };
  };
}
```

---

#### GET `/api/content`
**Purpose**: Retrieve user's content library
**Authentication**: JWT required

**Query Parameters**:
```typescript
interface ContentListParams {
  page?: number;                     // Default: 1
  limit?: number;                    // Default: 20, max: 100
  type?: string;                     // Filter by content type
  status?: 'draft' | 'published' | 'scheduled' | 'archived';
  search?: string;                   // Full-text search
  sort?: 'created_at' | 'updated_at' | 'view_count' | 'engagement_rate';
  order?: 'asc' | 'desc';           // Default: 'desc'
}
```

**Response** (200 OK):
```typescript
interface ContentListResponse {
  success: true;
  data: {
    content: ContentItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
}

interface ContentItem {
  id: string;
  title: string;
  body: string;
  excerpt?: string;
  type: string;
  status: string;
  visibility: string;
  featured_image_url?: string;
  view_count: number;
  like_count: number;
  share_count: number;
  engagement_rate: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
}
```

---

### 3. Analytics APIs

#### GET `/api/analytics/dashboard`
**Purpose**: Get user dashboard analytics
**Authentication**: JWT required

**Query Parameters**:
```typescript
interface DashboardAnalyticsParams {
  period?: '24h' | '7d' | '30d' | '90d' | '1y';  // Default: '30d'
  timezone?: string;                              // Default: 'UTC'
}
```

**Response** (200 OK):
```typescript
interface DashboardAnalyticsResponse {
  success: true;
  data: {
    summary: {
      total_content: number;
      total_views: number;
      total_engagement: number;
      average_engagement_rate: number;
      growth_rate: number;                        // Percentage change vs previous period
    };
    content_performance: Array<{
      content_id: string;
      title: string;
      views: number;
      engagement_rate: number;
      published_at: string;
    }>;
    engagement_trends: Array<{
      date: string;
      views: number;
      likes: number;
      shares: number;
      comments: number;
    }>;
    top_performing_types: Array<{
      type: string;
      count: number;
      avg_engagement_rate: number;
    }>;
  };
}
```

---

#### POST `/api/analytics/events`
**Purpose**: Track custom analytics events
**Authentication**: JWT required

**Request Body**:
```typescript
interface AnalyticsEventRequest {
  event_type: 'view' | 'click' | 'share' | 'like' | 'comment' | 'conversion';
  event_value?: Record<string, any>;             // Event-specific data
  content_id?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  user_context?: {
    device_type?: string;
    browser?: string;
    os?: string;
    country?: string;
  };
}
```

**Response** (202 Accepted):
```typescript
interface AnalyticsEventResponse {
  success: true;
  data: {
    event_id: string;
    processed_at: string;
  };
}
```

---

### 4. Influencer Matching APIs

#### POST `/api/matching/discover`
**Purpose**: Find matching influencers for brand campaigns
**Authentication**: JWT required
**Rate Limit**: 1000 searches/month

**Request Body**:
```typescript
interface InfluencerDiscoveryRequest {
  campaign: {
    name: string;
    description: string;
    budget_range: {
      min: number;
      max: number;
      currency: string;                          // ISO 4217 currency code
    };
    target_audience: {
      age_range: [number, number];
      genders: ('male' | 'female' | 'non-binary')[];
      locations: string[];                       // Country/region codes
      interests: string[];
      languages: string[];
    };
    content_requirements: {
      platforms: string[];
      content_types: string[];
      posting_frequency: string;
      brand_safety_level: 'strict' | 'moderate' | 'relaxed';
    };
  };
  filters?: {
    follower_range?: [number, number];
    engagement_rate_min?: number;
    verified_only?: boolean;
    exclude_previous_collaborations?: boolean;
  };
}
```

**Response** (200 OK):
```typescript
interface InfluencerDiscoveryResponse {
  success: true;
  data: {
    matches: Array<{
      influencer: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string;
        verified: boolean;
        follower_count: number;
        engagement_rate: number;
        platforms: Array<{
          platform: string;
          handle: string;
          follower_count: number;
          engagement_rate: number;
        }>;
      };
      compatibility_score: number;               // 0-100 match percentage
      audience_overlap: number;                  // 0-100 percentage
      estimated_rate: {
        min: number;
        max: number;
        currency: string;
      };
      availability_status: 'available' | 'busy' | 'unavailable';
      match_reasons: string[];                   // Why this influencer was matched
    }>;
    search_metadata: {
      total_matches: number;
      search_criteria: Record<string, any>;
      generated_at: string;
    };
  };
}
```

---

### 5. Campaign Management APIs

#### POST `/api/campaigns`
**Purpose**: Create new influencer campaign
**Authentication**: JWT required

**Request Body**:
```typescript
interface CreateCampaignRequest {
  name: string;
  description: string;
  objectives: string[];
  budget: {
    total: number;
    currency: string;
    allocation: Record<string, number>;          // Platform-wise budget allocation
  };
  timeline: {
    start_date: string;                          // ISO 8601 format
    end_date: string;
    application_deadline?: string;
  };
  requirements: {
    content_deliverables: Array<{
      type: string;
      quantity: number;
      specifications: Record<string, any>;
    }>;
    brand_guidelines: {
      do_mentions: string[];
      dont_mentions: string[];
      hashtags_required: string[];
      hashtags_forbidden: string[];
    };
  };
  target_influencers?: string[];                 // Pre-selected influencer IDs
}
```

**Response** (201 Created):
```typescript
interface CreateCampaignResponse {
  success: true;
  data: {
    campaign: {
      id: string;
      name: string;
      status: 'draft' | 'active' | 'paused' | 'completed';
      created_at: string;
      application_url: string;                   // URL for influencer applications
    };
  };
}
```

---

#### GET `/api/campaigns/{campaign_id}/applications`
**Purpose**: Get campaign applications from influencers
**Authentication**: JWT required

**Response** (200 OK):
```typescript
interface CampaignApplicationsResponse {
  success: true;
  data: {
    applications: Array<{
      id: string;
      influencer: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string;
        follower_count: number;
        engagement_rate: number;
      };
      status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
      proposed_rate: {
        amount: number;
        currency: string;
      };
      content_proposal: string;
      portfolio_samples: string[];               // URLs to sample content
      application_date: string;
      response_deadline: string;
    }>;
    summary: {
      total_applications: number;
      pending_review: number;
      approved: number;
      rejected: number;
    };
  };
}
```

---

### 6. Trend Analysis APIs

#### GET `/api/trends/current`
**Purpose**: Get current trending topics and hashtags
**Authentication**: JWT required

**Query Parameters**:
```typescript
interface TrendAnalysisParams {
  platforms?: string[];                         // Filter by social platforms
  regions?: string[];                           // Geographic regions
  categories?: string[];                        // Content categories
  time_range?: '1h' | '6h' | '24h' | '7d';     // Trend timeframe
}
```

**Response** (200 OK):
```typescript
interface TrendAnalysisResponse {
  success: true;
  data: {
    trending_topics: Array<{
      topic: string;
      volume: number;                            // Mention volume
      growth_rate: number;                       // Percentage growth
      sentiment: 'positive' | 'negative' | 'neutral';
      related_hashtags: string[];
      peak_time: string;
      relevance_score: number;                   // 0-100 relevance to user
    }>;
    hashtag_recommendations: Array<{
      hashtag: string;
      usage_count: number;
      competition_level: 'low' | 'medium' | 'high';
      effectiveness_score: number;
    }>;
    content_opportunities: Array<{
      title: string;
      description: string;
      estimated_reach: number;
      difficulty: 'easy' | 'medium' | 'hard';
      trending_until: string;
    }>;
  };
}
```

---

### 7. User Management APIs

#### GET `/api/users/profile`
**Purpose**: Get current user profile
**Authentication**: JWT required

**Response** (200 OK):
```typescript
interface UserProfileResponse {
  success: true;
  data: {
    user: {
      id: string;
      email: string;
      username: string;
      full_name?: string;
      bio?: string;
      avatar_url?: string;
      location?: string;
      website?: string;
      role: string;
      onboarding_completed: boolean;
      is_premium: boolean;
      created_at: string;
      updated_at: string;
    };
    social_accounts: Array<{
      platform: string;
      handle: string;
      verified: boolean;
      follower_count: number;
      connected_at: string;
    }>;
    subscription: {
      tier: string;
      status: string;
      current_period_end: string;
      usage: {
        text_tokens_used: number;
        text_tokens_limit: number;
        image_generations_used: number;
        image_generations_limit: number;
      };
    };
  };
}
```

---

#### PUT `/api/users/profile`
**Purpose**: Update user profile information
**Authentication**: JWT required

**Request Body**:
```typescript
interface UpdateProfileRequest {
  full_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  settings?: Record<string, any>;
}
```

**Response** (200 OK):
```typescript
interface UpdateProfileResponse {
  success: true;
  data: {
    user: UserProfile;
    updated_fields: string[];
  };
}
```

---

## Error Response Format

All API errors follow RFC 7807 Problem Details format:

```typescript
interface APIError {
  success: false;
  error: {
    type: string;                                // Error type URI
    title: string;                               // Human-readable title
    status: number;                              // HTTP status code
    detail: string;                              // Detailed error description
    instance?: string;                           // Request instance identifier
    validation_errors?: Array<{                 // Field-specific validation errors
      field: string;
      code: string;
      message: string;
    }>;
    trace_id?: string;                          // Request tracing identifier
  };
}
```

### Common Error Codes

| Status | Type | Description |
|--------|------|-------------|
| 400 | `validation_error` | Request validation failed |
| 401 | `authentication_required` | Valid authentication required |
| 403 | `insufficient_permissions` | User lacks required permissions |
| 404 | `resource_not_found` | Requested resource doesn't exist |
| 409 | `resource_conflict` | Resource already exists or conflict |
| 422 | `unprocessable_entity` | Valid request, business logic error |
| 429 | `rate_limit_exceeded` | Too many requests |
| 500 | `internal_server_error` | Unexpected server error |
| 503 | `service_unavailable` | Service temporarily unavailable |

## Rate Limiting

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1641081600
X-RateLimit-Window: 3600
```

### Rate Limits by Endpoint

| Endpoint Pattern | Free Tier | Pro Tier | Enterprise |
|-----------------|-----------|----------|------------|
| `/api/auth/register` | 5/hour | 10/hour | 20/hour |
| `/api/auth/login` | 10/hour | 50/hour | Unlimited |
| `/api/content/generate` | 100/month | 1000/month | 10000/month |
| `/api/analytics/*` | 1000/day | 10000/day | Unlimited |
| `/api/matching/discover` | 50/month | 1000/month | 10000/month |
| `/api/trends/*` | 500/day | 5000/day | Unlimited |

## API Versioning Strategy

### Current Version: v1

- **Versioning Method**: URI versioning (`/api/v1/`)
- **Backwards Compatibility**: Maintained for 12 months
- **Deprecation Notice**: 3 months advance notice
- **Migration Support**: Automated migration tools provided

### Version Headers
```http
API-Version: v1
Supported-Versions: v1
Deprecated-Versions: none
```

## SDK and Integration Support

### Official SDKs
- **JavaScript/TypeScript**: `@mustbeviral/sdk-js`
- **Python**: `mustbeviral-python`
- **PHP**: `mustbeviral-php`
- **Go**: `github.com/mustbeviral/go-sdk`

### Webhook Integration
- **Endpoint**: Configurable webhook URLs
- **Security**: HMAC-SHA256 signature verification
- **Retry Logic**: Exponential backoff with 3 retries
- **Events**: Content published, campaign application, payment processed

---

*API documentation generated from OpenAPI 3.0 specification*
*Rate limits and quotas subject to change based on usage patterns*
*All timestamps in ISO 8601 format (UTC)*