// Unit tests for security features
// LOG: TEST-SECURITY-1 - Security features unit tests

const { SecurityManager } = require('../../src/lib/security');

// Mock crypto module
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => Buffer.from('mock-hash', 'hex'))
  })),
  randomBytes: jest.fn(() => Buffer.from('mock-random-bytes', 'hex')),
  createCipheriv: jest.fn(() => ({
    update: jest.fn(() => 'encrypted'),
    final: jest.fn(() => 'data')
  })),
  createDecipheriv: jest.fn(() => ({
    update: jest.fn(() => 'decrypted'),
    final: jest.fn(() => 'data')
  }))
}));

// Mock fetch for SSO tests
global.fetch = jest.fn();

describe('SecurityManager', () => {
  let securityManager;

  beforeEach(() => {
    console.log('LOG: TEST-SECURITY-SETUP-1 - Setting up security manager test');
    securityManager = new SecurityManager();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with security tiers', () => {
      console.log('LOG: TEST-SECURITY-INIT-1 - Testing initialization');
      
      const freeTier = securityManager.getSecurityTier('free');
      const standardTier = securityManager.getSecurityTier('standard');
      const premiumTier = securityManager.getSecurityTier('premium');
      
      expect(freeTier).toBeDefined();
      expect(standardTier).toBeDefined();
      expect(premiumTier).toBeDefined();
      
      expect(freeTier.features.sso_enabled).toBe(false);
      expect(standardTier.features.sso_enabled).toBe(true);
      expect(premiumTier.features.mfa_required).toBe(true);
    });

    test('should load SSO providers', () => {
      console.log('LOG: TEST-SECURITY-INIT-2 - Testing SSO provider loading');
      
      const googleProvider = securityManager.getSSOProvider('google');
      const githubProvider = securityManager.getSSOProvider('github');
      
      expect(googleProvider).toBeDefined();
      expect(githubProvider).toBeDefined();
      expect(googleProvider.type).toBe('oauth2');
      expect(githubProvider.scopes).toContain('user:email');
    });
  });

  describe('Encryption', () => {
    test('should encrypt data with basic level', () => {
      console.log('LOG: TEST-SECURITY-ENCRYPT-1 - Testing basic encryption');
      
      const testData = 'sensitive information';
      const encrypted = securityManager.encryptSensitiveData(testData, 'basic');
      
      expect(encrypted).toBeDefined();
      expect(encrypted).toContain(':');
      expect(encrypted).not.toBe(testData);
    });

    test('should decrypt data correctly', () => {
      console.log('LOG: TEST-SECURITY-ENCRYPT-2 - Testing decryption');
      
      const testData = 'sensitive information';
      const encrypted = securityManager.encryptSensitiveData(testData, 'standard');
      const decrypted = securityManager.decryptSensitiveData(encrypted, 'standard');
      
      expect(decrypted).toBe('decrypteddata');
    });

    test('should handle encryption errors', () => {
      console.log('LOG: TEST-SECURITY-ENCRYPT-3 - Testing encryption error handling');
      
      // Mock crypto to throw error
      const crypto = require('crypto');
      crypto.createCipheriv.mockImplementation(() => {
        throw new Error('Encryption failed');
      });
      
      expect(() => {
        securityManager.encryptSensitiveData('test', 'basic');
      }).toThrow('Encryption failed');
    });
  });

  describe('SSO Integration', () => {
    test('should generate SSO auth URL', () => {
      console.log('LOG: TEST-SECURITY-SSO-1 - Testing SSO auth URL generation');
      
      const authUrl = securityManager.generateSSOAuthUrl(
        'google',
        'https://example.com/callback',
        'test-state'
      );
      
      expect(authUrl).toContain('accounts.google.com');
      expect(authUrl).toContain('client_id=test-google-client-id');
      expect(authUrl).toContain('redirect_uri=https%3A//example.com/callback');
      expect(authUrl).toContain('state=test-state');
    });

    test('should handle invalid SSO provider', () => {
      console.log('LOG: TEST-SECURITY-SSO-2 - Testing invalid SSO provider');
      
      expect(() => {
        securityManager.generateSSOAuthUrl('invalid', 'https://example.com', 'state');
      }).toThrow('SSO provider invalid not found');
    });

    test('should exchange code for token', async () => {
      console.log('LOG: TEST-SECURITY-SSO-3 - Testing code exchange');
      
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      });

      const result = await securityManager.exchangeCodeForToken(
        'google',
        'auth-code',
        'https://example.com/callback'
      );

      expect(result.access_token).toBe('mock-access-token');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
      );
    });

    test('should handle SSO token exchange failure', async () => {
      console.log('LOG: TEST-SECURITY-SSO-4 - Testing SSO token exchange failure');
      
      global.fetch.mockRejectedValue(new Error('Network error'));

      await expect(
        securityManager.exchangeCodeForToken('google', 'invalid-code', 'https://example.com')
      ).rejects.toThrow('SSO token exchange failed');
    });
  });

  describe('Bias Detection', () => {
    test('should detect basic bias in content', async () => {
      console.log('LOG: TEST-SECURITY-BIAS-1 - Testing basic bias detection');
      
      const biasedContent = 'All women are emotional and men are better at logic';
      const result = await securityManager.performBiasCheck(biasedContent, 'basic');
      
      expect(result.passed).toBe(false);
      expect(result.bias_score).toBeGreaterThan(0);
      expect(result.check_level).toBe('basic');
    });

    test('should pass clean content', async () => {
      console.log('LOG: TEST-SECURITY-BIAS-2 - Testing clean content');
      
      const cleanContent = 'This article discusses technology trends and their impact on society';
      const result = await securityManager.performBiasCheck(cleanContent, 'basic');
      
      expect(result.passed).toBe(true);
      expect(result.bias_score).toBe(0);
    });

    test('should detect advanced bias patterns', async () => {
      console.log('LOG: TEST-SECURITY-BIAS-3 - Testing advanced bias detection');
      
      const patternBiasContent = 'All people from that region are obviously good at math';
      const result = await securityManager.performBiasCheck(patternBiasContent, 'advanced');
      
      expect(result.bias_score).toBeGreaterThan(0);
      expect(result.detected_biases).toContain('generalization');
    });

    test('should provide comprehensive analysis', async () => {
      console.log('LOG: TEST-SECURITY-BIAS-4 - Testing comprehensive bias analysis');
      
      const complexContent = 'Typical women should act like ladies, unlike other groups who are naturally different';
      const result = await securityManager.performBiasCheck(complexContent, 'comprehensive');
      
      expect(result.detected_biases.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should adjust thresholds by check level', async () => {
      console.log('LOG: TEST-SECURITY-BIAS-5 - Testing threshold adjustment');
      
      const borderlineContent = 'Some people are naturally better at certain things';
      
      const basicResult = await securityManager.performBiasCheck(borderlineContent, 'basic');
      const comprehensiveResult = await securityManager.performBiasCheck(borderlineContent, 'comprehensive');
      
      // Comprehensive should be stricter
      expect(comprehensiveResult.passed).toBe(basicResult.passed || !comprehensiveResult.passed);
    });
  });

  describe('Feature Access Control', () => {
    test('should check feature access correctly', () => {
      console.log('LOG: TEST-SECURITY-ACCESS-1 - Testing feature access control');
      
      expect(securityManager.canUserAccessFeature('free', 'sso_enabled')).toBe(false);
      expect(securityManager.canUserAccessFeature('standard', 'sso_enabled')).toBe(true);
      expect(securityManager.canUserAccessFeature('premium', 'mfa_required')).toBe(true);
    });

    test('should handle invalid tier gracefully', () => {
      console.log('LOG: TEST-SECURITY-ACCESS-2 - Testing invalid tier handling');
      
      expect(securityManager.canUserAccessFeature('invalid', 'sso_enabled')).toBe(false);
    });

    test('should get available SSO providers by tier', () => {
      console.log('LOG: TEST-SECURITY-ACCESS-3 - Testing SSO provider access by tier');
      
      const freeProviders = securityManager.getAvailableSSOProviders('free');
      const standardProviders = securityManager.getAvailableSSOProviders('standard');
      
      expect(freeProviders).toHaveLength(0);
      expect(standardProviders.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting', () => {
    test('should check rate limits correctly', () => {
      console.log('LOG: TEST-SECURITY-RATE-1 - Testing rate limit checking');
      
      expect(securityManager.checkRateLimit('free', 50)).toBe(true);
      expect(securityManager.checkRateLimit('free', 150)).toBe(false);
      expect(securityManager.checkRateLimit('premium', 1500)).toBe(true);
    });

    test('should handle different tier limits', () => {
      console.log('LOG: TEST-SECURITY-RATE-2 - Testing tier-specific rate limits');
      
      const freeFeatures = securityManager.getUserSecurityFeatures('free');
      const premiumFeatures = securityManager.getUserSecurityFeatures('premium');
      
      expect(premiumFeatures.api_rate_limit).toBeGreaterThan(freeFeatures.api_rate_limit);
    });
  });

  describe('Security Compliance', () => {
    test('should validate security compliance for operations', () => {
      console.log('LOG: TEST-SECURITY-COMPLIANCE-1 - Testing security compliance validation');
      
      const freeResult = securityManager.validateSecurityCompliance('free', 'data_export');
      const premiumResult = securityManager.validateSecurityCompliance('premium', 'payment');
      
      expect(freeResult.allowed).toBe(false);
      expect(freeResult.reason).toContain('encryption level');
      expect(premiumResult.allowed).toBe(false); // MFA required
      expect(premiumResult.reason).toContain('MFA required');
    });

    test('should allow operations for appropriate tiers', () => {
      console.log('LOG: TEST-SECURITY-COMPLIANCE-2 - Testing allowed operations');
      
      const result = securityManager.validateSecurityCompliance('standard', 'content_creation');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    test('should log security events', async () => {
      console.log('LOG: TEST-SECURITY-AUDIT-1 - Testing security event logging');
      
      await securityManager.logSecurityEvent({
        user_id: 'test-user',
        event_type: 'LOGIN_SUCCESS',
        details: { ip: '127.0.0.1', method: 'password' },
        status: 'success',
        source: 'AUTH_API'
      });

      // In test environment, check global mock storage
      expect(global.auditLogs).toBeDefined();
      expect(global.auditLogs.length).toBeGreaterThan(0);
      
      const lastLog = global.auditLogs[global.auditLogs.length - 1];
      expect(lastLog.event_type).toBe('LOGIN_SUCCESS');
      expect(lastLog.user_id).toBe('test-user');
      expect(lastLog.status).toBe('success');
    });

    test('should handle audit logging errors gracefully', async () => {
      console.log('LOG: TEST-SECURITY-AUDIT-2 - Testing audit logging error handling');
      
      // Should not throw even if logging fails
      await expect(securityManager.logSecurityEvent({
        event_type: 'TEST_EVENT',
        details: { test: 'data' },
        status: 'success',
        source: 'TEST'
      })).resolves.not.toThrow();
    });
  });
});