/**
 * Data Retention and Lifecycle Management
 * Automated data retention policies with compliance and audit features
 */

import { CloudflareEnv } from '../cloudflare';
import { SecurityAuditLogger } from '../audit/securityLogger';

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataTypes: string[];
  retentionPeriod: number; // days
  archivePeriod?: number; // days before archiving
  deletionMethod: 'soft' | 'hard' | 'anonymize';
  triggers: RetentionTrigger[];
  exceptions: RetentionException[];
  compliance: ComplianceRequirement[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetentionTrigger {
  type: 'time_based' | 'event_based' | 'user_action' | 'legal_hold';
  condition: string;
  value: unknown;
  description: string;
}

export interface RetentionException {
  type: 'legal_hold' | 'active_case' | 'regulatory_review' | 'user_dispute';
  condition: string;
  description: string;
  expiresAt?: Date;
}

export interface ComplianceRequirement {
  regulation: 'GDPR' | 'CCPA' | 'HIPAA' | 'SOX' | 'PCI_DSS' | 'CUSTOM';
  requirement: string;
  retentionPeriod: number;
  deletionRequired: boolean;
  auditRequired: boolean;
}

export interface DataCategory {
  name: string;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  personalData: boolean;
  financialData: boolean;
  healthData: boolean;
  defaultRetentionDays: number;
  encryptionRequired: boolean;
  auditTrailRequired: boolean;
}

export interface RetentionJob {
  id: string;
  policyId: string;
  dataType: string;
  action: 'archive' | 'delete' | 'anonymize';
  scheduledFor: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  recordsProcessed: number;
  recordsAffected: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  dryRun: boolean;
}

export interface RetentionReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    policiesExecuted: number;
    recordsProcessed: number;
    recordsDeleted: number;
    recordsArchived: number;
    recordsAnonymized: number;
    storageFreed: number; // bytes
  };
  byDataType: Record<string, {
    processed: number;
    deleted: number;
    archived: number;
    anonymized: number;
  }>;
  compliance: {
    gdprDeletions: number;
    ccpaDeletions: number;
    legalHolds: number;
    exceptions: number;
  };
  errors: Array<{
    jobId: string;
    error: string;
    recordsAffected: number;
  }>;
}

export class DataRetentionManager {
  private env: CloudflareEnv;
  private auditLogger: SecurityAuditLogger;
  private policies: Map<string, RetentionPolicy> = new Map();
  private dataCategories: Map<string, DataCategory> = new Map();
  private jobQueue: RetentionJob[] = [];
  private executionTimer?: unknown;

  constructor(env: CloudflareEnv) {
    this.env = env;
    this.auditLogger = new SecurityAuditLogger(env);
    this.initializeDefaultPolicies();
    this.initializeDataCategories();
    this.startJobProcessor();
  }

  /**
   * Create or update retention policy
   */
  async createPolicy(policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<RetentionPolicy> {
    const policyId = `policy_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    const newPolicy: RetentionPolicy = {
      id: policyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...policy
    };

    // Validate policy
    await this.validatePolicy(newPolicy);

    // Store policy
    this.policies.set(policyId, newPolicy);
    await this.storePolicyInDB(newPolicy);

    // Log policy creation
    await this.auditLogger.logSecurityEvent({
      type: 'admin_action',
      severity: 'MEDIUM',
      userId: 'system',
      ip: 'system',
      userAgent: 'retention_manager',
      url: '/data-retention/policy',
      method: 'POST',
      details: {
        action: 'create_retention_policy',
        policyId,
        dataTypes: policy.dataTypes,
        retentionPeriod: policy.retentionPeriod
      },
      outcome: 'success',
      source: 'retention_manager'
    });

    console.log(`LOG: RETENTION-POLICY-CREATE-1 - Created retention policy: ${policyId}`);
    return newPolicy;
  }

  /**
   * Schedule retention jobs based on policies
   */
  async scheduleRetentionJobs(): Promise<RetentionJob[]> {
    const jobs: RetentionJob[] = [];

    for (const policy of this.policies.values()) {
      if (!policy.active) continue;

      for (const dataType of policy.dataTypes) {
        const job = await this.createRetentionJob(policy, dataType);
        if (job) {
          jobs.push(job);
          this.jobQueue.push(job);
        }
      }
    }

    console.log(`LOG: RETENTION-SCHEDULE-1 - Scheduled ${jobs.length} retention jobs`);
    return jobs;
  }

  /**
   * Execute retention job
   */
  async executeRetentionJob(jobId: string, dryRun: boolean = false): Promise<RetentionJob> {
    const job = this.jobQueue.find(j => j.id === jobId);
    if (!job) {
      throw new Error(`Retention job not found: ${jobId}`);
    }

    const policy = this.policies.get(job.policyId);
    if (!policy) {
      throw new Error(`Retention policy not found: ${job.policyId}`);
    }

    job.status = 'running';
    job.startedAt = new Date();
    job.dryRun = dryRun;

    try {
      console.log(`LOG: RETENTION-JOB-START-1 - Starting retention job: ${jobId} (${dryRun ? 'DRY RUN' : 'LIVE'})`);

      let recordsProcessed = 0;
      let recordsAffected = 0;

      switch (job.action) {
        case 'archive':
          ({ _recordsProcessed, recordsAffected } = await this.archiveData(job, policy, dryRun));
          break;
        case 'delete':
          ({ _recordsProcessed, recordsAffected } = await this.deleteData(job, policy, dryRun));
          break;
        case 'anonymize':
          ({ _recordsProcessed, recordsAffected } = await this.anonymizeData(job, policy, dryRun));
          break;
      }

      job.recordsProcessed = recordsProcessed;
      job.recordsAffected = recordsAffected;
      job.status = 'completed';
      job.completedAt = new Date();

      // Log completion
      await this.auditLogger.logSecurityEvent({
        type: 'data_modification',
        severity: 'MEDIUM',
        userId: 'system',
        ip: 'system',
        userAgent: 'retention_manager',
        url: '/data-retention/execute',
        method: 'POST',
        details: {
          action: 'retention_job_completed',
          jobId,
          policyId: job.policyId,
          dataType: job.dataType,
          action: job.action,
          recordsProcessed,
          recordsAffected,
          dryRun
        },
        outcome: 'success',
        source: 'retention_manager'
      });

      console.log(`LOG: RETENTION-JOB-COMPLETE-1 - Completed retention job: ${jobId} (${recordsAffected}/${recordsProcessed} records)`);

    } catch (error: unknown) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();

      await this.auditLogger.logSecurityEvent({
        type: 'data_modification',
        severity: 'HIGH',
        userId: 'system',
        ip: 'system',
        userAgent: 'retention_manager',
        url: '/data-retention/execute',
        method: 'POST',
        details: {
          action: 'retention_job_failed',
          jobId,
          error: error.message
        },
        outcome: 'failure',
        source: 'retention_manager'
      });

      console.error(`LOG: RETENTION-JOB-ERROR-1 - Failed retention job: ${jobId}:`, error);
    }

    return job;
  }

  /**
   * Check for data eligible for retention
   */
  async findEligibleData(policyId: string): Promise<{
    dataType: string;
    eligibleRecords: number;
    oldestRecord: Date;
    estimatedSize: number; // bytes
    hasExceptions: boolean;
  }[]> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const results: Array<{
      dataType: string;
      eligibleRecords: number;
      oldestRecord: Date;
      estimatedSize: number;
      hasExceptions: boolean;
    }> = [];

    for (const dataType of policy.dataTypes) {
      const eligibleData = await this.queryEligibleData(dataType, policy);
      results.push(eligibleData);
    }

    return results;
  }

  /**
   * Generate retention report
   */
  async generateRetentionReport(startDate: Date, endDate: Date): Promise<RetentionReport> {
    const completedJobs = this.jobQueue.filter(job =>
      job.status === 'completed' &&
      job.completedAt &&
      job.completedAt >= startDate &&
      job.completedAt <= endDate
    );

    const summary = {
      policiesExecuted: new Set(completedJobs.map(j => j.policyId)).size,
      recordsProcessed: completedJobs.reduce((sum, _j) => sum + j.recordsProcessed, 0),
      recordsDeleted: completedJobs.filter(j => j.action === 'delete').reduce((sum, _j) => sum + j.recordsAffected, 0),
      recordsArchived: completedJobs.filter(j => j.action === 'archive').reduce((sum, _j) => sum + j.recordsAffected, 0),
      recordsAnonymized: completedJobs.filter(j => j.action === 'anonymize').reduce((sum, _j) => sum + j.recordsAffected, 0),
      storageFreed: completedJobs.reduce((sum, _j) => sum + (j.recordsAffected * 1024), 0) // Estimate
    };

    const byDataType: Record<string, unknown> = {};
    for (const job of completedJobs) {
      if (!byDataType[job.dataType]) {
        byDataType[job.dataType] = { processed: 0, deleted: 0, archived: 0, anonymized: 0 };
      }

      byDataType[job.dataType].processed += job.recordsProcessed;

      switch (job.action) {
        case 'delete':
          byDataType[job.dataType].deleted += job.recordsAffected;
          break;
        case 'archive':
          byDataType[job.dataType].archived += job.recordsAffected;
          break;
        case 'anonymize':
          byDataType[job.dataType].anonymized += job.recordsAffected;
          break;
      }
    }

    const failedJobs = this.jobQueue.filter(job =>
      job.status === 'failed' &&
      job.completedAt &&
      job.completedAt >= startDate &&
      job.completedAt <= endDate
    );

    const errors = failedJobs.map(job => ({
      jobId: job.id,
      error: job.error || 'Unknown error',
      recordsAffected: job.recordsProcessed
    }));

    const compliance = {
      gdprDeletions: completedJobs.filter(j =>
        j.action === 'delete' &&
        this.policies.get(j.policyId)?.compliance.some(c => c.regulation === 'GDPR')
      ).reduce((sum, _j) => sum + j.recordsAffected, 0),
      ccpaDeletions: completedJobs.filter(j =>
        j.action === 'delete' &&
        this.policies.get(j.policyId)?.compliance.some(c => c.regulation === 'CCPA')
      ).reduce((sum, _j) => sum + j.recordsAffected, 0),
      legalHolds: 0, // Would query legal holds
      exceptions: 0  // Would query exceptions
    };

    return {
      period: { start: startDate, end: endDate },
      summary,
      byDataType,
      compliance,
      errors
    };
  }

  /**
   * Handle user data deletion request (GDPR/CCPA)
   */
  async processUserDataDeletion(userId: string, requestType: 'GDPR' | 'CCPA', reason: string): Promise<{
    jobId: string;
    dataTypesAffected: string[];
    estimatedRecords: number;
    scheduledFor: Date;
  }> {
    const jobId = `user_deletion_${userId}_${Date.now()}`;

    // Find all data types that contain user data
    const dataTypesAffected = Array.from(this.dataCategories.keys()).filter(type => {
      const category = this.dataCategories.get(type);
      return category && category.personalData;
    });

    // Create immediate deletion job
    const job: RetentionJob = {
      id: jobId,
      policyId: `user_deletion_${requestType}`,
      dataType: 'user_data',
      action: 'delete',
      scheduledFor: new Date(),
      status: 'pending',
      recordsProcessed: 0,
      recordsAffected: 0,
      dryRun: false
    };

    this.jobQueue.unshift(job); // Priority queue

    // Log the request
    await this.auditLogger.logSecurityEvent({
      type: 'data_modification',
      severity: 'HIGH',
      userId,
      ip: 'user_request',
      userAgent: 'data_deletion_request',
      url: '/data-retention/user-deletion',
      method: 'POST',
      details: {
        action: 'user_data_deletion_requested',
        requestType,
        reason,
        jobId,
        dataTypesAffected
      },
      outcome: 'success',
      source: 'user_request'
    });

    console.log(`LOG: RETENTION-USER-DELETION-1 - User data deletion requested: ${userId} (${requestType})`);

    return { _jobId,
      dataTypesAffected,
      estimatedRecords: 0, // Would calculate actual count
      scheduledFor: job.scheduledFor
    };
  }

  /**
   * Initialize default retention policies
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: Array<Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        name: 'User Activity Logs',
        description: 'Retention policy for user activity and access logs',
        dataTypes: ['user_sessions', 'access_logs', 'activity_logs'],
        retentionPeriod: 365, // 1 year
        deletionMethod: 'hard',
        triggers: [
          {
            type: 'time_based',
            condition: 'created_at < DATE_SUB(NOW(), INTERVAL 365 DAY)',
            value: 365,
            description: 'Delete logs older than 1 year'
          }
        ],
        exceptions: [
          {
            type: 'legal_hold',
            condition: 'legal_hold_active = true',
            description: 'Preserve data under legal hold'
          }
        ],
        compliance: [
          {
            regulation: 'GDPR',
            requirement: 'Data minimization - Article 5(1)(c)',
            retentionPeriod: 365,
            deletionRequired: true,
            auditRequired: true
          }
        ],
        active: true
      },
      {
        name: 'User Content',
        description: 'Retention policy for user-generated content',
        dataTypes: ['content', 'uploads', 'user_files'],
        retentionPeriod: 2555, // 7 years
        archivePeriod: 1095,   // 3 years
        deletionMethod: 'soft',
        triggers: [
          {
            type: 'user_action',
            condition: 'user_deleted_account = true',
            value: true,
            description: 'Delete content when user deletes account'
          }
        ],
        exceptions: [
          {
            type: 'active_case',
            condition: 'under_review = true',
            description: 'Preserve content under moderation review'
          }
        ],
        compliance: [
          {
            regulation: 'GDPR',
            requirement: 'Right to be forgotten - Article 17',
            retentionPeriod: 30,
            deletionRequired: true,
            auditRequired: true
          }
        ],
        active: true
      },
      {
        name: 'Security Events',
        description: 'Retention policy for security and audit logs',
        dataTypes: ['security_logs', 'audit_trails', 'incident_logs'],
        retentionPeriod: 2555, // 7 years
        deletionMethod: 'hard',
        triggers: [
          {
            type: 'time_based',
            condition: 'created_at < DATE_SUB(NOW(), INTERVAL 7 YEAR)',
            value: 2555,
            description: 'Delete security logs older than 7 years'
          }
        ],
        exceptions: [
          {
            type: 'regulatory_review',
            condition: 'under_investigation = true',
            description: 'Preserve logs under regulatory investigation'
          }
        ],
        compliance: [
          {
            regulation: 'SOX',
            requirement: 'Financial records retention',
            retentionPeriod: 2555,
            deletionRequired: false,
            auditRequired: true
          }
        ],
        active: true
      }
    ];

    for (const policyData of defaultPolicies) {
      const policy: RetentionPolicy = {
        id: `default_${policyData.name.toLowerCase().replace(/s+/g, '_')}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...policyData
      };
      this.policies.set(policy.id, policy);
    }
  }

  /**
   * Initialize data categories
   */
  private initializeDataCategories(): void {
    const categories: DataCategory[] = [
      {
        name: 'user_data',
        sensitivity: 'confidential',
        personalData: true,
        financialData: false,
        healthData: false,
        defaultRetentionDays: 365,
        encryptionRequired: true,
        auditTrailRequired: true
      },
      {
        name: 'payment_data',
        sensitivity: 'restricted',
        personalData: true,
        financialData: true,
        healthData: false,
        defaultRetentionDays: 2555, // 7 years
        encryptionRequired: true,
        auditTrailRequired: true
      },
      {
        name: 'content_metadata',
        sensitivity: 'internal',
        personalData: false,
        financialData: false,
        healthData: false,
        defaultRetentionDays: 1095, // 3 years
        encryptionRequired: false,
        auditTrailRequired: true
      },
      {
        name: 'system_logs',
        sensitivity: 'internal',
        personalData: false,
        financialData: false,
        healthData: false,
        defaultRetentionDays: 365,
        encryptionRequired: false,
        auditTrailRequired: true
      }
    ];

    for (const category of categories) {
      this.dataCategories.set(category.name, category);
    }
  }

  /**
   * Validate retention policy
   */
  private async validatePolicy(policy: RetentionPolicy): Promise<void> {
    // Validate retention period
    if (policy.retentionPeriod < 1) {
      throw new Error('Retention period must be at least 1 day');
    }

    // Validate compliance requirements
    for (const compliance of policy.compliance) {
      if (compliance.retentionPeriod > policy.retentionPeriod) {
        console.warn(`LOG: RETENTION-VALIDATE-WARN-1 - Compliance requirement for ${compliance.regulation} exceeds policy retention period`);
      }
    }

    // Validate data types exist
    for (const dataType of policy.dataTypes) {
      if (!this.dataCategories.has(dataType)) {
        console.warn(`LOG: RETENTION-VALIDATE-WARN-2 - Unknown data type in policy: ${dataType}`);
      }
    }
  }

  /**
   * Store policy in database
   */
  private async storePolicyInDB(policy: RetentionPolicy): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT OR REPLACE INTO retention_policies (
          id, name, description, data_types, retention_period, archive_period,
          deletion_method, triggers, exceptions, compliance, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        policy.id,
        policy.name,
        policy.description,
        JSON.stringify(policy.dataTypes),
        policy.retentionPeriod,
        policy.archivePeriod || null,
        policy.deletionMethod,
        JSON.stringify(policy.triggers),
        JSON.stringify(policy.exceptions),
        JSON.stringify(policy.compliance),
        policy.active ? 1 : 0,
        policy.createdAt.toISOString(),
        policy.updatedAt.toISOString()
      ).run();

    } catch (error: unknown) {
      console.error('LOG: RETENTION-STORE-ERROR-1 - Failed to store policy in database:', error);
      throw error;
    }
  }

  /**
   * Create retention job for policy and data type
   */
  private async createRetentionJob(policy: RetentionPolicy, dataType: string): Promise<RetentionJob | null> {
    const eligibleData = await this.queryEligibleData(dataType, policy);

    if (eligibleData.eligibleRecords === 0) {
      return null; // No data to process
    }

    let action: RetentionJob['action'] = 'delete';
    if (policy.archivePeriod && eligibleData.oldestRecord > new Date(Date.now() - policy.archivePeriod * 24 * 60 * 60 * 1000)) {
      action = 'archive';
    }

    if (policy.deletionMethod === 'anonymize') {
      action = 'anonymize';
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    return {
      id: jobId,
      policyId: policy.id,
      dataType,
      action,
      scheduledFor: new Date(),
      status: 'pending',
      recordsProcessed: 0,
      recordsAffected: 0,
      dryRun: false
    };
  }

  /**
   * Query eligible data for retention
   */
  private async queryEligibleData(dataType: string, policy: RetentionPolicy): Promise<{
    dataType: string;
    eligibleRecords: number;
    oldestRecord: Date;
    estimatedSize: number;
    hasExceptions: boolean;
  }> {
    // This would implement actual database queries based on data type
    // For now, return mock data

    const cutoffDate = new Date(Date.now() - policy.retentionPeriod * 24 * 60 * 60 * 1000);

    return { _dataType,
      eligibleRecords: 0, // Would query actual count
      oldestRecord: new Date(),
      estimatedSize: 0,
      hasExceptions: false
    };
  }

  /**
   * Archive data implementation
   */
  private async archiveData(job: RetentionJob, policy: RetentionPolicy, dryRun: boolean): Promise<{
    recordsProcessed: number;
    recordsAffected: number;
  }> {
    console.log(`LOG: RETENTION-ARCHIVE-1 - Archiving ${job.dataType} data (dry run: ${dryRun})`);

    // Implementation would:
    // 1. Query eligible records
    // 2. Move to archive storage (R2)
    // 3. Update records with archive status
    // 4. Generate archive manifest

    return {
      recordsProcessed: 0,
      recordsAffected: 0
    };
  }

  /**
   * Delete data implementation
   */
  private async deleteData(job: RetentionJob, policy: RetentionPolicy, dryRun: boolean): Promise<{
    recordsProcessed: number;
    recordsAffected: number;
  }> {
    console.log(`LOG: RETENTION-DELETE-1 - Deleting ${job.dataType} data (dry run: ${dryRun})`);

    // Implementation would:
    // 1. Query eligible records
    // 2. Check for exceptions (legal holds, etc.)
    // 3. Perform deletion (soft or hard)
    // 4. Log deletion events

    return {
      recordsProcessed: 0,
      recordsAffected: 0
    };
  }

  /**
   * Anonymize data implementation
   */
  private async anonymizeData(job: RetentionJob, policy: RetentionPolicy, dryRun: boolean): Promise<{
    recordsProcessed: number;
    recordsAffected: number;
  }> {
    console.log(`LOG: RETENTION-ANONYMIZE-1 - Anonymizing ${job.dataType} data (dry run: ${dryRun})`);

    // Implementation would:
    // 1. Query eligible records
    // 2. Apply anonymization algorithms
    // 3. Update records with anonymized data
    // 4. Log anonymization events

    return {
      recordsProcessed: 0,
      recordsAffected: 0
    };
  }

  /**
   * Start job processor
   */
  private startJobProcessor(): void {
    this.executionTimer = setInterval(async () => {
      const pendingJobs = this.jobQueue.filter(job =>
        job.status === 'pending' &&
        job.scheduledFor <= new Date()
      );

      for (const job of pendingJobs.slice(0, 5)) { // Process up to 5 jobs at a time
        try {
          await this.executeRetentionJob(job.id);
        } catch (error: unknown) {
          console.error(`LOG: RETENTION-PROCESSOR-ERROR-1 - Failed to process job ${job.id}:`, error);
        }
      }
    }, 60000); // Run every minute
  }

  /**
   * Shutdown retention manager
   */
  shutdown(): void {
    if (this.executionTimer) {
      clearInterval(this.executionTimer);
    }
    console.log('LOG: RETENTION-SHUTDOWN-1 - Data retention manager shutdown complete');
  }
}

/**
 * Global retention manager instance
 */
let globalRetentionManager: DataRetentionManager | null = null;

/**
 * Get or create global retention manager
 */
export function getDataRetentionManager(env: CloudflareEnv): DataRetentionManager {
  if (!globalRetentionManager) {
    globalRetentionManager = new DataRetentionManager(env);
  }
  return globalRetentionManager;
}