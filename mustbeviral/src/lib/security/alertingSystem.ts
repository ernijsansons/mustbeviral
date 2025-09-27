/**
 * Security Alerting System for Must Be Viral V2
 * Real-time security incident alerting and escalation
 */

import { EventEmitter } from 'events';
import { SecurityIncident } from './runtimeSecurityMonitor';

export interface AlertChannel {
  id: string;
  name: string;
  type: 'SLACK' | 'EMAIL' | 'PAGERDUTY' | 'WEBHOOK' | 'SMS';
  config: {
    url?: string;
    token?: string;
    recipients?: string[];
    threshold?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  enabled: boolean;
  rateLimit: {
    maxAlerts: number;
    timeWindow: number; // milliseconds
    lastSent: number;
    count: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  conditions: {
    vulnerabilityTypes: string[];
    severityLevels: string[];
    frequencyThreshold: number;
    timeWindow: number;
  };
  actions: {
    channels: string[];
    escalation: boolean;
    autoBlock: boolean;
    quarantine: boolean;
  };
  enabled: boolean;
}

export interface Alert {
  id: string;
  timestamp: Date;
  incident: SecurityIncident;
  rule: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  channels: string[];
  status: 'PENDING' | 'SENT' | 'FAILED' | 'ACKNOWLEDGED';
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

export class SecurityAlertingSystem extends EventEmitter {
  private channels: Map<string, AlertChannel> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private escalationQueue: Alert[] = [];
  private failureRetryTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.setupDefaultChannels();
    this.setupDefaultRules();
    this.startEscalationProcessor();
    this.startRetryProcessor();
  }

  /**
   * Process security incident and trigger alerts
   */
  async processSecurityIncident(incident: SecurityIncident): Promise<void> {
    // Find matching rules
    const matchingRules = this.findMatchingRules(incident);

    for (const rule of matchingRules) {
      if (!rule.enabled) continue;

      // Create alert
      const alert: Alert = {
        id: this.generateAlertId(),
        timestamp: new Date(),
        incident,
        rule: rule.id,
        severity: incident.severity,
        channels: rule.actions.channels,
        status: 'PENDING',
        attempts: 0
      };

      this.alerts.set(alert.id, alert);

      // Send alert to channels
      await this.sendAlert(alert);

      // Handle auto-actions
      if (rule.actions.autoBlock) {
        this.executeAutoBlock(incident);
      }

      if (rule.actions.quarantine) {
        this.executeQuarantine(incident);
      }

      if (rule.actions.escalation) {
        this.scheduleEscalation(alert);
      }
    }
  }

  /**
   * Send alert to configured channels
   */
  async sendAlert(alert: Alert): Promise<void> {
    alert.attempts++;
    alert.lastAttempt = new Date();

    const sendPromises = alert.channels.map(channelId =>
      this.sendToChannel(channelId, alert)
    );

    try {
      await Promise.allSettled(sendPromises);
      alert.status = 'SENT';
      console.log(`Alert ${alert.id} sent successfully`);
    } catch (error) {
      alert.status = 'FAILED';
      alert.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to send alert ${alert.id}:`, error);

      // Schedule retry if within retry limit
      if (alert.attempts < 3) {
        this.scheduleRetry(alert);
      }
    }
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(channelId: string, alert: Alert): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel || !channel.enabled) {
      throw new Error(`Channel ${channelId} not found or disabled`);
    }

    // Check rate limiting
    if (!this.checkRateLimit(channel)) {
      throw new Error(`Rate limit exceeded for channel ${channelId}`);
    }

    const message = this.formatAlertMessage(alert, channel.type);

    switch (channel.type) {
      case 'SLACK':
        await this.sendToSlack(channel, message);
        break;
      case 'EMAIL':
        await this.sendToEmail(channel, message);
        break;
      case 'PAGERDUTY':
        await this.sendToPagerDuty(channel, alert);
        break;
      case 'WEBHOOK':
        await this.sendToWebhook(channel, alert);
        break;
      case 'SMS':
        await this.sendToSMS(channel, message);
        break;
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }

    // Update rate limit counters
    this.updateRateLimit(channel);
  }

  /**
   * Send alert to Slack
   */
  private async sendToSlack(channel: AlertChannel, message: any): Promise<void> {
    if (!channel.config.url) {
      throw new Error('Slack webhook URL not configured');
    }

    const payload = {
      username: 'Security Monitor',
      icon_emoji: ':warning:',
      attachments: [{
        color: this.getSeverityColor(message.severity),
        title: `🚨 Security Alert: ${message.title}`,
        text: message.description,
        fields: [
          { title: 'Severity', value: message.severity, short: true },
          { title: 'Source IP', value: message.sourceIP, short: true },
          { title: 'Endpoint', value: message.endpoint, short: true },
          { title: 'Time', value: message.timestamp, short: true }
        ],
        footer: 'Must Be Viral Security',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    const response = await fetch(channel.config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send alert to email
   */
  private async sendToEmail(channel: AlertChannel, message: any): Promise<void> {
    // In production, use proper email service (SendGrid, SES, etc.)
    console.log('📧 EMAIL ALERT:', {
      to: channel.config.recipients,
      subject: `Security Alert: ${message.title}`,
      body: this.formatEmailBody(message)
    });

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send alert to PagerDuty
   */
  private async sendToPagerDuty(channel: AlertChannel, alert: Alert): Promise<void> {
    if (!channel.config.token) {
      throw new Error('PagerDuty integration key not configured');
    }

    const payload = {
      routing_key: channel.config.token,
      event_action: 'trigger',
      dedup_key: `security-incident-${alert.incident.id}`,
      payload: {
        summary: `Security Incident: ${alert.incident.vulnerability}`,
        severity: alert.severity.toLowerCase(),
        source: 'Must Be Viral Security Monitor',
        component: 'Security System',
        group: 'Security',
        class: alert.incident.vulnerability,
        custom_details: {
          incident_id: alert.incident.id,
          source_ip: alert.incident.source.ip,
          endpoint: alert.incident.attack.endpoint,
          attack_type: alert.incident.attack.type,
          confidence: alert.incident.detection.confidence
        }
      }
    };

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`PagerDuty API error: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send alert to webhook
   */
  private async sendToWebhook(channel: AlertChannel, alert: Alert): Promise<void> {
    if (!channel.config.url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      alert_id: alert.id,
      timestamp: alert.timestamp.toISOString(),
      severity: alert.severity,
      incident: {
        id: alert.incident.id,
        vulnerability: alert.incident.vulnerability,
        source: alert.incident.source,
        attack: alert.incident.attack,
        detection: alert.incident.detection
      }
    };

    const response = await fetch(channel.config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Security-Alert': 'true',
        'X-Source': 'MustBeViral-Security'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send alert via SMS
   */
  private async sendToSMS(channel: AlertChannel, message: any): Promise<void> {
    // In production, use SMS service (Twilio, AWS SNS, etc.)
    console.log('📱 SMS ALERT:', {
      to: channel.config.recipients,
      message: `🚨 Security Alert: ${message.title} - ${message.severity} severity incident detected at ${message.timestamp}`
    });

    // Simulate SMS sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Format alert message for different channel types
   */
  private formatAlertMessage(alert: Alert, channelType: string): any {
    const incident = alert.incident;

    const baseMessage = {
      title: `${incident.vulnerability} Attack Detected`,
      description: `A ${incident.severity} severity security incident has been detected`,
      severity: incident.severity,
      sourceIP: incident.source.ip,
      endpoint: incident.attack.endpoint,
      attackType: incident.attack.type,
      confidence: incident.detection.confidence,
      timestamp: incident.timestamp.toISOString(),
      incidentId: incident.id
    };

    switch (channelType) {
      case 'SLACK':
        return baseMessage;
      case 'EMAIL':
        return {
          ...baseMessage,
          htmlBody: this.formatEmailBody(baseMessage)
        };
      default:
        return baseMessage;
    }
  }

  /**
   * Format email body
   */
  private formatEmailBody(message: any): string {
    return `
      <h2>🚨 Security Alert: ${message.title}</h2>
      <p><strong>Severity:</strong> ${message.severity}</p>
      <p><strong>Source IP:</strong> ${message.sourceIP}</p>
      <p><strong>Endpoint:</strong> ${message.endpoint}</p>
      <p><strong>Attack Type:</strong> ${message.attackType}</p>
      <p><strong>Detection Confidence:</strong> ${(message.confidence * 100).toFixed(1)}%</p>
      <p><strong>Time:</strong> ${message.timestamp}</p>
      <p><strong>Incident ID:</strong> ${message.incidentId}</p>

      <h3>Description</h3>
      <p>${message.description}</p>

      <h3>Recommended Actions</h3>
      <ul>
        <li>Review the incident details in the security dashboard</li>
        <li>Investigate the source IP for additional suspicious activity</li>
        <li>Consider blocking the source if confirmed malicious</li>
        <li>Update security rules if this represents a new attack pattern</li>
      </ul>
    `;
  }

  /**
   * Check rate limiting for channel
   */
  private checkRateLimit(channel: AlertChannel): boolean {
    const now = Date.now();
    const timeWindow = channel.rateLimit.timeWindow;

    // Reset counter if time window has passed
    if (now - channel.rateLimit.lastSent > timeWindow) {
      channel.rateLimit.count = 0;
      channel.rateLimit.lastSent = now;
    }

    return channel.rateLimit.count < channel.rateLimit.maxAlerts;
  }

  /**
   * Update rate limit counters
   */
  private updateRateLimit(channel: AlertChannel): void {
    channel.rateLimit.count++;
    channel.rateLimit.lastSent = Date.now();
  }

  /**
   * Find matching alert rules for incident
   */
  private findMatchingRules(incident: SecurityIncident): AlertRule[] {
    const matchingRules: AlertRule[] = [];

    for (const rule of this.rules.values()) {
      // Check vulnerability type match
      if (rule.conditions.vulnerabilityTypes.length > 0 &&
          !rule.conditions.vulnerabilityTypes.includes(incident.vulnerability)) {
        continue;
      }

      // Check severity level match
      if (rule.conditions.severityLevels.length > 0 &&
          !rule.conditions.severityLevels.includes(incident.severity)) {
        continue;
      }

      // Check frequency threshold (simplified - in production would track frequency)
      // For now, always match if other conditions are met

      matchingRules.push(rule);
    }

    return matchingRules;
  }

  /**
   * Execute automatic blocking
   */
  private executeAutoBlock(incident: SecurityIncident): void {
    console.log(`🔒 AUTO-BLOCKING IP: ${incident.source.ip} due to ${incident.vulnerability}`);

    // In production, integrate with firewall/load balancer
    this.emit('auto-block', {
      ip: incident.source.ip,
      reason: incident.vulnerability,
      duration: 3600000 // 1 hour
    });
  }

  /**
   * Execute quarantine
   */
  private executeQuarantine(incident: SecurityIncident): void {
    console.log(`⚠️ QUARANTINING IP: ${incident.source.ip} due to ${incident.vulnerability}`);

    this.emit('quarantine', {
      ip: incident.source.ip,
      reason: incident.vulnerability,
      duration: 1800000 // 30 minutes
    });
  }

  /**
   * Schedule escalation
   */
  private scheduleEscalation(alert: Alert): void {
    // Add to escalation queue with delay
    setTimeout(() => {
      if (alert.status !== 'ACKNOWLEDGED') {
        this.escalationQueue.push(alert);
      }
    }, 300000); // 5 minutes
  }

  /**
   * Schedule retry for failed alert
   */
  private scheduleRetry(alert: Alert): void {
    const delay = Math.pow(2, alert.attempts) * 60000; // Exponential backoff

    setTimeout(() => {
      if (alert.status === 'FAILED') {
        this.sendAlert(alert);
      }
    }, delay);
  }

  /**
   * Get severity color for UI/Slack
   */
  private getSeverityColor(severity: string): string {
    const colors = {
      'CRITICAL': '#FF0000',
      'HIGH': '#FF8000',
      'MEDIUM': '#FFFF00',
      'LOW': '#00FF00'
    };
    return colors[severity as keyof typeof colors] || '#808080';
  }

  /**
   * Setup default alert channels
   */
  private setupDefaultChannels(): void {
    const defaultChannels: AlertChannel[] = [
      {
        id: 'slack-security',
        name: 'Security Team Slack',
        type: 'SLACK',
        config: {
          url: process.env.SLACK_SECURITY_WEBHOOK || '',
          threshold: 'MEDIUM'
        },
        enabled: !!process.env.SLACK_SECURITY_WEBHOOK,
        rateLimit: {
          maxAlerts: 10,
          timeWindow: 300000, // 5 minutes
          lastSent: 0,
          count: 0
        }
      },
      {
        id: 'email-security',
        name: 'Security Team Email',
        type: 'EMAIL',
        config: {
          recipients: ['security@mustbeviral.com'],
          threshold: 'HIGH'
        },
        enabled: true,
        rateLimit: {
          maxAlerts: 5,
          timeWindow: 600000, // 10 minutes
          lastSent: 0,
          count: 0
        }
      },
      {
        id: 'pagerduty-critical',
        name: 'PagerDuty Critical',
        type: 'PAGERDUTY',
        config: {
          token: process.env.PAGERDUTY_INTEGRATION_KEY || '',
          threshold: 'CRITICAL'
        },
        enabled: !!process.env.PAGERDUTY_INTEGRATION_KEY,
        rateLimit: {
          maxAlerts: 3,
          timeWindow: 900000, // 15 minutes
          lastSent: 0,
          count: 0
        }
      }
    ];

    defaultChannels.forEach(channel => {
      this.channels.set(channel.id, channel);
    });
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'critical-attacks',
        name: 'Critical Attack Detection',
        conditions: {
          vulnerabilityTypes: ['SQL_INJECTION', 'AUTH_BYPASS_ATTEMPT'],
          severityLevels: ['CRITICAL'],
          frequencyThreshold: 1,
          timeWindow: 60000
        },
        actions: {
          channels: ['slack-security', 'email-security', 'pagerduty-critical'],
          escalation: true,
          autoBlock: true,
          quarantine: true
        },
        enabled: true
      },
      {
        id: 'high-severity-attacks',
        name: 'High Severity Attack Detection',
        conditions: {
          vulnerabilityTypes: [],
          severityLevels: ['HIGH'],
          frequencyThreshold: 3,
          timeWindow: 300000
        },
        actions: {
          channels: ['slack-security', 'email-security'],
          escalation: true,
          autoBlock: false,
          quarantine: true
        },
        enabled: true
      },
      {
        id: 'authentication-issues',
        name: 'Authentication Security Issues',
        conditions: {
          vulnerabilityTypes: ['JWT_NONE_ALGORITHM', 'JWT_PATH_TRAVERSAL'],
          severityLevels: ['HIGH', 'CRITICAL'],
          frequencyThreshold: 1,
          timeWindow: 60000
        },
        actions: {
          channels: ['slack-security'],
          escalation: false,
          autoBlock: false,
          quarantine: false
        },
        enabled: true
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  /**
   * Start escalation processor
   */
  private startEscalationProcessor(): void {
    setInterval(() => {
      if (this.escalationQueue.length > 0) {
        const alert = this.escalationQueue.shift()!;
        console.log(`📈 ESCALATING ALERT: ${alert.id} - ${alert.incident.vulnerability}`);

        // Send escalation notification
        this.sendEscalationNotification(alert);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Start retry processor
   */
  private startRetryProcessor(): void {
    this.failureRetryTimer = setInterval(() => {
      const failedAlerts = Array.from(this.alerts.values())
        .filter(alert => alert.status === 'FAILED' && alert.attempts < 3);

      failedAlerts.forEach(alert => {
        this.sendAlert(alert);
      });
    }, 60000); // Check every minute
  }

  /**
   * Send escalation notification
   */
  private async sendEscalationNotification(alert: Alert): Promise<void> {
    const escalationMessage = {
      title: `ESCALATED: ${alert.incident.vulnerability}`,
      description: `Security incident ${alert.id} has been escalated due to lack of acknowledgment`,
      severity: 'CRITICAL',
      originalAlert: alert.id,
      escalationTime: new Date().toISOString()
    };

    // Send to all critical channels
    const criticalChannels = Array.from(this.channels.values())
      .filter(channel => channel.config.threshold === 'CRITICAL')
      .map(channel => channel.id);

    for (const channelId of criticalChannels) {
      try {
        await this.sendToChannel(channelId, {
          ...alert,
          channels: [channelId]
        });
      } catch (error) {
        console.error(`Failed to send escalation to channel ${channelId}:`, error);
      }
    }
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(): {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    acknowledged: number;
    channelStats: Array<{
      channel: string;
      sent: number;
      failed: number;
      rateLimited: number;
    }>;
  } {
    const alerts = Array.from(this.alerts.values());

    return {
      total: alerts.length,
      sent: alerts.filter(a => a.status === 'SENT').length,
      failed: alerts.filter(a => a.status === 'FAILED').length,
      pending: alerts.filter(a => a.status === 'PENDING').length,
      acknowledged: alerts.filter(a => a.status === 'ACKNOWLEDGED').length,
      channelStats: Array.from(this.channels.values()).map(channel => ({
        channel: channel.name,
        sent: 0, // Would track actual stats
        failed: 0,
        rateLimited: channel.rateLimit.count >= channel.rateLimit.maxAlerts ? 1 : 0
      }))
    };
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'ACKNOWLEDGED';
      console.log(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);
      return true;
    }
    return false;
  }

  /**
   * Shutdown alerting system
   */
  shutdown(): void {
    if (this.failureRetryTimer) {
      clearInterval(this.failureRetryTimer);
    }
    console.log('Security alerting system shutdown complete');
  }
}

// Export singleton instance
export const securityAlerting = new SecurityAlertingSystem();
export default securityAlerting;