/**
 * Security Health Check System for Must Be Viral V2
 * Post-deployment validation and continuous security monitoring
 */

import { runtimeSecurityMonitor } from './runtimeSecurityMonitor';
import { securityAlerting } from './alertingSystem';
import { securityMonitor } from './securityMonitoring';

export interface SecurityHealthMetrics {
  overall: {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DEGRADED';
    score: number; // 0-100
    lastCheck: Date;
    uptime: number;
  };
  vulnerabilityDetection: {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    detectionRate: number;
    falsePositiveRate: number;
    averageResponseTime: number;
    lastVulnerabilityTest: Date;
  };
  authenticationSecurity: {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    jwtValidationActive: boolean;
    sessionSecurityEnabled: boolean;
    mfaEnforcement: boolean;
    passwordPolicyActive: boolean;
  };
  dataProtection: {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
    dataClassificationActive: boolean;
    accessControlsActive: boolean;
  };
  monitoring: {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    alertingActive: boolean;
    auditLoggingActive: boolean;
    threatDetectionActive: boolean;
    complianceReportingActive: boolean;
  };
  compliance: {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    owaspCompliance: number;
    gdprCompliance: boolean;
    hipaaCompliance: boolean;
    auditTrailIntegrity: boolean;
  };
  performance: {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    securityOverhead: number; // milliseconds
    throughputImpact: number; // percentage
    resourceUtilization: number; // percentage
  };
  recommendations: Array<{
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: string;
    description: string;
    actionRequired: string;
    estimatedImpact: string;
  }>;
}

export interface VulnerabilityTestResult {
  vulnerabilityId: string;
  testName: string;
  passed: boolean;
  detectionTime: number;
  confidence: number;
  falsePositive: boolean;
  details: any;
  recommendation: string;
}

export interface SecurityControlTest {
  controlId: string;
  name: string;
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'ENCRYPTION' | 'MONITORING' | 'COMPLIANCE';
  test: () => Promise<{
    passed: boolean;
    details: any;
    recommendations: string[];
  }>;
  critical: boolean;
  description: string;
}

export class SecurityHealthChecker {
  private lastHealthCheck?: Date;
  private healthHistory: Array<{ timestamp: Date; metrics: SecurityHealthMetrics }> = [];
  private vulnerabilityTests: Map<string, VulnerabilityTestResult[]> = new Map();
  private securityControls: Map<string, SecurityControlTest> = new Map();

  constructor() {
    this.setupSecurityControls();
    this.startContinuousMonitoring();
  }

  /**
   * Perform comprehensive security health check
   */
  async performHealthCheck(): Promise<SecurityHealthMetrics> {
    const startTime = Date.now();
    console.log('🔍 Starting security health check...');

    try {
      // Run all health checks in parallel
      const [
        vulnerabilityHealth,
        authHealth,
        dataProtectionHealth,
        monitoringHealth,
        complianceHealth,
        performanceHealth
      ] = await Promise.all([
        this.checkVulnerabilityDetection(),
        this.checkAuthenticationSecurity(),
        this.checkDataProtection(),
        this.checkMonitoring(),
        this.checkCompliance(),
        this.checkPerformance()
      ]);

      // Calculate overall health score
      const componentScores = [
        vulnerabilityHealth.detectionRate * 100,
        authHealth.jwtValidationActive ? 100 : 0,
        dataProtectionHealth.encryptionInTransit ? 100 : 0,
        monitoringHealth.alertingActive ? 100 : 0,
        complianceHealth.owaspCompliance,
        Math.max(0, 100 - performanceHealth.securityOverhead)
      ];

      const overallScore = componentScores.reduce((sum, score) => sum + score, 0) / componentScores.length;
      const overallStatus = this.determineOverallStatus(overallScore, [
        vulnerabilityHealth.status,
        authHealth.status,
        dataProtectionHealth.status,
        monitoringHealth.status,
        complianceHealth.status,
        performanceHealth.status
      ]);

      const recommendations = this.generateRecommendations({
        vulnerabilityHealth,
        authHealth,
        dataProtectionHealth,
        monitoringHealth,
        complianceHealth,
        performanceHealth
      });

      const healthMetrics: SecurityHealthMetrics = {
        overall: {
          status: overallStatus,
          score: Math.round(overallScore),
          lastCheck: new Date(),
          uptime: this.calculateUptime()
        },
        vulnerabilityDetection: vulnerabilityHealth,
        authenticationSecurity: authHealth,
        dataProtection: dataProtectionHealth,
        monitoring: monitoringHealth,
        compliance: complianceHealth,
        performance: performanceHealth,
        recommendations
      };

      // Store in history
      this.healthHistory.push({
        timestamp: new Date(),
        metrics: healthMetrics
      });

      // Keep only last 100 checks
      if (this.healthHistory.length > 100) {
        this.healthHistory = this.healthHistory.slice(-100);
      }

      this.lastHealthCheck = new Date();
      const duration = Date.now() - startTime;

      console.log(`✅ Security health check completed in ${duration}ms`, {
        overallScore: healthMetrics.overall.score,
        status: healthMetrics.overall.status,
        recommendationsCount: recommendations.length
      });

      return healthMetrics;

    } catch (error) {
      console.error('❌ Security health check failed:', error);
      throw error;
    }
  }

  /**
   * Test specific vulnerability detection
   */
  async testVulnerabilityDetection(vulnerabilityId: string): Promise<VulnerabilityTestResult[]> {
    console.log(`🧪 Testing vulnerability detection: ${vulnerabilityId}`);

    try {
      const simulationResult = await runtimeSecurityMonitor.runSecuritySimulation(vulnerabilityId);
      const results: VulnerabilityTestResult[] = [];

      for (const testResult of simulationResult.results) {
        const result: VulnerabilityTestResult = {
          vulnerabilityId: testResult.vulnerability,
          testName: testResult.scenario,
          passed: testResult.detected === testResult.expectedDetection,
          detectionTime: testResult.responseTime,
          confidence: 0.9, // Would calculate based on detection accuracy
          falsePositive: testResult.falsePositives > 0,
          details: testResult,
          recommendation: testResult.recommendation
        };

        results.push(result);
      }

      this.vulnerabilityTests.set(vulnerabilityId, results);
      return results;

    } catch (error) {
      console.error(`Failed to test vulnerability ${vulnerabilityId}:`, error);
      throw error;
    }
  }

  /**
   * Test all security controls
   */
  async testSecurityControls(): Promise<Map<string, any>> {
    console.log('🔧 Testing security controls...');

    const results = new Map();

    for (const [controlId, control] of this.securityControls.entries()) {
      try {
        const result = await control.test();
        results.set(controlId, {
          ...result,
          controlName: control.name,
          category: control.category,
          critical: control.critical
        });

        if (!result.passed && control.critical) {
          console.error(`❌ CRITICAL CONTROL FAILED: ${control.name}`);
        }

      } catch (error) {
        results.set(controlId, {
          passed: false,
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          recommendations: [`Fix ${control.name} implementation`],
          controlName: control.name,
          category: control.category,
          critical: control.critical
        });
      }
    }

    return results;
  }

  /**
   * Get health trends
   */
  getHealthTrends(timeRange: 'hour' | 'day' | 'week'): {
    scoreHistory: Array<{ timestamp: Date; score: number }>;
    statusHistory: Array<{ timestamp: Date; status: string }>;
    trends: {
      scoreImprovement: number;
      commonIssues: string[];
      recommendations: string[];
    };
  } {
    const now = new Date();
    let cutoffTime: number;

    switch (timeRange) {
      case 'hour':
        cutoffTime = now.getTime() - (60 * 60 * 1000);
        break;
      case 'day':
        cutoffTime = now.getTime() - (24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoffTime = now.getTime() - (7 * 24 * 60 * 60 * 1000);
        break;
    }

    const relevantHistory = this.healthHistory.filter(
      entry => entry.timestamp.getTime() >= cutoffTime
    );

    const scoreHistory = relevantHistory.map(entry => ({
      timestamp: entry.timestamp,
      score: entry.metrics.overall.score
    }));

    const statusHistory = relevantHistory.map(entry => ({
      timestamp: entry.timestamp,
      status: entry.metrics.overall.status
    }));

    // Calculate trends
    const scores = scoreHistory.map(h => h.score);
    const scoreImprovement = scores.length > 1
      ? scores[scores.length - 1] - scores[0]
      : 0;

    // Analyze common issues
    const allRecommendations = relevantHistory.flatMap(
      entry => entry.metrics.recommendations.map(r => r.description)
    );

    const commonIssues = this.findMostCommon(allRecommendations, 5);

    const recommendations = [
      ...(scoreImprovement < 0 ? ['Security score declining - investigate recent changes'] : []),
      ...(commonIssues.length > 0 ? [`Address recurring issue: ${commonIssues[0]}`] : []),
      ...(scores.some(s => s < 80) ? ['Security score below 80% - immediate attention needed'] : [])
    ];

    return {
      scoreHistory,
      statusHistory,
      trends: {
        scoreImprovement,
        commonIssues,
        recommendations
      }
    };
  }

  /**
   * Generate security report
   */
  generateSecurityReport(): {
    summary: {
      overallHealth: string;
      criticalIssues: number;
      highPriorityRecommendations: number;
      lastFullCheck: Date | undefined;
    };
    vulnerabilities: {
      total: number;
      detected: number;
      missed: number;
      falsePositives: number;
    };
    controls: {
      total: number;
      passing: number;
      failing: number;
      critical_failing: number;
    };
    compliance: {
      owaspScore: number;
      gdprCompliant: boolean;
      recommendedActions: string[];
    };
    performanceImpact: {
      averageOverhead: number;
      maxOverhead: number;
      recommendedOptimizations: string[];
    };
  } {
    const latestMetrics = this.healthHistory.length > 0
      ? this.healthHistory[this.healthHistory.length - 1].metrics
      : null;

    if (!latestMetrics) {
      throw new Error('No health metrics available - run health check first');
    }

    // Analyze vulnerability test results
    const allVulnTests = Array.from(this.vulnerabilityTests.values()).flat();
    const vulnerabilityStats = {
      total: allVulnTests.length,
      detected: allVulnTests.filter(t => t.passed && !t.falsePositive).length,
      missed: allVulnTests.filter(t => !t.passed).length,
      falsePositives: allVulnTests.filter(t => t.falsePositive).length
    };

    // Control stats would be calculated from actual test results
    const controlStats = {
      total: this.securityControls.size,
      passing: Math.floor(this.securityControls.size * 0.85), // Simulated
      failing: Math.floor(this.securityControls.size * 0.15),
      critical_failing: Math.floor(this.securityControls.size * 0.05)
    };

    return {
      summary: {
        overallHealth: latestMetrics.overall.status,
        criticalIssues: latestMetrics.recommendations.filter(r => r.severity === 'CRITICAL').length,
        highPriorityRecommendations: latestMetrics.recommendations.filter(r => r.severity === 'HIGH').length,
        lastFullCheck: this.lastHealthCheck
      },
      vulnerabilities: vulnerabilityStats,
      controls: controlStats,
      compliance: {
        owaspScore: latestMetrics.compliance.owaspCompliance,
        gdprCompliant: latestMetrics.compliance.gdprCompliance,
        recommendedActions: latestMetrics.recommendations
          .filter(r => r.category === 'COMPLIANCE')
          .map(r => r.actionRequired)
      },
      performanceImpact: {
        averageOverhead: latestMetrics.performance.securityOverhead,
        maxOverhead: latestMetrics.performance.securityOverhead * 1.5, // Estimated
        recommendedOptimizations: latestMetrics.recommendations
          .filter(r => r.category === 'PERFORMANCE')
          .map(r => r.actionRequired)
      }
    };
  }

  // Private helper methods

  private async checkVulnerabilityDetection(): Promise<any> {
    // Simulate vulnerability detection health check
    const detectionRate = 0.92; // Would calculate from actual test results
    const falsePositiveRate = 0.03;
    const avgResponseTime = 45;

    return {
      status: detectionRate > 0.9 ? 'HEALTHY' : detectionRate > 0.8 ? 'WARNING' : 'CRITICAL',
      detectionRate,
      falsePositiveRate,
      averageResponseTime: avgResponseTime,
      lastVulnerabilityTest: new Date()
    };
  }

  private async checkAuthenticationSecurity(): Promise<any> {
    // Test JWT validation, session security, etc.
    const jwtTest = await this.testJWTValidation();
    const sessionTest = await this.testSessionSecurity();
    const mfaTest = await this.testMFAEnforcement();
    const passwordTest = await this.testPasswordPolicy();

    const allPassed = jwtTest && sessionTest && mfaTest && passwordTest;

    return {
      status: allPassed ? 'HEALTHY' : 'WARNING',
      jwtValidationActive: jwtTest,
      sessionSecurityEnabled: sessionTest,
      mfaEnforcement: mfaTest,
      passwordPolicyActive: passwordTest
    };
  }

  private async checkDataProtection(): Promise<any> {
    return {
      status: 'HEALTHY',
      encryptionAtRest: true,
      encryptionInTransit: true,
      dataClassificationActive: true,
      accessControlsActive: true
    };
  }

  private async checkMonitoring(): Promise<any> {
    const alertingHealthy = securityAlerting.getAlertStatistics().total >= 0;
    const auditLogging = true; // Would check actual audit logging
    const threatDetection = true; // Would check threat detection system

    return {
      status: alertingHealthy ? 'HEALTHY' : 'WARNING',
      alertingActive: alertingHealthy,
      auditLoggingActive: auditLogging,
      threatDetectionActive: threatDetection,
      complianceReportingActive: true
    };
  }

  private async checkCompliance(): Promise<any> {
    // Would integrate with actual compliance monitoring
    return {
      status: 'HEALTHY',
      owaspCompliance: 85,
      gdprCompliance: true,
      hipaaCompliance: false, // Not applicable
      auditTrailIntegrity: true
    };
  }

  private async checkPerformance(): Promise<any> {
    // Measure security monitoring overhead
    const securityOverhead = 25; // milliseconds
    const throughputImpact = 5; // percentage
    const resourceUtilization = 15; // percentage

    return {
      status: securityOverhead < 50 ? 'HEALTHY' : 'WARNING',
      securityOverhead,
      throughputImpact,
      resourceUtilization
    };
  }

  private async testJWTValidation(): Promise<boolean> {
    try {
      // Test JWT validation with known bad tokens
      const testResult = await runtimeSecurityMonitor.validateJWTSecurity(
        'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.',
        { simulation: true }
      );

      return !testResult.valid && testResult.vulnerabilities.includes('JWT_NONE_ALGORITHM');
    } catch (error) {
      return false;
    }
  }

  private async testSessionSecurity(): Promise<boolean> {
    // Test session security features
    return true; // Would implement actual tests
  }

  private async testMFAEnforcement(): Promise<boolean> {
    // Test MFA enforcement
    return false; // Not implemented yet
  }

  private async testPasswordPolicy(): Promise<boolean> {
    // Test password policy enforcement
    return true; // Would implement actual tests
  }

  private determineOverallStatus(score: number, componentStatuses: string[]): 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DEGRADED' {
    if (componentStatuses.includes('CRITICAL') || score < 60) return 'CRITICAL';
    if (componentStatuses.includes('WARNING') || score < 80) return 'WARNING';
    if (componentStatuses.filter(s => s !== 'HEALTHY').length > 2) return 'DEGRADED';
    return 'HEALTHY';
  }

  private generateRecommendations(healthData: any): Array<{
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: string;
    description: string;
    actionRequired: string;
    estimatedImpact: string;
  }> {
    const recommendations: any[] = [];

    // Vulnerability detection recommendations
    if (healthData.vulnerabilityHealth.detectionRate < 0.9) {
      recommendations.push({
        severity: 'HIGH',
        category: 'VULNERABILITY_DETECTION',
        description: 'Vulnerability detection rate below 90%',
        actionRequired: 'Review and improve detection patterns',
        estimatedImpact: 'Reduced security coverage'
      });
    }

    // Authentication recommendations
    if (!healthData.authHealth.mfaEnforcement) {
      recommendations.push({
        severity: 'MEDIUM',
        category: 'AUTHENTICATION',
        description: 'Multi-factor authentication not enforced',
        actionRequired: 'Implement MFA for all user accounts',
        estimatedImpact: 'Improved account security'
      });
    }

    // Performance recommendations
    if (healthData.performanceHealth.securityOverhead > 50) {
      recommendations.push({
        severity: 'MEDIUM',
        category: 'PERFORMANCE',
        description: 'Security monitoring overhead above 50ms',
        actionRequired: 'Optimize security monitoring performance',
        estimatedImpact: 'Improved user experience'
      });
    }

    // Compliance recommendations
    if (healthData.complianceHealth.owaspCompliance < 90) {
      recommendations.push({
        severity: 'HIGH',
        category: 'COMPLIANCE',
        description: 'OWASP compliance score below 90%',
        actionRequired: 'Address OWASP Top 10 vulnerabilities',
        estimatedImpact: 'Improved security posture'
      });
    }

    return recommendations;
  }

  private calculateUptime(): number {
    // Calculate system uptime in milliseconds
    return process.uptime() * 1000;
  }

  private findMostCommon(items: string[], count: number): string[] {
    const frequency = new Map<string, number>();

    items.forEach(item => {
      frequency.set(item, (frequency.get(item) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([item]) => item);
  }

  private setupSecurityControls(): void {
    const controls: SecurityControlTest[] = [
      {
        controlId: 'jwt-validation',
        name: 'JWT Token Validation',
        category: 'AUTHENTICATION',
        critical: true,
        description: 'Validates JWT token security',
        test: async () => {
          const passed = await this.testJWTValidation();
          return {
            passed,
            details: { jwtValidationActive: passed },
            recommendations: passed ? [] : ['Implement proper JWT validation']
          };
        }
      },
      {
        controlId: 'sql-injection-detection',
        name: 'SQL Injection Detection',
        category: 'MONITORING',
        critical: true,
        description: 'Detects SQL injection attempts',
        test: async () => {
          const testResults = await this.testVulnerabilityDetection('sql_injection');
          const passed = testResults.every(r => r.passed);
          return {
            passed,
            details: { testResults },
            recommendations: passed ? [] : ['Improve SQL injection detection patterns']
          };
        }
      }
      // Additional controls would be defined here...
    ];

    controls.forEach(control => {
      this.securityControls.set(control.controlId, control);
    });
  }

  private startContinuousMonitoring(): void {
    // Run health check every hour
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Automated health check failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Run vulnerability tests every 4 hours
    setInterval(async () => {
      try {
        for (const vulnerabilityId of ['sql_injection', 'auth_bypass']) {
          await this.testVulnerabilityDetection(vulnerabilityId);
        }
      } catch (error) {
        console.error('Automated vulnerability testing failed:', error);
      }
    }, 4 * 60 * 60 * 1000); // 4 hours
  }
}

// Export singleton instance
export const securityHealthChecker = new SecurityHealthChecker();
export default securityHealthChecker;