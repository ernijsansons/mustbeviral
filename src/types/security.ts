/**
 * Enhanced Type Safety for Security Modules
 * Comprehensive type definitions for all security-related components
 */

// Base security types
export interface SecurityContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  authenticated: boolean;
  permissions: string[];
  subscription: SubscriptionTier;
  riskLevel: RiskLevel;
}

export type SubscriptionTier = 'free' | 'standard' | 'premium';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AuthenticationLevel = 'none' | 'optional' | 'required' | 'admin';

// Validation types
export interface ValidationRule<T = unknown> {
  field: keyof T;
  type: 'required' | 'email' | 'phone' | 'string' | 'number' | 'boolean' | 'array' | 'object' | 'custom';
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => boolean | string;
  errorMessage?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: unknown;
}

export interface ValidationResult<T = unknown> {
  valid: boolean;
  data?: T;
  errors: ValidationError[];
  sanitized: boolean;
}

// Security event types
export type SecurityEventType =
  | 'authentication_success'
  | 'authentication_failure'
  | 'authorization_failure'
  | 'token_blacklisted'
  | 'rate_limit_exceeded'
  | 'security_violation'
  | 'suspicious_activity'
  | 'data_access'
  | 'data_modification'
  | 'admin_action'
  | 'password_change'
  | 'account_lockout'
  | 'session_timeout'
  | 'csp_violation'
  | 'sql_injection_attempt'
  | 'xss_attempt'
  | 'malicious_request'
  | 'environment_validation_failure'
  | 'route_security_violation'
  | 'header_injection_attempt';

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  url: string;
  method: string;
  details: Record<string, unknown>;
  outcome: 'success' | 'failure' | 'blocked';
  source: string;
  correlationId?: string;
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

// JWT and authentication types
export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: string;
  subscription: SubscriptionTier;
  permissions: string[];
  session_id: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

export interface RefreshTokenPayload {
  sub: string;
  session_id: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface AuthenticationResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    subscription: SubscriptionTier;
    permissions: string[];
  };
  tokens?: TokenPair;
  error?: string;
  securityFlags?: SecurityFlags;
}

// Security flags and risk assessment
export interface SecurityFlags {
  suspicious: boolean;
  rateLimited: boolean;
  authenticationRequired: boolean;
  piiPresent: boolean;
  crossOrigin: boolean;
  maliciousUserAgent: boolean;
  geoRestricted: boolean;
  headerInjection: boolean;
  sqlInjectionAttempt: boolean;
  xssAttempt: boolean;
}

// Rate limiting types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  statusCode?: number;
  tier?: SubscriptionTier;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  tier?: SubscriptionTier;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
  tier?: SubscriptionTier;
}

// Route security types
export interface RouteSecurityConfig {
  authentication: AuthenticationLevel;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
    keyType: 'ip' | 'user' | 'session';
  };
  permissions?: string[];
  csrfProtection?: boolean;
  httpsOnly?: boolean;
  allowedMethods?: string[];
  allowedOrigins?: string[];
  sensitiveData?: boolean;
  adminOnly?: boolean;
  subscription?: 'none' | 'unknown' | 'standard' | 'premium';
}

export interface RouteMatch {
  pattern: string | RegExp;
  methods?: string[];
  config: RouteSecurityConfig;
}

// Encryption types
export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  keyVersion: string;
}

export interface EncryptionResult {
  encrypted: string;
  algorithm: string;
  keyVersion: string;
  metadata?: Record<string, unknown>;
}

export interface DecryptionResult {
  decrypted: string;
  algorithm: string;
  keyVersion: string;
  metadata?: Record<string, unknown>;
}

export interface EncryptedField {
  value: string;
  metadata: {
    algorithm: string;
    keyVersion: string;
    timestamp: string;
    fieldName?: string;
  };
}

export interface EncryptionJob {
  id: string;
  operation: 'encrypt' | 'decrypt';
  data: {
    value: string;
    fieldName?: string;
  } | {
    encryptedField: EncryptedField;
    fieldName?: string;
  };
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

// Database types
export interface DatabaseConnection {
  id: string;
  db: D1Database;
  createdAt: Date;
  lastUsed: Date;
  isHealthy: boolean;
  queryCount: number;
  errorCount: number;
  averageResponseTime: number;
}

export interface DatabaseQueryOptions {
  timeout?: number;
  retries?: number;
  priority?: 'low' | 'normal' | 'high';
  trace?: boolean;
}

export interface DatabaseTransaction {
  id: string;
  queries: Array<{
    query: string;
    params?: unknown[];
    expectedResult?: 'success' | 'error';
  }>;
  options?: DatabaseQueryOptions;
}

// Environment and configuration types
export interface EnvironmentConfig {
  name: string;
  tier: 'development' | 'staging' | 'production';
  allowedOrigins: string[];
  jwtSecret: string;
  jwtRefreshSecret: string;
  encryptionKey: string;
  databaseUrl: string;
  stripeSecretKey: string;
  rateLimits: {
    windowMs: number;
    maxRequests: number;
  };
  cacheConfig: {
    ttl: number;
    maxSize: number;
  };
  securityConfig: {
    csrfProtection: boolean;
    httpsOnly: boolean;
    hsts: boolean;
    contentSecurityPolicy: string;
  };
}

export interface EnvironmentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  criticalMissing: string[];
  environment: string;
  timestamp: Date;
}

// Request context types
export interface RequestContext {
  id: string;
  startTime: number;
  ip: string;
  userAgent: string;
  method: string;
  url: string;
  userId?: string;
  sessionId?: string;
  origin?: string;
  country?: string;
  ray?: string;
  metadata: Record<string, unknown>;
  securityFlags: SecurityFlags;
  riskAssessment?: RiskAssessment;
}

export interface RiskAssessment {
  score: number; // 0-100
  level: RiskLevel;
  factors: Array<{
    factor: string;
    weight: number;
    value: unknown;
    risk: number;
  }>;
  recommendations: string[];
  timestamp: Date;
}

export interface RequestMetrics {
  duration: number;
  statusCode: number;
  responseSize?: number;
  errorType?: string;
  cacheHit?: boolean;
  dbQueries?: number;
  kvReads?: number;
  kvWrites?: number;
  encryptionOps?: number;
  validationTime?: number;
  authTime?: number;
}

// Circuit breaker types
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedErrors?: Array<string | RegExp>;
  onStateChange?: (state: CircuitBreakerState) => void;
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  requests: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
}

// Monitoring and metrics types
export interface SecurityMetrics {
  eventCount: number;
  severityBreakdown: Record<SecuritySeverity, number>;
  typeBreakdown: Record<SecurityEventType, number>;
  hourlyDistribution: Record<string, number>;
  topIPs: Array<{ ip: string; count: number }>;
  topUserAgents: Array<{ userAgent: string; count: number }>;
  riskDistribution: Record<RiskLevel, number>;
  responseTimePercentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface PerformanceMetrics {
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  databaseConnections: number;
  encryptionQueueSize: number;
  memoryUsage: number;
  cpuUsage?: number;
}

// Error handling types
export interface SecurityError extends Error {
  code: string;
  severity: SecuritySeverity;
  context?: Record<string, unknown>;
  userId?: string;
  requestId?: string;
  timestamp: Date;
  retryable: boolean;
}

export interface ErrorHandlingConfig {
  logErrors: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  sanitizeErrors: boolean;
  includeStackTrace: boolean;
  notifyOnCritical: boolean;
  circuitBreakerEnabled: boolean;
}

// PII and data protection types
export interface PIIField {
  name: string;
  type: 'email' | 'phone' | 'ssn' | 'credit_card' | 'name' | 'address' | 'custom';
  pattern?: RegExp;
  required: boolean;
  encrypted: boolean;
  masked: boolean;
}

export interface DataProtectionConfig {
  piiFields: PIIField[];
  encryptionRequired: boolean;
  maskingEnabled: boolean;
  auditEnabled: boolean;
  retentionPeriod: number; // days
  anonymizationEnabled: boolean;
}

// Compliance and audit types
export interface ComplianceConfig {
  gdprEnabled: boolean;
  ccpaEnabled: boolean;
  hipaaEnabled: boolean;
  auditRetention: number; // days
  dataExportEnabled: boolean;
  dataDeleteEnabled: boolean;
  consentRequired: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  oldValue?: unknown;
  newValue?: unknown;
  ip: string;
  userAgent: string;
  success: boolean;
  reason?: string;
}

// Type guards and utilities
export function isSecurityEvent(obj: unknown): obj is SecurityEvent {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.timestamp === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.severity === 'string' &&
    typeof obj.ip === 'string' &&
    typeof obj.userAgent === 'string';
}

export function isValidJWTPayload(obj: unknown): obj is JWTPayload {
  return obj &&
    typeof obj.sub === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.iat === 'number' &&
    typeof obj.exp === 'number';
}

export function isEncryptedField(obj: unknown): obj is EncryptedField {
  return obj &&
    typeof obj.value === 'string' &&
    obj.metadata &&
    typeof obj.metadata.algorithm === 'string' &&
    typeof obj.metadata.keyVersion === 'string' &&
    typeof obj.metadata.timestamp === 'string';
}

export function isValidationError(obj: unknown): obj is ValidationError {
  return obj &&
    typeof obj.field === 'string' &&
    typeof obj.message === 'string';
}

// Utility types for strict typing
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys];

export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

// Configuration validation schemas
export interface ConfigurationSchema {
  environment: EnvironmentConfig;
  security: {
    authentication: {
      jwtConfig: {
        algorithm: 'HS256' | 'HS384' | 'HS512';
        expiresIn: string;
        refreshExpiresIn: string;
        issuer: string;
        audience: string;
      };
      sessionConfig: {
        maxSessions: number;
        sessionTimeout: number;
        refreshTokenRotation: boolean;
      };
    };
    encryption: {
      algorithm: 'AES-GCM';
      keyLength: 256;
      keyRotationInterval: number; // days
      cacheEncryption: boolean;
    };
    rateLimiting: {
      global: RateLimitConfig;
      perUser: RateLimitConfig;
      perIP: RateLimitConfig;
      api: RateLimitConfig;
      auth: RateLimitConfig;
    };
  };
  database: {
    poolSize: number;
    connectionTimeout: number;
    queryTimeout: number;
    retryAttempts: number;
    healthCheckInterval: number;
  };
  monitoring: {
    metricsEnabled: boolean;
    securityEventsEnabled: boolean;
    performanceLogging: boolean;
    errorTracking: boolean;
    alerting: {
      criticalThreshold: number;
      notificationChannels: string[];
    };
  };
}