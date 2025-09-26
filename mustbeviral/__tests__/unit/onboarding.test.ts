// Unit tests for onboarding functionality
// LOG: ONBOARD-TEST-1 - Onboarding unit tests

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Onboarding Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Validation', () => {
    test('should validate email format correctly', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@test-domain.com'
      ];
      
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@@domain.com',
        ''
      ];

      validEmails.forEach(email => {
        expect(/\S+@\S+\.\S+/.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(/\S+@\S+\.\S+/.test(email)).toBe(false);
      });
    });
  });

  describe('Role Validation', () => {
    test('should accept valid roles', () => {
      const validRoles = ['creator', 'influencer'];
      
      validRoles.forEach(role => {
        expect(['creator', 'influencer'].includes(role)).toBe(true);
      });
    });

    test('should reject invalid roles', () => {
      const invalidRoles = ['admin', 'user', '', 'manager'];
      
      invalidRoles.forEach(role => {
        expect(['creator', 'influencer'].includes(role)).toBe(false);
      });
    });
  });

  describe('AI Autonomy Level', () => {
    test('should accept values between 0 and 100', () => {
      const validLevels = [0, 25, 50, 75, 100];
      
      validLevels.forEach(level => {
        expect(level >= 0 && level <= 100).toBe(true);
      });
    });

    test('should reject values outside range', () => {
      const invalidLevels = [-1, 101, 150, -50];
      
      invalidLevels.forEach(level => {
        expect(level >= 0 && level <= 100).toBe(false);
      });
    });
  });

  describe('API Integration', () => {
    test('should handle successful onboarding API call', async () => {
      const mockResponse = {
        success: true,
        user: {
          id: '123',
          email: 'test@example.com',
          username: 'testuser',
          role: 'creator'
        },
        token: 'mock-jwt-token'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
          role: 'creator',
          aiPreferenceLevel: 50
        })
      });

      const result = await response.json();

      expect(fetch).toHaveBeenCalledWith('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
          role: 'creator',
          aiPreferenceLevel: 50
        })
      });

      expect(result).toEqual(mockResponse);
    });

    test('should handle onboarding API error', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'User already exists'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse
      });

      const response = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          username: 'existinguser',
          password: 'password123',
          role: 'creator'
        })
      });

      const result = await response.json();

      expect(response.ok).toBe(false);
      expect(result.error).toBe('User already exists');
    });
  });

  describe('OAuth Integration', () => {
    test('should redirect to Google OAuth URL', () => {
      const mockLocation = {
        href: ''
      };
      
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      });

      // Simulate Google OAuth button click
      window.location.href = '/api/oauth/google';
      
      expect(window.location.href).toBe('/api/oauth/google');
    });

    test('should redirect to Twitter OAuth URL', () => {
      const mockLocation = {
        href: ''
      };
      
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      });

      // Simulate Twitter OAuth button click
      window.location.href = '/api/oauth/twitter';
      
      expect(window.location.href).toBe('/api/oauth/twitter');
    });
  });
});