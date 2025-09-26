# Must Be Viral V2 - API Documentation

> Comprehensive API reference for the AI-powered influencer marketing platform

## 📋 Overview

Must Be Viral V2 provides RESTful APIs for authentication, content management, AI tools, and user onboarding. All APIs use JSON for request/response bodies and include comprehensive error handling.

### Base URL
```
Development:  http://localhost:3000/api
Production:   https://api.mustbeviral.com/api
```

### Authentication
All protected endpoints require a JWT Bearer token:
```http
Authorization: Bearer <jwt_token>
```

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message",
  "timestamp": "2025-01-XX:XX:XX.XXXZ"
}
```

### Error Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-XX:XX:XX.XXXZ"
}
```

## 🔐 Authentication API

### Register User
Creates a new user account with email and password.

```http
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "unique_username",
  "password": "secure_password123",
  "role": "creator" | "influencer" | "brand"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "username": "unique_username",
      "role": "creator"
    },
    "token": "jwt_token_string"
  }
}
```

**Validation Rules:**
- Email: Valid email format, unique in system
- Username: 3-50 characters, unique in system
- Password: Minimum 8 characters
- Role: Must be 'creator', 'influencer', or 'brand'

**Error Responses:**
```http
400 Bad Request - Missing required fields
400 Bad Request - User already exists
400 Bad Request - Invalid email format
400 Bad Request - Password too short
500 Internal Server Error - Server error
```

### Login User
Authenticates user and returns JWT token.

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "username": "unique_username",
      "role": "creator"
    },
    "token": "jwt_token_string"
  }
}
```

**Error Responses:**
```http
400 Bad Request - Missing email or password
401 Unauthorized - Invalid credentials
500 Internal Server Error - Server error
```

### Get Current User
Retrieves current authenticated user's information.

```http
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "email": "user@example.com",
    "username": "unique_username",
    "role": "creator",
    "onboardingCompleted": 1
  }
}
```

**Error Responses:**
```http
401 Unauthorized - No token provided
401 Unauthorized - Invalid token
404 Not Found - User not found
500 Internal Server Error - Server error
```

## 📝 Content Management API

### Create Content
Creates new content (AI-generated or user-created).

```http
POST /api/content
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Content Title",
  "body": "Content body text...",
  "imageUrl": "https://example.com/image.jpg", // optional
  "status": "draft" | "published" | "archived", // optional, defaults to 'draft'
  "type": "news_article" | "social_post" | "blog_post", // optional, defaults to 'news_article'
  "generatedByAi": 0 | 1, // optional, defaults to 0
  "aiModelUsed": "gpt-4" | "llama-3-8b" | null, // optional
  "ethicsCheckStatus": "pending" | "approved" | "rejected", // optional, defaults to 'pending'
  "metadata": "{\"tags\": [\"marketing\", \"viral\"]}" // optional JSON string
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "content-uuid",
    "userId": "user-uuid",
    "title": "Content Title",
    "body": "Content body text...",
    "imageUrl": "https://example.com/image.jpg",
    "status": "draft",
    "type": "news_article",
    "generatedByAi": 0,
    "aiModelUsed": null,
    "ethicsCheckStatus": "pending",
    "metadata": "{\"tags\": [\"marketing\", \"viral\"]}",
    "createdAt": "2025-01-XX:XX:XX.XXXZ",
    "updatedAt": "2025-01-XX:XX:XX.XXXZ"
  }
}
```

**Error Responses:**
```http
400 Bad Request - Title and body are required
401 Unauthorized - Invalid or missing token
500 Internal Server Error - Server error
```

### Get User's Content
Retrieves all content created by the authenticated user.

```http
GET /api/content/my
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "content-uuid",
      "title": "Content Title",
      "body": "Content body...",
      "status": "draft",
      "type": "news_article",
      "createdAt": "2025-01-XX:XX:XX.XXXZ"
      // ... other content fields
    }
  ]
}
```

**Error Responses:**
```http
401 Unauthorized - Invalid or missing token
500 Internal Server Error - Server error
```

### Get Published Content
Retrieves all published content (public endpoint).

```http
GET /api/content/published
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "content-uuid",
      "title": "Published Content",
      "body": "Published content body...",
      "status": "published",
      "createdAt": "2025-01-XX:XX:XX.XXXZ"
      // ... other content fields
    }
  ]
}
```

**Error Responses:**
```http
500 Internal Server Error - Server error
```

### Update Content
Updates existing content owned by the authenticated user.

```http
PUT /api/content/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:** (All fields optional, only provided fields will be updated)
```json
{
  "title": "Updated Title",
  "body": "Updated content body...",
  "imageUrl": "https://example.com/new-image.jpg",
  "status": "published",
  "type": "social_post",
  "ethicsCheckStatus": "approved"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "content-uuid",
    "title": "Updated Title",
    // ... updated content fields
    "updatedAt": "2025-01-XX:XX:XX.XXXZ"
  }
}
```

**Error Responses:**
```http
401 Unauthorized - Invalid or missing token
403 Forbidden - Not authorized to update this content
404 Not Found - Content not found
500 Internal Server Error - Server error
```

## 👥 User Onboarding API

### Complete Onboarding
Processes user onboarding data and marks onboarding as complete.

```http
POST /api/onboard
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "profileData": {
    "displayName": "John Creator",
    "bio": "Content creator passionate about...",
    "interests": ["technology", "marketing", "ai"],
    "socialLinks": {
      "twitter": "@johncreator",
      "instagram": "@johncreator",
      "youtube": "johncreator"
    }
  },
  "preferences": {
    "aiPreferenceLevel": 75, // 0-100 scale
    "contentTypes": ["news_article", "social_post"],
    "notifications": {
      "email": true,
      "push": false
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Onboarding completed successfully",
    "user": {
      "id": "user-uuid",
      "onboardingCompleted": 1,
      "profileData": "...", // Stored as JSON string
      "aiPreferenceLevel": 75
    }
  }
}
```

**Error Responses:**
```http
400 Bad Request - Invalid request data
401 Unauthorized - Invalid or missing token
500 Internal Server Error - Server error
```

## 🤖 AI Tools API

### Get AI Tiers
Retrieves available AI subscription tiers and their capabilities.

```http
GET /api/ai/tiers
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "free",
      "name": "Free",
      "description": "Basic AI tools with open-source models",
      "price_per_month": 0,
      "daily_limits": {
        "text_tokens": 10000,
        "image_generations": 5,
        "video_seconds": 0
      },
      "available_models": ["llama-3-8b"],
      "quality_level": 3,
      "priority": "low"
    },
    {
      "id": "standard",
      "name": "Standard",
      "description": "Enhanced AI with Mistral and Stable Diffusion",
      "price_per_month": 19,
      "daily_limits": {
        "text_tokens": 100000,
        "image_generations": 50,
        "video_seconds": 60
      },
      "available_models": ["llama-3-8b", "mistral-7b", "stable-diffusion-xl"],
      "quality_level": 6,
      "priority": "medium"
    },
    {
      "id": "premium",
      "name": "Premium",
      "description": "All AI models including GPT-4 and advanced features",
      "price_per_month": 49,
      "daily_limits": {
        "text_tokens": 500000,
        "image_generations": 200,
        "video_seconds": 300
      },
      "available_models": ["llama-3-8b", "mistral-7b", "gpt-4o-mini", "stable-diffusion-xl", "stable-diffusion-3"],
      "quality_level": 10,
      "priority": "high"
    }
  ]
}
```

### Get User AI Info
Retrieves user's current AI tier and usage information.

```http
GET /api/ai/user-info
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tier": {
      "id": "standard",
      "name": "Standard",
      "daily_limits": {
        "text_tokens": 100000,
        "image_generations": 50,
        "video_seconds": 60
      }
    },
    "usage": {
      "user_id": "user-uuid",
      "tier_id": "standard",
      "daily_usage": {
        "text_tokens": 2500,
        "image_generations": 12,
        "video_seconds": 0
      },
      "last_reset": "2025-01-XX"
    }
  }
}
```

### Generate AI Content
Generates content using specified AI model.

```http
POST /api/ai/generate
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "text" | "image",
  "model": "gpt-4o-mini" | "llama-3-8b" | "stable-diffusion-xl",
  "prompt": "Generate a viral social media post about AI technology",
  "parameters": {
    "max_tokens": 500, // for text generation
    "temperature": 0.7, // for text generation
    "size": "1024x1024" // for image generation
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "text",
    "model": "gpt-4o-mini",
    "result": "Generated content here...",
    "usage": {
      "tokens_used": 245,
      "cost": 0.012
    },
    "metadata": {
      "generation_time": 1.2,
      "quality_score": 0.85
    }
  }
}
```

**Error Responses:**
```http
400 Bad Request - Invalid model or parameters
401 Unauthorized - Invalid or missing token
429 Too Many Requests - Usage limit exceeded
500 Internal Server Error - AI generation failed
```

## 📊 Analytics & Metrics API

### Get User Metrics
Retrieves analytics and metrics for the authenticated user.

```http
GET /api/metrics/user
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `period` (optional): `7d`, `30d`, `90d` (default: `30d`)
- `type` (optional): `content`, `engagement`, `revenue`

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "content_metrics": {
      "total_content": 45,
      "published": 32,
      "draft": 13,
      "ai_generated": 28,
      "human_created": 17
    },
    "engagement_metrics": {
      "total_views": 12500,
      "total_likes": 890,
      "total_shares": 234,
      "engagement_rate": 0.09
    },
    "ai_usage": {
      "text_tokens_used": 45000,
      "images_generated": 23,
      "current_tier": "standard"
    }
  }
}
```

## 🚀 System Health & Status API

### Health Check
Simple health check endpoint for monitoring.

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX:XX:XX.XXXZ",
  "uptime": 86400,
  "memory": {
    "usage": 45,
    "total": 512
  },
  "worker_id": 12345,
  "redis_connected": true
}
```

### System Metrics
Prometheus-compatible metrics endpoint.

```http
GET /metrics
```

**Response:** (Plain text Prometheus format)
```
# HELP nodejs_memory_usage_bytes Memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss",worker="12345"} 67108864
nodejs_memory_usage_bytes{type="heapTotal",worker="12345"} 45088768
...
```

## 🔄 Rate Limiting

All API endpoints are subject to rate limiting:

- **Authentication**: 10 requests per minute per IP
- **Content Operations**: 100 requests per hour per user
- **AI Generation**: Based on tier limits (see AI Tiers)
- **General API**: 1000 requests per hour per IP

Rate limit headers included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1641234567
```

## 🚨 Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_REQUEST` | Malformed request data | 400 |
| `UNAUTHORIZED` | Invalid or missing authentication | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `RATE_LIMITED` | Rate limit exceeded | 429 |
| `SERVER_ERROR` | Internal server error | 500 |
| `AI_ERROR` | AI generation failed | 500 |
| `DATABASE_ERROR` | Database operation failed | 500 |

## 📝 Examples

### Complete User Registration Flow
```javascript
// 1. Register new user
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'creator@example.com',
    username: 'awesome_creator',
    password: 'secure123password',
    role: 'creator'
  })
});
const { data: authData } = await registerResponse.json();

// 2. Complete onboarding
const onboardResponse = await fetch('/api/onboard', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authData.token}`
  },
  body: JSON.stringify({
    profileData: {
      displayName: 'Awesome Creator',
      bio: 'I create viral content about technology',
      interests: ['tech', 'ai', 'startups']
    },
    preferences: {
      aiPreferenceLevel: 80
    }
  })
});

// 3. Create AI-generated content
const contentResponse = await fetch('/api/ai/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authData.token}`
  },
  body: JSON.stringify({
    type: 'text',
    model: 'gpt-4o-mini',
    prompt: 'Write a viral LinkedIn post about the future of AI'
  })
});
```

### Content Management Flow
```javascript
// Create content with AI-generated text
const createContentResponse = await fetch('/api/content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'The Future of AI in Marketing',
    body: aiGeneratedText,
    generatedByAi: 1,
    aiModelUsed: 'gpt-4o-mini',
    status: 'draft'
  })
});

// Update content status to published
const updateResponse = await fetch(`/api/content/${contentId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    status: 'published',
    ethicsCheckStatus: 'approved'
  })
});
```

---

## 📞 API Support

- **Documentation Issues**: [GitHub Issues](https://github.com/your-org/must-be-viral-v2/issues)
- **API Questions**: [Discord Community](https://discord.gg/mustbeviral)
- **Enterprise Support**: enterprise@mustbeviral.com

---

*Last Updated: January 2025 | API Version: v1 | Documentation Coverage: Complete*