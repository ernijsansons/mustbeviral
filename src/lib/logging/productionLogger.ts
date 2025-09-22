// Production-Safe Logging System
// Replaces console statements with structured, secure logging

import { log } from '../monitoring/logger';

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

export interface LogContext {
  component?: string;
  userId?: string;
  organizationId?: string;
  requestId?: string;
  sessionId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  performance?: {
    startTime?: number;
    endTime?: number;
    duration?: number;
  };
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  environment: string;
  service: string;
  version: string;
}

class ProductionLogger {
  private static instance: ProductionLogger;
  private logLevel: LogLevel;
  private environment: string;
  private service: string;
  private version: string;
  private sensitiveFields = new Set([
    'password', 'secret', 'token', 'key', 'authorization', 'cookie',
    'x-api-key', 'x-auth-token', 'stripe', 'payment', 'card', 'ssn',
    'email', 'phone', 'address', 'ip', 'fingerprint'
  ]);

  private constructor() {
    this.environment = this.getEnvironment();
    this.service = 'must-be-viral';
    this.version = '1.0.0';
    this.logLevel = this.getLogLevel();
  }

  static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger();
    }
    return ProductionLogger.instance;
  }

  // Safe logging methods that replace console.log
  trace(message: string, context?: LogContext): void {
    this.writeLog(LogLevel.TRACE, message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.writeLog(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.writeLog(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.writeLog(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: this.sanitizeStack(error.stack),
      }
    } : context;

    this.writeLog(LogLevel.ERROR, message, errorContext);
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: this.sanitizeStack(error.stack),
      }
    } : context;

    this.writeLog(LogLevel.FATAL, message, errorContext);
  }

  // Performance logging for monitoring
  startTimer(label: string, context?: LogContext): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.info(`Performance: ${label}`, {
        ...context,
        performance: { _startTime,
          endTime,
          duration
        }
      });
    };
  }

  // Audit logging for security events
  audit(action: string, context: LogContext): void {
    this.info(`AUDIT: ${action}`, {
      ...context,
      audit: true,
      timestamp: new Date().toISOString()
    });
  }

  // Security logging for threats
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    this.warn(`SECURITY: ${event}`, {
      ...context,
      security: { _event,
        severity,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Business logic logging
  business(event: string, context?: LogContext): void {
    this.info(`BUSINESS: ${event}`, {
      ...context,
      business: true
    });
  }

  // API request/response logging
  api(method: string, path: string, statusCode: number, duration: number, context?: LogContext): void {
    const level = statusCode >= 500 ? LogLevel.ERROR :
                 statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;

    this.writeLog(level, `API ${method} ${path} ${statusCode}`, {
      ...context,
      api: { _method,
        path,
        statusCode,
        duration
      }
    });
  }

  // Database operation logging
  database(operation: string, table: string, duration?: number, context?: LogContext): void {
    this.debug(`DB ${operation} ${table}`, {
      ...context,
      database: { _operation,
        table,
        duration
      }
    });
  }

  // AI/ML operation logging
  ai(operation: string, model: string, tokens?: number, cost?: number, context?: LogContext): void {
    this.info(`AI ${operation} ${model}`, {
      ...context,
      ai: { _operation,
        model,
        tokens,
        cost
      }
    });
  }

  private writeLog(level: LogLevel, message: string, context?: LogContext): void {
    if (level < this.logLevel) {
      return;
    }

    // Sanitize context to remove sensitive data
    const sanitizedContext = this.sanitizeContext(context);

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message: this.sanitizeMessage(message),
      context: sanitizedContext,
      environment: this.environment,
      service: this.service,
      version: this.version
    };

    // Use existing monitoring logger for output
    try {
      switch (level) {
        case LogLevel.TRACE:
        case LogLevel.DEBUG:
          log.debug(message, sanitizedContext);
          break;
        case LogLevel.INFO:
          log.info(message, sanitizedContext);
          break;
        case LogLevel.WARN:
          log.warn(message, sanitizedContext);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          log.error(message, sanitizedContext);
          break;
      }

      // In development, also output to console for debugging
      if (this.environment === 'development') {
        this.developmentConsoleOutput(level, logEntry);
      }

    } catch (error: unknown) {
      // Fallback to console only if logger fails
      console.error('Logger failed:', error);
      console.log(JSON.stringify(logEntry));
    }
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    const sanitized = { ...context };

    // Recursively sanitize metadata
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeObject(sanitized.metadata);
    }

    // Sanitize sensitive IDs (keep only last 4 characters)
    if (sanitized.userId && sanitized.userId.length > 8) {
      sanitized.userId = '***' + sanitized.userId.slice(-4);
    }

    return sanitized;
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = Array.isArray(value)
          ? value.map(item => typeof item === 'object' ? this.sanitizeObject(item) : item)
          : this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private sanitizeMessage(message: string): string {
    // Remove potential sensitive data from message strings
    let sanitized = message;

    // Replace common patterns that might contain sensitive data
    sanitized = sanitized.replace(/password[=:]\s*[^\s]+/gi, 'password=[REDACTED]');
    sanitized = sanitized.replace(/token[=:]\s*[^\s]+/gi, 'token=[REDACTED]');
    sanitized = sanitized.replace(/key[=:]\s*[^\s]+/gi, 'key=[REDACTED]');
    sanitized = sanitized.replace(/secret[=:]\s*[^\s]+/gi, 'secret=[REDACTED]');

    // Replace email addresses
    sanitized = sanitized.replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[EMAIL_REDACTED]');

    // Replace potential API keys (32+ character alphanumeric strings)
    sanitized = sanitized.replace(/[a-zA-Z0-9]{32,}/g, '[KEY_REDACTED]');

    return sanitized;
  }

  private sanitizeStack(stack?: string): string | undefined {
    if (!stack) return undefined;

    // Remove file paths that might contain sensitive information
    return stack.replace(/\/.*\//g, '/[PATH]/')
                .replace(/file:\/\/.*\//g, 'file://[PATH]/')
                .replace(/C:\\.*\\/g, 'C:\\[PATH]\\');
  }

  private isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return Array.from(this.sensitiveFields).some(sensitiveField =>
      lowerField.includes(sensitiveField)
    );
  }

  private getEnvironment(): string {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.ENVIRONMENT || process.env.NODE_ENV || 'development';
    }

    // Browser environment detection
    if (typeof window !== 'undefined') {
      return window.location.hostname.includes('localhost') ? 'development' : 'production';
    }

    return 'unknown';
  }

  private getLogLevel(): LogLevel {
    if (this.environment === 'production') {
      return LogLevel.INFO;
    } else if (this.environment === 'staging') {
      return LogLevel.DEBUG;
    } else {
      return LogLevel.TRACE;
    }
  }

  private developmentConsoleOutput(level: LogLevel, entry: LogEntry): void {
    const color = this.getConsoleColor(level);
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();

    console.group(`%c[${timestamp}] ${entry.level}: ${entry.message}`, `color: ${color}`);

    if (entry.context) {
      console.log('Context:', entry.context);
    }

    console.groupEnd();
  }

  private getConsoleColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.TRACE: return '#888';
      case LogLevel.DEBUG: return '#00f';
      case LogLevel.INFO: return '#090';
      case LogLevel.WARN: return '#f90';
      case LogLevel.ERROR: return '#f00';
      case LogLevel.FATAL: return '#800';
      default: return '#000';
    }
  }
}

// Export singleton instance and convenience functions
export const productionLogger = ProductionLogger.getInstance();

// Convenience functions that replace console methods
export const logger = {
  trace: (message: string, context?: LogContext) => productionLogger.trace(message, context),
  debug: (message: string, context?: LogContext) => productionLogger.debug(message, context),
  info: (message: string, context?: LogContext) => productionLogger.info(message, context),
  warn: (message: string, context?: LogContext) => productionLogger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) => productionLogger.error(message, error, context),
  fatal: (message: string, error?: Error, context?: LogContext) => productionLogger.fatal(message, error, context),

  // Specialized logging
  timer: (label: string, context?: LogContext) => productionLogger.startTimer(label, context),
  audit: (action: string, context: LogContext) => productionLogger.audit(action, context),
  security: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext) =>
    productionLogger.security(event, severity, context),
  business: (event: string, context?: LogContext) => productionLogger.business(event, context),
  api: (method: string, path: string, statusCode: number, duration: number, context?: LogContext) =>
    productionLogger.api(method, path, statusCode, duration, context),
  database: (operation: string, table: string, duration?: number, context?: LogContext) =>
    productionLogger.database(operation, table, duration, context),
  ai: (operation: string, model: string, tokens?: number, cost?: number, context?: LogContext) =>
    productionLogger.ai(operation, model, tokens, cost, context)
};

// Legacy console replacement for migration (temporary)
export const secureConsole = {
  log: logger.info,
  debug: logger.debug,
  info: logger.info,
  warn: logger.warn,
  error: (message: string, ...args: unknown[]) => {
    const error = args.find(arg => arg instanceof Error);
    const context = args.find(arg => arg && typeof arg === 'object' && !(arg instanceof Error));
    logger.error(message, error, context);
  },
  trace: logger.trace,
  time: (label: string) => {
    const endTimer = logger.timer(label);
    return { timeEnd: endTimer };
  },
  timeEnd: () => {} // Handled by timer function
};