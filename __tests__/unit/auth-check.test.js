// Unit tests for auth check API
// LOG: TEST-AUTH-CHECK-1 - Auth check API unit tests

const { POST, GET } = require('../../src/app/api/auth-check/route');

// Mock dependencies
jest.mock('../../src/lib/auth', () => ({
  AuthService: {
    verifyToken: jest.fn(),
    generateToken: jest.fn(),
    hashPassword: jest.fn()
  }
}));

jest.mock('../../src/lib/security', () => ({
  securityManager: {
    validateSecurityCompliance: jest.fn(),
    canUserAccessFeature: jest.fn(),
    generateSSOAuthUrl: jest.fn(),
    exchangeCodeForToken: jest.fn(),
    getSSOProvider: jest.fn(),
    checkRateLimit: jest.fn(),
    getUserSecurityFeatures: jest.fn(),
    getAvailableSSOProviders: jest.fn(),
    logSecurityEvent: jest.fn()
  }
}));

jest.mock('../../src/lib/db', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    getUserByEmail: jest.fn(),
    createUser: jest.fn()
  }))
}));

// Mock fetch
global.fetch = jest.fn();

describe('Auth Check API', () => {
  let mockRequest;
  const { AuthService } = require('../../src/lib/auth');
  const { securityManager } = require('../../src/lib/security');

  beforeEach(() => {
    console.log('LOG: TEST-AUTH-CHECK-SETUP-1 - Setting up auth check API test');
    
    mockRequest = {
      json: jest.fn(),
      url: 'http://localhost:3000/api/auth-check'
    };
    
    jest.clearAllMocks();
  });

  describe('Token Verification', () => {
    test('should verify valid token successfully', async () => {
      console.log('LOG: TEST-AUTH-CHECK-TOKEN-1 - Testing valid token verification');
      
      mockRequest.json.mockResolvedValue({
        action: 'verify_token',
        token: 'valid-jwt-token'
      });

      AuthService.verifyToken.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'creator'
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
      expect(result.data.user.id).toBe('user123');
      expect(securityManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'TOKEN_VERIFIED',
          status: 'success'
        })
      );
    });

    test('should reject invalid token', async () => {
      console.log('LOG: TEST-AUTH-CHECK-TOKEN-2 - Testing invalid token rejection');
      
      mockRequest.json.mockResolvedValue({
        action: 'verify_token',
        token: 'invalid-token'
      });

      AuthService.verifyToken.mockResolvedValue(null);

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired token');
      expect(securityManager.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'TOKEN_VERIFICATION_FAILED',
          status: 'failure'
        })
      );
    });

    test('should handle missing token', async () => {
      console.log('LOG: TEST-AUTH-CHECK-TOKEN-3 - Testing missing token');
      
      mockRequest.json.mockResolvedValue({
        action: 'verify_token'
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token required for verification');
    });
  });

  describe('Permission Checks', () => {
    test('should check permissions successfully', async () => {
      console.log('LOG: TEST-AUTH-CHECK-PERM-1 - Testing permission check');
      
      mockRequest.json.mockResolvedValue({
        action: 'check_permissions',
        user_id: 'user123',
        operation: 'content_creation'
      });

      securityManager.validateSecurityCompliance.mockReturnValue({
        allowed: true
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.allowed).toBe(true);
      expect(result.data.operation).toBe('content_creation');
    });

    test('should deny restricted operations', async () => {
      console.log('LOG: TEST-AUTH-CHECK-PERM-2 - Testing restricted operation denial');
      
      mockRequest.json.mockResolvedValue({
        action: 'check_permissions',
        user_id: 'user123',
        operation: 'data_export'
      });

      securityManager.validateSecurityCompliance.mockReturnValue({
        allowed: false,
        reason: 'Higher encryption level required'
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.allowed).toBe(false);
      expect(result.data.reason).toContain('encryption level');
    });
  });

  describe('SSO Authentication', () => {
    test('should generate SSO auth URL', async () => {
      console.log('LOG: TEST-AUTH-CHECK-SSO-1 - Testing SSO auth URL generation');
      
      mockRequest.json.mockResolvedValue({
        action: 'sso_auth_url',
        sso_provider: 'google',
        redirect_uri: 'https://example.com/callback',
        user_id: 'user123'
      });

      securityManager.canUserAccessFeature.mockReturnValue(true);
      securityManager.generateSSOAuthUrl.mockReturnValue('https://accounts.google.com/oauth2/auth?...');

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.auth_url).toContain('accounts.google.com');
      expect(result.data.provider).toBe('google');
    });

    test('should handle SSO callback', async () => {
      console.log('LOG: TEST-AUTH-CHECK-SSO-2 - Testing SSO callback handling');
      
      mockRequest.json.mockResolvedValue({
        action: 'sso_callback',
        sso_provider: 'google',
        sso_code: 'auth-code-123',
        redirect_uri: 'https://example.com/callback'
      });

      securityManager.exchangeCodeForToken.mockResolvedValue({
        access_token: 'access-token'
      });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'google-user-123',
          email: 'user@gmail.com',
          name: 'Test User'
        })
      });

      const { DatabaseService } = require('../../src/lib/db');
      const mockDbService = new DatabaseService();
      mockDbService.getUserByEmail.mockResolvedValue(null);
      mockDbService.createUser.mockResolvedValue({
        id: 'new-user-123',
        email: 'user@gmail.com',
        username: 'user',
        role: 'creator'
      });

      AuthService.generateToken.mockResolvedValue('jwt-token');

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
      expect(result.data.token).toBe('jwt-token');
    });
  });

  describe('Rate Limiting', () => {
    test('should check rate limits', async () => {
      console.log('LOG: TEST-AUTH-CHECK-RATE-1 - Testing rate limit check');
      
      mockRequest.json.mockResolvedValue({
        action: 'rate_limit_check',
        user_id: 'user123'
      });

      securityManager.checkRateLimit.mockReturnValue(true);
      securityManager.getUserSecurityFeatures.mockReturnValue({
        api_rate_limit: 500
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.within_limit).toBe(true);
      expect(result.data.limit).toBe(500);
    });
  });

  describe('GET Requests', () => {
    test('should get user auth status', async () => {
      console.log('LOG: TEST-AUTH-CHECK-GET-1 - Testing get auth status');
      
      const mockGetRequest = {
        url: 'http://localhost:3000/api/auth-check?user_id=user123&check_type=status'
      };

      securityManager.getUserSecurityFeatures.mockReturnValue({
        sso_enabled: true,
        mfa_required: false
      });

      const response = await GET(mockGetRequest);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.user_id).toBe('user123');
      expect(result.data.security_features).toBeDefined();
    });

    test('should get available SSO providers', async () => {
      console.log('LOG: TEST-AUTH-CHECK-GET-2 - Testing get SSO providers');
      
      const mockGetRequest = {
        url: 'http://localhost:3000/api/auth-check?user_id=user123&check_type=sso_providers'
      };

      securityManager.canUserAccessFeature.mockReturnValue(true);
      securityManager.getAvailableSSOProviders.mockReturnValue([
        { id: 'google', name: 'Google', type: 'oauth2' }
      ]);

      const response = await GET(mockGetRequest);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.sso_enabled).toBe(true);
      expect(result.data.providers).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing required parameters', async () => {
      console.log('LOG: TEST-AUTH-CHECK-ERROR-1 - Testing missing parameters');
      
      mockRequest.json.mockResolvedValue({});

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameter: action');
    });

    test('should handle invalid actions', async () => {
      console.log('LOG: TEST-AUTH-CHECK-ERROR-2 - Testing invalid actions');
      
      mockRequest.json.mockResolvedValue({
        action: 'invalid_action'
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid action');
    });
  });
});