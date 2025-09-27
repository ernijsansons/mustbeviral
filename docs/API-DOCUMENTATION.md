# Must Be Viral V2 - API Documentation

## Overview

Must Be Viral V2 provides a comprehensive REST API for content creation, analytics, and viral marketing optimization. The API is built on a microservices architecture with enterprise-grade security, rate limiting, and monitoring.

## Base URL
```
Production: https://api.mustbeviral.com
Development: https://dev.mustbeviral.com
```

## Authentication

### JWT Bearer Token
Most endpoints require authentication via JWT Bearer token:
```http
Authorization: Bearer <your-jwt-token>
```

### API Key Authentication
For service-to-service communication:
```http
X-API-Key: <your-api-key>
```

## Common Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `Authorization` | Most endpoints | `Bearer <token>` |
| `X-Request-ID` | No | Request tracking ID |
| `X-API-Key` | Service endpoints | API key for authentication |

## Rate Limiting

- **Default**: 1000 requests per hour per user
- **Burst**: 100 requests per minute
- **Headers**:
  - `X-RateLimit-Limit`: Total limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "requestId": "req_123456789"
}
```

### HTTP Status Codes

| Code | Description | When |
|------|-------------|------|
| 200 | Success | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Access denied |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Authentication Endpoints

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "SecurePass123!",
  "role": "creator",
  "termsAccepted": true,
  "marketingConsent": false
}
```

**Validation Rules:**
- Email: Valid email format
- Username: 3-30 characters, alphanumeric + underscore
- Password: Minimum 8 characters, must include uppercase, lowercase, number
- Role: `creator` or `influencer`

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_12345",
      "email": "user@example.com",
      "username": "username",
      "role": "creator",
      "onboarding_completed": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

**Errors:**
- `400`: Validation failed, email already exists
- `429`: Registration rate limit exceeded

---

### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_12345",
      "email": "user@example.com",
      "username": "username",
      "role": "creator",
      "onboarding_completed": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h",
    "refreshToken": "refresh_token_here"
  }
}
```

**Errors:**
- `400`: Missing email or password
- `401`: Invalid credentials
- `429`: Too many login attempts

---

### POST /api/auth/logout
Invalidate current session.

**Headers Required:**
```http
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST /api/auth/refresh
Refresh JWT token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "expiresIn": "24h"
  }
}
```

---

## AI Content Generation Endpoints

### POST /api/ai/generate-content
Generate AI-powered content.

**Authentication:** Required

**Request Body:**
```json
{
  "type": "social_post",
  "topic": "sustainable fashion trends",
  "tone": "professional",
  "audience": "professionals",
  "length": "medium",
  "keywords": ["sustainability", "fashion", "eco-friendly"],
  "context": "Creating content for LinkedIn audience",
  "platform": "linkedin"
}
```

**Content Types:**
- `article`: Long-form article
- `social_post`: Social media post
- `headline`: Catchy headlines
- `description`: Product/service descriptions
- `script`: Video/audio scripts
- `email`: Email marketing content

**Tones:**
- `professional`, `casual`, `humorous`, `urgent`, `inspiring`, `educational`

**Audiences:**
- `general`, `professionals`, `students`, `seniors`, `teenagers`

**Lengths:**
- `short` (50-150 words)
- `medium` (150-300 words)
- `long` (300+ words)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "content": "Generated content here...",
    "metadata": {
      "wordCount": 245,
      "readabilityScore": 8.2,
      "viralPotential": 0.78,
      "seoScore": 85,
      "sentiment": "positive"
    },
    "suggestions": [
      "Add more hashtags for better reach",
      "Consider including a call-to-action"
    ],
    "generationTime": 1.2
  }
}
```

**Errors:**
- `400`: Invalid content type, topic too long, invalid parameters
- `401`: Authentication required
- `429`: AI generation rate limit exceeded

---

### POST /api/ai/generate-variations
Generate multiple content variations.

**Authentication:** Required

**Request Body:**
```json
{
  "type": "headline",
  "topic": "New AI productivity tool launch",
  "tone": "urgent",
  "audience": "professionals",
  "length": "short",
  "count": 5
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "variations": [
      {
        "content": "Revolutionary AI Tool Transforms Workplace Productivity",
        "viralPotential": 0.82
      },
      {
        "content": "Game-Changing AI: Boost Your Team's Efficiency by 300%",
        "viralPotential": 0.79
      }
    ],
    "count": 5
  }
}
```

---

### POST /api/ai/analyze-content
Analyze existing content for optimization.

**Authentication:** Required

**Request Body:**
```json
{
  "content": "Your existing content to analyze...",
  "type": "social_post",
  "targetKeywords": ["productivity", "AI", "efficiency"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "viralPotential": 0.65,
      "seoScore": 72,
      "readabilityScore": 8.5,
      "sentiment": "positive",
      "engagement": {
        "predicted": {
          "likes": 150,
          "shares": 25,
          "comments": 35
        }
      }
    },
    "improvements": [
      {
        "type": "keyword_optimization",
        "suggestion": "Include 'AI productivity' keyword",
        "impact": "high"
      },
      {
        "type": "engagement",
        "suggestion": "Add a question to encourage comments",
        "impact": "medium"
      }
    ],
    "optimizedContent": "Improved version of your content..."
  }
}
```

---

### POST /api/ai/optimize-platform
Optimize content for specific platform.

**Authentication:** Required

**Request Body:**
```json
{
  "content": "Original content here...",
  "platform": "instagram"
}
```

**Supported Platforms:**
- `instagram`, `twitter`, `linkedin`, `facebook`, `tiktok`, `youtube`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "originalContent": "Original content...",
    "optimizedContent": "Platform-optimized content...",
    "analysis": {
      "changes": [
        "Added relevant hashtags",
        "Adjusted tone for platform audience",
        "Optimized length for platform"
      ],
      "platformScore": 0.89
    }
  }
}
```

---

## Content Management Endpoints

### GET /api/content/library
Get user's content library.

**Authentication:** Required

**Query Parameters:**
```
?page=1&limit=20&type=social_post&sort=created_at&order=desc
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "content_123",
        "type": "social_post",
        "title": "AI Productivity Tips",
        "content": "Content text...",
        "platform": "linkedin",
        "status": "published",
        "performance": {
          "views": 1500,
          "likes": 89,
          "shares": 12
        },
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

---

### POST /api/content/save
Save generated content to library.

**Authentication:** Required

**Request Body:**
```json
{
  "title": "AI Productivity Tips",
  "content": "Content text here...",
  "type": "social_post",
  "platform": "linkedin",
  "tags": ["ai", "productivity", "tips"],
  "scheduledFor": "2025-01-15T10:00:00.000Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "content_123",
    "title": "AI Productivity Tips",
    "status": "draft",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## Analytics Endpoints

### GET /api/analytics/dashboard
Get analytics dashboard data.

**Authentication:** Required

**Query Parameters:**
```
?timeframe=7d&metrics=engagement,reach,viral_score
```

**Timeframes:**
- `1d`, `7d`, `30d`, `90d`, `1y`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalContent": 45,
      "totalViews": 15420,
      "avgViralScore": 0.72,
      "topPerforming": "content_123"
    },
    "metrics": {
      "engagement": {
        "current": 8.5,
        "previous": 7.2,
        "change": 18.1
      },
      "reach": {
        "current": 12500,
        "previous": 10800,
        "change": 15.7
      }
    },
    "charts": {
      "engagement": [
        { "date": "2025-01-01", "value": 8.2 },
        { "date": "2025-01-02", "value": 8.5 }
      ]
    }
  }
}
```

---

### GET /api/analytics/content/{contentId}
Get detailed analytics for specific content.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "content": {
      "id": "content_123",
      "title": "AI Productivity Tips",
      "type": "social_post"
    },
    "performance": {
      "views": 1500,
      "likes": 89,
      "shares": 12,
      "comments": 25,
      "viralScore": 0.78,
      "reachRate": 0.65
    },
    "timeline": [
      {
        "timestamp": "2025-01-01T10:00:00.000Z",
        "event": "published",
        "platform": "linkedin"
      },
      {
        "timestamp": "2025-01-01T12:00:00.000Z",
        "event": "viral_threshold",
        "details": "Reached 100 likes"
      }
    ]
  }
}
```

---

## User Management Endpoints

### GET /api/user/profile
Get current user profile.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "username",
      "role": "creator",
      "subscription": {
        "plan": "pro",
        "status": "active",
        "expiresAt": "2025-12-31T23:59:59.000Z"
      },
      "preferences": {
        "defaultTone": "professional",
        "preferredPlatforms": ["linkedin", "twitter"],
        "aiAssistanceLevel": 3
      },
      "stats": {
        "contentCreated": 45,
        "totalViews": 15420,
        "avgViralScore": 0.72
      }
    }
  }
}
```

---

### PUT /api/user/profile
Update user profile.

**Authentication:** Required

**Request Body:**
```json
{
  "username": "new_username",
  "preferences": {
    "defaultTone": "casual",
    "preferredPlatforms": ["instagram", "tiktok"],
    "aiAssistanceLevel": 4
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "user_123",
      "username": "new_username",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

---

## Webhook Endpoints

### POST /api/webhooks/content-performance
Receive content performance updates.

**Authentication:** Webhook signature verification

**Request Body:**
```json
{
  "event": "content.performance.viral",
  "data": {
    "contentId": "content_123",
    "platform": "linkedin",
    "metrics": {
      "views": 5000,
      "likes": 250,
      "shares": 45
    },
    "viralScore": 0.89,
    "timestamp": "2025-01-01T12:00:00.000Z"
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { MustBeViralAPI } from '@mustbeviral/sdk';

const api = new MustBeViralAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://api.mustbeviral.com'
});

// Generate content
const content = await api.ai.generateContent({
  type: 'social_post',
  topic: 'AI trends 2025',
  tone: 'professional',
  audience: 'professionals',
  length: 'medium'
});

// Analyze content
const analysis = await api.ai.analyzeContent({
  content: 'Your content here...',
  type: 'social_post'
});
```

### Python
```python
from mustbeviral import MustBeViralAPI

api = MustBeViralAPI(
    api_key='your-api-key',
    base_url='https://api.mustbeviral.com'
)

# Generate content
content = api.ai.generate_content(
    type='social_post',
    topic='AI trends 2025',
    tone='professional',
    audience='professionals',
    length='medium'
)

# Get analytics
analytics = api.analytics.get_dashboard(timeframe='7d')
```

---

## Gotchas and Best Practices

### Rate Limiting
- **Gotcha**: AI generation endpoints have separate, stricter rate limits
- **Solution**: Implement exponential backoff and cache results
- **Best Practice**: Use batch endpoints when possible

### Content Generation
- **Gotcha**: Very long topics (>500 chars) may produce generic content
- **Solution**: Keep topics concise and specific
- **Best Practice**: Provide context for better results

### Authentication
- **Gotcha**: Tokens expire after 24 hours
- **Solution**: Implement automatic token refresh
- **Best Practice**: Store refresh tokens securely

### Platform Optimization
- **Gotcha**: Platform-specific optimization may significantly change content
- **Solution**: Review optimized content before publishing
- **Best Practice**: Test with small audiences first

### Error Handling
- **Gotcha**: Network timeouts may occur during AI generation
- **Solution**: Implement retry logic with proper delays
- **Best Practice**: Show progress indicators for long operations

---

## Support

- **Documentation**: https://docs.mustbeviral.com
- **Status Page**: https://status.mustbeviral.com
- **Support**: support@mustbeviral.com
- **Community**: https://community.mustbeviral.com

---

*Last Updated: January 2025*