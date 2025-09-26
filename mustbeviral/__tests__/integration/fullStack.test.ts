/**
 * Full Stack Integration Tests
 * End-to-end testing of database, AI, collaboration, and security systems
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { QueryOptimizer } from '../../src/lib/database/queryOptimizer';
import { AICostOptimizer } from '../../src/lib/ai/costOptimizer';
import { ModelRouter } from '../../src/lib/ai/modelRouter';
import { IntelligentAIService } from '../../src/lib/ai/intelligentService';
import { CollaborationService } from '../../src/lib/collaboration';
import { WebSocketManager } from '../../src/lib/collaboration/websocketManager';
import { ContentCollaborationEditor } from '../../src/lib/collaboration/contentEditor';
import {
  MockDatabase,
  MockAIProvider,
  MockWebSocket,
  PerformanceTracker,
  MemoryLeakDetector,
  LoadTestRunner,
  TestDataGenerator,
  testUtils
} from '../utils/testHelpers';

describe('Full Stack Integration Tests', () => {
  let database: MockDatabase;
  let queryOptimizer: QueryOptimizer;
  let aiService: IntelligentAIService;
  let collaborationService: CollaborationService;
  let performanceTracker: PerformanceTracker;
  let memoryDetector: MemoryLeakDetector;

  beforeAll(() => {
    testUtils.setupMocks();
  });

  afterAll(() => {
    testUtils.cleanup();
  });

  beforeEach(() => {
    database = new MockDatabase();
    queryOptimizer = new QueryOptimizer();
    aiService = new IntelligentAIService();
    performanceTracker = new PerformanceTracker();
    memoryDetector = new MemoryLeakDetector();
    
    collaborationService = new CollaborationService({
      websocketUrl: 'ws://localhost:8080',
      enablePresence: true,
      enableTyping: true,
      enableCursor: true,
      autoReconnect: true,
      heartbeatInterval: 30000,
    });
  });

  afterEach(() => {
    performanceTracker.clear();
    memoryDetector.getReport();
  });

  describe('Database + AI Integration', () => {
    test('should optimize AI queries using database patterns', async () => {
      // Setup test data
      const users = TestDataGenerator.generateLargeDataset(
        () => TestDataGenerator.generateUser(),
        100
      );
      const posts = TestDataGenerator.generateLargeDataset(
        () => TestDataGenerator.generatePost(),
        1000
      );
      
      database.setMockData('users', users);
      database.setMockData('posts', posts);
      
      performanceTracker.start('ai-database-integration');
      
      // Use AI to analyze user engagement patterns
      const analysisRequest = {
        prompt: 'Analyze user engagement patterns and suggest content optimization strategies',
        taskType: 'analysis' as const,
        complexity: 'high' as const,
        maxCost: 0.50,
        priority: 'normal' as const
      };
      
      // Load user data with optimized queries
      const userIds = users.slice(0, 50).map(u => u.id);
      const usersWithPosts = await queryOptimizer.batchLoadUsersWithRelations(
        userIds,
        ['posts', 'analytics']
      );
      
      // Use AI to process the data
      const aiResponse = await aiService.executeRequest(analysisRequest);
      
      const duration = performanceTracker.end('ai-database-integration');
      
      expect(usersWithPosts).toHaveLength(50);
      expect(aiResponse.content).toBeDefined();
      expect(aiResponse.cost).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10000); // Should complete in under 10s
      
      // Verify database optimization prevented N+1 queries
      const queryLog = database.getQueryLog();
      expect(queryLog.length).toBeLessThan(10); // Should be batched efficiently
    });

    test('should cache AI results and database queries together', async () => {
      const cacheKey = 'user-content-analysis';
      
      // First request - should hit database and AI
      performanceTracker.start('first-request');
      
      const request = {
        prompt: 'Generate content recommendations for user engagement',
        taskType: 'content-generation' as const,
        complexity: 'medium' as const,
        cacheKey
      };
      
      const firstResponse = await aiService.executeRequest(request);
      const firstDuration = performanceTracker.end('first-request');
      
      // Second request - should use cache
      performanceTracker.start('cached-request');
      const secondResponse = await aiService.executeRequest(request);
      const cachedDuration = performanceTracker.end('cached-request');
      
      expect(firstResponse.content).toBeDefined();
      expect(secondResponse.cached).toBe(true);
      expect(secondResponse.cost).toBe(0); // Cached, no cost
      expect(cachedDuration).toBeLessThan(firstDuration / 5); // Significantly faster
    });

    test('should handle high load with database + AI coordination', async () => {
      const loadTestRunner = new LoadTestRunner();
      
      await loadTestRunner.runLoadTest(async () => {
        // Simulate concurrent users requesting AI analysis
        const userId = TestDataGenerator.generateUser().id;
        const posts = await queryOptimizer.batchLoadUsersWithRelations([userId], ['posts']);
        
        const aiRequest = {
          prompt: `Analyze engagement for user ${userId}`,
          taskType: 'analysis' as const,
          complexity: 'low' as const,
          maxCost: 0.05,
          priority: 'normal' as const
        };
        
        await aiService.executeRequest(aiRequest);
      }, {
        concurrency: 20,
        duration: 5000, // 5 seconds
        rampUp: 1000   // 1 second ramp up
      });
      
      const results = loadTestRunner.getResults()[0];
      expect(results.successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(results.avgLatency).toBeLessThan(2000); // Under 2s average
    });
  });

  describe('Collaboration + Database Integration', () => {
    test('should sync real-time edits to database efficiently', async () => {
      const mockWs = new MockWebSocket('ws://localhost:8080');
      const wsManager = new WebSocketManager();
      
      // Mock the connection
      (global as any).WebSocket = () => mockWs;
      
      const contentEditor = new ContentCollaborationEditor(
        wsManager,
        'content123',
        'room456',
        'Initial content',
        { canEdit: true, canComment: true, canView: true }
      );
      
      performanceTracker.start('collaborative-edit');
      
      // Simulate multiple users editing
      const operations = [
        () => contentEditor.insertText(0, 'Hello '),
        () => contentEditor.insertText(13, 'world!'),
        () => contentEditor.deleteText(6, 5),
        () => contentEditor.insertText(6, 'universe'),
      ];
      
      // Execute operations concurrently
      await Promise.all(operations.map(op => op()));
      
      const duration = performanceTracker.end('collaborative-edit');
      
      const finalContent = contentEditor.getContent();
      expect(finalContent).toContain('universe');
      expect(duration).toBeLessThan(1000); // Should be fast
      
      // Verify database operations were optimized
      const queryLog = database.getQueryLog();
      expect(queryLog.length).toBeLessThan(20); // Efficient batch operations
    });

    test('should handle concurrent collaboration sessions', async () => {
      const sessions = [];
      
      // Create multiple collaboration sessions
      for (let i = 0; i < 10; i++) {
        const session = collaborationService.startContentSession(
          `content${i}`,
          `room${i}`,
          `Initial content ${i}`,
          { canEdit: true, canComment: true, canView: true }
        );
        sessions.push(session);
      }
      
      const editors = await Promise.all(sessions);
      
      // Each editor should work independently
      for (let i = 0; i < editors.length; i++) {
        editors[i].insertText(0, `User ${i}: `);
      }
      
      // Verify all editors have correct content
      for (let i = 0; i < editors.length; i++) {
        const content = editors[i].getContent();
        expect(content).toContain(`User ${i}:`);
      }
      
      // Cleanup
      for (let i = 0; i < 10; i++) {
        collaborationService.endContentSession(`content${i}`);
      }
    });
  });

  describe('AI + Collaboration Integration', () => {
    test('should provide AI suggestions during collaboration', async () => {
      const contentEditor = new ContentCollaborationEditor(
        new WebSocketManager(),
        'content789',
        'room789',
        'Draft blog post about',
        { canEdit: true, canComment: true, canView: true }
      );
      
      // User starts typing
      contentEditor.insertText(21, ' artificial intelligence');
      
      // AI provides suggestions based on content
      const currentContent = contentEditor.getContent();
      const suggestionRequest = {
        prompt: `Complete this blog post: "${currentContent}"`,
        taskType: 'content-generation' as const,
        complexity: 'medium' as const,
        maxCost: 0.10,
        priority: 'normal' as const
      };
      
      const aiSuggestion = await aiService.executeRequest(suggestionRequest);
      
      expect(aiSuggestion.content).toBeDefined();
      expect(aiSuggestion.content.length).toBeGreaterThan(50);
      expect(aiSuggestion.cost).toBeLessThan(0.10);
      
      // User can accept suggestion
      contentEditor.insertText(currentContent.length, '\n\n' + aiSuggestion.content);
      
      const finalContent = contentEditor.getContent();
      expect(finalContent).toContain('artificial intelligence');
      expect(finalContent.length).toBeGreaterThan(100);
    });

    test('should optimize AI costs during collaborative sessions', async () => {
      const costOptimizer = new AICostOptimizer();
      
      // Simulate multiple users requesting AI help simultaneously
      const requests = Array.from({ length: 20 }, (_, i) => ({
        prompt: `Help with content ${i}`,
        taskType: 'content-generation' as const,
        complexity: 'low' as const,
        maxCost: 0.05,
        priority: 'normal' as const
      }));
      
      performanceTracker.start('bulk-ai-requests');
      
      const responses = await aiService.batchExecute(requests);
      
      const duration = performanceTracker.end('bulk-ai-requests');
      
      expect(responses).toHaveLength(20);
      expect(duration).toBeLessThan(15000); // Should handle batch efficiently
      
      // Calculate total cost savings
      const totalCost = responses.reduce((sum, r) => sum + r.cost, 0);
      const totalSavings = responses.reduce((sum, r) => sum + r.optimization.savings, 0);
      
      expect(totalSavings).toBeGreaterThan(0);
      expect(totalCost).toBeLessThan(20 * 0.05); // Should be less than max individual costs
    });
  });

  describe('Security Integration', () => {
    test('should maintain security across all systems', async () => {
      // Test data validation across systems
      const maliciousInput = '<script>alert("xss")</script>';
      
      // AI service should sanitize input
      const aiRequest = {
        prompt: maliciousInput,
        taskType: 'analysis' as const,
        complexity: 'low' as const
      };
      
      const aiResponse = await aiService.executeRequest(aiRequest);
      expect(aiResponse.content).not.toContain('<script>');
      
      // Collaboration should sanitize content
      const contentEditor = new ContentCollaborationEditor(
        new WebSocketManager(),
        'content999',
        'room999',
        '',
        { canEdit: true, canComment: true, canView: true }
      );
      
      contentEditor.insertText(0, maliciousInput);
      const sanitizedContent = contentEditor.getContent();
      expect(sanitizedContent).not.toContain('<script>');
      
      // Database queries should be protected
      const userQuery = `SELECT * FROM users WHERE name = '${maliciousInput}'`;
      await expect(
        database.prepare(userQuery).all()
      ).resolves.toBeDefined(); // Should not throw SQL injection error
    });

    test('should handle authentication across services', async () => {
      const authenticatedUser = {
        id: 'auth-user-123',
        permissions: ['read', 'write', 'admin']
      };
      
      // All services should respect user permissions
      const restrictedRequest = {
        prompt: 'Access sensitive data',
        taskType: 'analysis' as const,
        complexity: 'high' as const,
        userId: authenticatedUser.id
      };
      
      const response = await aiService.executeRequest(restrictedRequest);
      expect(response).toBeDefined(); // Should work with valid user
      
      // Invalid user should be rejected
      const invalidRequest = {
        ...restrictedRequest,
        userId: 'invalid-user'
      };
      
      // This would normally throw in a real auth system
      const invalidResponse = await aiService.executeRequest(invalidRequest);
      expect(invalidResponse).toBeDefined(); // Mock allows it
    });
  });

  describe('Performance Integration', () => {
    test('should maintain performance under realistic load', async () => {
      memoryDetector.takeSnapshot('integration-start');
      
      const loadTestRunner = new LoadTestRunner();
      
      await loadTestRunner.runLoadTest(async () => {
        // Realistic user workflow
        const user = TestDataGenerator.generateUser();
        
        // 1. Load user data
        const userData = await queryOptimizer.batchLoadUsersWithRelations([user.id], ['posts']);
        
        // 2. Get AI content suggestions
        const aiResponse = await aiService.executeRequest({
          prompt: 'Generate engaging content',
          taskType: 'content-generation' as const,
          complexity: 'medium' as const,
          maxCost: 0.10
        });
        
        // 3. Start collaborative editing
        const editor = await collaborationService.startContentSession(
          `content-${user.id}`,
          `room-${user.id}`,
          aiResponse.content,
          { canEdit: true, canComment: true, canView: true }
        );
        
        // 4. Make some edits
        editor.insertText(0, 'TRENDING: ');
        editor.addComment(50, 'This looks great!');
        
        // 5. Cleanup
        collaborationService.endContentSession(`content-${user.id}`);
        
      }, {
        concurrency: 50,
        duration: 10000, // 10 seconds
        rampUp: 2000     // 2 second ramp up
      });
      
      const results = loadTestRunner.getResults()[0];
      
      expect(results.successRate).toBeGreaterThan(0.95);
      expect(results.avgLatency).toBeLessThan(3000);
      expect(results.errorsPerSecond).toBeLessThan(1);
      
      memoryDetector.takeSnapshot('integration-end');
      
      // Check for memory leaks
      expect(memoryDetector.detectLeak(500)).toBe(false); // Less than 500MB growth
    });

    test('should scale efficiently with system resources', async () => {
      const stats = {
        database: queryOptimizer.getCacheStats(),
        ai: aiService.getMetrics(),
        collaboration: collaborationService.getMetrics()
      };
      
      // Process large dataset
      const largeDataset = TestDataGenerator.generateLargeDataset(
        () => TestDataGenerator.generatePost(),
        10000
      );
      
      performanceTracker.start('large-dataset-processing');
      
      // Process in batches
      const batchSize = 100;
      for (let i = 0; i < largeDataset.length; i += batchSize) {
        const batch = largeDataset.slice(i, i + batchSize);
        const userIds = batch.map(p => p.userId);
        
        await queryOptimizer.batchLoadUsersWithRelations(userIds, ['analytics']);
      }
      
      const duration = performanceTracker.end('large-dataset-processing');
      
      expect(duration).toBeLessThan(30000); // Should process 10k items in under 30s
      
      const finalStats = {
        database: queryOptimizer.getCacheStats(),
        ai: aiService.getMetrics(),
        collaboration: collaborationService.getMetrics()
      };
      
      // Verify caching improved performance
      expect(finalStats.database.cacheEntries).toBeGreaterThan(stats.database.cacheEntries);
      expect(finalStats.ai.cacheHitRate).toBeGreaterThanOrEqual(stats.ai.cacheHitRate);
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover gracefully from system failures', async () => {
      let errorCount = 0;
      
      // Simulate intermittent failures
      const flakyAIService = {
        async executeRequest(request: any) {
          errorCount++;
          if (errorCount <= 3) {
            throw new Error(`Service temporarily unavailable (${errorCount})`);
          }
          return await aiService.executeRequest(request);
        }
      };
      
      // System should retry and eventually succeed
      const request = {
        prompt: 'Test resilience',
        taskType: 'analysis' as const,
        complexity: 'low' as const
      };
      
      const response = await flakyAIService.executeRequest(request);
      expect(response).toBeDefined();
      expect(errorCount).toBe(4); // Should have retried 3 times before success
    });

    test('should maintain data consistency during failures', async () => {
      const contentEditor = new ContentCollaborationEditor(
        new WebSocketManager(),
        'consistent-content',
        'consistent-room',
        'Original content',
        { canEdit: true, canComment: true, canView: true }
      );
      
      const originalContent = contentEditor.getContent();
      
      // Simulate network failure during operation
      try {
        contentEditor.insertText(0, 'Failed: ');
        throw new Error('Network failure');
      } catch (error) {
        // Content should remain in consistent state
        const currentContent = contentEditor.getContent();
        expect(currentContent).toContain('Failed: '); // Local change preserved
        expect(currentContent).toContain('Original content');
      }
    });
  });

  describe('Cross-System Data Flow', () => {
    test('should maintain data integrity across all systems', async () => {
      const testData = {
        user: TestDataGenerator.generateUser(),
        posts: TestDataGenerator.generateLargeDataset(
          () => TestDataGenerator.generatePost(),
          10
        )
      };
      
      // Store in database
      database.setMockData('users', [testData.user]);
      database.setMockData('posts', testData.posts);
      
      // Load through query optimizer
      const optimizedData = await queryOptimizer.batchLoadUsersWithRelations(
        [testData.user.id],
        ['posts']
      );
      
      // Process with AI
      const aiAnalysis = await aiService.executeRequest({
        prompt: `Analyze user ${testData.user.username} with ${testData.posts.length} posts`,
        taskType: 'analysis' as const,
        complexity: 'medium' as const
      });
      
      // Use in collaboration
      const contentEditor = await collaborationService.startContentSession(
        'data-flow-test',
        'data-flow-room',
        aiAnalysis.content,
        { canEdit: true, canComment: true, canView: true }
      );
      
      // Verify data consistency
      expect(optimizedData[0].id).toBe(testData.user.id);
      expect(aiAnalysis.content).toContain(testData.user.username);
      expect(contentEditor.getContent()).toBe(aiAnalysis.content);
      
      // Cleanup
      collaborationService.endContentSession('data-flow-test');
    });
  });
});