/**
 * Comprehensive Error Handling Framework
 * Provides structured error handling, logging, and monitoring
 */

import { CloudflareEnv } from '../cloudflare';
import { SecurityAuditLogger } from '../audit/securityLogger';
import { PIIEncryption } from '../crypto/encryption';
import { EnvironmentManager } from '../../config/environment';

export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ErrorCategory = 'AUTHENTICATION' | 'AUTHORIZATION' | 'VALIDATION' | 'DATABASE' | 'NETWORK' | 'BUSINESS_LOGIC' | 'SYSTEM' | 'SECURITY' | 'EXTERNAL_SERVICE';

export interface ApplicationError extends Error {
  id: string;
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  statusCode: number;
  userMessage: string;
  developerMessage: string;
  details: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  retryable: boolean;
  sensitive: boolean;
}

export interface ErrorContext {
  request?: Request;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorResponse {
  error: {
    id: string;
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    correlationId?: string;
  };
  status: number;
  retryAfter?: number;
}

/**
 * Base application error class
 */
export abstract class BaseApplicationError extends Error implements ApplicationError {
  id: string;
  abstract code: string;
  abstract category: ErrorCategory;
  abstract severity: ErrorSeverity;
  abstract statusCode: number;
  abstract userMessage: string;
  abstract retryable: boolean;

  developerMessage: string;
  details: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  sensitive: boolean = false;

  constructor(
    message: string,
    details: Record<string, unknown> = {},
    correlationId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.id = crypto.randomUUID();
    this.developerMessage = message;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.correlationId = correlationId;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      code: this.code,
      category: this.category,
      severity: this.severity,
      statusCode: this.statusCode,
      message: this.message,
      userMessage: this.userMessage,
      developerMessage: this.developerMessage,
      details: this.sensitive ? PIIEncryption.createMaskedCopy(this.details) : this.details,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      userId: this.userId,
      sessionId: this.sessionId,
      retryable: this.retryable,
      stack: this.stack
    };
  }

  /**
   * Convert error to user-safe response
   */
  toResponse(): ErrorResponse {
    return {
      error: {
        id: this.id,
        code: this.code,
        message: this.userMessage,
        details: this.sensitive ? undefined : this.details,
        timestamp: this.timestamp,
        correlationId: this.correlationId
      },
      status: this.statusCode,
      retryAfter: this.retryable ? 60 : undefined
    };
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends BaseApplicationError {
  code = 'AUTH_ERROR';
  category = 'AUTHENTICATION' as const;
  severity = 'MEDIUM' as const;
  statusCode = 401;
  userMessage = 'Authentication failed';
  retryable = false;
  sensitive = true;
}

/**
 * Authorization error
 */
export class AuthorizationError extends BaseApplicationError {
  code = 'AUTHZ_ERROR';
  category = 'AUTHORIZATION' as const;
  severity = 'MEDIUM' as const;
  statusCode = 403;
  userMessage = 'Access denied';
  retryable = false;
}

/**
 * Validation error
 */
export class ValidationError extends BaseApplicationError {
  code = 'VALIDATION_ERROR';
  category = 'VALIDATION' as const;
  severity = 'LOW' as const;
  statusCode = 400;
  userMessage = 'Invalid input provided';
  retryable = false;
}

/**
 * Database error
 */
export class DatabaseError extends BaseApplicationError {
  code = 'DATABASE_ERROR';
  category = 'DATABASE' as const;
  severity = 'HIGH' as const;
  statusCode = 500;
  userMessage = 'Data operation failed';
  retryable = true;
}

/**
 * Rate limit error
 */
export class RateLimitError extends BaseApplicationError {
  code = 'RATE_LIMIT_ERROR';
  category = 'SYSTEM' as const;
  severity = 'MEDIUM' as const;
  statusCode = 429;
  userMessage = 'Too many requests, please try again later';
  retryable = true;
}

/**
 * Security violation error
 */
export class SecurityViolationError extends BaseApplicationError {
  code = 'SECURITY_VIOLATION';
  category = 'SECURITY' as const;
  severity = 'CRITICAL' as const;
  statusCode = 403;
  userMessage = 'Security violation detected';
  retryable = false;
}

/**
 * External service error
 */
export class ExternalServiceError extends BaseApplicationError {
  code = 'EXTERNAL_SERVICE_ERROR';
  category = 'EXTERNAL_SERVICE' as const;
  severity = 'MEDIUM' as const;
  statusCode = 502;
  userMessage = 'External service unavailable';
  retryable = true;
}

/**
 * Business logic error
 */
export class BusinessLogicError extends BaseApplicationError {
  code = 'BUSINESS_LOGIC_ERROR';
  category = 'BUSINESS_LOGIC' as const;
  severity = 'LOW' as const;
  statusCode = 422;
  userMessage = 'Operation not allowed';
  retryable = false;
}

/**
 * Error handler service
 */
export class ErrorHandler {
  private env: CloudflareEnv;
  private auditLogger: SecurityAuditLogger;
  private errorCounts = new Map<string, number>();
  private circuitBreakers = new Map<string, { failures: number; lastFailure: number; isOpen: boolean }>();

  constructor(env: CloudflareEnv) {
    this.env = env;
    this.auditLogger = new SecurityAuditLogger(env);
  }

  /**
   * Handle application error
   */
  async handleError(
    error: unknown,
    context: ErrorContext = {}
  ): Promise<ApplicationError> {
    let appError: ApplicationError;

    // Convert unknown error to ApplicationError
    if (error instanceof BaseApplicationError) {
      appError = error;
    } else if (error instanceof Error) {
      appError = this.convertStandardError(error, context);
    } else {
      appError = new ValidationError(
        'Unknown error occurred',
        { originalError: String(error) },
        context.correlationId
      );
    }

    // Add context to error
    if (context.userId) appError.userId = context.userId;
    if (context.sessionId) appError.sessionId = context.sessionId;
    if (context.correlationId) appError.correlationId = context.correlationId;

    // Log the error
    await this.logError(appError, context);

    // Update circuit breaker if applicable
    this.updateCircuitBreaker(appError);

    // Send alerts for critical errors
    if (appError.severity === 'CRITICAL') {
      await this.sendCriticalAlert(appError, context);
    }

    return appError;
  }

  /**
   * Create error response
   */
  createErrorResponse(error: ApplicationError): Response {
    const errorResponse = error.toResponse();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Error-ID': error.id,
      'Cache-Control': 'no-store'
    };

    if (error.correlationId) {
      headers['X-Correlation-ID'] = error.correlationId;
    }

    if (error.retryable && errorResponse.retryAfter) {
      headers['Retry-After'] = errorResponse.retryAfter.toString();
    }

    return new Response(
      JSON.stringify(errorResponse.error),
      {
        status: errorResponse.status,
        headers
      }
    );
  }

  /**
   * Convert standard Error to ApplicationError
   */
  private convertStandardError(error: Error, context: ErrorContext): ApplicationError {
    // Database errors
    if (error.message.includes('D1') || error.message.includes('database')) {
      return new DatabaseError(
        error.message,
        { stack: error.stack },
        context.correlationId
      );
    }

    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new ExternalServiceError(
        error.message,
        { stack: error.stack },
        context.correlationId
      );
    }

    // JWT errors
    if (error.message.includes('jwt') || error.message.includes('token')) {
      return new AuthenticationError(
        error.message,
        { stack: error.stack },
        context.correlationId
      );
    }

    // Default to validation error
    return new ValidationError(
      error.message,
      { stack: error.stack },
      context.correlationId
    );
  }

  /**
   * Log error to audit system
   */
  private async logError(error: ApplicationError, context: ErrorContext): Promise<void> {
    try {
      // Log to structured error logs
      const errorLog = {
        ...error.toJSON(),
        context: {
          operation: context.operation,
          metadata: context.metadata
        }
      };

      console.error(`LOG: ERROR-${error.severity}-1 - ${error.category}:`, JSON.stringify(errorLog));

      // Log to security audit if it's a security-related error
      if (error.category === 'SECURITY' || error.category === 'AUTHENTICATION') {
        await this.auditLogger.logSecurityEvent({
          type: 'security_violation',
          severity: error.severity,
          userId: error.userId,
          sessionId: error.sessionId,
          ip: context.request ? this.getIP(context.request) : 'unknown',
          userAgent: context.request ? context.request.headers.get('User-Agent') || 'unknown' : 'unknown',
          url: context.request ? context.request.url : 'unknown',
          method: context.request ? context.request.method : 'unknown',
          details: {
            errorCode: error.code,
            errorMessage: error.message,
            ...error.details
          },
          outcome: 'failure',
          source: 'error_handler',
          correlationId: error.correlationId
        });
      }

      // Store in KV for error analytics
      await this.storeErrorForAnalytics(error);
    } catch (logError: unknown) {
      console.error('LOG: ERROR-HANDLER-ERROR-1 - Failed to log error:', logError);
    }
  }

  /**
   * Store error for analytics
   */
  private async storeErrorForAnalytics(error: ApplicationError): Promise<void> {
    try {
      const key = `error_analytics:${new Date().toISOString().split('T')[0]}:${error.code}`;
      const current = await this.env.TRENDS_CACHE.get(key, 'json') as { count: number; lastOccurrence: string } | null;

      const analytics = {
        count: (current?.count || 0) + 1,
        lastOccurrence: error.timestamp,
        severity: error.severity,
        category: error.category
      };

      await this.env.TRENDS_CACHE.put(
        key,
        JSON.stringify(analytics),
        { expirationTtl: 86400 * 7 } // 7 days
      );
    } catch (error: unknown) {
      console.error('LOG: ERROR-ANALYTICS-ERROR-1 - Failed to store error analytics:', error);
    }
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(error: ApplicationError): void {
    if (!error.retryable) return;

    const key = `${error.category}:${error.code}`;
    const breaker = this.circuitBreakers.get(key) || { failures: 0, lastFailure: 0, isOpen: false };

    breaker.failures++;
    breaker.lastFailure = Date.now();

    // Open circuit if too many failures
    if (breaker.failures >= 5) {
      breaker.isOpen = true;
      console.warn(`LOG: CIRCUIT-BREAKER-1 - Circuit breaker opened for ${key}`);
    }

    this.circuitBreakers.set(key, breaker);
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitBreakerOpen(category: ErrorCategory, code: string): boolean {
    const key = `${category}:${code}`;
    const breaker = this.circuitBreakers.get(key);

    if (!breaker || !breaker.isOpen) return false;

    // Reset circuit breaker after 5 minutes
    if (Date.now() - breaker.lastFailure > 300000) {
      breaker.isOpen = false;
      breaker.failures = 0;
      this.circuitBreakers.set(key, breaker);
      return false;
    }

    return true;
  }

  /**
   * Send critical alert
   */
  private async sendCriticalAlert(error: ApplicationError, context: ErrorContext): Promise<void> {
    try {
      const alert = {
        id: error.id,
        type: 'CRITICAL_ERROR',
        timestamp: error.timestamp,
        error: error.toJSON(),
        context,
        environment: EnvironmentManager.getConfig().environment
      };

      // Store alert in KV for immediate access
      await this.env.TRENDS_CACHE.put(
        `critical_error:${error.id}`,
        JSON.stringify(alert),
        { expirationTtl: 86400 } // 24 hours
      );

      console.error('🚨 CRITICAL ERROR ALERT:', JSON.stringify(alert));

      // In production, send to monitoring service, email, Slack, etc.
    } catch (alertError: unknown) {
      console.error('LOG: CRITICAL-ALERT-ERROR-1 - Failed to send critical alert:', alertError);
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStatistics(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    topErrors: Array<{ code: string; count: number }>;
  }> {
    try {
      const stats = {
        totalErrors: 0,
        errorsByCategory: {} as Record<ErrorCategory, number>,
        errorsBySeverity: {} as Record<ErrorSeverity, number>,
        topErrors: [] as Array<{ code: string; count: number }>
      };

      // Get error analytics from KV
      const prefix = `error_analytics:${new Date().toISOString().split('T')[0]}`;
      const errors = await this.env.TRENDS_CACHE.list({ prefix });

      const errorCounts = new Map<string, number>();

      for (const key of errors.keys) {
        try {
          const data = await this.env.TRENDS_CACHE.get(key.name, 'json') as unknown;
          if (data) {
            const errorCode = key.name.split(':')[2];
            stats.totalErrors += data.count;
            errorCounts.set(errorCode, data.count);

            // Update category and severity counts
            stats.errorsByCategory[data.category] = (stats.errorsByCategory[data.category] || 0) + data.count;
            stats.errorsBySeverity[data.severity] = (stats.errorsBySeverity[data.severity] || 0) + data.count;
          }
        } catch (error: unknown) {
          console.warn('LOG: ERROR-STATS-WARN-1 - Failed to parse error data:', error);
        }
      }

      // Top errors
      stats.topErrors = Array.from(errorCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([code, count]) => ({ _code, count }));

      return stats;
    } catch (error: unknown) {
      console.error('LOG: ERROR-STATS-ERROR-1 - Failed to get error statistics:', error);
      return {
        totalErrors: 0,
        errorsByCategory: {} as Record<ErrorCategory, number>,
        errorsBySeverity: {} as Record<ErrorSeverity, number>,
        topErrors: []
      };
    }
  }

  /**
   * Helper to get IP from request
   */
  private getIP(request: Request): string {
    return request.headers.get('CF-Connecting-IP') ||
           request.headers.get('X-Forwarded-For') ||
           'unknown';
  }

  /**
   * Cleanup old error data
   */
  async cleanupOldErrors(retentionDays: number = 30): Promise<{ deleted: number }> {
    try {
      let deleted = 0;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Clean up KV error analytics
      const errors = await this.env.TRENDS_CACHE.list({ prefix: 'error_analytics:' });

      for (const key of errors.keys) {
        const dateStr = key.name.split(':')[1];
        const errorDate = new Date(dateStr);

        if (errorDate < cutoffDate) {
          await this.env.TRENDS_CACHE.delete(key.name);
          deleted++;
        }
      }

      console.log(`LOG: ERROR-CLEANUP-1 - Deleted ${deleted} old error analytics`);
      return { deleted };
    } catch (error: unknown) {
      console.error('LOG: ERROR-CLEANUP-ERROR-1 - Failed to cleanup old errors:', error);
      return { deleted: 0 };
    }
  }
}

/**
 * Global error handler middleware
 */
export function createGlobalErrorHandler(env: CloudflareEnv) {
  const errorHandler = new ErrorHandler(env);

  return {
    handleError: (error: unknown, context: ErrorContext = {}) => {
      return errorHandler.handleError(error, context);
    },

    createErrorResponse: (error: ApplicationError) => {
      return errorHandler.createErrorResponse(error);
    },

    isCircuitBreakerOpen: (category: ErrorCategory, code: string) => {
      return errorHandler.isCircuitBreakerOpen(category, code);
    },

    getErrorStatistics: (timeframe?: 'hour' | 'day' | 'week') => {
      return errorHandler.getErrorStatistics(timeframe);
    }
  };
}