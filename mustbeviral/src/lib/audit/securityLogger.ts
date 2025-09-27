/**
 * Security Audit Logger
 * Comprehensive security event logging and monitoring
 */

import { CloudflareEnv} from '../cloudflare';
import { PIIEncryption} from '../crypto/encryption';
import { ValidationError} from '../../middleware/validation';
import { logger} from '../monitoring/logger';

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
  | 'malicious_request';

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

export interface SecurityMetrics {
  eventCount: number;
  severityBreakdown: Record<SecuritySeverity, number>;
  typeBreakdown: Record<SecurityEventType, number>;
  hourlyDistribution: Record<string, number>;
  topIPs: Array<{ ip: string; count: number }>;
  topUserAgents: Array<{ userAgent: string; count: number }>;
}

export class SecurityLogger {
  static async logSecurityEvent(type: string, event: unknown): Promise<void> {
    // Static method wrapper for compatibility
    const logger = new SecurityAuditLogger({} as CloudflareEnv);
    await logger.logSecurityEvent({
      type: type as SecurityEventType,
      severity: 'MEDIUM',
      ip: event.ip ?? 'unknown',
      userAgent: event.userAgent ?? 'unknown',
      url: event.url ?? '',
      method: event.method ?? '',
      details: event,
      outcome: 'blocked',
      source: 'system'
    });
  }
}

export class SecurityAuditLogger {
  private env: CloudflareEnv;
  private batchSize = 10;
  private flushInterval = 30000; // 30 seconds
  private eventBatch: SecurityEvent[] = [];
  private flushTimer?: unknown;

  constructor(env: CloudflareEnv) {
    this.env = env;
    this.startBatchFlush();
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const securityEvent: SecurityEvent = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        ...event
      };

      // Validate and sanitize event data
      const sanitizedEvent = await this.sanitizeEvent(securityEvent);

      // Add to batch
      this.eventBatch.push(sanitizedEvent);

      // Log critical events immediately
      if (sanitizedEvent.severity === 'CRITICAL') {
        await this.flushBatch();
        await this.sendCriticalAlert(sanitizedEvent);
      }

      // Flush batch if it's full
      if (this.eventBatch.length >= this.batchSize) {
        await this.flushBatch();
      }

      logger.info('Security event logged', {
        component: 'SecurityAuditLogger',
        action: 'logSecurityEvent',
        metadata: { 
          eventType: sanitizedEvent.type, 
          severity: sanitizedEvent.severity,
          eventId: sanitizedEvent.id 
        }
      });
    } catch (error: unknown) {
      logger.error('Failed to log security event', error instanceof Error ? error : new Error(String(error)), {
        component: 'SecurityAuditLogger',
        action: 'logSecurityEvent'
      });
      // Don't throw - audit logging failures shouldn't break the application
    }
  }

  /**
   * Log authentication success
   */
  async logAuthSuccess(userId: string, request: Request, details?: Record<string, unknown>): Promise<void> {
    await this.logSecurityEvent({
      type: 'authentication_success',
      severity: 'LOW',
      userId,
      ip: this.getIP(request),
      userAgent: this.getUserAgent(request),
      url: request.url,
      method: request.method,
      details: details ?? {},
      outcome: 'success',
      source: 'auth_service',
      geolocation: this.getGeolocation(request)
    });
  }

  /**
   * Log authentication failure
   */
  async logAuthFailure(email: string, request: Request, reason: string, details?: Record<string, unknown>): Promise<void> {
    await this.logSecurityEvent({
      type: 'authentication_failure',
      severity: 'MEDIUM',
      ip: this.getIP(request),
      userAgent: this.getUserAgent(request),
      url: request.url,
      method: request.method,
      details: {
        email: PIIEncryption.maskPII(email),
        reason,
        ...details
      },
      outcome: 'failure',
      source: 'auth_service',
      geolocation: this.getGeolocation(request)
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimit(request: Request, limit: number, details?: Record<string, unknown>): Promise<void> {
    await this.logSecurityEvent({
      type: 'rate_limit_exceeded',
      severity: 'MEDIUM',
      ip: this.getIP(request),
      userAgent: this.getUserAgent(request),
      url: request.url,
      method: request.method,
      details: { limit,
        ...details
      },
      outcome: 'blocked',
      source: 'rate_limiter',
      geolocation: this.getGeolocation(request)
    });
  }

  /**
   * Log security violation
   */
  async logSecurityViolation(request: Request, violation: string, details?: Record<string, unknown>): Promise<void> {
    await this.logSecurityEvent({
      type: 'security_violation',
      severity: 'HIGH',
      ip: this.getIP(request),
      userAgent: this.getUserAgent(request),
      url: request.url,
      method: request.method,
      details: { violation,
        ...details
      },
      outcome: 'blocked',
      source: 'security_middleware',
      geolocation: this.getGeolocation(request)
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(request: Request, activity: string, userId?: string, details?: Record<string, unknown>): Promise<void> {
    await this.logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'HIGH',
      userId,
      ip: this.getIP(request),
      userAgent: this.getUserAgent(request),
      url: request.url,
      method: request.method,
      details: { activity,
        ...details
      },
      outcome: 'blocked',
      source: 'detection_system',
      geolocation: this.getGeolocation(request)
    });
  }

  /**
   * Log data access
   */
  async logDataAccess(userId: string, resource: string, request: Request, details?: Record<string, unknown>): Promise<void> {
    await this.logSecurityEvent({
      type: 'data_access',
      severity: 'LOW',
      userId,
      ip: this.getIP(request),
      userAgent: this.getUserAgent(request),
      url: request.url,
      method: request.method,
      details: { resource,
        ...details
      },
      outcome: 'success',
      source: 'api_service',
      geolocation: this.getGeolocation(request)
    });
  }

  /**
   * Log admin action
   */
  async logAdminAction(userId: string, action: string, request: Request, details?: Record<string, unknown>): Promise<void> {
    await this.logSecurityEvent({
      type: 'admin_action',
      severity: 'MEDIUM',
      userId,
      ip: this.getIP(request),
      userAgent: this.getUserAgent(request),
      url: request.url,
      method: request.method,
      details: { action,
        ...details
      },
      outcome: 'success',
      source: 'admin_panel',
      geolocation: this.getGeolocation(request)
    });
  }

  /**
   * Log CSP violation
   */
  async logCSPViolation(report: unknown, request: Request): Promise<void> {
    await this.logSecurityEvent({
      type: 'csp_violation',
      severity: 'MEDIUM',
      ip: this.getIP(request),
      userAgent: this.getUserAgent(request),
      url: request.url,
      method: request.method,
      details: {
        violatedDirective: report['violated-directive'],
        blockedUri: report['blocked-uri'],
        documentUri: report['document-uri'],
        originalPolicy: report['original-policy']
      },
      outcome: 'blocked',
      source: 'csp_reporter',
      geolocation: this.getGeolocation(request)
    });
  }

  /**
   * Get security metrics for a time period
   */
  async getSecurityMetrics(
    startTime: Date,
    endTime: Date,
    userId?: string
  ): Promise<SecurityMetrics> {
    try {
      // Query security events from D1
      const query = `
        SELECT type, severity, ip, useragent, timestamp
        FROM security_audit_logs
        WHERE timestamp BETWEEN ? AND ?
        ${userId ? 'AND userid = ?' : ''}
        ORDER BY timestamp DESC
      `;

      const params = [startTime.toISOString(), endTime.toISOString()];
      if (userId) {params.push(userId);}

      const events = await this.env.DB.prepare(query).bind(...params).all();

      // Calculate metrics
      const metrics: SecurityMetrics = {
        eventCount: events.results?.length ?? 0,
        severityBreakdown: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        typeBreakdown: {} as Record<SecurityEventType, number>,
        hourlyDistribution: {},
        topIPs: [],
        topUserAgents: []
      };

      const ipCounts = new Map<string, number>();
      const userAgentCounts = new Map<string, number>();

      for (const event of events.results ?? []) {
        const eventData = event as unknown;

        // Severity breakdown
        metrics.severityBreakdown[eventData.severity as SecuritySeverity]++;

        // Type breakdown
        const type = eventData.type as SecurityEventType;
        metrics.typeBreakdown[type] = (metrics.typeBreakdown[type]  ?? 0) + 1;

        // Hourly distribution
        const hour = new Date(eventData.timestamp).getHours().toString();
        metrics.hourlyDistribution[hour] = (metrics.hourlyDistribution[hour]  ?? 0) + 1;

        // IP counts
        const ip = eventData.ip;
        ipCounts.set(ip, (ipCounts.get(ip)  ?? 0) + 1);

        // User agent counts
        const userAgent = eventData.useragent;
        userAgentCounts.set(userAgent, (userAgentCounts.get(userAgent)  ?? 0) + 1);
      }

      // Top IPs
      metrics.topIPs = Array.from(ipCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count }));

      // Top User Agents
      metrics.topUserAgents = Array.from(userAgentCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([userAgent, count]) => ({ userAgent, count }));

      return metrics;
    } catch (error: unknown) {
      logger.error('Failed to get security metrics', error instanceof Error ? error : new Error(String(error)), {
        component: 'SecurityAuditLogger',
        action: 'getSecurityMetrics'
      });
      throw new ValidationError(
        [{ field: 'metrics', message: 'Failed to retrieve security metrics' }],
        'Security metrics query failed'
      );
    }
  }

  /**
   * Search security events
   */
  async searchEvents(
    filters: {
      startTime?: Date;
      endTime?: Date;
      userId?: string;
      ip?: string;
      type?: SecurityEventType;
      severity?: SecuritySeverity;
      outcome?: 'success' | 'failure' | 'blocked';
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<SecurityEvent[]> {
    try {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (filters.startTime) {
        conditions.push('timestamp >= ?');
        params.push(filters.startTime.toISOString());
      }

      if (filters.endTime) {
        conditions.push('timestamp <= ?');
        params.push(filters.endTime.toISOString());
      }

      if (filters.userId) {
        conditions.push('userid = ?');
        params.push(filters.userId);
      }

      if (filters.ip) {
        conditions.push('ip = ?');
        params.push(filters.ip);
      }

      if (filters.type) {
        conditions.push('type = ?');
        params.push(filters.type);
      }

      if (filters.severity) {
        conditions.push('severity = ?');
        params.push(filters.severity);
      }

      if (filters.outcome) {
        conditions.push('outcome = ?');
        params.push(filters.outcome);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT *
        FROM security_audit_logs
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);

      const result = await this.env.DB.prepare(query).bind(...params).all();

      return (result.results ?? []).map(row => {
        const event = row as unknown;
        return {
          ...event,
          details: JSON.parse(event.details ?? '{}'),
          geolocation: event.geolocation ? JSON.parse(event.geolocation) : undefined
        };
      });
    } catch (error: unknown) {
      logger.error('Failed to search security events', error instanceof Error ? error : new Error(String(error)), {
        component: 'SecurityAuditLogger',
        action: 'searchEvents'
      });
      throw new ValidationError(
        [{ field: 'search', message: 'Failed to search security events' }],
        'Security event search failed'
      );
    }
  }

  /**
   * Sanitize event data before logging
   */
  private async sanitizeEvent(event: SecurityEvent): Promise<SecurityEvent> {
    const sanitized = { ...event };

    // Deep sanitize PII in details and all string fields
    if (sanitized.details) {
      sanitized.details = this.deepSanitizePII(sanitized.details);
    }

    // Sanitize user agent for potential PII
    if (sanitized.userAgent) {
      sanitized.userAgent = this.sanitizeUserAgent(sanitized.userAgent);
    }

    // Sanitize URL for potential PII in query parameters
    if (sanitized.url) {
      sanitized.url = this.sanitizeURL(sanitized.url);
    }

    // Validate required fields
    if (!sanitized.ip) {
      sanitized.ip = 'unknown';
    }

    if (!sanitized.userAgent) {
      sanitized.userAgent = 'unknown';
    }

    // Limit detail size
    const detailsString = JSON.stringify(sanitized.details);
    if (detailsString.length > 10000) {
      sanitized.details = { truncated: true, size: detailsString.length };
    }

    return sanitized;
  }

  /**
   * Deep sanitize object for PII
   */
  private deepSanitizePII(obj: unknown): unknown {
    if (typeof obj !== 'object'  ?? obj === null) {
      return typeof obj === 'string' ? this.sanitizeStringForPII(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitizePII(item));
    }

    const sanitized: unknown = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if key indicates PII
      if (this.isPIIField(key)) {
        sanitized[key] = typeof value === 'string' ? PIIEncryption.maskPII(value) : '[REDACTED]';
      } else {
        sanitized[key] = this.deepSanitizePII(value);
      }
    }

    return sanitized;
  }

  /**
   * Check if field name indicates PII
   */
  private isPIIField(fieldName: string): boolean {
    const piiFields = [
      'email', 'password', 'ssn', 'phone', 'address', 'firstName', 'lastName',
      'fullName', 'creditCard', 'bankAccount', 'passport', 'driverLicense',
      'token', 'secret', 'key', 'authorization', 'session'
    ];

    const lowerField = fieldName.toLowerCase();
    return piiFields.some(piiField => lowerField.includes(piiField));
  }

  /**
   * Sanitize string for potential PII patterns
   */
  private sanitizeStringForPII(str: string): string {
    let sanitized = str;

    // Email patterns
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}/g, '[EMAIL]');

    // Phone number patterns
    sanitized = sanitized.replace(/\+?[\d\s\-()]{10,}/g, '[PHONE]');

    // Credit card patterns (simplified)
    sanitized = sanitized.replace(/\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g, '[CARD]');

    // SSN patterns
    sanitized = sanitized.replace(/\b\d{3}\-?\d{2}\-?\d{4}\b/g, '[SSN]');

    // Token patterns (JWT-like)
    sanitized = sanitized.replace(/\b[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\b/g, '[TOKEN]');

    // API key patterns
    sanitized = sanitized.replace(/\b[a-zA-Z0-9]{32,}\b/g, '[APIKEY]');

    return sanitized;
  }

  /**
   * Sanitize user agent string
   */
  private sanitizeUserAgent(userAgent: string): string {
    // Keep only essential parts, remove potential PII
    const parts = userAgent.split(/[s()]/);
    const safeParts = parts.filter(part => {
      // Keep browser names, versions, OS info
      return /^(Mozilla|Chrome|Safari|Firefox|Edge|Opera|Windows|Macintosh|Linux|Android|iOS|Version)/i.test(part)  ?? /^d+.d+/.test(part); // Version numbers
    });

    return safeParts.length > 0 ? safeParts.slice(0, 5).join(' ') : 'sanitized-ua';
  }

  /**
   * Sanitize URL for PII in query parameters
   */
  private sanitizeURL(url: string): string {
    try {
      const urlObj = new URL(url);

      // Keep path and basic structure, sanitize query parameters
      const sensitiveParams = ['email', 'token', 'key', 'secret', 'password', 'phone', 'ssn'];

      for (const [key, value] of urlObj.searchParams.entries()) {
        if (sensitiveParams.some(param => key.toLowerCase().includes(param))) {
          urlObj.searchParams.set(key, '[REDACTED]');
        } else if (this.containsPII(value)) {
          urlObj.searchParams.set(key, '[REDACTED]');
        }
      }

      return urlObj.toString();
    } catch (error: unknown) {
      // If URL parsing fails, return sanitized version
      return url.replace(/[?&][^=&]*=([^&]*)/g, (match, value) => {
        return this.containsPII(value) ? match.replace(value, '[REDACTED]') : match;
      });
    }
  }

  /**
   * Check if string contains PII patterns
   */
  private containsPII(str: string): boolean {
    // Email pattern
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}/.test(str)) {return true;}

    // Phone pattern
    if (/\+?[\d\s\-()]{10,}/.test(str)) {return true;}

    // Credit card pattern
    if (/\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/.test(str)) {return true;}

    // SSN pattern
    if (/\b\d{3}\-?\d{2}\-?\d{4}\b/.test(str)) {return true;}

    // Token pattern
    if (/\b[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\b/.test(str)) {return true;}

    return false;
  }

  /**
   * Flush batch of events to storage
   */
  private async flushBatch(): Promise<void> {
    if (this.eventBatch.length === 0) {return;}

    try {
      const events = [...this.eventBatch];
      this.eventBatch = [];

      // Prepare batch insert
      const statements = events.map(event => {
        return this.env.DB.prepare(`
          INSERT INTO securityauditlogs(
            id, timestamp, type, severity, userid, sessionid, ip, useragent,
            url, method, details, outcome, source, correlationid, geolocation
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          event.id,
          event.timestamp,
          event.type,
          event.severity,
          event.userId ?? null,
          event.sessionId ?? null,
          event.ip,
          event.userAgent,
          event.url,
          event.method,
          JSON.stringify(event.details),
          event.outcome,
          event.source,
          event.correlationId ?? null,
          event.geolocation ? JSON.stringify(event.geolocation) : null
        );
      });

      await this.env.DB.batch(statements);

      logger.info('Flushed security events batch', {
        component: 'SecurityAuditLogger',
        action: 'flushBatch',
        metadata: { eventsCount: events.length }
      });
    } catch (error: unknown) {
      logger.error('Failed to flush security events batch', error instanceof Error ? error : new Error(String(error)), {
        component: 'SecurityAuditLogger',
        action: 'flushBatch'
      });
      // Re-add events to batch for retry (but limit to prevent memory issues)
      this.eventBatch = [...this.eventBatch.slice(-50), ...this.eventBatch];
    }
  }

  /**
   * Start batch flush timer
   */
  private startBatchFlush(): void {
    this.flushTimer = setInterval_(() => {
      this.flushBatch().catch(error => {
        logger.error('Timer flush failed', error instanceof Error ? error : new Error(String(error)), {
          component: 'SecurityAuditLogger',
          action: 'startBatchFlush'
        });
      });
    }, this.flushInterval);
  }

  /**
   * Send critical alert
   */
  private async sendCriticalAlert(event: SecurityEvent): Promise<void> {
    try {
      // In production, send to monitoring service, email, Slack, etc.
      logger.fatal('Critical security event detected', new Error(`Critical security violation: ${event.type}`), {
        component: 'SecurityAuditLogger',
        action: 'sendCriticalAlert',
        metadata: {
          eventType: event.type,
          sourceIP: event.ip,
          eventId: event.id,
          severity: event.severity
        }
      });

      // Store in KV for immediate access
      await this.env.TRENDS_CACHE.put(
        `critical_alert:${event.id}`,
        JSON.stringify(event),
        { expirationTtl: 86400 } // 24 hours
      );
    } catch (error: unknown) {
      logger.error('Failed to send critical alert', error instanceof Error ? error : new Error(String(error)), {
        component: 'SecurityAuditLogger',
        action: 'sendCriticalAlert',
        metadata: { eventId: event.id }
      });
    }
  }

  /**
   * Helper methods for extracting request information
   */
  private getIP(request: Request): string {
    return request.headers.get('CF-Connecting-IP')  ?? request.headers.get('X-Forwarded-For')  ?? 'unknown';
  }

  private getUserAgent(request: Request): string {
    return request.headers.get('User-Agent')  ?? 'unknown';
  }

  private getGeolocation(request: Request): SecurityEvent['geolocation'] {
    return {
      country: request.headers.get('CF-IPCountry')  ?? undefined,
      region: request.headers.get('CF-Region')  ?? undefined,
      city: request.headers.get('CF-IPCity')  ?? undefined
    };
  }

  /**
   * Cleanup old events (maintenance function)
   */
  async cleanupOldEvents(retentionDays: number = 90): Promise<{ deleted: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.env.DB.prepare(`
        DELETE FROM security_audit_logs
        WHERE timestamp < ?
      `).bind(cutoffDate.toISOString()).run();

      logger.info('Cleaned up old security events', {
        component: 'SecurityAuditLogger',
        action: 'cleanupOldEvents',
        metadata: { deletedCount: result.meta?.changes ?? 0, retentionDays }
      });

      return { deleted: result.meta?.changes ?? 0 };
    } catch (error: unknown) {
      logger.error('Failed to cleanup old events', error instanceof Error ? error : new Error(String(error)), {
        component: 'SecurityAuditLogger',
        action: 'cleanupOldEvents'
      });
      return { deleted: 0 };
    }
  }

  /**
   * Destroy logger (cleanup)
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Flush remaining events
    this.flushBatch().catch(error => {
      logger.error('Final flush failed during destroy', error instanceof Error ? error : new Error(String(error)), {
        component: 'SecurityAuditLogger',
        action: 'destroy'
      });
    });
  }
}