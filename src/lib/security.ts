// Security features per plan with SSO, encryption, and bias detection
// LOG: SECURITY-INIT-1 - Initialize security framework

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

export interface SecurityTier {
  id: string;
  name: string;
  features: {
    sso_enabled: boolean;
    encryption_level: 'basic' | 'standard' | 'enterprise';
    bias_check_level: 'basic' | 'advanced' | 'comprehensive';
    audit_retention_days: number;
    mfa_required: boolean;
    api_rate_limit: number;
  };
}

export interface BiasCheckResult {
  passed: boolean;
  confidence: number;
  bias_score: number;
  detected_biases: string[];
  recommendations: string[];
  check_level: string;
}

export interface EncryptionConfig {
  algorithm: string;
  key_length: number;
  iv_length: number;
}

export interface SSOProvider {
  id: string;
  name: string;
  type: 'oauth2' | 'saml' | 'oidc';
  client_id: string;
  auth_url: string;
  token_url: string;
  user_info_url: string;
  scopes: string[];
}

export class SecurityManager {
  private encryptionKey: Buffer;
  private securityTiers: Map<string, SecurityTier> = new Map();
  private ssoProviders: Map<string, SSOProvider> = new Map();
  private biasKeywords: Map<string, string[]> = new Map();

  constructor() {
    console.log('LOG: SECURITY-MANAGER-1 - Initializing security manager');
    
    this.encryptionKey = this.deriveEncryptionKey();
    this.initializeSecurityTiers();
    this.initializeSSOProviders();
    this.initializeBiasDetection();
    
    console.log('LOG: SECURITY-MANAGER-2 - Security manager initialized');
  }

  private deriveEncryptionKey(): Buffer {
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production';
    return createHash('sha256').update(secret).digest();
  }

  private initializeSecurityTiers(): void {
    console.log('LOG: SECURITY-TIERS-1 - Loading security tiers');
    
    const tiers: SecurityTier[] = [
      {
        id: 'free',
        name: 'Free',
        features: {
          sso_enabled: false,
          encryption_level: 'basic',
          bias_check_level: 'basic',
          audit_retention_days: 30,
          mfa_required: false,
          api_rate_limit: 100
        }
      },
      {
        id: 'standard',
        name: 'Standard',
        features: {
          sso_enabled: true,
          encryption_level: 'standard',
          bias_check_level: 'advanced',
          audit_retention_days: 90,
          mfa_required: false,
          api_rate_limit: 500
        }
      },
      {
        id: 'premium',
        name: 'Premium',
        features: {
          sso_enabled: true,
          encryption_level: 'enterprise',
          bias_check_level: 'comprehensive',
          audit_retention_days: 365,
          mfa_required: true,
          api_rate_limit: 2000
        }
      }
    ];

    tiers.forEach(tier => this.securityTiers.set(tier.id, tier));
    console.log('LOG: SECURITY-TIERS-2 - Loaded', tiers.length, 'security tiers');
  }

  private initializeSSOProviders(): void {
    console.log('LOG: SECURITY-SSO-1 - Loading SSO providers');
    
    const providers: SSOProvider[] = [
      {
        id: 'google',
        name: 'Google',
        type: 'oauth2',
        client_id: process.env.GOOGLE_CLIENT_ID || 'test-google-client-id',
        auth_url: 'https://accounts.google.com/oauth2/auth',
        token_url: 'https://oauth2.googleapis.com/token',
        user_info_url: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'email', 'profile']
      },
      {
        id: 'github',
        name: 'GitHub',
        type: 'oauth2',
        client_id: process.env.GITHUB_CLIENT_ID || 'test-github-client-id',
        auth_url: 'https://github.com/login/oauth/authorize',
        token_url: 'https://github.com/login/oauth/access_token',
        user_info_url: 'https://api.github.com/user',
        scopes: ['user:email']
      }
    ];

    providers.forEach(provider => this.ssoProviders.set(provider.id, provider));
    console.log('LOG: SECURITY-SSO-2 - Loaded', providers.length, 'SSO providers');
  }

  private initializeBiasDetection(): void {
    console.log('LOG: SECURITY-BIAS-1 - Loading bias detection keywords');
    
    this.biasKeywords.set('gender', [
      'men are better', 'women should', 'typical male', 'typical female',
      'boys will be boys', 'act like a lady', 'man up', 'emotional woman'
    ]);
    
    this.biasKeywords.set('racial', [
      'all [race] people', 'typical [race]', 'those people',
      'urban youth', 'articulate for a', 'exotic looking'
    ]);
    
    this.biasKeywords.set('age', [
      'too old for', 'young people these days', 'boomer mentality',
      'millennial entitlement', 'generation gap'
    ]);
    
    this.biasKeywords.set('economic', [
      'poor people are', 'rich people deserve', 'welfare queens',
      'entitled rich', 'lazy unemployed'
    ]);

    console.log('LOG: SECURITY-BIAS-2 - Loaded bias detection categories');
  }

  // Encryption methods
  encryptSensitiveData(data: string, level: 'basic' | 'standard' | 'enterprise' = 'basic'): string {
    console.log('LOG: SECURITY-ENCRYPT-1 - Encrypting data with level:', level);
    
    try {
      const algorithm = this.getEncryptionAlgorithm(level);
      const iv = randomBytes(16);
      const cipher = createCipheriv(algorithm, this.encryptionKey, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const result = iv.toString('hex') + ':' + encrypted;
      console.log('LOG: SECURITY-ENCRYPT-2 - Data encrypted successfully');
      return result;
    } catch (error) {
      console.error('LOG: SECURITY-ENCRYPT-ERROR-1 - Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  decryptSensitiveData(encryptedData: string, level: 'basic' | 'standard' | 'enterprise' = 'basic'): string {
    console.log('LOG: SECURITY-DECRYPT-1 - Decrypting data');
    
    try {
      const [ivHex, encrypted] = encryptedData.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const algorithm = this.getEncryptionAlgorithm(level);
      
      const decipher = createDecipheriv(algorithm, this.encryptionKey, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      console.log('LOG: SECURITY-DECRYPT-2 - Data decrypted successfully');
      return decrypted;
    } catch (error) {
      console.error('LOG: SECURITY-DECRYPT-ERROR-1 - Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  private getEncryptionAlgorithm(level: string): string {
    switch (level) {
      case 'enterprise': return 'aes-256-gcm';
      case 'standard': return 'aes-256-cbc';
      case 'basic': return 'aes-128-cbc';
      default: return 'aes-128-cbc';
    }
  }

  // SSO methods
  generateSSOAuthUrl(providerId: string, redirectUri: string, state: string): string {
    console.log('LOG: SECURITY-SSO-3 - Generating SSO auth URL for provider:', providerId);
    
    const provider = this.ssoProviders.get(providerId);
    if (!provider) {
      throw new Error(`SSO provider ${providerId} not found`);
    }

    const params = new URLSearchParams({
      client_id: provider.client_id,
      redirect_uri: redirectUri,
      scope: provider.scopes.join(' '),
      response_type: 'code',
      state: state
    });

    const authUrl = `${provider.auth_url}?${params.toString()}`;
    console.log('LOG: SECURITY-SSO-4 - SSO auth URL generated');
    return authUrl;
  }

  async exchangeCodeForToken(providerId: string, code: string, redirectUri: string): Promise<any> {
    console.log('LOG: SECURITY-SSO-5 - Exchanging code for token');
    
    const provider = this.ssoProviders.get(providerId);
    if (!provider) {
      throw new Error(`SSO provider ${providerId} not found`);
    }

    try {
      const response = await fetch(provider.token_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: provider.client_id,
          client_secret: process.env[`${providerId.toUpperCase()}_CLIENT_SECRET`] || 'test-secret',
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await response.json();
      console.log('LOG: SECURITY-SSO-6 - Token exchange successful');
      return tokenData;
    } catch (error) {
      console.error('LOG: SECURITY-SSO-ERROR-1 - Token exchange failed:', error);
      throw new Error('SSO token exchange failed');
    }
  }

  // Enhanced bias detection
  async performBiasCheck(content: string, checkLevel: 'basic' | 'advanced' | 'comprehensive'): Promise<BiasCheckResult> {
    console.log('LOG: SECURITY-BIAS-3 - Performing bias check with level:', checkLevel);
    
    try {
      const result: BiasCheckResult = {
        passed: true,
        confidence: 0,
        bias_score: 0,
        detected_biases: [],
        recommendations: [],
        check_level: checkLevel
      };

      // Basic keyword-based detection
      result.bias_score = this.calculateKeywordBiasScore(content);
      
      if (checkLevel === 'advanced' || checkLevel === 'comprehensive') {
        // Advanced pattern detection
        const patternBias = this.detectBiasPatterns(content);
        result.bias_score = Math.max(result.bias_score, patternBias.score);
        result.detected_biases.push(...patternBias.types);
      }

      if (checkLevel === 'comprehensive') {
        // Comprehensive semantic analysis
        const semanticBias = await this.performSemanticBiasAnalysis(content);
        result.bias_score = Math.max(result.bias_score, semanticBias.score);
        result.detected_biases.push(...semanticBias.types);
        result.recommendations.push(...semanticBias.recommendations);
      }

      result.passed = result.bias_score < this.getBiasThreshold(checkLevel);
      result.confidence = this.calculateConfidence(result.bias_score, checkLevel);

      console.log('LOG: SECURITY-BIAS-4 - Bias check completed:', result.passed, 'Score:', result.bias_score);
      return result;
    } catch (error) {
      console.error('LOG: SECURITY-BIAS-ERROR-1 - Bias check failed:', error);
      throw new Error('Bias detection failed');
    }
  }

  private calculateKeywordBiasScore(content: string): number {
    const lowerContent = content.toLowerCase();
    let score = 0;

    for (const [category, keywords] of this.biasKeywords.entries()) {
      for (const keyword of keywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          score += 20;
          console.log('LOG: SECURITY-BIAS-5 - Detected bias keyword:', keyword, 'Category:', category);
        }
      }
    }

    return Math.min(100, score);
  }

  private detectBiasPatterns(content: string): { score: number; types: string[] } {
    console.log('LOG: SECURITY-BIAS-6 - Detecting bias patterns');
    
    const patterns = [
      { regex: /\b(all|every|no)\s+(men|women|people)\s+(are|do|have)\b/gi, type: 'generalization', weight: 15 },
      { regex: /\b(typical|stereotypical)\s+\w+\b/gi, type: 'stereotyping', weight: 20 },
      { regex: /\b(obviously|clearly|everyone knows)\b/gi, type: 'assumption', weight: 10 },
      { regex: /\b(should|must|need to)\s+(act|behave|be)\s+like\b/gi, type: 'prescriptive', weight: 18 }
    ];

    let score = 0;
    const detectedTypes: string[] = [];

    patterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      if (matches) {
        score += matches.length * pattern.weight;
        detectedTypes.push(pattern.type);
        console.log('LOG: SECURITY-BIAS-7 - Pattern detected:', pattern.type, 'Matches:', matches.length);
      }
    });

    return { score: Math.min(100, score), types: [...new Set(detectedTypes)] };
  }

  private async performSemanticBiasAnalysis(content: string): Promise<{ score: number; types: string[]; recommendations: string[] }> {
    console.log('LOG: SECURITY-BIAS-8 - Performing semantic bias analysis');
    
    // Simulate advanced semantic analysis (in production, would use NLP models)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    let semanticScore = 0;
    const types: string[] = [];
    const recommendations: string[] = [];

    for (const sentence of sentences) {
      const sentiment = this.analyzeSentenceSentiment(sentence);
      const context = this.analyzeContext(sentence);
      
      if (sentiment.bias_indicators > 0) {
        semanticScore += sentiment.bias_indicators * 8;
        types.push('sentiment_bias');
      }
      
      if (context.problematic_framing) {
        semanticScore += 12;
        types.push('framing_bias');
        recommendations.push('Consider reframing statements to be more inclusive');
      }
    }

    if (semanticScore > 30) {
      recommendations.push('Review content for balanced perspectives');
    }

    return { 
      score: Math.min(100, semanticScore), 
      types: [...new Set(types)], 
      recommendations: [...new Set(recommendations)]
    };
  }

  private analyzeSentenceSentiment(sentence: string): { bias_indicators: number } {
    const biasIndicators = [
      'inherently', 'naturally', 'born to', 'designed for',
      'can\'t help but', 'it\'s in their nature'
    ];
    
    const lowerSentence = sentence.toLowerCase();
    const indicators = biasIndicators.filter(indicator => lowerSentence.includes(indicator));
    
    return { bias_indicators: indicators.length };
  }

  private analyzeContext(sentence: string): { problematic_framing: boolean } {
    const problematicFrames = [
      /\b(unlike|different from)\s+(other|normal|regular)\s+\w+/gi,
      /\b(special case|exception|not like)\s+\w+/gi,
      /\b(for a|considering they are)\s+\w+/gi
    ];

    return {
      problematic_framing: problematicFrames.some(pattern => pattern.test(sentence))
    };
  }

  private getBiasThreshold(level: string): number {
    switch (level) {
      case 'comprehensive': return 15;
      case 'advanced': return 25;
      case 'basic': return 40;
      default: return 40;
    }
  }

  private calculateConfidence(biasScore: number, level: string): number {
    const baseConfidence = level === 'comprehensive' ? 85 : level === 'advanced' ? 70 : 60;
    const scoreAdjustment = Math.min(20, biasScore * 0.5);
    return Math.max(30, baseConfidence - scoreAdjustment);
  }

  // Security tier management
  getSecurityTier(tierId: string): SecurityTier | null {
    return this.securityTiers.get(tierId) || null;
  }

  getUserSecurityFeatures(userTierId: string): SecurityTier['features'] | null {
    const tier = this.getSecurityTier(userTierId);
    return tier ? tier.features : null;
  }

  canUserAccessFeature(userTierId: string, feature: keyof SecurityTier['features']): boolean {
    console.log('LOG: SECURITY-ACCESS-1 - Checking feature access:', feature, 'for tier:', userTierId);
    
    const features = this.getUserSecurityFeatures(userTierId);
    if (!features) return false;
    
    const hasAccess = Boolean(features[feature]);
    console.log('LOG: SECURITY-ACCESS-2 - Feature access result:', hasAccess);
    return hasAccess;
  }

  // SSO provider management
  getSSOProvider(providerId: string): SSOProvider | null {
    return this.ssoProviders.get(providerId) || null;
  }

  getAvailableSSOProviders(userTierId: string): SSOProvider[] {
    if (!this.canUserAccessFeature(userTierId, 'sso_enabled')) {
      return [];
    }
    return Array.from(this.ssoProviders.values());
  }

  // Rate limiting
  checkRateLimit(userTierId: string, currentRequests: number): boolean {
    console.log('LOG: SECURITY-RATE-1 - Checking rate limit for tier:', userTierId);
    
    const features = this.getUserSecurityFeatures(userTierId);
    if (!features) return false;
    
    const withinLimit = currentRequests < features.api_rate_limit;
    console.log('LOG: SECURITY-RATE-2 - Rate limit check:', withinLimit, 'Requests:', currentRequests, 'Limit:', features.api_rate_limit);
    return withinLimit;
  }

  // Audit logging
  async logSecurityEvent(event: {
    user_id?: string;
    event_type: string;
    details: any;
    status: 'success' | 'failure';
    source: string;
  }): Promise<void> {
    console.log('LOG: SECURITY-AUDIT-1 - Logging security event:', event.event_type);
    
    try {
      // In production, this would write to audit_logs table
      const auditEntry = {
        id: this.generateAuditId(),
        timestamp: new Date().toISOString(),
        user_id: event.user_id,
        event_type: event.event_type,
        entity_type: 'security',
        entity_id: event.user_id || 'system',
        details: JSON.stringify(event.details),
        source: event.source,
        status: event.status,
        error_message: event.status === 'failure' ? event.details.error : null
      };

      // Mock storage (in production, use database)
      if (typeof global !== 'undefined') {
        global.auditLogs = global.auditLogs || [];
        global.auditLogs.push(auditEntry);
      }

      console.log('LOG: SECURITY-AUDIT-2 - Security event logged successfully');
    } catch (error) {
      console.error('LOG: SECURITY-AUDIT-ERROR-1 - Failed to log security event:', error);
    }
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  // Security validation
  validateSecurityCompliance(userTierId: string, operation: string): { allowed: boolean; reason?: string } {
    console.log('LOG: SECURITY-VALIDATE-1 - Validating security compliance for operation:', operation);
    
    const features = this.getUserSecurityFeatures(userTierId);
    if (!features) {
      return { allowed: false, reason: 'Invalid user tier' };
    }

    // Check MFA requirement for sensitive operations
    if (features.mfa_required && ['payment', 'tier_change', 'data_export'].includes(operation)) {
      return { allowed: false, reason: 'MFA required for this operation' };
    }

    // Check encryption level for data operations
    if (operation === 'data_export' && features.encryption_level === 'basic') {
      return { allowed: false, reason: 'Higher encryption level required for data export' };
    }

    console.log('LOG: SECURITY-VALIDATE-2 - Security compliance validated successfully');
    return { allowed: true };
  }
}

// Export singleton instance
export const securityManager = new SecurityManager();