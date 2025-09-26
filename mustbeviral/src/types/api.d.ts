// API-specific type definitions
// These replace 'unknown' types in API calls and responses

import { _User, AuthTokens } from './common';

// Request types
export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean>;
}

// Auth API types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  name?: string;
  confirmPassword?: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Content API types
export interface Content {
  id: string;
  title: string;
  body: string;
  platform?: string;
  status?: 'draft' | 'published' | 'scheduled';
  authorId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateContentRequest {
  title: string;
  body: string;
  platform?: string;
  tags?: string[];
}

export interface UpdateContentRequest extends Partial<CreateContentRequest> {
  status?: 'draft' | 'published' | 'scheduled';
}

// Payment API types
export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'paypal';
  last4?: string;
  brand?: string;
  isDefault?: boolean;
}

export interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  plan: string;
  amount: number;
  currency: string;
  currentPeriodEnd?: string;
}

export interface CreatePaymentRequest {
  amount: number;
  currency?: string;
  paymentMethodId?: string;
  description?: string;
}

// Analytics API types
export interface AnalyticsData {
  views: number;
  engagement: number;
  conversions: number;
  revenue?: number;
  period: string;
  breakdown?: Record<string, number>;
}

export interface AnalyticsRequest {
  startDate?: string;
  endDate?: string;
  metrics?: string[];
  groupBy?: 'day' | 'week' | 'month';
}

// Agent API types
export interface AgentTask {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input: unknown;
  output?: unknown;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AgentRequest {
  agentType: string;
  action: string;
  payload: unknown;
}

export interface AgentResponse {
  taskId: string;
  status: string;
  result?: unknown;
}

// Webhook types
export interface WebhookEvent {
  id: string;
  type: string;
  data: unknown;
  timestamp: string;
  signature?: string;
}

// Error response types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

export interface ValidationErrorResponse {
  errors: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
}

// Stripe webhook types
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

// Database query types
export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  fields?: Array<{
    name: string;
    dataType: string;
  }>;
}

// File upload types
export interface FileUploadResponse {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

// Search types
export interface SearchRequest {
  query: string;
  filters?: Record<string, unknown>;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
  facets?: Record<string, number>;
}