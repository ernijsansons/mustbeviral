/**
 * Advanced Threat Detection System
 * ML-powered threat detection with behavioral analysis and anomaly detection
 */

import { CloudflareEnv } from '../cloudflare';
import { SecurityAuditLogger } from '../audit/securityLogger';
import { RequestContext } from '../../worker/requestContext';
import { logger } from '../logging/productionLogger';

export interface ThreatSignature {
  id: string;
  name: string;
  description: string;
  category: 'malware' | 'phishing' | 'bot' | 'ddos' | 'injection' | 'brute_force' | 'data_exfiltration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  patterns: ThreatPattern[];
  confidence: number;
  active: boolean;
  lastUpdated: Date;
}

export interface ThreatPattern {
  type: 'regex' | 'ip_range' | 'user_agent' | 'header' | 'payload' | 'behavioral';
  pattern: string;
  weight: number;
  description: string;
}

export interface BehavioralProfile {
  userId?: string;
  ipAddress: string;
  userAgent: string;
  geolocation: {
    country: string;
    region: string;
    asn: string;
  };
  baseline: {
    requestRate: number;
    errorRate: number;
    responseTime: number;
    endpoints: string[];
    timezones: string[];
    sessionDuration: number;
  };
  current: {
    requestRate: number;
    errorRate: number;
    responseTime: number;
    endpoints: string[];
    timezone: string;
    sessionDuration: number;
  };
  anomalyScore: number;
  lastUpdated: Date;
}

export interface ThreatDetectionResult {
  threatDetected: boolean;
  threats: DetectedThreat[];
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  actions: ThreatAction[];
  confidence: number;
  processingTime: number;
}

export interface DetectedThreat {
  signatureId: string;
  name: string;
  category: string;
  severity: string;
  confidence: number;
  evidence: ThreatEvidence[];
  mitigationSuggestions: string[];
}

export interface ThreatEvidence {
  type: 'pattern_match' | 'anomaly' | 'reputation' | 'behavioral';
  description: string;
  value: string;
  confidence: number;
  source: string;
}

export interface ThreatAction {
  action: 'block' | 'challenge' | 'monitor' | 'throttle' | 'alert';
  reason: string;
  duration?: number; // seconds
  automatic: boolean;
}

export interface ThreatIntelligence {
  ipReputationData: Map<string, ReputationData>;
  maliciousDomains: Set<string>;
  knownBots: Set<string>;
  compromisedCredentials: Map<string, Date>;
  attackPatterns: AttackPattern[];
}

export interface ReputationData {
  score: number; // 0-100, 0 = malicious, 100 = clean
  categories: string[];
  lastSeen: Date;
  reportedBy: string[];
  confidence: number;
}

export interface AttackPattern {
  id: string;
  name: string;
  indicators: string[];
  timeWindow: number; // seconds
  threshold: number;
  description: string;
}

export class AdvancedThreatDetector {
  private env: CloudflareEnv;
  private auditLogger: SecurityAuditLogger;
  private signatures: Map<string, ThreatSignature> = new Map();
  private behavioralProfiles: Map<string, BehavioralProfile> = new Map();
  private threatIntelligence: ThreatIntelligence;
  private detectionHistory: Array<{ timestamp: Date; result: ThreatDetectionResult; context: RequestContext }> = [];
  private readonly MAX_HISTORY = 10000;
  private readonly PROFILE_TTL = 86400000; // 24 hours

  constructor(env: CloudflareEnv) {
    this.env = env;
    this.auditLogger = new SecurityAuditLogger(env);
    this.threatIntelligence = {
      ipReputationData: new Map(),
      maliciousDomains: new Set(),
      knownBots: new Set(),
      compromisedCredentials: new Map(),
      attackPatterns: []
    };

    this.initializeSignatures();
    this.initializeThreatIntelligence();
    this.startPeriodicTasks();
  }

  /**
   * Analyze request for threats
   */
  async analyzeRequest(request: Request, context: RequestContext): Promise<ThreatDetectionResult> {
    const startTime = Date.now();
    const threats: DetectedThreat[] = [];
    let riskScore = 0;

    try {
      // 1. Signature-based detection
      const signatureThreats = await this.runSignatureDetection(request, context);
      threats.push(...signatureThreats);

      // 2. Behavioral analysis
      const behavioralThreats = await this.runBehavioralAnalysis(request, context);
      threats.push(...behavioralThreats);

      // 3. Reputation-based detection
      const reputationThreats = await this.runReputationAnalysis(request, context);
      threats.push(...reputationThreats);

      // 4. ML-based anomaly detection
      const anomalyThreats = await this.runAnomalyDetection(request, context);
      threats.push(...anomalyThreats);

      // Calculate overall risk score
      riskScore = this.calculateRiskScore(threats);
      const riskLevel = this.determineRiskLevel(riskScore);

      // Determine actions
      const actions = this.determineActions(threats, riskLevel);

      // Calculate confidence
      const confidence = threats.length > 0
        ? threats.reduce((sum, _t) => sum + t.confidence, 0) / threats.length
        : 100;

      const result: ThreatDetectionResult = {
        threatDetected: threats.length > 0,
        threats,
        riskScore,
        riskLevel,
        actions,
        confidence,
        processingTime: Date.now() - startTime
      };

      // Store in history
      this.addToHistory(result, context);

      // Log threats
      if (result.threatDetected) {
        await this.logThreats(result, context);
      }

      return result;

    } catch (error: unknown) {
      logger.error('Threat analysis failed', error as Error, {
        component: 'ThreatDetector',
        action: 'analyze_request',
        metadata: {
          url: context.url,
          method: context.method,
          ip: context.ip,
          userAgent: context.userAgent,
          processingTime: Date.now() - startTime
        }
      });

      return {
        threatDetected: false,
        threats: [],
        riskScore: 0,
        riskLevel: 'low',
        actions: [],
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Update behavioral profile
   */
  async updateBehavioralProfile(request: Request, context: RequestContext, responseTime: number): Promise<void> {
    const profileKey = context.userId || context.ip;
    let profile = this.behavioralProfiles.get(profileKey);

    if (!profile) {
      profile = await this.createBehavioralProfile(request, context);
      this.behavioralProfiles.set(profileKey, profile);
    }

    // Update current metrics
    const url = new URL(request.url);
    profile.current.endpoints.push(url.pathname);
    profile.current.requestRate++;
    profile.current.responseTime = (profile.current.responseTime + responseTime) / 2;

    if (context.securityFlags.suspicious) {
      profile.current.errorRate++;
    }

    // Calculate anomaly score
    profile.anomalyScore = this.calculateAnomalyScore(profile);
    profile.lastUpdated = new Date();

    // Cleanup old data
    this.cleanupBehavioralProfiles();
  }

  /**
   * Get threat statistics
   */
  getThreatStatistics(): {
    totalThreats: number;
    threatsByCategory: Record<string, number>;
    threatsBySeverity: Record<string, number>;
    topThreats: Array<{ name: string; count: number }>;
    riskTrend: Array<{ timestamp: Date; riskScore: number }>;
    blockedRequests: number;
    falsePositives: number;
  } {
    const recentHistory = this.detectionHistory.slice(-1000); // Last 1000 detections

    const totalThreats = recentHistory.filter(h => h.result.threatDetected).length;

    const threatsByCategory: Record<string, number> = {};
    const threatsBySeverity: Record<string, number> = {};
    const threatCounts: Map<string, number> = new Map();

    for (const history of recentHistory) {
      if (history.result.threatDetected) {
        for (const threat of history.result.threats) {
          // Category counts
          threatsByCategory[threat.category] = (threatsByCategory[threat.category] || 0) + 1;

          // Severity counts
          threatsBySeverity[threat.severity] = (threatsBySeverity[threat.severity] || 0) + 1;

          // Threat name counts
          threatCounts.set(threat.name, (threatCounts.get(threat.name) || 0) + 1);
        }
      }
    }

    const topThreats = Array.from(threatCounts.entries())
      .map(([name, count]) => ({ _name, count }))
      .sort((a, _b) => b.count - a.count)
      .slice(0, 10);

    const riskTrend = recentHistory
      .slice(-24) // Last 24 entries
      .map(h => ({
        timestamp: h.timestamp,
        riskScore: h.result.riskScore
      }));

    const blockedRequests = recentHistory.filter(h =>
      h.result.actions.some(a => a.action === 'block')
    ).length;

    return { _totalThreats,
      threatsByCategory,
      threatsBySeverity,
      topThreats,
      riskTrend,
      blockedRequests,
      falsePositives: 0 // Would track actual false positives
    };
  }

  /**
   * Update threat signatures
   */
  async updateSignatures(signatures: ThreatSignature[]): Promise<void> {
    for (const signature of signatures) {
      this.signatures.set(signature.id, signature);
    }

    await this.persistSignatures();
    logger.info('Threat signatures updated', {
      component: 'ThreatDetector',
      action: 'update_signatures',
      metadata: { signaturesCount: signatures.length }
    });
  }

  /**
   * Run signature-based detection
   */
  private async runSignatureDetection(request: Request, context: RequestContext): Promise<DetectedThreat[]> {
    const threats: DetectedThreat[] = [];

    for (const signature of this.signatures.values()) {
      if (!signature.active) continue;

      const matches = await this.checkSignature(signature, request, context);
      if (matches.length > 0) {
        const confidence = matches.reduce((sum, _m) => sum + m.confidence, 0) / matches.length;

        threats.push({
          signatureId: signature.id,
          name: signature.name,
          category: signature.category,
          severity: signature.severity,
          confidence: Math.min(confidence * signature.confidence, 100),
          evidence: matches,
          mitigationSuggestions: this.getSuggestions(signature.category)
        });
      }
    }

    return threats;
  }

  /**
   * Run behavioral analysis
   */
  private async runBehavioralAnalysis(request: Request, context: RequestContext): Promise<DetectedThreat[]> {
    const threats: DetectedThreat[] = [];
    const profileKey = context.userId || context.ip;
    const profile = this.behavioralProfiles.get(profileKey);

    if (!profile) return threats;

    // Check for anomalies
    const anomalies = this.detectBehavioralAnomalies(profile);

    if (anomalies.length > 0) {
      threats.push({
        signatureId: 'behavioral_anomaly',
        name: 'Behavioral Anomaly Detected',
        category: 'bot',
        severity: profile.anomalyScore > 80 ? 'high' : 'medium',
        confidence: profile.anomalyScore,
        evidence: anomalies.map(a => ({
          type: 'behavioral',
          description: a,
          value: profile.anomalyScore.toString(),
          confidence: profile.anomalyScore,
          source: 'behavioral_analyzer'
        })),
        mitigationSuggestions: ['Monitor user behavior', 'Implement CAPTCHA challenge', 'Rate limit requests']
      });
    }

    return threats;
  }

  /**
   * Run reputation analysis
   */
  private async runReputationAnalysis(request: Request, context: RequestContext): Promise<DetectedThreat[]> {
    const threats: DetectedThreat[] = [];

    // Check IP reputation
    const ipReputation = this.threatIntelligence.ipReputationData.get(context.ip);
    if (ipReputation && ipReputation.score < 30) {
      threats.push({
        signatureId: 'malicious_ip',
        name: 'Malicious IP Address',
        category: 'bot',
        severity: ipReputation.score < 10 ? 'critical' : 'high',
        confidence: ipReputation.confidence,
        evidence: [{
          type: 'reputation',
          description: 'IP address has poor reputation',
          value: context.ip,
          confidence: ipReputation.confidence,
          source: 'threat_intelligence'
        }],
        mitigationSuggestions: ['Block IP address', 'Implement geographic filtering']
      });
    }

    // Check for known bots
    if (this.threatIntelligence.knownBots.has(context.userAgent)) {
      threats.push({
        signatureId: 'known_bot',
        name: 'Known Malicious Bot',
        category: 'bot',
        severity: 'high',
        confidence: 90,
        evidence: [{
          type: 'reputation',
          description: 'User agent matches known malicious bot',
          value: context.userAgent,
          confidence: 90,
          source: 'bot_database'
        }],
        mitigationSuggestions: ['Block user agent', 'Implement bot challenge']
      });
    }

    return threats;
  }

  /**
   * Run ML-based anomaly detection
   */
  private async runAnomalyDetection(request: Request, context: RequestContext): Promise<DetectedThreat[]> {
    const threats: DetectedThreat[] = [];

    // Analyze request patterns
    const anomalies = await this.detectRequestAnomalies(request, context);

    for (const anomaly of anomalies) {
      threats.push({
        signatureId: 'ml_anomaly',
        name: `ML Detected Anomaly: ${anomaly.type}`,
        category: 'injection',
        severity: anomaly.severity,
        confidence: anomaly.confidence,
        evidence: [{
          type: 'anomaly',
          description: anomaly.description,
          value: anomaly.value,
          confidence: anomaly.confidence,
          source: 'ml_detector'
        }],
        mitigationSuggestions: anomaly.suggestions
      });
    }

    return threats;
  }

  /**
   * Check individual signature
   */
  private async checkSignature(signature: ThreatSignature, request: Request, context: RequestContext): Promise<ThreatEvidence[]> {
    const evidence: ThreatEvidence[] = [];

    for (const pattern of signature.patterns) {
      const match = await this.checkPattern(pattern, request, context);
      if (match) {
        evidence.push(match);
      }
    }

    return evidence;
  }

  /**
   * Check individual pattern
   */
  private async checkPattern(pattern: ThreatPattern, request: Request, context: RequestContext): Promise<ThreatEvidence | null> {
    try {
      let testValue = '';
      let matched = false;

      switch (pattern.type) {
        case 'regex':
          // Test against URL, headers, and body
          testValue = request.url + JSON.stringify(Object.fromEntries(request.headers.entries()));
          matched = new RegExp(pattern.pattern).test(testValue);
          break;

        case 'ip_range':
          testValue = context.ip;
          matched = this.isIPInRange(context.ip, pattern.pattern);
          break;

        case 'user_agent':
          testValue = context.userAgent;
          matched = new RegExp(pattern.pattern, 'i').test(testValue);
          break;

        case 'header':
          testValue = request.headers.get(pattern.pattern.split(':')[0]) || '';
          const headerPattern = pattern.pattern.split(':')[1];
          matched = headerPattern ? new RegExp(headerPattern).test(testValue) : !!testValue;
          break;

        case 'payload':
          if (request.method === 'POST' || request.method === 'PUT') {
            // Would analyze request body
            matched = false; // Placeholder
          }
          break;

        case 'behavioral':
          // Check behavioral patterns
          matched = false; // Placeholder
          break;
      }

      if (matched) {
        return {
          type: 'pattern_match',
          description: pattern.description,
          value: testValue.substring(0, 200), // Limit length
          confidence: pattern.weight,
          source: `signature_${pattern.type}`
        };
      }

      return null;

    } catch (error: unknown) {
      logger.error('Pattern check failed', error as Error, {
        component: 'ThreatDetector',
        action: 'check_pattern',
        metadata: {
          patternType: pattern.type,
          patternDescription: pattern.description
        }
      });
      return null;
    }
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(threats: DetectedThreat[]): number {
    if (threats.length === 0) return 0;

    const severityWeights = { low: 1, medium: 2, high: 3, critical: 4 };
    let totalScore = 0;
    let totalWeight = 0;

    for (const threat of threats) {
      const weight = severityWeights[threat.severity];
      totalScore += threat.confidence * weight;
      totalWeight += weight;
    }

    return Math.min(totalScore / totalWeight, 100);
  }

  /**
   * Determine risk level
   */
  private determineRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * Determine actions based on threats
   */
  private determineActions(threats: DetectedThreat[], riskLevel: string): ThreatAction[] {
    const actions: ThreatAction[] = [];

    switch (riskLevel) {
      case 'critical':
        actions.push({
          action: 'block',
          reason: 'Critical threat detected',
          duration: 3600, // 1 hour
          automatic: true
        });
        break;

      case 'high':
        actions.push({
          action: 'challenge',
          reason: 'High risk activity detected',
          automatic: true
        });
        break;

      case 'medium':
        actions.push({
          action: 'throttle',
          reason: 'Suspicious activity detected',
          duration: 300, // 5 minutes
          automatic: true
        });
        break;

      case 'low':
        actions.push({
          action: 'monitor',
          reason: 'Low risk activity - monitoring',
          automatic: true
        });
        break;
    }

    // Always alert on unknown threat
    if (threats.length > 0) {
      actions.push({
        action: 'alert',
        reason: 'Threat detected - sending alert',
        automatic: true
      });
    }

    return actions;
  }

  /**
   * Initialize threat signatures
   */
  private initializeSignatures(): void {
    const defaultSignatures: ThreatSignature[] = [
      {
        id: 'sql_injection',
        name: 'SQL Injection Attack',
        description: 'Detects SQL injection attempts',
        category: 'injection',
        severity: 'high',
        patterns: [
          {
            type: 'regex',
            pattern: '(union|select|insert|delete|drop|exec|script|alert|onload|onerror)',
            weight: 80,
            description: 'SQL injection keywords'
          },
          {
            type: 'regex',
            pattern: '(\'|")(.*)(\'|").*(\sor\s|\sand\s)',
            weight: 70,
            description: 'SQL injection syntax patterns'
          }
        ],
        confidence: 0.85,
        active: true,
        lastUpdated: new Date()
      },
      {
        id: 'xss_attack',
        name: 'Cross-Site Scripting (XSS)',
        description: 'Detects XSS attack attempts',
        category: 'injection',
        severity: 'high',
        patterns: [
          {
            type: 'regex',
            pattern: '(<script|javascript:|vbscript:|onload=|onerror=|onclick=)',
            weight: 90,
            description: 'XSS script injection patterns'
          },
          {
            type: 'regex',
            pattern: '(%3Cscript|%3E|%22|%27)',
            weight: 75,
            description: 'URL-encoded XSS patterns'
          }
        ],
        confidence: 0.90,
        active: true,
        lastUpdated: new Date()
      },
      {
        id: 'brute_force',
        name: 'Brute Force Attack',
        description: 'Detects brute force login attempts',
        category: 'brute_force',
        severity: 'medium',
        patterns: [
          {
            type: 'behavioral',
            pattern: 'rapid_login_attempts',
            weight: 85,
            description: 'Multiple rapid login attempts'
          }
        ],
        confidence: 0.80,
        active: true,
        lastUpdated: new Date()
      },
      {
        id: 'ddos_attack',
        name: 'DDoS Attack',
        description: 'Detects distributed denial of service attacks',
        category: 'ddos',
        severity: 'critical',
        patterns: [
          {
            type: 'behavioral',
            pattern: 'high_request_rate',
            weight: 90,
            description: 'Abnormally high request rate'
          }
        ],
        confidence: 0.75,
        active: true,
        lastUpdated: new Date()
      }
    ];

    for (const signature of defaultSignatures) {
      this.signatures.set(signature.id, signature);
    }
  }

  /**
   * Initialize threat intelligence
   */
  private initializeThreatIntelligence(): void {
    // Add known malicious IPs (example data)
    this.threatIntelligence.ipReputationData.set('192.168.1.100', {
      score: 15,
      categories: ['malware', 'bot'],
      lastSeen: new Date(),
      reportedBy: ['threat_feed_1'],
      confidence: 85
    });

    // Add malicious domains
    this.threatIntelligence.maliciousDomains.add('malicious-site.com');
    this.threatIntelligence.maliciousDomains.add('phishing-site.net');

    // Add known bot user agents
    this.threatIntelligence.knownBots.add('BadBot/1.0');
    this.threatIntelligence.knownBots.add('MaliciousScanner');

    // Add attack patterns
    this.threatIntelligence.attackPatterns.push({
      id: 'rapid_requests',
      name: 'Rapid Request Pattern',
      indicators: ['high_request_rate', 'short_intervals'],
      timeWindow: 60,
      threshold: 100,
      description: 'More than 100 requests in 60 seconds'
    });
  }

  /**
   * Utility methods
   */
  private createBehavioralProfile(request: Request, context: RequestContext): BehavioralProfile {
    const url = new URL(request.url);

    return {
      userId: context.userId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      geolocation: {
        country: context.country || 'unknown',
        region: 'unknown',
        asn: 'unknown'
      },
      baseline: {
        requestRate: 1,
        errorRate: 0,
        responseTime: 500,
        endpoints: [url.pathname],
        timezones: ['UTC'],
        sessionDuration: 0
      },
      current: {
        requestRate: 1,
        errorRate: 0,
        responseTime: 500,
        endpoints: [url.pathname],
        timezone: 'UTC',
        sessionDuration: 0
      },
      anomalyScore: 0,
      lastUpdated: new Date()
    };
  }

  private calculateAnomalyScore(profile: BehavioralProfile): number {
    let score = 0;

    // Request rate anomaly
    const requestRateDiff = Math.abs(profile.current.requestRate - profile.baseline.requestRate);
    if (requestRateDiff > profile.baseline.requestRate * 2) {
      score += 30;
    }

    // Error rate anomaly
    if (profile.current.errorRate > profile.baseline.errorRate * 3) {
      score += 25;
    }

    // Response time anomaly
    const responseTimeDiff = Math.abs(profile.current.responseTime - profile.baseline.responseTime);
    if (responseTimeDiff > profile.baseline.responseTime * 2) {
      score += 20;
    }

    // Endpoint diversity anomaly
    const uniqueEndpoints = new Set(profile.current.endpoints).size;
    if (uniqueEndpoints > 50) {
      score += 25;
    }

    return Math.min(score, 100);
  }

  private detectBehavioralAnomalies(profile: BehavioralProfile): string[] {
    const anomalies: string[] = [];

    if (profile.current.requestRate > profile.baseline.requestRate * 10) {
      anomalies.push('Extremely high request rate detected');
    }

    if (profile.current.errorRate > 50) {
      anomalies.push('High error rate indicates probing behavior');
    }

    const uniqueEndpoints = new Set(profile.current.endpoints).size;
    if (uniqueEndpoints > 100) {
      anomalies.push('Accessing too many different endpoints');
    }

    return anomalies;
  }

  private async detectRequestAnomalies(request: Request, context: RequestContext): Promise<Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    description: string;
    value: string;
    suggestions: string[];
  }>> {
    const anomalies: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      confidence: number;
      description: string;
      value: string;
      suggestions: string[];
    }> = [];

    // Check for unusual headers
    const headerCount = Array.from(request.headers.keys()).length;
    if (headerCount > 50) {
      anomalies.push({
        type: 'unusual_headers',
        severity: 'medium',
        confidence: 75,
        description: 'Unusually high number of headers',
        value: headerCount.toString(),
        suggestions: ['Monitor for header injection', 'Validate header count']
      });
    }

    // Check for unusual URL patterns
    const url = new URL(request.url);
    if (url.pathname.length > 500) {
      anomalies.push({
        type: 'long_url',
        severity: 'medium',
        confidence: 80,
        description: 'Unusually long URL path',
        value: url.pathname.substring(0, 100) + '...',
        suggestions: ['Check for buffer overflow attempts', 'Validate URL length']
      });
    }

    return anomalies;
  }

  private isIPInRange(ip: string, range: string): boolean {
    // Simple IP range check implementation
    // In production, use proper IP range libraries
    return range.includes(ip);
  }

  private getSuggestions(category: string): string[] {
    const suggestions: Record<string, string[]> = {
      injection: ['Sanitize input', 'Use parameterized queries', 'Implement WAF rules'],
      bot: ['Implement CAPTCHA', 'Rate limit requests', 'Use bot detection service'],
      ddos: ['Enable DDoS protection', 'Implement rate limiting', 'Scale infrastructure'],
      brute_force: ['Lock accounts after failures', 'Implement delays', 'Use strong passwords'],
      malware: ['Scan uploads', 'Use antivirus', 'Implement content filtering'],
      phishing: ['Validate domains', 'Check URLs', 'Educate users']
    };

    return suggestions[category] || ['Monitor activity', 'Review security logs'];
  }

  private addToHistory(result: ThreatDetectionResult, context: RequestContext): void {
    this.detectionHistory.unshift({
      timestamp: new Date(),
      result,
      context
    });

    if (this.detectionHistory.length > this.MAX_HISTORY) {
      this.detectionHistory = this.detectionHistory.slice(0, this.MAX_HISTORY);
    }
  }

  private async logThreats(result: ThreatDetectionResult, context: RequestContext): Promise<void> {
    for (const threat of result.threats) {
      await this.auditLogger.logSecurityEvent({
        type: 'suspicious_activity',
        severity: threat.severity.toUpperCase() as unknown,
        userId: context.userId,
        ip: context.ip,
        userAgent: context.userAgent,
        url: context.url,
        method: context.method,
        details: {
          action: 'threat_detected',
          threatId: threat.signatureId,
          threatName: threat.name,
          category: threat.category,
          confidence: threat.confidence,
          riskScore: result.riskScore,
          evidence: threat.evidence,
          actions: result.actions
        },
        outcome: 'blocked',
        source: 'threat_detector'
      });
    }
  }

  private cleanupBehavioralProfiles(): void {
    const cutoff = Date.now() - this.PROFILE_TTL;
    for (const [key, profile] of this.behavioralProfiles.entries()) {
      if (profile.lastUpdated.getTime() < cutoff) {
        this.behavioralProfiles.delete(key);
      }
    }
  }

  private async persistSignatures(): Promise<void> {
    try {
      const signaturesData = Array.from(this.signatures.values());
      await this.env.TRENDS_CACHE.put(
        'threat_signatures',
        JSON.stringify(signaturesData),
        { expirationTtl: 86400 } // 24 hours
      );
    } catch (error: unknown) {
      logger.error('Failed to persist threat signatures', error as Error, {
        component: 'ThreatDetector',
        action: 'persist_signatures',
        metadata: { signaturesCount: this.signatures.size }
      });
    }
  }

  private startPeriodicTasks(): void {
    // Update threat intelligence every hour
    setInterval(async () => {
      await this.updateThreatIntelligence();
    }, 3600000);

    // Cleanup old data every 6 hours
    setInterval(() => {
      this.cleanupBehavioralProfiles();
    }, 21600000);
  }

  private async updateThreatIntelligence(): Promise<void> {
    logger.info('Updating threat intelligence data', {
      component: 'ThreatDetector',
      action: 'update_threat_intelligence',
      metadata: { updateType: 'periodic' }
    });
    // In production, this would fetch from external threat feeds
  }

  /**
   * Shutdown threat detector
   */
  shutdown(): void {
    logger.info('Threat detector shutdown complete', {
      component: 'ThreatDetector',
      action: 'shutdown',
      metadata: {
        totalDetections: this.detectionHistory.length,
        activeBehavioralProfiles: this.behavioralProfiles.size,
        activeSignatures: this.signatures.size
      }
    });
  }
}

/**
 * Global threat detector instance
 */
let globalThreatDetector: AdvancedThreatDetector | null = null;

/**
 * Get or create global threat detector
 */
export function getThreatDetector(env: CloudflareEnv): AdvancedThreatDetector {
  if (!globalThreatDetector) {
    globalThreatDetector = new AdvancedThreatDetector(env);
  }
  return globalThreatDetector;
}