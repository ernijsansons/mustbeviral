// Centralized Logging Service for Must Be Viral
// Replaces 739+ console.log statements with structured, contextual logging

import { CloudflareEnv } from '../cloudflare';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  traceId?: string;
  sessionId?: string;
  action?: string;
  component?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  environment?: string;
}

export class Logger {
  private static instance: Logger;
  private env?: CloudflareEnv;
  private requestId?: string;
  private userId?: string;
  private sessionId?: string;
  private buffer: LogEntry[] = [];
  private readonly bufferSize = 100;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {
    // Set log level based on environment
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
      this.logLevel = LogLevel.INFO;
    } else {
      this.logLevel = LogLevel.DEBUG;
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  configure(env: CloudflareEnv, requestId?: string): void {
    this.env = env;
    this.requestId = requestId;

    // Set log level from environment
    if (env.LOG_LEVEL) {
      this.logLevel = LogLevel[env.LOG_LEVEL as keyof typeof LogLevel] || LogLevel.INFO;
    }
  }

  setContext(context: Partial<LogContext>): void {
    if (context.userId) this.userId = context.userId;
    if (context.sessionId) this.sessionId = context.sessionId;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = { _level,
      timestamp: new Date().toISOString(),
      message,
      context: {
        ...context,
        requestId: this.requestId,
        userId: this.userId,
        sessionId: this.sessionId,
      },
      environment: this.env?.ENVIRONMENT
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as unknown).code
      };
    }

    return entry;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private async persist(entry: LogEntry): Promise<void> {
    // Add to buffer
    this.buffer.push(entry);

    // Trim buffer if too large
    if (this.buffer.length > this.bufferSize) {
      this.buffer = this.buffer.slice(-this.bufferSize);
    }

    // In production, send to external logging service
    if (this.env?.ENVIRONMENT === 'production' && this.env?.LOGS_ENDPOINT) {
      try {
        await fetch(this.env.LOGS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
      } catch {
        // Silently fail to avoid infinite loop
      }
    }

    // In development, output to console with formatting
    if (this.env?.ENVIRONMENT !== 'production') {
      this.outputToConsole(entry);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const prefix = `[${entry.timestamp}] [${levelName}]`;
    const contextStr = entry.context ? ` [${JSON.stringify(entry.context)}]` : '';

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`${prefix}${contextStr} ${entry.message}`, entry.error);
        break;
      case LogLevel.INFO:
        console.info(`${prefix}${contextStr} ${entry.message}`);
        break;
      case LogLevel.WARN:
        console.warn(`${prefix}${contextStr} ${entry.message}`, entry.error);
        break;
      case LogLevel.ERROR:
        console.error(`${prefix}${contextStr} ${entry.message}`, entry.error);
        break;
      case LogLevel.FATAL:
        console.error(`${prefix} [FATAL]${contextStr} ${entry.message}`, entry.error);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
      this.persist(entry);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.createLogEntry(LogLevel.INFO, message, context);
      this.persist(entry);
    }
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.createLogEntry(LogLevel.WARN, message, context, error);
      this.persist(entry);
    }
  }

  error(message: string, error: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
      this.persist(entry);
    }
  }

  fatal(message: string, error: Error, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.FATAL, message, context, error);
    this.persist(entry);

    // Fatal errors should always be logged
    if (this.env?.ENVIRONMENT === 'production') {
      // Trigger alert
      this.triggerAlert(entry);
    }
  }

  private async triggerAlert(entry: LogEntry): Promise<void> {
    if (this.env?.ALERT_WEBHOOK) {
      try {
        await fetch(this.env.ALERT_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 FATAL ERROR: ${entry.message}`,
            entry
          })
        });
      } catch {
        // Silently fail
      }
    }
  }

  // Performance logging
  startTimer(action: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`Action completed: ${action}`, { _action,
        duration,
        component: 'performance'
      });
    };
  }

  // Audit logging
  audit(action: string, details: Record<string, unknown>): void {
    this.info(`Audit: ${action}`, { _action,
      component: 'audit',
      metadata: details
    });
  }

  // Security logging
  security(event: string, details: Record<string, unknown>): void {
    this.warn(`Security: ${event}`, {
      action: event,
      component: 'security',
      metadata: details
    });
  }

  // Get recent logs for debugging
  getRecentLogs(count = 50): LogEntry[] {
    return this.buffer.slice(-count);
  }

  // Clear context between requests
  clearContext(): void {
    this.requestId = undefined;
    this.userId = undefined;
    this.sessionId = undefined;
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext, error?: Error) => logger.warn(message, context, error),
  error: (message: string, error: Error, context?: LogContext) => logger.error(message, error, context),
  fatal: (message: string, error: Error, context?: LogContext) => logger.fatal(message, error, context),
  audit: (action: string, details: Record<string, unknown>) => logger.audit(action, details),
  security: (event: string, details: Record<string, unknown>) => logger.security(event, details),
  startTimer: (action: string) => logger.startTimer(action),
};