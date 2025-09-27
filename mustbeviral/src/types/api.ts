/**
 * API Type Safety Definitions
 * Comprehensive types for all API endpoints and responses
 */

import { SecurityContext, ValidationError, SubscriptionTier} from './security';

// Base API types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: APIMetadata;
  requestId: string;
  timestamp: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: ValidationError[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  help?: string;
}

export interface APIMetadata {
  version: string;
  rateLimit?: {
    remaining: number;
    reset: number;
    limit: number;
  };
  pagination?: PaginationMetadata;
  performance?: {
    duration: number;
    cacheHit: boolean;
    dbQueries: number;
  };
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Request types
export interface APIRequest<T = unknown> {
  body?: T;
  params?: Record<string, string>;
  query?: Record<string, string | string[]>;
  headers?: Record<string, string>;
  context?: SecurityContext;
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filter?: Record<string, unknown>;
}

// Authentication API types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  captcha?: string;
}

export interface LoginResponse {
  user: UserProfile;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  };
  session: {
    id: string;
    expiresAt: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  termsAccepted: boolean;
  marketingConsent?: boolean;
  referralCode?: string;
}

export interface RegisterResponse {
  user: UserProfile;
  emailVerificationRequired: boolean;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface PasswordResetRequest {
  email: string;
  captcha?: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// User API types
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  role: 'user' | 'admin' | 'super_admin';
  subscription: SubscriptionTier;
  permissions: string[];
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  preferences: UserPreferences;
  stats: UserStats;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profileVisible: boolean;
    contentVisible: boolean;
    analyticsEnabled: boolean;
  };
}

export interface UserStats {
  contentCount: number;
  viewsCount: number;
  sharesCount: number;
  subscriptionStartDate?: string;
  usageThisMonth: {
    contentCreated: number;
    uploadsUsed: number;
    apiCalls: number;
  };
  limits: {
    contentPerMonth: number;
    uploadsPerMonth: number;
    apiCallsPerHour: number;
  };
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
}

export interface UserListRequest extends PaginatedRequest {
  role?: string;
  subscription?: SubscriptionTier;
  verified?: boolean;
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
}

// Content API types
export interface Content {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: ContentType;
  status: ContentStatus;
  visibility: ContentVisibility;
  tags: string[];
  metadata: ContentMetadata;
  analytics: ContentAnalytics;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  expiresAt?: string;
}

export type ContentType = 'video' | 'image' | 'audio' | 'text' | 'poll' | 'story';
export type ContentStatus = 'draft' | 'published' | 'archived' | 'deleted' | 'processing';
export type ContentVisibility = 'public' | 'private' | 'unlisted' | 'subscribers';

export interface ContentMetadata {
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  fileSize?: number;
  mimeType?: string;
  encoding?: string;
  thumbnail?: string;
  preview?: string;
  chapters?: Array<{
    time: number;
    title: string;
  }>;
  captions?: Array<{
    language: string;
    url: string;
  }>;
}

export interface ContentAnalytics {
  views: number;
  uniqueViews: number;
  shares: number;
  likes: number;
  comments: number;
  averageWatchTime?: number;
  completionRate?: number;
  engagement: {
    total: number;
    rate: number;
  };
  demographics?: {
    ageGroups: Record<string, number>;
    countries: Record<string, number>;
    devices: Record<string, number>;
  };
}

export interface CreateContentRequest {
  title: string;
  description?: string;
  type: ContentType;
  visibility: ContentVisibility;
  tags?: string[];
  scheduledFor?: string;
  file?: {
    name: string;
    size: number;
    type: string;
    checksum: string;
  };
}

export interface UpdateContentRequest {
  title?: string;
  description?: string;
  visibility?: ContentVisibility;
  tags?: string[];
  status?: ContentStatus;
  scheduledFor?: string;
}

export interface ContentListRequest extends PaginatedRequest {
  type?: ContentType;
  status?: ContentStatus;
  visibility?: ContentVisibility;
  tags?: string[];
  userId?: string;
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface ContentUploadRequest {
  contentId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  checksum: string;
  chunkSize?: number;
}

export interface ContentUploadResponse {
  uploadUrl: string;
  uploadId: string;
  chunkUrls?: string[];
  expiresAt: string;
}

// Subscription API types
export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  billing: BillingInfo;
  usage: SubscriptionUsage;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal';
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface BillingInfo {
  name: string;
  email: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  taxId?: string;
}

export interface SubscriptionUsage {
  contentCreated: number;
  uploadsUsed: number;
  storageUsed: number; // bytes
  bandwidthUsed: number; // bytes
  apiCalls: number;
  limits: {
    contentPerMonth: number;
    uploadsPerMonth: number;
    storageLimit: number;
    bandwidthLimit: number;
    apiCallsPerHour: number;
  };
  resetDate: string;
}

export interface CreateSubscriptionRequest {
  priceId: string;
  paymentMethodId: string;
  billingInfo: BillingInfo;
  trialDays?: number;
}

export interface UpdateSubscriptionRequest {
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  paymentMethodId?: string;
  billingInfo?: Partial<BillingInfo>;
}

export interface SubscriptionPreviewRequest {
  priceId: string;
  currentPriceId?: string;
}

export interface SubscriptionPreview {
  immediateCharge: number;
  nextInvoiceAmount: number;
  proratedAmount: number;
  creditAmount: number;
  currency: string;
  nextInvoiceDate: string;
}

// Analytics API types
export interface AnalyticsRequest {
  startDate: string;
  endDate: string;
  granularity: 'hour' | 'day' | 'week' | 'month';
  metrics: string[];
  filters?: Record<string, unknown>;
  groupBy?: string[];
}

export interface AnalyticsResponse {
  data: Array<{
    timestamp: string;
    values: Record<string, number>;
    dimensions?: Record<string, string>;
  }>;
  totals: Record<string, number>;
  metadata: {
    period: {
      start: string;
      end: string;
    };
    granularity: string;
    metrics: string[];
    sampleRate: number;
  };
}

export interface DashboardStats {
  overview: {
    totalViews: number;
    totalContent: number;
    totalShares: number;
    engagement: number;
    growth: {
      views: number;
      content: number;
      shares: number;
      engagement: number;
    };
  };
  trending: {
    content: Content[];
    tags: Array<{
      name: string;
      count: number;
      growth: number;
    }>;
  };
  performance: {
    topContent: Array<{
      id: string;
      title: string;
      views: number;
      engagement: number;
    }>;
    demographics: {
      ageGroups: Record<string, number>;
      countries: Record<string, number>;
      devices: Record<string, number>;
    };
  };
  recent: {
    activity: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: string;
    }>;
  };
}

// Admin API types
export interface AdminStats {
  users: {
    total: number;
    active: number;
    verified: number;
    subscribed: number;
    growth: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  content: {
    total: number;
    published: number;
    processing: number;
    flagged: number;
    storage: {
      used: number;
      total: number;
    };
  };
  revenue: {
    total: number;
    monthly: number;
    arr: number; // Annual Recurring Revenue
    churn: number;
    byTier: Record<SubscriptionTier, number>;
  };
  system: {
    health: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    responseTime: number;
    errorRate: number;
    load: number;
  };
}

export interface AdminUserListRequest extends PaginatedRequest {
  role?: string;
  subscription?: SubscriptionTier;
  status?: 'active' | 'inactive' | 'banned';
  verified?: boolean;
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
}

export interface AdminUserUpdateRequest {
  role?: string;
  subscription?: SubscriptionTier;
  status?: 'active' | 'inactive' | 'banned';
  emailVerified?: boolean;
  permissions?: string[];
  notes?: string;
}

export interface SystemHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    error?: string;
    dependencies?: string[];
  }>;
  metrics: {
    uptime: number;
    responseTime: {
      avg: number;
      p95: number;
      p99: number;
    };
    errorRate: number;
    throughput: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    storage: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

// File upload types
export interface FileUploadRequest {
  fileName: string;
  fileSize: number;
  fileType: string;
  contentType?: ContentType;
  checksum: string;
  metadata?: Record<string, unknown>;
}

export interface FileUploadResponse {
  uploadId: string;
  uploadUrl: string;
  fileName: string;
  expiresAt: string;
  maxFileSize: number;
  allowedTypes: string[];
}

export interface FileUploadStatus {
  uploadId: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  fileName: string;
  fileSize: number;
  processedSize?: number;
  url?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// Webhook types
export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
  version: string;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Error types for specific endpoints
export interface APIErrorCode {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'auth/invalid-credentials';
  AUTH_TOKEN_EXPIRED: 'auth/token-expired';
  AUTH_TOKEN_INVALID: 'auth/token-invalid';
  AUTH_INSUFFICIENT_PERMISSIONS: 'auth/insufficient-permissions';

  // Validation errors
  VALIDATION_REQUIRED_FIELD: 'validation/required-field';
  VALIDATION_INVALID_FORMAT: 'validation/invalid-format';
  VALIDATION_OUT_OF_RANGE: 'validation/out-of-range';

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'rate-limit/exceeded';

  // Resource errors
  RESOURCE_NOT_FOUND: 'resource/not-found';
  RESOURCE_ALREADY_EXISTS: 'resource/already-exists';
  RESOURCE_CONFLICT: 'resource/conflict';

  // Subscription errors
  SUBSCRIPTION_LIMIT_EXCEEDED: 'subscription/limit-exceeded';
  SUBSCRIPTION_PAYMENT_REQUIRED: 'subscription/payment-required';
  SUBSCRIPTION_TIER_REQUIRED: 'subscription/tier-required';

  // System errors
  SYSTEM_INTERNAL_ERROR: 'system/internal-error';
  SYSTEM_SERVICE_UNAVAILABLE: 'system/service-unavailable';
  SYSTEM_MAINTENANCE: 'system/maintenance';
}

// Type utilities for API endpoints
export type APIHandler<TRequest = unknown, TResponse = unknown> = (
  request: APIRequest<TRequest>
) => Promise<APIResponse<TResponse>>;

export type AuthenticatedAPIHandler<TRequest = unknown, TResponse = unknown> = (
  request: APIRequest<TRequest> & { context: SecurityContext }
) => Promise<APIResponse<TResponse>>;

// Request validation schemas
export interface APIEndpointSchema {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  authentication: 'none' | 'optional' | 'required' | 'admin';
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  validation?: {
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
  };
  response?: Record<string, unknown>;
}