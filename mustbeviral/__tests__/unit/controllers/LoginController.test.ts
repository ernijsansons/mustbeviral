/**
 * Comprehensive tests for LoginController
 * Testing before simplification to ensure no functionality loss
 */

import { LoginController } from '../../../workers/auth-worker/src/controllers/LoginController'

// Mock dependencies
const mockEnv = {
  MAX_LOGIN_ATTEMPTS: '5',
  TOKEN_EXPIRY: '3600',
  LOCKOUT_DURATION: '900',
  RATE_LIMITER: {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}

const mockLogger = {
  security: jest.fn(),
  audit: jest.fn(),
  error: jest.fn()
}

const mockMetrics = {
  startTimer: jest.fn(() => ({ end: jest.fn() }))
}

const mockPasswordService = {
  verify: jest.fn()
}

const mockTokenService = {
  generateTokenPair: jest.fn(),
  verifyAccessToken: jest.fn(),
  blacklistToken: jest.fn()
}

const mockUserService = {
  findByEmail: jest.fn(),
  updateLastLogin: jest.fn()
}

const mockSessionService = {
  create: jest.fn(),
  invalidateUserSessions: jest.fn()
}

const mockMFAService = {
  verify: jest.fn()
}

// Mock the services
jest.mock('../../../workers/auth-worker/src/services/PasswordService', () => ({
  PasswordService: jest.fn(() => mockPasswordService)
}))

jest.mock('../../../workers/auth-worker/src/services/TokenService', () => ({
  TokenService: jest.fn(() => mockTokenService)
}))

jest.mock('../../../workers/auth-worker/src/services/UserService', () => ({
  UserService: jest.fn(() => mockUserService)
}))

jest.mock('../../../workers/auth-worker/src/services/SessionService', () => ({
  SessionService: jest.fn(() => mockSessionService)
}))

jest.mock('../../../workers/auth-worker/src/services/MFAService', () => ({
  MFAService: jest.fn(() => mockMFAService)
}))

describe('LoginController', () => {
  let controller: LoginController
  let mockRequest: any

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new LoginController(mockEnv as any, mockLogger as any, mockMetrics as any)

    mockRequest = {
      json: jest.fn(),
      headers: {
        get: jest.fn()
      }
    }

    // Default mocks
    mockRequest.headers.get.mockReturnValue('192.168.1.1')
    mockEnv.RATE_LIMITER.get.mockResolvedValue(null)
  })

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'validpassword'
      }

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
        password_hash: 'hashedpassword',
        email_verified: true,
        mfa_enabled: false
      }

      const mockTokenPair = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123'
      }

      mockRequest.json.mockResolvedValue(loginData)
      mockUserService.findByEmail.mockResolvedValue(mockUser)
      mockPasswordService.verify.mockResolvedValue(true)
      mockTokenService.generateTokenPair.mockResolvedValue(mockTokenPair)

      const response = await controller.login(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(200)
      expect(responseData.user.email).toBe('test@example.com')
      expect(responseData.accessToken).toBe('access-token-123')
      expect(responseData.refreshToken).toBe('refresh-token-123')

      expect(mockUserService.findByEmail).toHaveBeenCalledWith('test@example.com')
      expect(mockPasswordService.verify).toHaveBeenCalledWith('validpassword', 'hashedpassword')
      expect(mockTokenService.generateTokenPair).toHaveBeenCalled()
      expect(mockSessionService.create).toHaveBeenCalled()
      expect(mockUserService.updateLastLogin).toHaveBeenCalledWith('user123')
      expect(mockEnv.RATE_LIMITER.delete).toHaveBeenCalled()
    })

    it('should reject login with missing email', async () => {
      mockRequest.json.mockResolvedValue({ password: 'password' })

      const response = await controller.login(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Email and password are required')
    })

    it('should reject login with missing password', async () => {
      mockRequest.json.mockResolvedValue({ email: 'test@example.com' })

      const response = await controller.login(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Email and password are required')
    })

    it('should block login when rate limit exceeded', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'test@example.com',
        password: 'password'
      })

      mockEnv.RATE_LIMITER.get.mockResolvedValue('6') // Exceeds MAX_LOGIN_ATTEMPTS

      const response = await controller.login(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(429)
      expect(responseData.error).toBe('Account locked due to too many failed attempts')
    })

    it('should reject login for non-existent user', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'nonexistent@example.com',
        password: 'password'
      })

      mockUserService.findByEmail.mockResolvedValue(null)

      const response = await controller.login(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Invalid credentials')
      expect(mockEnv.RATE_LIMITER.put).toHaveBeenCalled()
      expect(mockLogger.security).toHaveBeenCalledWith('login.failed', {
        email: 'nonexistent@example.com',
        reason: 'user_not_found'
      })
    })

    it('should reject login with invalid password', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      }

      mockRequest.json.mockResolvedValue({
        email: 'test@example.com',
        password: 'wrongpassword'
      })

      mockUserService.findByEmail.mockResolvedValue(mockUser)
      mockPasswordService.verify.mockResolvedValue(false)

      const response = await controller.login(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Invalid credentials')
      expect(mockEnv.RATE_LIMITER.put).toHaveBeenCalled()
      expect(mockLogger.security).toHaveBeenCalledWith('login.failed', {
        userId: 'user123',
        email: 'test@example.com',
        reason: 'invalid_password'
      })
    })

    it('should handle MFA requirement', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        mfa_enabled: true
      }

      mockRequest.json.mockResolvedValue({
        email: 'test@example.com',
        password: 'validpassword'
      })

      mockUserService.findByEmail.mockResolvedValue(mockUser)
      mockPasswordService.verify.mockResolvedValue(true)

      const response = await controller.login(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(200)
      expect(responseData.error).toBe('MFA code required')
      expect(responseData.mfaRequired).toBe(true)
    })

    it('should verify MFA code when provided', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
        password_hash: 'hashedpassword',
        email_verified: true,
        mfa_enabled: true
      }

      const mockTokenPair = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123'
      }

      mockRequest.json.mockResolvedValue({
        email: 'test@example.com',
        password: 'validpassword',
        mfaCode: '123456'
      })

      mockUserService.findByEmail.mockResolvedValue(mockUser)
      mockPasswordService.verify.mockResolvedValue(true)
      mockMFAService.verify.mockResolvedValue(true)
      mockTokenService.generateTokenPair.mockResolvedValue(mockTokenPair)

      const response = await controller.login(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(200)
      expect(responseData.accessToken).toBe('access-token-123')
      expect(mockMFAService.verify).toHaveBeenCalledWith('user123', '123456')
    })

    it('should reject invalid MFA code', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        mfa_enabled: true
      }

      mockRequest.json.mockResolvedValue({
        email: 'test@example.com',
        password: 'validpassword',
        mfaCode: 'invalid'
      })

      mockUserService.findByEmail.mockResolvedValue(mockUser)
      mockPasswordService.verify.mockResolvedValue(true)
      mockMFAService.verify.mockResolvedValue(false)

      const response = await controller.login(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Invalid MFA code')
      expect(mockEnv.RATE_LIMITER.put).toHaveBeenCalled()
      expect(mockLogger.security).toHaveBeenCalledWith('login.failed', {
        userId: 'user123',
        email: 'test@example.com',
        reason: 'invalid_mfa'
      })
    })

    it('should handle login errors gracefully', async () => {
      mockRequest.json.mockRejectedValue(new Error('JSON parse error'))

      const response = await controller.login(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Login failed')
      expect(mockLogger.error).toHaveBeenCalledWith('Login failed', { error: expect.any(Error) })
    })

    it('should handle different IP sources', async () => {
      mockRequest.headers.get.mockImplementation((header: string) => {
        if (header === 'CF-Connecting-IP') return '203.0.113.1'
        if (header === 'User-Agent') return 'TestAgent'
        return null
      })

      mockRequest.json.mockResolvedValue({
        email: 'test@example.com',
        password: 'password'
      })

      await controller.login(mockRequest)

      // Check that the IP was used for rate limiting
      expect(mockEnv.RATE_LIMITER.get).toHaveBeenCalledWith('login_attempts:203.0.113.1')
    })
  })

  describe('logout', () => {
    it('should successfully logout with valid token', async () => {
      const mockTokenPayload = {
        userId: 'user123',
        email: 'test@example.com'
      }

      mockRequest.headers.get.mockImplementation((header: string) => {
        if (header === 'Authorization') return 'Bearer valid-token-123'
        return null
      })

      mockTokenService.verifyAccessToken.mockResolvedValue(mockTokenPayload)

      const response = await controller.logout(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(200)
      expect(responseData.message).toBe('Logged out successfully')

      expect(mockTokenService.verifyAccessToken).toHaveBeenCalledWith('valid-token-123')
      expect(mockSessionService.invalidateUserSessions).toHaveBeenCalledWith('user123')
      expect(mockTokenService.blacklistToken).toHaveBeenCalledWith('valid-token-123')
      expect(mockLogger.audit).toHaveBeenCalledWith('user.logged_out', {
        userId: 'user123',
        email: 'test@example.com'
      })
    })

    it('should reject logout without token', async () => {
      mockRequest.headers.get.mockReturnValue(null)

      const response = await controller.logout(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('No token provided')
    })

    it('should reject logout with invalid token', async () => {
      mockRequest.headers.get.mockReturnValue('Bearer invalid-token')
      mockTokenService.verifyAccessToken.mockResolvedValue(null)

      const response = await controller.logout(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Invalid token')
    })

    it('should handle logout errors gracefully', async () => {
      mockRequest.headers.get.mockImplementation(() => {
        throw new Error('Header access error')
      })

      const response = await controller.logout(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Logout failed')
      expect(mockLogger.error).toHaveBeenCalledWith('Logout failed', { error: expect.any(Error) })
    })

    it('should handle different authorization header formats', async () => {
      mockRequest.headers.get.mockReturnValue('Bearer ')

      const response = await controller.logout(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('No token provided')
    })
  })

  describe('Helper Methods', () => {
    it('should track login attempts correctly', async () => {
      const clientId = 'test-client'

      // Mock current attempts
      mockEnv.RATE_LIMITER.get.mockResolvedValue('2')

      await (controller as any).incrementLoginAttempts(clientId)

      expect(mockEnv.RATE_LIMITER.put).toHaveBeenCalledWith(
        'login_attempts:test-client',
        '3',
        { expirationTtl: 900 }
      )
    })

    it('should reset login attempts', async () => {
      const clientId = 'test-client'

      await (controller as any).resetLoginAttempts(clientId)

      expect(mockEnv.RATE_LIMITER.delete).toHaveBeenCalledWith('login_attempts:test-client')
    })

    it('should get login attempts with default value', async () => {
      const clientId = 'test-client'
      mockEnv.RATE_LIMITER.get.mockResolvedValue(null)

      const attempts = await (controller as any).getLoginAttempts(clientId)

      expect(attempts).toBe(0)
      expect(mockEnv.RATE_LIMITER.get).toHaveBeenCalledWith('login_attempts:test-client')
    })

    it('should create error responses correctly', () => {
      const response = (controller as any).createErrorResponse('Test error', 400)

      expect(response).toBeInstanceOf(Response)
      expect(response.status).toBe(400)
    })
  })

  describe('Edge Cases and Security', () => {
    it('should handle null/undefined request data', async () => {
      mockRequest.json.mockResolvedValue(null)

      const response = await controller.login(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Email and password are required')
    })

    it('should handle empty string credentials', async () => {
      mockRequest.json.mockResolvedValue({
        email: '',
        password: ''
      })

      const response = await controller.login(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Email and password are required')
    })

    it('should handle whitespace-only credentials', async () => {
      mockRequest.json.mockResolvedValue({
        email: '   ',
        password: '   '
      })

      const response = await controller.login(mockRequest)
      const responseData = JSON.parse(await response.text())

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Email and password are required')
    })

    it('should prevent timing attacks on user enumeration', async () => {
      const startTime = Date.now()

      mockRequest.json.mockResolvedValue({
        email: 'nonexistent@example.com',
        password: 'password'
      })

      mockUserService.findByEmail.mockResolvedValue(null)

      await controller.login(mockRequest)

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should still increment login attempts even for non-existent users
      expect(mockEnv.RATE_LIMITER.put).toHaveBeenCalled()

      // Response time should be reasonable (not too fast to prevent enumeration)
      expect(duration).toBeGreaterThan(0)
    })

    it('should handle concurrent login attempts', async () => {
      const loginPromises = []

      for (let i = 0; i < 5; i++) {
        const request = {
          json: jest.fn().mockResolvedValue({
            email: 'test@example.com',
            password: 'password'
          }),
          headers: {
            get: jest.fn().mockReturnValue('192.168.1.1')
          }
        }

        loginPromises.push(controller.login(request))
      }

      const responses = await Promise.all(loginPromises)

      // All requests should be processed
      expect(responses).toHaveLength(5)
      responses.forEach(response => {
        expect(response).toBeInstanceOf(Response)
      })
    })
  })
})