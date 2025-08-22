// Unit tests for database connection and operations
// LOG: TEST-DB-1 - Database unit tests

const { DatabaseService } = require('../../src/lib/db');

// Mock D1 database for testing
const mockD1Database = {
  prepare: jest.fn().mockReturnThis(),
  bind: jest.fn().mockReturnThis(),
  first: jest.fn(),
  all: jest.fn(),
  run: jest.fn(),
};

describe('DatabaseService', () => {
  let dbService;

  beforeEach(() => {
    console.log('LOG: TEST-DB-SETUP-1 - Setting up database service for test');
    dbService = new DatabaseService(mockD1Database);
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    test('should return true when database is healthy', async () => {
      console.log('LOG: TEST-DB-HEALTH-1 - Testing healthy database connection');
      
      mockD1Database.first.mockResolvedValue({ result: 1 });

      const result = await dbService.healthCheck();

      expect(result).toBe(true);
      expect(mockD1Database.prepare).toHaveBeenCalledWith('SELECT 1');
    });

    test('should return false when database connection fails', async () => {
      console.log('LOG: TEST-DB-HEALTH-2 - Testing failed database connection');
      
      mockD1Database.first.mockRejectedValue(new Error('Connection failed'));

      const result = await dbService.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('User Operations', () => {
    test('should create user successfully', async () => {
      console.log('LOG: TEST-DB-USER-1 - Testing user creation');
      
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        role: 'creator',
        profile_data: '{}',
        ai_preference_level: 50,
        onboarding_completed: 1,
        created_at: '2025-01-27T10:00:00Z',
        updated_at: '2025-01-27T10:00:00Z',
      };

      mockD1Database.first.mockResolvedValue(mockUser);

      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        role: 'creator',
        profile_data: '{}',
        ai_preference_level: 50,
        onboarding_completed: 1,
      };

      const result = await dbService.createUser(userData);

      expect(result).toEqual(mockUser);
      expect(mockD1Database.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users')
      );
    });

    test('should get user by email', async () => {
      console.log('LOG: TEST-DB-USER-2 - Testing get user by email');
      
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      };

      mockD1Database.first.mockResolvedValue(mockUser);

      const result = await dbService.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockD1Database.bind).toHaveBeenCalledWith('test@example.com');
    });

    test('should return null when user not found', async () => {
      console.log('LOG: TEST-DB-USER-3 - Testing user not found scenario');
      
      mockD1Database.first.mockResolvedValue(null);

      const result = await dbService.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    test('should handle database errors gracefully', async () => {
      console.log('LOG: TEST-DB-USER-4 - Testing database error handling');
      
      mockD1Database.first.mockRejectedValue(new Error('Database error'));

      await expect(dbService.getUserByEmail('test@example.com')).rejects.toThrow(
        'Failed to fetch user: Error: Database error'
      );
    });
  });

  describe('Content Operations', () => {
    test('should create content successfully', async () => {
      console.log('LOG: TEST-DB-CONTENT-1 - Testing content creation');
      
      const mockContent = {
        id: 'content123',
        user_id: 'user123',
        title: 'Test Article',
        body: 'Test content body',
        status: 'draft',
        type: 'news_article',
        generated_by_ai: 1,
        ai_model_used: 'Llama-3.1',
        ethics_check_status: 'pending',
        metadata: '{}',
        created_at: '2025-01-27T10:00:00Z',
        updated_at: '2025-01-27T10:00:00Z',
      };

      mockD1Database.first.mockResolvedValue(mockContent);

      const contentData = {
        user_id: 'user123',
        title: 'Test Article',
        body: 'Test content body',
        status: 'draft',
        type: 'news_article',
        generated_by_ai: 1,
        ai_model_used: 'Llama-3.1',
        ethics_check_status: 'pending',
        metadata: '{}',
      };

      const result = await dbService.createContent(contentData);

      expect(result).toEqual(mockContent);
      expect(mockD1Database.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO content')
      );
    });

    test('should get content by user ID', async () => {
      console.log('LOG: TEST-DB-CONTENT-2 - Testing get content by user ID');
      
      const mockContent = [
        { id: 'content1', title: 'Article 1', user_id: 'user123' },
        { id: 'content2', title: 'Article 2', user_id: 'user123' },
      ];

      mockD1Database.all.mockResolvedValue({ results: mockContent });

      const result = await dbService.getContentByUserId('user123');

      expect(result).toEqual(mockContent);
      expect(mockD1Database.bind).toHaveBeenCalledWith('user123');
    });
  });
});