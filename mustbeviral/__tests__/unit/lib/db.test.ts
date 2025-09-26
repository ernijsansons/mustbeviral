// Comprehensive unit tests for DatabaseService
// Tests all database operations, CRUD functionality, and edge cases

import { 
  DatabaseService, 
  User, 
  UserProfile, 
  Content, 
  ContentMetadata, 
  Match, 
  MatchDetails 
} from '../../../src/lib/db';
import { CloudflareService, CloudflareEnv } from '../../../src/lib/cloudflare';

// Mock CloudflareService
jest.mock('../../../src/lib/cloudflare');

const MockedCloudflareService = CloudflareService as jest.MockedClass<typeof CloudflareService>;

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  let mockCloudflareService: jest.Mocked<CloudflareService>;
  let mockEnv: CloudflareEnv;

  const mockUser: Omit<User, 'id' | 'created_at' | 'updated_at'> = {
    email: 'test@example.com',
    username: 'testuser',
    password_hash: 'hashed-password',
    role: 'creator',
    profile_data: JSON.stringify({
      avatar_url: 'https://example.com/avatar.jpg',
      bio: 'Test user bio',
    }),
    ai_preference_level: 3,
    onboarding_completed: 1,
  };

  const mockUserResult: User = {
    id: 'user-123',
    ...mockUser,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockContent: Omit<Content, 'id' | 'created_at' | 'updated_at'> = {
    user_id: 'user-123',
    title: 'Test Content',
    body: 'This is test content body',
    image_url: 'https://example.com/image.jpg',
    status: 'draft',
    type: 'social_post',
    generated_by_ai: 1,
    ai_model_used: 'gpt-4',
    ethics_check_status: 'passed',
    metadata: JSON.stringify({
      tags: ['test', 'content'],
      platforms: ['twitter', 'instagram'],
    }),
  };

  const mockContentResult: Content = {
    id: 'content-123',
    ...mockContent,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    published_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock environment
    mockEnv = {
      DB: {
        prepare: jest.fn(),
        exec: jest.fn(),
        batch: jest.fn(),
      },
      KV: {
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        list: jest.fn(),
      },
      R2: {
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        list: jest.fn(),
      },
    } as unknown as CloudflareEnv;

    // Mock CloudflareService instance
    mockCloudflareService = {
      db: {
        fetchOne: jest.fn(),
        fetchAll: jest.fn(),
        executeQuery: jest.fn(),
      },
      kv: {
        getJSON: jest.fn(),
        putJSON: jest.fn(),
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
      },
    } as unknown as jest.Mocked<CloudflareService>;

    MockedCloudflareService.mockImplementation(() => mockCloudflareService);

    // Suppress console.log in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor and initialization', () => {
    it('should initialize without Cloudflare environment', () => {
      dbService = new DatabaseService();
      expect(MockedCloudflareService).not.toHaveBeenCalled();
    });

    it('should initialize with Cloudflare environment', () => {
      dbService = new DatabaseService(mockEnv);
      expect(MockedCloudflareService).toHaveBeenCalledWith(mockEnv);
    });

    it('should initialize environment after construction', () => {
      dbService = new DatabaseService();
      dbService.initWithEnv(mockEnv);
      expect(MockedCloudflareService).toHaveBeenCalledWith(mockEnv);
    });
  });

  describe('createUser', () => {
    beforeEach(() => {
      dbService = new DatabaseService(mockEnv);
    });

    it('should create user successfully', async () => {
      mockCloudflareService.db.fetchOne.mockResolvedValue(mockUserResult);

      const result = await dbService.createUser(mockUser);

      expect(result).toEqual(mockUserResult);
      expect(mockCloudflareService.db.fetchOne).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [
          mockUser.email,
          mockUser.username,
          mockUser.password_hash,
          mockUser.role,
          mockUser.profile_data,
          mockUser.ai_preference_level,
          mockUser.onboarding_completed,
        ]
      );
    });

    it('should throw error for missing required fields', async () => {
      const incompleteUser = { ...mockUser };
      delete incompleteUser.email;

      await expect(dbService.createUser(incompleteUser as any)).rejects.toThrow(
        'Missing required user data: email, username, and password_hash are required'
      );
    });

    it('should throw error when database returns null', async () => {
      mockCloudflareService.db.fetchOne.mockResolvedValue(null);

      await expect(dbService.createUser(mockUser)).rejects.toThrow(
        'Failed to create user - no result returned'
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockCloudflareService.db.fetchOne.mockRejectedValue(dbError);

      await expect(dbService.createUser(mockUser)).rejects.toThrow(
        'Failed to create user: Error: Database connection failed'
      );
    });

    it('should throw error when not initialized', async () => {
      const uninitializedService = new DatabaseService();

      await expect(uninitializedService.createUser(mockUser)).rejects.toThrow(
        'Database service not properly initialized'
      );
    });
  });

  describe('getUserByEmail', () => {
    beforeEach(() => {
      dbService = new DatabaseService(mockEnv);
    });

    it('should fetch user by email successfully', async () => {
      mockCloudflareService.db.fetchOne.mockResolvedValue(mockUserResult);

      const result = await dbService.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUserResult);
      expect(mockCloudflareService.db.fetchOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE email = ?'),
        ['test@example.com']
      );
    });

    it('should return null when user not found', async () => {
      mockCloudflareService.db.fetchOne.mockResolvedValue(null);

      const result = await dbService.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should throw error for invalid email parameter', async () => {
      await expect(dbService.getUserByEmail('')).rejects.toThrow(
        'Valid email string is required'
      );
      
      await expect(dbService.getUserByEmail(null as any)).rejects.toThrow(
        'Valid email string is required'
      );
      
      await expect(dbService.getUserByEmail(undefined as any)).rejects.toThrow(
        'Valid email string is required'
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query failed');
      mockCloudflareService.db.fetchOne.mockRejectedValue(dbError);

      await expect(dbService.getUserByEmail('test@example.com')).rejects.toThrow(
        'Failed to fetch user: Error: Query failed'
      );
    });
  });

  describe('updateUserOnboarding', () => {
    beforeEach(() => {
      dbService = new DatabaseService(mockEnv);
    });

    it('should update onboarding status to completed', async () => {
      mockCloudflareService.db.executeQuery.mockResolvedValue(undefined);

      await dbService.updateUserOnboarding('user-123', true);

      expect(mockCloudflareService.db.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET onboarding_completed = ?'),
        [1, 'user-123']
      );
    });

    it('should update onboarding status to not completed', async () => {
      mockCloudflareService.db.executeQuery.mockResolvedValue(undefined);

      await dbService.updateUserOnboarding('user-123', false);

      expect(mockCloudflareService.db.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET onboarding_completed = ?'),
        [0, 'user-123']
      );
    });

    it('should throw error for invalid userId', async () => {
      await expect(dbService.updateUserOnboarding('', true)).rejects.toThrow(
        'Valid userId string is required'
      );
      
      await expect(dbService.updateUserOnboarding(null as any, true)).rejects.toThrow(
        'Valid userId string is required'
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Update failed');
      mockCloudflareService.db.executeQuery.mockRejectedValue(dbError);

      await expect(dbService.updateUserOnboarding('user-123', true)).rejects.toThrow(
        'Failed to update onboarding: Error: Update failed'
      );
    });
  });

  describe('session management', () => {
    beforeEach(() => {
      dbService = new DatabaseService(mockEnv);
    });

    describe('cacheUserSession', () => {
      it('should cache user session successfully', async () => {
        const sessionData = { token: 'abc123', lastActivity: Date.now() };
        mockCloudflareService.kv.putJSON.mockResolvedValue(undefined);

        await dbService.cacheUserSession('user-123', sessionData);

        expect(mockCloudflareService.kv.putJSON).toHaveBeenCalledWith(
          'session:user-123',
          sessionData,
          { expirationTtl: 86400 }
        );
      });

      it('should cache user session with custom TTL', async () => {
        const sessionData = { token: 'abc123' };
        mockCloudflareService.kv.putJSON.mockResolvedValue(undefined);

        await dbService.cacheUserSession('user-123', sessionData, 3600);

        expect(mockCloudflareService.kv.putJSON).toHaveBeenCalledWith(
          'session:user-123',
          sessionData,
          { expirationTtl: 3600 }
        );
      });

      it('should handle KV unavailable gracefully', async () => {
        const serviceWithoutKV = new DatabaseService(mockEnv);
        (serviceWithoutKV as any).cfService = { db: mockCloudflareService.db };

        const sessionData = { token: 'abc123' };
        
        // Should not throw error
        await expect(serviceWithoutKV.cacheUserSession('user-123', sessionData)).resolves.toBeUndefined();
      });

      it('should handle KV errors gracefully', async () => {
        const kvError = new Error('KV storage failed');
        mockCloudflareService.kv.putJSON.mockRejectedValue(kvError);
        
        const sessionData = { token: 'abc123' };
        
        // Should not throw error (non-critical operation)
        await expect(dbService.cacheUserSession('user-123', sessionData)).resolves.toBeUndefined();
      });
    });

    describe('getUserSession', () => {
      it('should get user session successfully', async () => {
        const sessionData = { token: 'abc123', lastActivity: Date.now() };
        mockCloudflareService.kv.getJSON.mockResolvedValue(sessionData);

        const result = await dbService.getUserSession('user-123');

        expect(result).toEqual(sessionData);
        expect(mockCloudflareService.kv.getJSON).toHaveBeenCalledWith('session:user-123');
      });

      it('should return null when session not found', async () => {
        mockCloudflareService.kv.getJSON.mockResolvedValue(null);

        const result = await dbService.getUserSession('user-123');

        expect(result).toBeNull();
      });

      it('should handle KV unavailable', async () => {
        const serviceWithoutKV = new DatabaseService(mockEnv);
        (serviceWithoutKV as any).cfService = { db: mockCloudflareService.db };

        const result = await serviceWithoutKV.getUserSession('user-123');

        expect(result).toBeNull();
      });

      it('should handle KV errors gracefully', async () => {
        const kvError = new Error('KV retrieval failed');
        mockCloudflareService.kv.getJSON.mockRejectedValue(kvError);

        const result = await dbService.getUserSession('user-123');

        expect(result).toBeNull();
      });
    });
  });

  describe('createContent', () => {
    beforeEach(() => {
      dbService = new DatabaseService(mockEnv);
    });

    it('should create content successfully', async () => {
      mockCloudflareService.db.fetchOne.mockResolvedValue(mockContentResult);

      const result = await dbService.createContent(mockContent);

      expect(result).toEqual(mockContentResult);
      expect(mockCloudflareService.db.fetchOne).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO content'),
        [
          mockContent.user_id,
          mockContent.title,
          mockContent.body,
          mockContent.image_url,
          mockContent.status,
          mockContent.type,
          mockContent.generated_by_ai,
          mockContent.ai_model_used,
          mockContent.ethics_check_status,
          mockContent.metadata,
        ]
      );
    });

    it('should throw error for missing required fields', async () => {
      const incompleteContent = { ...mockContent };
      delete incompleteContent.user_id;

      await expect(dbService.createContent(incompleteContent as any)).rejects.toThrow(
        'Missing required content data: user_id, title, and body are required'
      );
    });

    it('should validate all required fields', async () => {
      const testCases = [
        { field: 'user_id', value: '' },
        { field: 'title', value: '' },
        { field: 'body', value: '' },
        { field: 'user_id', value: null },
        { field: 'title', value: null },
        { field: 'body', value: null },
      ];

      for (const testCase of testCases) {
        const invalidContent = { ...mockContent, [testCase.field]: testCase.value };
        
        await expect(dbService.createContent(invalidContent as any)).rejects.toThrow(
          'Missing required content data: user_id, title, and body are required'
        );
      }
    });

    it('should throw error when database returns null', async () => {
      mockCloudflareService.db.fetchOne.mockResolvedValue(null);

      await expect(dbService.createContent(mockContent)).rejects.toThrow(
        'Failed to create content - no result returned'
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Content creation failed');
      mockCloudflareService.db.fetchOne.mockRejectedValue(dbError);

      await expect(dbService.createContent(mockContent)).rejects.toThrow(
        'Failed to create content: Error: Content creation failed'
      );
    });
  });

  describe('getContentByUserId', () => {
    beforeEach(() => {
      dbService = new DatabaseService(mockEnv);
    });

    it('should fetch content by user ID successfully', async () => {
      const contentList = [mockContentResult, { ...mockContentResult, id: 'content-456' }];
      mockCloudflareService.db.fetchAll.mockResolvedValue(contentList);

      const result = await dbService.getContentByUserId('user-123');

      expect(result).toEqual(contentList);
      expect(mockCloudflareService.db.fetchAll).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM content WHERE user_id = ? ORDER BY created_at DESC'),
        ['user-123']
      );
    });

    it('should return empty array when no content found', async () => {
      mockCloudflareService.db.fetchAll.mockResolvedValue([]);

      const result = await dbService.getContentByUserId('user-123');

      expect(result).toEqual([]);
    });

    it('should throw error for invalid userId', async () => {
      await expect(dbService.getContentByUserId('')).rejects.toThrow(
        'Valid userId string is required'
      );
      
      await expect(dbService.getContentByUserId(null as any)).rejects.toThrow(
        'Valid userId string is required'
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Content fetch failed');
      mockCloudflareService.db.fetchAll.mockRejectedValue(dbError);

      await expect(dbService.getContentByUserId('user-123')).rejects.toThrow(
        'Failed to fetch content: Error: Content fetch failed'
      );
    });
  });

  describe('healthCheck', () => {
    it('should pass health check when database is available', async () => {
      dbService = new DatabaseService(mockEnv);
      mockCloudflareService.db.fetchOne.mockResolvedValue({ '1': 1 });

      const result = await dbService.healthCheck();

      expect(result).toBe(true);
      expect(mockCloudflareService.db.fetchOne).toHaveBeenCalledWith('SELECT 1');
    });

    it('should fail health check when database is unavailable', async () => {
      const uninitializedService = new DatabaseService();

      const result = await uninitializedService.healthCheck();

      expect(result).toBe(false);
    });

    it('should fail health check on database errors', async () => {
      dbService = new DatabaseService(mockEnv);
      const dbError = new Error('Health check query failed');
      mockCloudflareService.db.fetchOne.mockRejectedValue(dbError);

      const result = await dbService.healthCheck();

      expect(result).toBe(false);
    });

    it('should handle partial initialization', async () => {
      dbService = new DatabaseService(mockEnv);
      (dbService as any).cfService = {}; // Missing db property

      const result = await dbService.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('type safety and interfaces', () => {
    it('should validate UserProfile interface structure', () => {
      const validProfile: UserProfile = {
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'User bio',
        location: 'New York',
        website: 'https://example.com',
        social_links: {
          twitter: '@user',
          instagram: 'user123',
          tiktok: '@tiktokuser',
          youtube: 'UserChannel',
        },
        preferences: {
          theme: 'dark',
          notifications: true,
          public_profile: false,
        },
      };

      expect(validProfile.avatar_url).toBeDefined();
      expect(validProfile.social_links?.twitter).toBe('@user');
      expect(validProfile.preferences?.theme).toBe('dark');
    });

    it('should validate ContentMetadata interface structure', () => {
      const validMetadata: ContentMetadata = {
        tags: ['viral', 'marketing'],
        target_audience: ['millennials', 'tech'],
        platforms: ['twitter', 'instagram'],
        scheduled_time: '2023-12-01T12:00:00Z',
        viral_score: 0.85,
        engagement_prediction: {
          likes: 1000,
          shares: 200,
          comments: 50,
          reach: 5000,
        },
        seo_keywords: ['viral marketing', 'social media'],
        content_warnings: ['flashing images'],
      };

      expect(validMetadata.tags).toContain('viral');
      expect(validMetadata.platforms).toContain('twitter');
      expect(validMetadata.engagement_prediction?.likes).toBe(1000);
    });

    it('should validate MatchDetails interface structure', () => {
      const validMatchDetails: MatchDetails = {
        algorithm_version: '2.1.0',
        matching_factors: {
          content_relevance: 0.9,
          audience_alignment: 0.8,
          engagement_history: 0.7,
          availability: 1.0,
          cost_efficiency: 0.6,
        },
        estimated_reach: 10000,
        estimated_cost: 500,
        delivery_timeline: {
          content_review: '2023-12-01',
          publish_date: '2023-12-03',
          campaign_duration: 7,
        },
        contract_terms: {
          payment_amount: 500,
          payment_schedule: 'net-30',
          deliverables: ['post creation', 'story sharing'],
          revision_rounds: 2,
        },
      };

      expect(validMatchDetails.algorithm_version).toBe('2.1.0');
      expect(validMatchDetails.matching_factors.content_relevance).toBe(0.9);
      expect(validMatchDetails.contract_terms?.payment_amount).toBe(500);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle service initialization edge cases', () => {
      // Test with undefined environment
      const service1 = new DatabaseService(undefined);
      expect(service1).toBeDefined();

      // Test with partial environment
      const partialEnv = { DB: mockEnv.DB } as unknown as CloudflareEnv;
      const service2 = new DatabaseService(partialEnv);
      expect(service2).toBeDefined();
    });

    it('should handle concurrent operations', async () => {
      dbService = new DatabaseService(mockEnv);
      mockCloudflareService.db.fetchOne.mockResolvedValue(mockUserResult);

      const promises = [
        dbService.getUserByEmail('user1@example.com'),
        dbService.getUserByEmail('user2@example.com'),
        dbService.getUserByEmail('user3@example.com'),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      expect(mockCloudflareService.db.fetchOne).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure operations', async () => {
      dbService = new DatabaseService(mockEnv);
      
      mockCloudflareService.db.fetchOne
        .mockResolvedValueOnce(mockUserResult)
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(null);

      const result1 = await dbService.getUserByEmail('user1@example.com');
      expect(result1).toEqual(mockUserResult);

      await expect(dbService.getUserByEmail('user2@example.com')).rejects.toThrow();

      const result3 = await dbService.getUserByEmail('user3@example.com');
      expect(result3).toBeNull();
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton database service', () => {
      // Import the singleton
      const { dbService: singletonService } = require('../../../src/lib/db');
      expect(singletonService).toBeInstanceOf(DatabaseService);
    });
  });
});