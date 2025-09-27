// Simple security scanner - only scans for security issues!
import { EdgeNode } from './edgeTypes';
import { EdgeNodeManager } from './EdgeNodeManager';

export interface SecurityScanResult {
  nodeId: string;
  vulnerabilities: SecurityVulnerability[];
  score: number;
  lastScan: number;
}

export interface SecurityVulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  recommendation: string;
}

export class EdgeSecurityScanner {
  constructor(private nodeManager: EdgeNodeManager) {
    this.startSecurityScanning();
  }

  async scanAllNodes(): Promise<SecurityScanResult[]> {
    const allNodes = await this.nodeManager.getAllNodes();
    const scanPromises = allNodes.map(node => this.scanNode(node));
    return Promise.all(scanPromises);
  }

  async scanNode(node: EdgeNode): Promise<SecurityScanResult> {
    const vulnerabilities = await this.performSecurityScan(node);
    const score = this.calculateSecurityScore(vulnerabilities);

    return {
      nodeId: node.id,
      vulnerabilities,
      score,
      lastScan: Date.now()
    };
  }

  async getNodeSecurityStatus(nodeId: string): Promise<SecurityScanResult | null> {
    const node = await this.nodeManager.getNode(nodeId);
    if (!node) {
      return null;
    }

    return this.scanNode(node);
  }

  private async performSecurityScan(node: EdgeNode): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Simulate various security checks
    await this.checkNetworkSecurity(node, vulnerabilities);
    await this.checkAuthenticationSecurity(node, vulnerabilities);
    await this.checkEncryptionSecurity(node, vulnerabilities);
    await this.checkFirewallSecurity(node, vulnerabilities);
    await this.checkComplianceSecurity(node, vulnerabilities);

    return vulnerabilities;
  }

  private async checkNetworkSecurity(node: EdgeNode, vulnerabilities: SecurityVulnerability[]): Promise<void> {
    // Check for insecure network configurations
    if (!node.security.encryption.inTransit.enabled) {
      vulnerabilities.push({
        id: 'NET001',
        severity: 'high',
        type: 'network',
        description: 'TLS encryption not enabled for transit',
        recommendation: 'Enable TLS 1.3 encryption for all network traffic'
      });
    }

    if (node.network.ports && node.network.ports.some(port => !port.ssl)) {
      vulnerabilities.push({
        id: 'NET002',
        severity: 'medium',
        type: 'network',
        description: 'Some ports do not use SSL/TLS',
        recommendation: 'Configure SSL/TLS for all exposed ports'
      });
    }
  }

  private async checkAuthenticationSecurity(node: EdgeNode, vulnerabilities: SecurityVulnerability[]): Promise<void> {
    if (!node.security.authentication.enabled) {
      vulnerabilities.push({
        id: 'AUTH001',
        severity: 'critical',
        type: 'authentication',
        description: 'Authentication is disabled',
        recommendation: 'Enable and configure authentication mechanisms'
      });
    }

    if (!node.security.authentication.mfa.enabled) {
      vulnerabilities.push({
        id: 'AUTH002',
        severity: 'medium',
        type: 'authentication',
        description: 'Multi-factor authentication not enabled',
        recommendation: 'Enable MFA for enhanced security'
      });
    }
  }

  private async checkEncryptionSecurity(node: EdgeNode, vulnerabilities: SecurityVulnerability[]): Promise<void> {
    if (!node.security.encryption.atRest.enabled) {
      vulnerabilities.push({
        id: 'ENC001',
        severity: 'high',
        type: 'encryption',
        description: 'Data at rest encryption not enabled',
        recommendation: 'Enable encryption for stored data'
      });
    }

    if (!node.security.encryption.keyManagement.backup) {
      vulnerabilities.push({
        id: 'ENC002',
        severity: 'medium',
        type: 'encryption',
        description: 'Encryption key backup not configured',
        recommendation: 'Configure secure key backup and recovery'
      });
    }
  }

  private async checkFirewallSecurity(node: EdgeNode, vulnerabilities: SecurityVulnerability[]): Promise<void> {
    if (!node.security.firewall.enabled) {
      vulnerabilities.push({
        id: 'FW001',
        severity: 'high',
        type: 'firewall',
        description: 'Firewall is disabled',
        recommendation: 'Enable and configure firewall rules'
      });
    }

    if (node.security.firewall.defaultPolicy === 'allow') {
      vulnerabilities.push({
        id: 'FW002',
        severity: 'medium',
        type: 'firewall',
        description: 'Default firewall policy is permissive',
        recommendation: 'Set default policy to deny and create specific allow rules'
      });
    }
  }

  private async checkComplianceSecurity(node: EdgeNode, vulnerabilities: SecurityVulnerability[]): Promise<void> {
    if (!node.security.compliance.auditLogging) {
      vulnerabilities.push({
        id: 'COMP001',
        severity: 'medium',
        type: 'compliance',
        description: 'Audit logging not enabled',
        recommendation: 'Enable comprehensive audit logging'
      });
    }

    if (node.security.compliance.dataRetention < 90) {
      vulnerabilities.push({
        id: 'COMP002',
        severity: 'low',
        type: 'compliance',
        description: 'Data retention period may not meet compliance requirements',
        recommendation: 'Review and extend data retention period as needed'
      });
    }
  }

  private calculateSecurityScore(vulnerabilities: SecurityVulnerability[]): number {
    let score = 100;

    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    });

    return Math.max(0, score);
  }

  private startSecurityScanning(): void {
    setInterval(() => {
      this.performPeriodicScan();
    }, 300000); // Every 5 minutes
  }

  private async performPeriodicScan(): void {
    const allNodes = await this.nodeManager.getAllNodes();

    for (const node of allNodes) {
      const scanResult = await this.scanNode(node);

      if (scanResult.vulnerabilities.length > 0) {
        console.warn(`Security scan found ${scanResult.vulnerabilities.length} vulnerabilities on node ${node.id}`);
      }
    }
  }
}