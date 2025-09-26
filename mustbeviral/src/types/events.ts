/**
 * Event Handling and Error Types
 * Replaces 'any' types with proper type definitions for events and errors
 */

// Base Event Types
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date | string;
  source: string;
  version: string;
  metadata: EventMetadata;
}

export interface EventMetadata {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  [key: string]: unknown;
}

// Domain Event Types
export interface UserEvent extends BaseEvent {
  userId: string;
  userEmail?: string;
  userData: UserEventData;
}

export interface UserEventData {
  action: 'created' | 'updated' | 'deleted' | 'login' | 'logout' | 'verified';
  changes?: Record<string, { from: unknown; to: unknown }>;
  profile?: Partial<UserProfile>;
  preferences?: Record<string, unknown>;
}

export interface ContentEvent extends BaseEvent {
  contentId: string;
  userId: string;
  contentData: ContentEventData;
}

export interface ContentEventData {
  action: 'created' | 'updated' | 'published' | 'unpublished' | 'deleted' | 'viewed' | 'shared' | 'liked';
  contentType: 'video' | 'image' | 'audio' | 'text' | 'poll' | 'story';
  title?: string;
  tags?: string[];
  metrics?: ContentMetrics;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export interface SystemEvent extends BaseEvent {
  service: string;
  component: string;
  systemData: SystemEventData;
}

export interface SystemEventData {
  action: 'started' | 'stopped' | 'error' | 'warning' | 'info' | 'health_check' | 'backup';
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  error?: ErrorDetails;
  metrics?: SystemMetrics;
  context?: Record<string, unknown>;
}

export interface AnalyticsEvent extends BaseEvent {
  eventType: AnalyticsEventType;
  properties: AnalyticsEventProperties;
  context: AnalyticsContext;
}

export type AnalyticsEventType = 
  | 'page_view' 
  | 'content_view' 
  | 'content_share' 
  | 'content_like' 
  | 'user_signup' 
  | 'user_login' 
  | 'subscription_created' 
  | 'payment_completed' 
  | 'error_occurred';

export interface AnalyticsEventProperties {
  contentId?: string;
  contentType?: string;
  userId?: string;
  sessionDuration?: number;
  platform?: string;
  referrer?: string;
  campaign?: string;
  value?: number;
  currency?: string;
  category?: string;
  label?: string;
  [key: string]: unknown;
}

export interface AnalyticsContext {
  page: PageContext;
  user: UserContext;
  session: SessionContext;
  device: DeviceContext;
  location: LocationContext;
}

export interface PageContext {
  url: string;
  title: string;
  referrer?: string;
  path: string;
  search?: string;
  hash?: string;
}

export interface UserContext {
  id?: string;
  email?: string;
  role?: string;
  subscription?: string;
  signupDate?: string;
  isReturning: boolean;
}

export interface SessionContext {
  id: string;
  startTime: string;
  duration: number;
  pageViews: number;
  isFirstVisit: boolean;
  lastActivity: string;
}

export interface DeviceContext {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  version: string;
  viewport: {
    width: number;
    height: number;
  };
  userAgent: string;
}

export interface LocationContext {
  country?: string;
  region?: string;
  city?: string;
  timezone: string;
  language: string;
  ip?: string;
}

// Event Handler Types
export interface EventHandler<T extends BaseEvent = BaseEvent> {
  canHandle(event: T): boolean;
  handle(event: T): Promise<EventHandlerResult>;
  priority: number;
  name: string;
}

export interface EventHandlerResult {
  success: boolean;
  error?: Error;
  processingTime: number;
  effects?: EventEffect[];
  metadata?: Record<string, unknown>;
}

export interface EventEffect {
  type: 'notification' | 'database_write' | 'api_call' | 'cache_update' | 'email' | 'webhook';
  description: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Event Bus Types
export interface EventBusConfig {
  maxRetries: number;
  retryDelay: number;
  deadLetterQueue: boolean;
  batchSize: number;
  concurrency: number;
  timeout: number;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  filter?: EventFilter;
  priority: number;
  active: boolean;
  createdAt: Date;
}

export interface EventFilter {
  source?: string[];
  userId?: string[];
  metadata?: Record<string, unknown>;
  customFilter?: (event: BaseEvent) => boolean;
}

// Error Types
export interface ErrorDetails {
  name: string;
  message: string;
  code?: string;
  stack?: string;
  cause?: Error;
  context?: Record<string, unknown>;
  severity: ErrorSeverity;
  category: ErrorCategory;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ErrorCategory = 
  | 'validation' 
  | 'authentication' 
  | 'authorization' 
  | 'not_found' 
  | 'conflict' 
  | 'rate_limit' 
  | 'external_service' 
  | 'database' 
  | 'file_system' 
  | 'network' 
  | 'configuration' 
  | 'business_logic' 
  | 'unknown';

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  operation: string;
  component: string;
  timestamp: Date;
  environment: string;
  version: string;
  metadata?: Record<string, unknown>;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: unknown;
  constraint?: string;
}

export interface BusinessRuleViolation {
  rule: string;
  description: string;
  context: Record<string, unknown>;
  suggestedAction?: string;
}

// Metrics and Monitoring Types
export interface SystemMetrics {
  memory: MemoryMetrics;
  cpu: CpuMetrics;
  network: NetworkMetrics;
  disk: DiskMetrics;
  database: DatabaseMetrics;
  cache: CacheMetrics;
}

export interface MemoryMetrics {
  used: number;
  available: number;
  total: number;
  percentage: number;
  gc?: GarbageCollectionMetrics;
}

export interface GarbageCollectionMetrics {
  collections: number;
  totalTime: number;
  averageTime: number;
  lastCollection: Date;
}

export interface CpuMetrics {
  usage: number;
  loadAverage: number[];
  cores: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  errors: number;
  connectionsActive: number;
}

export interface DiskMetrics {
  used: number;
  available: number;
  total: number;
  percentage: number;
  readOps: number;
  writeOps: number;
  readBytes: number;
  writeBytes: number;
}

export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    total: number;
    maxConnections: number;
  };
  queries: {
    total: number;
    slow: number;
    failed: number;
    averageTime: number;
  };
  locks: {
    waiting: number;
    active: number;
  };
  cache: {
    hitRate: number;
    size: number;
    evictions: number;
  };
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  entries: number;
  evictions: number;
  memory: number;
}

// Content-specific Types
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  subscription: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface ContentMetrics {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  saves: number;
  clicks: number;
  engagementRate: number;
  completionRate?: number;
  averageWatchTime?: number;
}

// Utility Types
export type EventCallback<T extends BaseEvent = BaseEvent> = (event: T) => void | Promise<void>;

export type EventMiddleware<T extends BaseEvent = BaseEvent> = (
  event: T,
  next: () => Promise<void>
) => Promise<void>;

export interface EventMetrics {
  processed: number;
  failed: number;
  retries: number;
  averageProcessingTime: number;
  queueLength: number;
  lastProcessedAt?: Date;
}

export interface EventQueue {
  name: string;
  size: number;
  processing: boolean;
  nextEvent?: BaseEvent;
  metrics: EventMetrics;
}