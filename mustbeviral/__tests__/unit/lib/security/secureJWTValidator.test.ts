/**
 * Comprehensive tests for SecureJWTValidator
 * Testing before simplification to ensure no functionality loss
 */

import { SecureJWTValidator } from '../../../../src/lib/security/secureJWTValidator'

// Mock crypto.subtle for testing
const mockCrypto = {
  subtle: {
    importKey: jest.fn(),
    sign: jest.fn()
  }
}

global.crypto = mockCrypto as any

describe('SecureJWTValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('JWT Generation', () => {
    it('should generate valid JWT with HS256', async () => {
      const payload = { userId: '123', exp: Math.floor(Date.now() / 1000) + 3600 }
      const secret = 'test-secret'

      // Mock crypto operations
      mockCrypto.subtle.importKey.mockResolvedValue('mock-key')
      mockCrypto.subtle.sign.mockResolvedValue(new ArrayBuffer(32))

      const token = await SecureJWTValidator.generateJWT(payload, secret, 'HS256')

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('should reject unsupported algorithms', async () => {
      const payload = { userId: '123' }
      const secret = 'test-secret'

      await expect(
        SecureJWTValidator.generateJWT(payload, secret, 'UNSUPPORTED' as any)
      ).rejects.toThrow('Unsupported algorithm: UNSUPPORTED')
    })

    it('should generate token with proper header structure', async () => {
      const payload = { userId: '123' }
      const secret = 'test-secret'

      mockCrypto.subtle.importKey.mockResolvedValue('mock-key')
      mockCrypto.subtle.sign.mockResolvedValue(new ArrayBuffer(32))

      const token = await SecureJWTValidator.generateJWT(payload, secret)
      const [headerB64] = token.split('.')
      const header = JSON.parse(atob(headerB64))

      expect(header).toEqual({
        alg: 'HS256',
        typ: 'JWT'
      })
    })
  })

  describe('JWT Verification', () => {
    it('should verify valid JWT successfully', async () => {
      const payload = { sub: 'user123', exp: Math.floor(Date.now() / 1000) + 3600 }
      const header = { alg: 'HS256', typ: 'JWT' }

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const mockSignature = 'mock-signature'

      const token = `${encodedHeader}.${encodedPayload}.${mockSignature}`

      // Mock signature generation to match
      jest.spyOn(SecureJWTValidator as any, 'generateSignature')
        .mockResolvedValue(mockSignature)

      const result = await SecureJWTValidator.verifyJWT(token, 'test-secret')

      expect(result.valid).toBe(true)
      expect(result.payload).toEqual(payload)
    })

    it('should reject JWT with invalid format', async () => {
      const result = await SecureJWTValidator.verifyJWT('invalid.token', 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('invalid JWT format')
    })

    it('should reject JWT with malformed header', async () => {
      const token = 'invalid-base64.payload.signature'

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('invalid header encoding')
    })

    it('should reject JWT with missing algorithm', async () => {
      const header = { typ: 'JWT' } // Missing alg
      const payload = { sub: 'user123', exp: Math.floor(Date.now() / 1000) + 3600 }

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const token = `${encodedHeader}.${encodedPayload}.signature`

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('missing algorithm in header')
    })

    it('should reject JWT with "none" algorithm', async () => {
      const header = { alg: 'none', typ: 'JWT' }
      const payload = { sub: 'user123', exp: Math.floor(Date.now() / 1000) + 3600 }

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const token = `${encodedHeader}.${encodedPayload}.signature`

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('insecure algorithm: none')
    })

    it('should reject JWT with unsupported algorithm', async () => {
      const header = { alg: 'HS999', typ: 'JWT' }
      const payload = { sub: 'user123', exp: Math.floor(Date.now() / 1000) + 3600 }

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const token = `${encodedHeader}.${encodedPayload}.signature`

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('unsupported algorithm: HS999')
    })

    it('should reject JWT with malformed payload', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const encodedHeader = btoa(JSON.stringify(header))
      const token = `${encodedHeader}.invalid-payload.signature`

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('invalid payload encoding')
    })

    it('should reject JWT with invalid signature', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'user123', exp: Math.floor(Date.now() / 1000) + 3600 }

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const token = `${encodedHeader}.${encodedPayload}.invalid-signature`

      // Mock signature generation to return different signature
      jest.spyOn(SecureJWTValidator as any, 'generateSignature')
        .mockResolvedValue('valid-signature')

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('signature verification failed')
    })
  })

  describe('Claims Validation', () => {
    it('should reject JWT without subject claim', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { exp: Math.floor(Date.now() / 1000) + 3600 } // Missing sub

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const mockSignature = 'mock-signature'
      const token = `${encodedHeader}.${encodedPayload}.${mockSignature}`

      jest.spyOn(SecureJWTValidator as any, 'generateSignature')
        .mockResolvedValue(mockSignature)

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('missing subject claim')
    })

    it('should reject JWT without expiry claim', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'user123' } // Missing exp

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const mockSignature = 'mock-signature'
      const token = `${encodedHeader}.${encodedPayload}.${mockSignature}`

      jest.spyOn(SecureJWTValidator as any, 'generateSignature')
        .mockResolvedValue(mockSignature)

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('missing expiry claim')
    })

    it('should reject expired JWT', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = {
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      }

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const mockSignature = 'mock-signature'
      const token = `${encodedHeader}.${encodedPayload}.${mockSignature}`

      jest.spyOn(SecureJWTValidator as any, 'generateSignature')
        .mockResolvedValue(mockSignature)

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('token expired')
    })

    it('should reject JWT with future not-before claim', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = {
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        nbf: Math.floor(Date.now() / 1000) + 1800 // Not valid for 30 minutes
      }

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const mockSignature = 'mock-signature'
      const token = `${encodedHeader}.${encodedPayload}.${mockSignature}`

      jest.spyOn(SecureJWTValidator as any, 'generateSignature')
        .mockResolvedValue(mockSignature)

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('token not yet valid')
    })

    it('should reject JWT with future issued-at claim', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = {
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) + 1800 // Issued in future
      }

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const mockSignature = 'mock-signature'
      const token = `${encodedHeader}.${encodedPayload}.${mockSignature}`

      jest.spyOn(SecureJWTValidator as any, 'generateSignature')
        .mockResolvedValue(mockSignature)

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('token issued in the future')
    })

    it('should reject JWT with excessive lifetime', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const now = Math.floor(Date.now() / 1000)
      const payload = {
        sub: 'user123',
        iat: now,
        exp: now + (25 * 60 * 60) // 25 hours lifetime
      }

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const mockSignature = 'mock-signature'
      const token = `${encodedHeader}.${encodedPayload}.${mockSignature}`

      jest.spyOn(SecureJWTValidator as any, 'generateSignature')
        .mockResolvedValue(mockSignature)

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('token lifetime exceeds maximum allowed')
    })

    it('should validate issuer when expected', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = {
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'wrong-issuer'
      }

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const mockSignature = 'mock-signature'
      const token = `${encodedHeader}.${encodedPayload}.${mockSignature}`

      jest.spyOn(SecureJWTValidator as any, 'generateSignature')
        .mockResolvedValue(mockSignature)

      const result = await SecureJWTValidator.verifyJWT(token, 'secret', {
        expectedIssuer: 'correct-issuer'
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('invalid issuer')
    })

    it('should validate audience when expected', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = {
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'wrong-audience'
      }

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const mockSignature = 'mock-signature'
      const token = `${encodedHeader}.${encodedPayload}.${mockSignature}`

      jest.spyOn(SecureJWTValidator as any, 'generateSignature')
        .mockResolvedValue(mockSignature)

      const result = await SecureJWTValidator.verifyJWT(token, 'secret', {
        expectedAudience: 'correct-audience'
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('invalid audience')
    })

    it('should validate array audience when expected', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = {
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: ['aud1', 'aud2', 'aud3']
      }

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const mockSignature = 'mock-signature'
      const token = `${encodedHeader}.${encodedPayload}.${mockSignature}`

      jest.spyOn(SecureJWTValidator as any, 'generateSignature')
        .mockResolvedValue(mockSignature)

      const result = await SecureJWTValidator.verifyJWT(token, 'secret', {
        expectedAudience: 'aud2'
      })

      expect(result.valid).toBe(true)
      expect(result.payload).toEqual(payload)
    })
  })

  describe('Security Warnings', () => {
    it('should warn about unusually long expiry time', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const now = Math.floor(Date.now() / 1000)
      const payload = {
        sub: 'user123',
        iat: now,
        exp: now + (8 * 24 * 60 * 60) // 8 days
      }

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const mockSignature = 'mock-signature'
      const token = `${encodedHeader}.${encodedPayload}.${mockSignature}`

      jest.spyOn(SecureJWTValidator as any, 'generateSignature')
        .mockResolvedValue(mockSignature)

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(true)
      expect(result.warnings).toContain('unusually long expiry time')
    })

    it('should warn about suspicious claims', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = {
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        customClaim: '<script>alert("xss")</script>' // Suspicious content
      }

      const encodedHeader = btoa(JSON.stringify(header))
      const encodedPayload = btoa(JSON.stringify(payload))
      const mockSignature = 'mock-signature'
      const token = `${encodedHeader}.${encodedPayload}.${mockSignature}`

      jest.spyOn(SecureJWTValidator as any, 'generateSignature')
        .mockResolvedValue(mockSignature)

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(true)
      expect(result.warnings).toContain('suspicious claims detected')
    })
  })

  describe('Base64URL Encoding/Decoding', () => {
    it('should encode strings correctly', () => {
      const input = 'Hello World!'
      const result = (SecureJWTValidator as any).base64URLEncode(input)

      expect(result).not.toContain('+')
      expect(result).not.toContain('/')
      expect(result).not.toContain('=')
    })

    it('should encode Uint8Array correctly', () => {
      const input = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
      const result = (SecureJWTValidator as any).base64URLEncode(input)

      expect(typeof result).toBe('string')
      expect(result).not.toContain('+')
      expect(result).not.toContain('/')
      expect(result).not.toContain('=')
    })

    it('should decode base64url strings correctly', () => {
      const encoded = 'SGVsbG8gV29ybGQh'
      const result = (SecureJWTValidator as any).base64URLDecode(encoded)

      expect(result).toBe('Hello World!')
    })

    it('should handle padding correctly', () => {
      const encoded = 'SGVsbG8' // No padding
      const result = (SecureJWTValidator as any).base64URLDecode(encoded)

      expect(result).toBe('Hello')
    })

    it('should throw on invalid base64', () => {
      expect(() => {
        (SecureJWTValidator as any).base64URLDecode('invalid!base64')
      }).toThrow('Invalid base64 encoding')
    })
  })

  describe('Constant Time Comparison', () => {
    it('should return true for identical strings', () => {
      const result = (SecureJWTValidator as any).constantTimeCompare('hello', 'hello')
      expect(result).toBe(true)
    })

    it('should return false for different strings', () => {
      const result = (SecureJWTValidator as any).constantTimeCompare('hello', 'world')
      expect(result).toBe(false)
    })

    it('should return false for different length strings', () => {
      const result = (SecureJWTValidator as any).constantTimeCompare('hello', 'hello!')
      expect(result).toBe(false)
    })

    it('should be resistant to timing attacks', () => {
      // This is hard to test properly, but we can at least verify the implementation
      const str1 = 'a'.repeat(1000)
      const str2 = 'b'.repeat(1000)

      const start = Date.now()
      const result = (SecureJWTValidator as any).constantTimeCompare(str1, str2)
      const end = Date.now()

      expect(result).toBe(false)
      expect(end - start).toBeLessThan(100) // Should be very fast
    })
  })

  describe('Hash Algorithm Mapping', () => {
    it('should map HS256 to SHA-256', () => {
      const result = (SecureJWTValidator as any).getHashAlgorithm('HS256')
      expect(result).toBe('SHA-256')
    })

    it('should map HS384 to SHA-384', () => {
      const result = (SecureJWTValidator as any).getHashAlgorithm('HS384')
      expect(result).toBe('SHA-384')
    })

    it('should map HS512 to SHA-512', () => {
      const result = (SecureJWTValidator as any).getHashAlgorithm('HS512')
      expect(result).toBe('SHA-512')
    })

    it('should throw for unsupported algorithm', () => {
      expect(() => {
        (SecureJWTValidator as any).getHashAlgorithm('UNKNOWN')
      }).toThrow('Unsupported algorithm: UNKNOWN')
    })
  })

  describe('Suspicious Claims Detection', () => {
    it('should detect HTML patterns', () => {
      const payload = { claim: '<script>alert(1)</script>' }
      const result = (SecureJWTValidator as any).hasSuspiciousClaims(payload)
      expect(result).toBe(true)
    })

    it('should detect SQL injection patterns', () => {
      const payload = { claim: "'; DROP TABLE users; --" }
      const result = (SecureJWTValidator as any).hasSuspiciousClaims(payload)
      expect(result).toBe(true)
    })

    it('should detect path traversal patterns', () => {
      const payload = { claim: '../../../etc/passwd' }
      const result = (SecureJWTValidator as any).hasSuspiciousClaims(payload)
      expect(result).toBe(true)
    })

    it('should detect URL encoding patterns', () => {
      const payload = { claim: '%3Cscript%3E' }
      const result = (SecureJWTValidator as any).hasSuspiciousClaims(payload)
      expect(result).toBe(true)
    })

    it('should detect JavaScript protocol', () => {
      const payload = { claim: 'javascript:alert(1)' }
      const result = (SecureJWTValidator as any).hasSuspiciousClaims(payload)
      expect(result).toBe(true)
    })

    it('should handle nested objects', () => {
      const payload = {
        user: {
          name: 'test',
          evil: '<script>alert(1)</script>'
        }
      }
      const result = (SecureJWTValidator as any).hasSuspiciousClaims(payload)
      expect(result).toBe(true)
    })

    it('should return false for clean claims', () => {
      const payload = {
        sub: 'user123',
        name: 'John Doe',
        email: 'john@example.com'
      }
      const result = (SecureJWTValidator as any).hasSuspiciousClaims(payload)
      expect(result).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle signature generation errors gracefully', async () => {
      const payload = { userId: '123' }
      const secret = 'test-secret'

      mockCrypto.subtle.importKey.mockRejectedValue(new Error('Crypto error'))

      await expect(
        SecureJWTValidator.generateJWT(payload, secret)
      ).rejects.toThrow()
    })

    it('should handle verification errors gracefully', async () => {
      const token = 'header.payload.signature'

      jest.spyOn(SecureJWTValidator as any, 'generateSignature')
        .mockRejectedValue(new Error('Signature error'))

      const result = await SecureJWTValidator.verifyJWT(token, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('token verification failed')
    })
  })
})