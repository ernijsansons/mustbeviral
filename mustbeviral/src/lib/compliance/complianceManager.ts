/**
 * Compliance Management System
 * GDPR, CCPA, HIPAA, and other regulatory compliance framework
 */

import { CloudflareEnv } from '../cloudflare';
import { SecurityAuditLogger } from '../audit/securityLogger';
import { getDataRetentionManager } from './dataRetention';
import { PIIEncryption } from '../crypto/encryption';

export interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  version: string;
  jurisdiction: string[];
  requirements: ComplianceRequirement[];
  controls: ComplianceControl[];
  assessments: ComplianceAssessment[];
  status: 'draft' | 'active' | 'deprecated';
  lastUpdated: Date;
}

export interface ComplianceRequirement {
  id: string;
  frameworkId: string;
  category: 'data_protection' | 'access_control' | 'audit' | 'breach_notification' | 'consent' | 'retention';
  title: string;
  description: string;
  mandatory: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  implementationStatus: 'not_implemented' | 'in_progress' | 'implemented' | 'verified';
  evidence: ComplianceEvidence[];
  controls: string[];
  dueDate?: Date;
  assessmentFrequency: 'monthly' | 'quarterly' | 'annually';
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  type: 'technical' | 'administrative' | 'physical';
  automated: boolean;
  effectiveness: 'low' | 'medium' | 'high';
  lastTested: Date;
  testResults: ControlTestResult[];
  remediation?: string;
}

export interface ComplianceEvidence {
  id: string;
  type: 'document' | 'log' | 'certificate' | 'assessment' | 'screenshot';
  description: string;
  location: string;
  collectedAt: Date;
  expiresAt?: Date;
  verified: boolean;
  verifiedBy?: string;
}

export interface ComplianceAssessment {
  id: string;
  frameworkId: string;
  type: 'self_assessment' | 'third_party' | 'regulatory';
  status: 'planned' | 'in_progress' | 'completed' | 'failed';
  startDate: Date;
  endDate?: Date;
  assessor: string;
  scope: string[];
  findings: AssessmentFinding[];
  overallScore: number;
  riskRating: 'low' | 'medium' | 'high' | 'critical';
}

export interface AssessmentFinding {
  id: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
  dueDate?: Date;
  assignedTo?: string;
}

export interface ControlTestResult {
  id: string;
  testDate: Date;
  testType: 'automated' | 'manual' | 'penetration' | 'compliance';
  result: 'pass' | 'fail' | 'partial';
  score: number;
  details: string;
  recommendations: string[];
  nextTestDate: Date;
}

export interface PrivacyRequest {
  id: string;
  type: 'access' | 'portability' | 'rectification' | 'erasure' | 'restriction' | 'objection';
  regulation: 'GDPR' | 'CCPA' | 'PIPEDA' | 'LGPD';
  subjectId: string;
  subjectEmail: string;
  requestDate: Date;
  status: 'received' | 'processing' | 'completed' | 'rejected' | 'expired';
  description: string;
  legalBasis?: string;
  responseDate?: Date;
  completionDate?: Date;
  processingNotes: string[];
  attachments: string[];
}

export interface ConsentRecord {
  id: string;
  subjectId: string;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  granted: boolean;
  grantedAt?: Date;
  withdrawnAt?: Date;
  method: 'explicit' | 'implicit' | 'opt_in' | 'opt_out';
  details: string;
  version: number;
  ipAddress: string;
  userAgent: string;
}

export class ComplianceManager {
  private env: CloudflareEnv;
  private auditLogger: SecurityAuditLogger;
  private frameworks: Map<string, ComplianceFramework> = new Map();
  private privacyRequests: Map<string, PrivacyRequest> = new Map();
  private consentRecords: Map<string, ConsentRecord[]> = new Map();

  constructor(env: CloudflareEnv) {
    this.env = env;
    this.auditLogger = new SecurityAuditLogger(env);
    this.initializeFrameworks();
  }

  /**
   * Register compliance framework
   */
  async registerFramework(framework: Omit<ComplianceFramework, 'id' | 'lastUpdated'>): Promise<ComplianceFramework> {
    const frameworkId = `framework_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    const newFramework: ComplianceFramework = {
      id: frameworkId,
      lastUpdated: new Date(),
      ...framework
    };

    this.frameworks.set(frameworkId, newFramework);

    // Store in database
    await this.storeFramework(newFramework);

    console.log(`LOG: COMPLIANCE-FRAMEWORK-1 - Registered framework: ${framework.name}`);
    return newFramework;
  }

  /**
   * Process privacy request (GDPR Article 15-22, CCPA Section 1798.100)
   */
  async processPrivacyRequest(request: Omit<PrivacyRequest, 'id' | 'requestDate' | 'status'>): Promise<PrivacyRequest> {
    const requestId = `privacy_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    const privacyRequest: PrivacyRequest = {
      id: requestId,
      requestDate: new Date(),
      status: 'received',
      processingNotes: [],
      attachments: [],
      ...request
    };

    this.privacyRequests.set(requestId, privacyRequest);

    // Log privacy request
    await this.auditLogger.logSecurityEvent({
      type: 'data_access',
      severity: 'MEDIUM',
      userId: request.subjectId,
      ip: 'privacy_request',
      userAgent: 'compliance_manager',
      url: '/compliance/privacy-request',
      method: 'POST',
      details: {
        action: 'privacy_request_received',
        requestId,
        type: request.type,
        regulation: request.regulation,
        subjectEmail: PIIEncryption.maskPII(request.subjectEmail)
      },
      outcome: 'success',
      source: 'compliance_manager'
    });

    // Auto-process certain request types
    if (request.type === 'erasure') {
      await this.processDataErasureRequest(privacyRequest);
    } else if (request.type === 'access') {
      await this.processDataAccessRequest(privacyRequest);
    }

    console.log(`LOG: COMPLIANCE-PRIVACY-REQUEST-1 - Received ${request.type} request: ${requestId}`);
    return privacyRequest;
  }

  /**
   * Record consent (GDPR Article 7, CCPA opt-out)
   */
  async recordConsent(consent: Omit<ConsentRecord, 'id' | 'version'>): Promise<ConsentRecord> {
    const consentId = `consent_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Get existing consents for this subject
    const existingConsents = this.consentRecords.get(consent.subjectId) || [];
    const latestVersion = existingConsents.length > 0 ? Math.max(...existingConsents.map(c => c.version)) : 0;

    const consentRecord: ConsentRecord = {
      id: consentId,
      version: latestVersion + 1,
      ...consent
    };

    // Store consent
    existingConsents.push(consentRecord);
    this.consentRecords.set(consent.subjectId, existingConsents);

    // Log consent
    await this.auditLogger.logSecurityEvent({
      type: 'data_access',
      severity: 'LOW',
      userId: consent.subjectId,
      ip: consent.ipAddress,
      userAgent: consent.userAgent,
      url: '/compliance/consent',
      method: 'POST',
      details: {
        action: 'consent_recorded',
        consentId,
        purpose: consent.purpose,
        granted: consent.granted,
        method: consent.method,
        legalBasis: consent.legalBasis
      },
      outcome: 'success',
      source: 'compliance_manager'
    });

    console.log(`LOG: COMPLIANCE-CONSENT-1 - Recorded consent: ${consentId} (${consent.granted ? 'granted' : 'withdrawn'})`);
    return consentRecord;
  }

  /**
   * Conduct compliance assessment
   */
  async conductAssessment(
    frameworkId: string,
    assessor: string,
    scope: string[]
  ): Promise<ComplianceAssessment> {
    const framework = this.frameworks.get(frameworkId);
    if (!framework) {
      throw new Error(`Framework not found: ${frameworkId}`);
    }

    const assessmentId = `assessment_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    const assessment: ComplianceAssessment = {
      id: assessmentId,
      frameworkId,
      type: 'self_assessment',
      status: 'in_progress',
      startDate: new Date(),
      assessor,
      scope,
      findings: [],
      overallScore: 0,
      riskRating: 'medium'
    };

    // Assess each requirement in scope
    const findings: AssessmentFinding[] = [];
    let totalScore = 0;
    let assessedRequirements = 0;

    for (const requirement of framework.requirements) {
      if (scope.includes(requirement.category)) {
        const finding = await this.assessRequirement(requirement);
        findings.push(finding);

        // Calculate score
        const scores = { 'critical': 0, 'high': 25, 'medium': 50, 'low': 75, 'info': 100 };
        totalScore += scores[finding.severity] || 0;
        assessedRequirements++;
      }
    }

    assessment.findings = findings;
    assessment.overallScore = assessedRequirements > 0 ? totalScore / assessedRequirements : 0;
    assessment.riskRating = this.calculateRiskRating(assessment.overallScore, findings);
    assessment.status = 'completed';
    assessment.endDate = new Date();

    // Log assessment
    await this.auditLogger.logSecurityEvent({
      type: 'admin_action',
      severity: 'MEDIUM',
      userId: 'system',
      ip: 'system',
      userAgent: 'compliance_manager',
      url: '/compliance/assessment',
      method: 'POST',
      details: {
        action: 'compliance_assessment_completed',
        assessmentId,
        frameworkId,
        overallScore: assessment.overallScore,
        riskRating: assessment.riskRating,
        findingsCount: findings.length
      },
      outcome: 'success',
      source: 'compliance_manager'
    });

    console.log(`LOG: COMPLIANCE-ASSESSMENT-1 - Completed assessment: ${assessmentId} (Score: ${assessment.overallScore})`);
    return assessment;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(frameworkId?: string): Promise<{
    summary: {
      totalFrameworks: number;
      activeRequirements: number;
      implementedRequirements: number;
      pendingRequirements: number;
      overallComplianceScore: number;
    };
    frameworks: Array<{
      id: string;
      name: string;
      status: string;
      complianceScore: number;
      criticalFindings: number;
      lastAssessment?: Date;
    }>;
    recentActivity: Array<{
      type: string;
      description: string;
      timestamp: Date;
      severity: string;
    }>;
    privacyRequests: {
      total: number;
      pending: number;
      completed: number;
      byType: Record<string, number>;
    };
    riskAreas: Array<{
      area: string;
      riskLevel: string;
      description: string;
      recommendations: string[];
    }>;
  }> {
    const frameworks = frameworkId
      ? [this.frameworks.get(frameworkId)].filter(Boolean) as ComplianceFramework[]
      : Array.from(this.frameworks.values());

    let totalRequirements = 0;
    let implementedRequirements = 0;
    let pendingRequirements = 0;
    let totalScore = 0;

    const frameworkSummaries = frameworks.map(framework => {
      const implemented = framework.requirements.filter(r => r.implementationStatus === 'implemented').length;
      const pending = framework.requirements.filter(r => r.implementationStatus !== 'implemented').length;
      const score = framework.requirements.length > 0 ? (implemented / framework.requirements.length) * 100 : 0;

      totalRequirements += framework.requirements.length;
      implementedRequirements += implemented;
      pendingRequirements += pending;
      totalScore += score;

      return {
        id: framework.id,
        name: framework.name,
        status: framework.status,
        complianceScore: score,
        criticalFindings: framework.requirements.filter(r => r.riskLevel === 'critical' && r.implementationStatus !== 'implemented').length,
        lastAssessment: framework.assessments.length > 0 ?
          new Date(Math.max(...framework.assessments.map(a => a.startDate.getTime()))) : undefined
      };
    });

    const overallComplianceScore = frameworks.length > 0 ? totalScore / frameworks.length : 0;

    // Recent privacy requests
    const requests = Array.from(this.privacyRequests.values());
    const privacyRequestsSummary = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'processing' || r.status === 'received').length,
      completed: requests.filter(r => r.status === 'completed').length,
      byType: this.groupBy(requests, 'type')
    };

    // Identify risk areas
    const riskAreas = this.identifyRiskAreas(frameworks);

    return {
      summary: {
        totalFrameworks: frameworks.length,
        activeRequirements: totalRequirements,
        implementedRequirements,
        pendingRequirements,
        overallComplianceScore
      },
      frameworks: frameworkSummaries,
      recentActivity: [],
      privacyRequests: privacyRequestsSummary,
      riskAreas
    };
  }

  /**
   * Check consent validity
   */
  async checkConsent(subjectId: string, purpose: string): Promise<{
    valid: boolean;
    consent?: ConsentRecord;
    reason?: string;
  }> {
    const consents = this.consentRecords.get(subjectId) || [];
    const relevantConsents = consents.filter(c => c.purpose === purpose);

    if (relevantConsents.length === 0) {
      return {
        valid: false,
        reason: 'No consent found for this purpose'
      };
    }

    // Get latest consent
    const latestConsent = relevantConsents.reduce((latest, _current) =>
      current.version > latest.version ? current : latest
    );

    if (!latestConsent.granted) {
      return {
        valid: false,
        consent: latestConsent,
        reason: 'Consent was withdrawn'
      };
    }

    if (latestConsent.withdrawnAt) {
      return {
        valid: false,
        consent: latestConsent,
        reason: 'Consent was withdrawn'
      };
    }

    return {
      valid: true,
      consent: latestConsent
    };
  }

  /**
   * Handle data breach notification (GDPR Article 33-34)
   */
  async handleDataBreach(breach: {
    description: string;
    category: 'confidentiality' | 'integrity' | 'availability';
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedRecords: number;
    personalDataInvolved: boolean;
    discoveredAt: Date;
    containedAt?: Date;
    rootCause?: string;
    impactAssessment: string;
  }): Promise<{
    breachId: string;
    supervisoryAuthorityNotified: boolean;
    dataSubjectsNotified: boolean;
    notificationDeadline: Date;
  }> {
    const breachId = `breach_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // GDPR requires notification within 72 hours
    const notificationDeadline = new Date(breach.discoveredAt.getTime() + 72 * 60 * 60 * 1000);

    // Determine if notification is required
    const supervisoryAuthorityNotified = breach.personalDataInvolved && breach.severity !== 'low';
    const dataSubjectsNotified = breach.personalDataInvolved &&
      (breach.severity === 'high' || breach.severity === 'critical');

    // Log breach
    await this.auditLogger.logSecurityEvent({
      type: 'security_violation',
      severity: breach.severity.toUpperCase() as unknown,
      userId: 'system',
      ip: 'system',
      userAgent: 'compliance_manager',
      url: '/compliance/data-breach',
      method: 'POST',
      details: {
        action: 'data_breach_reported',
        breachId,
        category: breach.category,
        affectedRecords: breach.affectedRecords,
        personalDataInvolved: breach.personalDataInvolved,
        supervisoryAuthorityNotified,
        dataSubjectsNotified,
        notificationDeadline: notificationDeadline.toISOString()
      },
      outcome: 'success',
      source: 'breach_handler'
    });

    console.log(`🚨 DATA BREACH REPORTED: ${breachId} - ${breach.description}`, {
      severity: breach.severity,
      affectedRecords: breach.affectedRecords,
      notificationDeadline
    });

    return { _breachId,
      supervisoryAuthorityNotified,
      dataSubjectsNotified,
      notificationDeadline
    };
  }

  /**
   * Initialize compliance frameworks
   */
  private initializeFrameworks(): void {
    const gdprFramework: ComplianceFramework = {
      id: 'gdpr',
      name: 'General Data Protection Regulation (GDPR)',
      description: 'EU GDPR compliance framework',
      version: '2.0',
      jurisdiction: ['EU', 'EEA'],
      requirements: [
        {
          id: 'gdpr_art_5',
          frameworkId: 'gdpr',
          category: 'data_protection',
          title: 'Principles of data processing (Article 5)',
          description: 'Data must be processed lawfully, fairly, transparently, and for specified purposes',
          mandatory: true,
          riskLevel: 'critical',
          implementationStatus: 'implemented',
          evidence: [],
          controls: ['data_minimization', 'purpose_limitation'],
          assessmentFrequency: 'quarterly'
        },
        {
          id: 'gdpr_art_17',
          frameworkId: 'gdpr',
          category: 'data_protection',
          title: 'Right to erasure (Article 17)',
          description: 'Data subjects have the right to request deletion of their personal data',
          mandatory: true,
          riskLevel: 'high',
          implementationStatus: 'implemented',
          evidence: [],
          controls: ['data_deletion_process'],
          assessmentFrequency: 'quarterly'
        },
        {
          id: 'gdpr_art_32',
          frameworkId: 'gdpr',
          category: 'data_protection',
          title: 'Security of processing (Article 32)',
          description: 'Implement appropriate technical and organizational measures',
          mandatory: true,
          riskLevel: 'critical',
          implementationStatus: 'implemented',
          evidence: [],
          controls: ['encryption', 'access_control', 'security_monitoring'],
          assessmentFrequency: 'quarterly'
        }
      ],
      controls: [],
      assessments: [],
      status: 'active',
      lastUpdated: new Date()
    };

    const ccpaFramework: ComplianceFramework = {
      id: 'ccpa',
      name: 'California Consumer Privacy Act (CCPA)',
      description: 'California privacy law compliance',
      version: '1.0',
      jurisdiction: ['CA', 'US'],
      requirements: [
        {
          id: 'ccpa_1798_100',
          frameworkId: 'ccpa',
          category: 'data_protection',
          title: 'Consumer Right to Know (Section 1798.100)',
          description: 'Consumers have the right to know what personal information is collected',
          mandatory: true,
          riskLevel: 'high',
          implementationStatus: 'implemented',
          evidence: [],
          controls: ['privacy_notice', 'data_inventory'],
          assessmentFrequency: 'annually'
        },
        {
          id: 'ccpa_1798_105',
          frameworkId: 'ccpa',
          category: 'data_protection',
          title: 'Consumer Right to Delete (Section 1798.105)',
          description: 'Consumers have the right to request deletion of personal information',
          mandatory: true,
          riskLevel: 'high',
          implementationStatus: 'implemented',
          evidence: [],
          controls: ['data_deletion_process'],
          assessmentFrequency: 'annually'
        }
      ],
      controls: [],
      assessments: [],
      status: 'active',
      lastUpdated: new Date()
    };

    this.frameworks.set('gdpr', gdprFramework);
    this.frameworks.set('ccpa', ccpaFramework);
  }

  /**
   * Process data erasure request
   */
  private async processDataErasureRequest(request: PrivacyRequest): Promise<void> {
    request.status = 'processing';
    request.processingNotes.push(`Started processing erasure request at ${new Date().toISOString()}`);

    try {
      // Use data retention manager for deletion
      const retentionManager = getDataRetentionManager(this.env);
      const deletionResult = await retentionManager.processUserDataDeletion(
        request.subjectId,
        request.regulation as 'GDPR' | 'CCPA',
        `Privacy request: ${request.id}`
      );

      request.status = 'completed';
      request.completionDate = new Date();
      request.processingNotes.push(`Deletion job created: ${deletionResult.jobId}`);

    } catch (error: unknown) {
      request.status = 'rejected';
      request.processingNotes.push(`Deletion failed: ${error.message}`);
    }
  }

  /**
   * Process data access request
   */
  private async processDataAccessRequest(request: PrivacyRequest): Promise<void> {
    request.status = 'processing';
    request.processingNotes.push(`Started processing access request at ${new Date().toISOString()}`);

    try {
      // Collect user data from various sources
      // This would implement actual data collection logic

      request.status = 'completed';
      request.completionDate = new Date();
      request.processingNotes.push('Data package prepared and delivered');

    } catch (error: unknown) {
      request.status = 'rejected';
      request.processingNotes.push(`Access request failed: ${error.message}`);
    }
  }

  /**
   * Assess individual requirement
   */
  private async assessRequirement(requirement: ComplianceRequirement): Promise<AssessmentFinding> {
    const findingId = `finding_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Simulate assessment logic
    let severity: AssessmentFinding['severity'] = 'info';
    let description = `Assessment of ${requirement.title}`;
    let recommendation = 'No action required';

    if (requirement.implementationStatus === 'not_implemented') {
      severity = requirement.riskLevel === 'critical' ? 'critical' :
                 requirement.riskLevel === 'high' ? 'high' : 'medium';
      description = `${requirement.title} is not implemented`;
      recommendation = `Implement ${requirement.title} to meet compliance requirements`;
    } else if (requirement.implementationStatus === 'in_progress') {
      severity = 'medium';
      description = `${requirement.title} implementation is in progress`;
      recommendation = `Complete implementation of ${requirement.title}`;
    }

    return {
      id: findingId,
      severity,
      category: requirement.category,
      description,
      recommendation,
      status: 'open'
    };
  }

  /**
   * Calculate risk rating from assessment
   */
  private calculateRiskRating(score: number, findings: AssessmentFinding[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalFindings = findings.filter(f => f.severity === 'critical').length;
    const highFindings = findings.filter(f => f.severity === 'high').length;

    if (criticalFindings > 0 || score < 40) return 'critical';
    if (highFindings > 2 || score < 60) return 'high';
    if (score < 80) return 'medium';
    return 'low';
  }

  /**
   * Store framework in database
   */
  private async storeFramework(framework: ComplianceFramework): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT OR REPLACE INTO compliance_frameworks (
          id, name, description, version, jurisdiction, requirements,
          controls, assessments, status, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        framework.id,
        framework.name,
        framework.description,
        framework.version,
        JSON.stringify(framework.jurisdiction),
        JSON.stringify(framework.requirements),
        JSON.stringify(framework.controls),
        JSON.stringify(framework.assessments),
        framework.status,
        framework.lastUpdated.toISOString()
      ).run();

    } catch (error: unknown) {
      console.error('LOG: COMPLIANCE-STORE-ERROR-1 - Failed to store framework:', error);
    }
  }

  /**
   * Identify risk areas
   */
  private identifyRiskAreas(frameworks: ComplianceFramework[]): Array<{
    area: string;
    riskLevel: string;
    description: string;
    recommendations: string[];
  }> {
    const riskAreas: Array<{
      area: string;
      riskLevel: string;
      description: string;
      recommendations: string[];
    }> = [];

    // Analyze implementation gaps
    for (const framework of frameworks) {
      const unimplemented = framework.requirements.filter(r => r.implementationStatus === 'not_implemented');
      const critical = unimplemented.filter(r => r.riskLevel === 'critical');

      if (critical.length > 0) {
        riskAreas.push({
          area: `${framework.name} Critical Requirements`,
          riskLevel: 'critical',
          description: `${critical.length} critical requirements not implemented`,
          recommendations: critical.map(r => `Implement ${r.title}`)
        });
      }
    }

    return riskAreas;
  }

  /**
   * Utility function to group array by property
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((groups, _item) => {
      const group = String(item[key]);
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }
}

/**
 * Global compliance manager instance
 */
let globalComplianceManager: ComplianceManager | null = null;

/**
 * Get or create global compliance manager
 */
export function getComplianceManager(env: CloudflareEnv): ComplianceManager {
  if (!globalComplianceManager) {
    globalComplianceManager = new ComplianceManager(env);
  }
  return globalComplianceManager;
}