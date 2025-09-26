/**
 * Database and Query Optimization Types
 * Replaces 'any' types with proper type definitions
 */

// Generic database entity type
export interface DatabaseEntity {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// User database entity
export interface UserEntity extends DatabaseEntity {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  passwordHash?: string;
  emailVerified: boolean;
  role: string;
  subscription?: string;
  preferences?: Record<string, unknown>;
}

// Post database entity
export interface PostEntity extends DatabaseEntity {
  userId: string;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  metadata: PostMetadata;
}

export interface PostMetadata {
  wordCount: number;
  readingTime: number;
  featuredImage?: string;
  excerpt?: string;
  seoTitle?: string;
  seoDescription?: string;
}

// Follower relationship entity
export interface FollowerEntity extends DatabaseEntity {
  followerId: string;
  followedId: string;
  status: 'active' | 'blocked' | 'pending';
}

// Analytics entity
export interface AnalyticsEntity extends DatabaseEntity {
  userId: string;
  contentId?: string;
  eventType: string;
  views: number;
  likes: number;
  shares: number;
  engagementRate: number;
  platform?: string;
  metadata: AnalyticsMetadata;
}

export interface AnalyticsMetadata {
  deviceType?: string;
  userAgent?: string;
  referrer?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  sessionId?: string;
  timestamp: Date | string;
}

// Query result types
export interface QueryResult<T = DatabaseEntity> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface SingleQueryResult<T = DatabaseEntity> {
  data: T | null;
  found: boolean;
}

// Batch operation types
export interface BatchQueryResult<T = DatabaseEntity> {
  results: T[];
  errors: BatchError[];
  successCount: number;
  failureCount: number;
}

export interface BatchError {
  index: number;
  key: string;
  error: string;
  retryable: boolean;
}

// Cache types
export interface CacheEntry<T = unknown> {
  data: T;
  expiry: number;
  hits: number;
  createdAt: number;
  lastAccessed: number;
}

export interface CacheMetadata {
  size: number;
  entries: number;
  hitRate: number;
  memoryUsage: number;
}

// Data loader types
export interface DataLoaderOptions {
  maxBatchSize?: number;
  batchWindow?: number;
  cache?: boolean;
  cacheSize?: number;
  cacheKeyFn?: (key: unknown) => string;
}

export interface LoaderStats {
  batchCount: number;
  cacheHits: number;
  cacheMisses: number;
  averageBatchSize: number;
  totalRequests: number;
}

// Query optimization types
export interface QueryPerformanceMetrics {
  executionTime: number;
  rowsExamined: number;
  rowsReturned: number;
  indexesUsed: string[];
  optimizations: string[];
  warnings: string[];
}

export interface QueryPlan {
  operation: string;
  table: string;
  index?: string;
  cost: number;
  rows: number;
  filtered: number;
  extra: string[];
}

// Error handling types for database operations
export interface DatabaseError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  query?: string;
  parameters?: unknown[];
  table?: string;
  constraint?: string;
  retryable: boolean;
}

// Pagination types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
  sort?: SortOptions;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
  nullsFirst?: boolean;
}

export interface PaginatedResult<T = DatabaseEntity> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

// Transaction types
export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  timeout?: number;
  readOnly?: boolean;
}

export interface TransactionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: DatabaseError;
  rollbackReason?: string;
  affectedRows: number;
  executionTime: number;
}