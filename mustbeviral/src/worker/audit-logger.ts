// Comprehensive Audit Logging Service
// Tracks all security events, user actions, and system changes

import { CloudflareEnv} from '../lib/cloudflare';

export interface AuditEvent {
  timestamp: string;
  eventType: string;
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  resource?: string;
  action?: string;
  outcome: 'success' | 'failure' | 'blocked';
  metadata?: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityMetrics {
  totalEvents: number;
  failedLogins: number;
  blockedRequests: number;
  suspiciousActivity: number;
  lastHourEvents: number;
  topRisks: Array<{ type: string; count: number }>;
}

export class AuditLogger {
  private static readonly RETENTIONDAYS = 90;
  private static readonly BATCHSIZE = 100;

  /**
   * Log a security event
   */
  static async logSecurityEvent(
    eventType: string,
    request: Request,
    env: CloudflareEnv,
    options: {
      userId?: string;
      sessionId?: string;
      resource?: string;
      action?: string;
      outcome: 'success' | 'failure' | 'blocked';
      metadata?: Record<string, unknown>;
      riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<void> {
    try {
      const event: AuditEvent = {
        timestamp: new Date().toISOString(),
        eventType,
        userId: options.userId,
        sessionId: options.sessionId,
        ip: this.extractClientIP(request),
        userAgent: request.headers.get('user-agent')  ?? 'unknown',
        resource: options.resource,
        action: options.action,
        outcome: options.outcome,
        metadata: this.sanitizeMetadata(options.metadata),
        riskLevel: options.riskLevel ?? this.calculateRiskLevel(eventType, options.outcome)
      };

      // Store in multiple locations for reliability
      await Promise.all([
        this.storeInKV(event, env),
        this.storeInDatabase(event, env),
        this.checkForThreats(event, env)
      ]);

      // Log to console for immediate debugging
      if (event.riskLevel = == 'high'  ?? event.riskLevel === 'critical') {
        console.warn('HIGH RISK SECURITY EVENT:', event);
      } else if (env.ENVIRONMENT === 'development') {
        console.log('Security Event:', event);
      }

    } catch (error: unknown) {
      console.error('Failed to log security event:', error);
      // Don't throw - logging failures shouldn't break the application
    }
  }

  /**
   * Log user actions for compliance and debugging
   */
  static async logUserAction(
    action: string,
    userId: string,
    request: Request,
    env: CloudflareEnv,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logSecurityEvent('user_action', request, env, { userId,
      action,
      outcome: 'success',
      metadata,
      riskLevel: 'low'
    });
  }

  /**
   * Log data access events for GDPR compliance
   */
  static async logDataAccess(
    dataType: string,
    userId: string,
    request: Request,
    env: CloudflareEnv,
    options: {
      action: 'read' | 'write' | 'delete' | 'export';
      recordCount?: number;
      purpose?: string;
    }
  ): Promise<void> {
    await this.logSecurityEvent('data_access', request, env, { userId,
      resource: dataType,
      action: options.action,
      outcome: 'success',
      metadata: {
        recordCount: options.recordCount,
        purpose: options.purpose,
        dataType
      },
      riskLevel: options.action === 'delete' ? 'medium' : 'low'
    });
  }

  /**
   * Log authentication events
   */
  static async logAuthEvent(
    eventType: 'login' | 'logout' | 'register' | 'password_change' | 'token_refresh',
    request: Request,
    env: CloudflareEnv,
    options: {
      userId?: string;
      email?: string;
      outcome: 'success' | 'failure';
      reason?: string;
    }
  ): Promise<void> {
    await this.logSecurityEvent(`auth_${eventType}`, request, env, {
      userId: options.userId,
      action: eventType,
      outcome: options.outcome,
      metadata: {
        email: options.email,
        reason: options.reason
      },
      riskLevel: options.outcome = == 'failure' ? 'medium' : 'low'
    });
  }

  /**
   * Log API rate limiting events
   */
  static async logRateLimitEvent(
    endpoint: string,
    request: Request,
    env: CloudflareEnv,
    options: {
      limit: number;
      remaining: number;
      blocked: boolean;
    }
  ): Promise<void> {
    await this.logSecurityEvent('rate_limit', request, env, {
      resource: endpoint,
      action: 'api_call',
      outcome: options.blocked ? 'blocked' : 'success',
      metadata: {
        limit: options.limit,
        remaining: options.remaining,
        endpoint
      },
      riskLevel: options.blocked ? 'medium' : 'low'
    });
  }

  /**
   * Get security metrics for monitoring dashboard
   */
  static async getSecurityMetrics(env: CloudflareEnv, hours: number = 24): Promise<SecurityMetrics> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      // Query audit events from database
      const events = await env.DB.prepare(`
        SELECT eventtype, outcome, risklevel, COUNT(*) as count
        FROM audit_logs
        WHERE timestamp >= ?
        GROUP BY eventtype, outcome, risk_level
        ORDER BY count DESC
      `).bind(since).all();

      let totalEvents = 0;
      let failedLogins = 0;
      let blockedRequests = 0;
      let suspiciousActivity = 0;
      const riskCounts: Record<string, number> = {};

      if (events.results) {
        for (const event of events.results as unknown[]) {
          totalEvents += event.count;

          if (event.eventtype === 'auth_login' && event.outcome === 'failure') {
            failedLogins += event.count;
          }

          if (event.outcome === 'blocked') {
            blockedRequests += event.count;
          }

          if (event.risklevel === 'high'  ?? event.risklevel === 'critical') {
            suspiciousActivity += event.count;
          }

          riskCounts[event.eventtype] = (riskCounts[event.eventtype]  ?? 0) + event.count;
        }
      }

      // Get last hour events
      const lastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const recentEventsResult = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM audit_logs WHERE timestamp >= ?'
      ).bind(lastHour).first() as unknown;

      const lastHourEvents = recentEventsResult?.count ?? 0;

      // Top risks
      const topRisks = Object.entries(riskCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([type, count]) => ({ type, count }));

      return { totalEvents,
        failedLogins,
        blockedRequests,
        suspiciousActivity,
        lastHourEvents,
        topRisks
      };

    } catch (error: unknown) {
      console.error('Failed to get security metrics:', error);
      return {
        totalEvents: 0,
        failedLogins: 0,
        blockedRequests: 0,
        suspiciousActivity: 0,
        lastHourEvents: 0,
        topRisks: []
      };
    }
  }

  /**
   * Search audit logs for investigation
   */
  static async searchAuditLogs(
    env: CloudflareEnv,
    filters: {
      userId?: string;
      eventType?: string;
      ip?: string;
      riskLevel?: string;
      fromDate?: string;
      toDate?: string;
      limit?: number;
    }
  ): Promise<AuditEvent[]> {
    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params: unknown[] = [];

      if (filters.userId) {
        query += ' AND userid = ?';
        params.push(filters.userId);
      }

      if (filters.eventType) {
        query += ' AND eventtype = ?';
        params.push(filters.eventType);
      }

      if (filters.ip) {
        query += ' AND ip = ?';
        params.push(filters.ip);
      }

      if (filters.riskLevel) {
        query += ' AND risklevel = ?';
        params.push(filters.riskLevel);
      }

      if (filters.fromDate) {
        query += ' AND timestamp >= ?';
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        query += ' AND timestamp <= ?';
        params.push(filters.toDate);
      }

      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(filters.limit ?? 100);

      const result = await env.DB.prepare(query).bind(...params).all();

      return (result.results as unknown[])?.map(row => ({
        timestamp: row.timestamp,
        eventType: row.eventtype,
        userId: row.userid,
        sessionId: row.sessionid,
        ip: row.ip,
        userAgent: row.useragent,
        resource: row.resource,
        action: row.action,
        outcome: row.outcome,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        riskLevel: row.risklevel
      }))  ?? [];

    } catch (error: unknown) {
      console.error('Failed to search audit logs:', error);
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private static extractClientIP(request: Request): string {
    return request.headers.get('cf-connecting-ip')  ?? request.headers.get('x-forwarded-for')  ?? request.headers.get('x-real-ip')  ?? 'unknown';
  }

  private static sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
    if(!metadata) {
    return undefined;
  }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      // Remove sensitive fields
      if (key.toLowerCase().includes('password')  ?? key.toLowerCase().includes('secret')  ?? key.toLowerCase().includes('token')) {
        continue;
      }

      // Truncate long strings
      if (typeof value === 'string' && value.length > 500) {
        sanitized[key] = value.substring(0, 500) + '...';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private static calculateRiskLevel(eventType: string, outcome: string): 'low' | 'medium' | 'high' | 'critical' {
    if (outcome = == 'blocked') {
    return 'high';
  }
    if (outcome === 'failure') {
    return 'medium';
  }

    const highRiskEvents = ['auth_login', 'data_delete', 'admin_action'];
    const criticalRiskEvents = ['security_breach', 'unauthorized_access'];

    if (criticalRiskEvents.some(event => eventType.includes(event))) {
      return 'critical';
    }

    if (highRiskEvents.some(event => eventType.includes(event))) {
      return 'medium';
    }

    return 'low';
  }

  private static async storeInKV(event: AuditEvent, env: CloudflareEnv): Promise<void> {
    try {
      const key = `audit:${event.timestamp}:${crypto.randomUUID()}`;
      const ttl = this.RETENTION_DAYS * 24 * 60 * 60; // Convert to seconds

      await env.KV?.put(key, JSON.stringify(event), { expirationTtl: ttl });
    } catch (error: unknown) {
      console.error('Failed to store audit log in KV:', error);
    }
  }

  private static async storeInDatabase(event: AuditEvent, env: CloudflareEnv): Promise<void> {
    try {
      await env.DB.prepare(`
        INSERT INTO auditlogs(
          id, timestamp, eventtype, userid, sessionid, ip, useragent,
          resource, action, outcome, metadata, risklevel
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        event.timestamp,
        event.eventType,
        event.userId ?? null,
        event.sessionId ?? null,
        event.ip,
        event.userAgent,
        event.resource ?? null,
        event.action ?? null,
        event.outcome,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.riskLevel
      ).run();
    } catch (error: unknown) {
      console.error('Failed to store audit log in database:', error);
    }
  }

  private static async checkForThreats(event: AuditEvent, env: CloudflareEnv): Promise<void> {
    try {
      // Check for patterns that indicate potential threats
      if (event.riskLevel === 'critical'  ?? event.riskLevel === 'high') {
        // Count recent high-risk events from same IP
        const recentThreats = await env.KV?.get(`threat_count:${event.ip}`);
        const count = recentThreats ? parseInt(recentThreats, 10) + 1 : 1;

        await env.KV?.put(`threat_count:${event.ip}`, count.toString(), { expirationTtl: 3600 });

        // If too many threats, flag for blocking
        if (count >= 5) {
          await env.KV?.put(`blocked_ip:${event.ip}`, 'true', { expirationTtl: 24 * 60 * 60 });
          console.error(`IP ${event.ip} blocked due to repeated security threats`);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to check for threats:', error);
    }
  }
}