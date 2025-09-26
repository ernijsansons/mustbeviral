/**
 * UserController Test Suite
 * Tests for comprehensive user profile management
 */

import { UserController, UserUpdateRequest, UserResponse } from '../../../src/controllers/userController';
import { DatabaseService } from '../../../src/lib/db';
import { JWTManager } from '../../../src/lib/auth/jwtManager';

// Mock dependencies
jest.mock('../../../src/lib/db');
jest.mock('../../../src/lib/auth/jwtManager');
jest.mock('../../../src/lib/monitoring/logger');

describe('UserController', () => {
  let userController: UserController;
  let mockDbService: jest.Mocked<DatabaseService>;
  let mockJwtManager: jest.Mocked<JWTManager>;
  let mockKVNamespace: unknown;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockDbService = {
      getUserById: jest.fn(),
      getUserByUsername: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
    } as unknown;

    mockJwtManager = {
      verifyAccessToken: jest.fn(),
    } as unknown;

    mockKVNamespace = {
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    userController = new UserController(mockDbService, mockJwtManager, mockKVNamespace);
  });

  describe('getUser', () => {
    const validToken = 'valid.jwt.token';
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      username: 'testuser',
      role: 'creator',
      onboarding_completed: true,
      ai_preference_level: 2,
      profile_data: { firstName: 'Test', lastName: 'User' },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };

    it('should return user profile from cache if available', async () => {
      // Arrange
      const request = new Request(`http://localhost/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });

      mockJwtManager.verifyAccessToken.mockResolvedValue({ userId,
        role: 'creator'
      });

      mockKVNamespace.get.mockResolvedValue(JSON.stringify(mockUser));

      // Act
      const response = await userController.getUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(mockKVNamespace.get).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockDbService.getUserById).not.toHaveBeenCalled();
    });

    it('should return user profile from database if not cached', async () => {
      // Arrange
      const request = new Request(`http://localhost/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });

      mockJwtManager.verifyAccessToken.mockResolvedValue({ userId,
        role: 'creator'
      });

      mockKVNamespace.get.mockResolvedValue(null);
      mockDbService.getUserById.mockResolvedValue(mockUser);

      // Act
      const response = await userController.getUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(userId);
      expect(mockDbService.getUserById).toHaveBeenCalledWith(userId);
      expect(mockKVNamespace.put).toHaveBeenCalledWith(
        `user:${userId}`,
        expect.any(String),
        { expirationTtl: 300 }
      );
    });

    it('should return 401 for missing authorization header', async () => {
      // Arrange
      const request = new Request(`http://localhost/api/users/${userId}`);

      // Act
      const response = await userController.getUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authorization token required');
    });

    it('should return 401 for invalid JWT token', async () => {
      // Arrange
      const request = new Request(`http://localhost/api/users/${userId}`, {
        headers: { Authorization: `Bearer invalid.token` }
      });

      mockJwtManager.verifyAccessToken.mockResolvedValue(null);

      // Act
      const response = await userController.getUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired token');
    });

    it('should return 403 for unauthorized access', async () => {
      // Arrange
      const request = new Request(`http://localhost/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });

      mockJwtManager.verifyAccessToken.mockResolvedValue({
        userId: 'other-user',
        role: 'creator'
      });

      // Act
      const response = await userController.getUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });

    it('should allow admin access to unknown user profile', async () => {
      // Arrange
      const request = new Request(`http://localhost/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });

      mockJwtManager.verifyAccessToken.mockResolvedValue({
        userId: 'admin-user',
        role: 'admin'
      });

      mockKVNamespace.get.mockResolvedValue(null);
      mockDbService.getUserById.mockResolvedValue(mockUser);

      // Act
      const response = await userController.getUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(mockDbService.getUserById).toHaveBeenCalledWith(userId);
    });

    it('should return 404 for non-existent user', async () => {
      // Arrange
      const request = new Request(`http://localhost/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });

      mockJwtManager.verifyAccessToken.mockResolvedValue({ userId,
        role: 'creator'
      });

      mockKVNamespace.get.mockResolvedValue(null);
      mockDbService.getUserById.mockResolvedValue(null);

      // Act
      const response = await userController.getUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('updateUser', () => {
    const validToken = 'valid.jwt.token';
    const userId = 'user-123';
    const updateData: UserUpdateRequest = {
      username: 'newusername',
      profile_data: { firstName: 'Updated', lastName: 'User' }
    };

    const mockUpdatedUser = {
      id: userId,
      email: 'test@example.com',
      username: 'newusername',
      role: 'creator',
      onboarding_completed: true,
      ai_preference_level: 2,
      profile_data: { firstName: 'Updated', lastName: 'User' },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z'
    };

    it('should update user profile successfully', async () => {
      // Arrange
      const request = new Request(`http://localhost/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      mockJwtManager.verifyAccessToken.mockResolvedValue({ userId,
        role: 'creator'
      });

      mockDbService.getUserByUsername.mockResolvedValue(null);
      mockDbService.updateUser.mockResolvedValue(mockUpdatedUser);

      // Act
      const response = await userController.updateUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.username).toBe('newusername');
      expect(mockDbService.updateUser).toHaveBeenCalledWith(userId, expect.objectContaining({
        username: 'newusername',
        profile_data: { firstName: 'Updated', lastName: 'User' },
        updated_at: expect.any(String)
      }));
      expect(mockKVNamespace.delete).toHaveBeenCalledWith(`user:${userId}`);
    });

    it('should return 400 for invalid JSON', async () => {
      // Arrange
      const request = new Request(`http://localhost/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });

      mockJwtManager.verifyAccessToken.mockResolvedValue({ userId,
        role: 'creator'
      });

      // Act
      const response = await userController.updateUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON in request body');
    });

    it('should return 409 for duplicate username', async () => {
      // Arrange
      const request = new Request(`http://localhost/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      mockJwtManager.verifyAccessToken.mockResolvedValue({ userId,
        role: 'creator'
      });

      mockDbService.getUserByUsername.mockResolvedValue({
        id: 'other-user',
        username: 'newusername'
      });

      // Act
      const response = await userController.updateUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Username is already taken');
    });

    it('should validate username format', async () => {
      // Arrange
      const invalidUpdateData = {
        username: 'ab', // Too short
        profile_data: {}
      };

      const request = new Request(`http://localhost/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidUpdateData)
      });

      mockJwtManager.verifyAccessToken.mockResolvedValue({ userId,
        role: 'creator'
      });

      // Act
      const response = await userController.updateUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Username must be between 3 and 30 characters');
    });

    it('should validate profile data size', async () => {
      // Arrange
      const largeProfileData = {
        username: 'validuser',
        profile_data: {
          // Create data larger than 10KB
          largeField: 'x'.repeat(11000)
        }
      };

      const request = new Request(`http://localhost/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(largeProfileData)
      });

      mockJwtManager.verifyAccessToken.mockResolvedValue({ userId,
        role: 'creator'
      });

      // Act
      const response = await userController.updateUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Profile data is too large');
    });
  });

  describe('deleteUser', () => {
    const validToken = 'valid.jwt.token';
    const userId = 'user-123';

    it('should delete user successfully', async () => {
      // Arrange
      const request = new Request(`http://localhost/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${validToken}` }
      });

      mockJwtManager.verifyAccessToken.mockResolvedValue({ userId,
        role: 'creator'
      });

      mockDbService.deleteUser.mockResolvedValue(true);

      // Act
      const response = await userController.deleteUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Account deleted successfully');
      expect(mockDbService.deleteUser).toHaveBeenCalledWith(userId);
      expect(mockKVNamespace.delete).toHaveBeenCalledWith(`user:${userId}`);
    });

    it('should return 404 for non-existent user', async () => {
      // Arrange
      const request = new Request(`http://localhost/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${validToken}` }
      });

      mockJwtManager.verifyAccessToken.mockResolvedValue({ userId,
        role: 'creator'
      });

      mockDbService.deleteUser.mockResolvedValue(false);

      // Act
      const response = await userController.deleteUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found or deletion failed');
    });

    it('should handle internal server error', async () => {
      // Arrange
      const request = new Request(`http://localhost/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${validToken}` }
      });

      mockJwtManager.verifyAccessToken.mockResolvedValue({ userId,
        role: 'creator'
      });

      mockDbService.deleteUser.mockRejectedValue(new Error('Database error'));

      // Act
      const response = await userController.deleteUser(request, {});
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('Validation', () => {
    let userController: UserController;

    beforeEach(() => {
      userController = new UserController(mockDbService, mockJwtManager, mockKVNamespace);
    });

    it('should validate website URLs correctly', async () => {
      // Arrange
      const validWebsiteData = {
        username: 'testuser',
        profile_data: {
          website: 'https://example.com'
        }
      };

      const invalidWebsiteData = {
        username: 'testuser',
        profile_data: {
          website: 'not-a-url'
        }
      };

      // Test valid URL
      expect((userController as unknown).validateUserUpdate(validWebsiteData).valid).toBe(true);

      // Test invalid URL
      const invalidResult = (userController as unknown).validateUserUpdate(invalidWebsiteData);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('Website must be a valid URL');
    });

    it('should validate bio length correctly', async () => {
      // Arrange
      const longBioData = {
        username: 'testuser',
        profile_data: {
          bio: 'x'.repeat(501) // Too long
        }
      };

      // Act
      const result = (userController as unknown).validateUserUpdate(longBioData);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Bio must be a string with maximum 500 characters');
    });

    it('should validate username characters correctly', async () => {
      // Arrange
      const invalidUsernameData = {
        username: 'test@user!', // Invalid characters
        profile_data: {}
      };

      // Act
      const result = (userController as unknown).validateUserUpdate(invalidUsernameData);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Username can only contain letters, numbers, hyphens, and underscores');
    });
  });
});