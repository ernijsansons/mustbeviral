/**
 * Query Optimizer Unit Tests
 * Comprehensive testing for N+1 query prevention and database optimization
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { QueryOptimizer, DataLoader } from '../../../src/lib/database/queryOptimizer';
import { MockDatabase, PerformanceTracker, TestDataGenerator } from '../../utils/testHelpers';

describe('QueryOptimizer', () => {
  let queryOptimizer: QueryOptimizer;
  let mockDb: MockDatabase;
  let performanceTracker: PerformanceTracker;

  beforeEach(() => {
    queryOptimizer = new QueryOptimizer();
    mockDb = new MockDatabase();
    performanceTracker = new PerformanceTracker();
    
    // Setup mock data
    const users = TestDataGenerator.generateLargeDataset(
      () => TestDataGenerator.generateUser(),
      100
    );
    const posts = TestDataGenerator.generateLargeDataset(
      () => TestDataGenerator.generatePost(),
      1000
    );
    
    mockDb.setMockData('users', users);
    mockDb.setMockData('posts', posts);
  });

  afterEach(() => {
    performanceTracker.clear();
    mockDb.clearQueryLog();
  });

  describe('DataLoader', () => {
    test('should batch multiple load requests', async () => {
      const batchLoadFn = jest.fn(async (ids: string[]) => {
        expect(ids.length).toBeGreaterThan(1); // Ensure batching occurred
        return ids.map(id => ({ id, name: `User ${id}` }));
      });

      const loader = new DataLoader(batchLoadFn, { maxBatchSize: 10 });

      // Make multiple concurrent requests
      const promises = [
        loader.load('1'),
        loader.load('2'),
        loader.load('3'),
      ];

      const results = await Promise.all(promises);

      expect(batchLoadFn).toHaveBeenCalledTimes(1); // Only one batch call
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ id: '1', name: 'User 1' });
    });

    test('should cache results and avoid duplicate requests', async () => {
      const batchLoadFn = jest.fn(async (ids: string[]) => {
        return ids.map(id => ({ id, name: `User ${id}` }));
      });

      const loader = new DataLoader(batchLoadFn, { cache: true });

      // First load
      const result1 = await loader.load('1');
      
      // Second load (should use cache)
      const result2 = await loader.load('1');

      expect(batchLoadFn).toHaveBeenCalledTimes(1); // Only one call
      expect(result1).toEqual(result2);
    });

    test('should respect max batch size', async () => {
      const batchLoadFn = jest.fn(async (ids: string[]) => {
        expect(ids.length).toBeLessThanOrEqual(3); // Max batch size
        return ids.map(id => ({ id, name: `User ${id}` }));
      });

      const loader = new DataLoader(batchLoadFn, { maxBatchSize: 3 });

      // Make more requests than batch size
      const promises = Array.from({ length: 10 }, (_, i) => 
        loader.load(i.toString())
      );

      await Promise.all(promises);

      expect(batchLoadFn).toHaveBeenCalledTimes(4); // 3+3+3+1 = 4 batches
    });

    test('should handle errors gracefully', async () => {
      const batchLoadFn = jest.fn(async (ids: string[]) => {
        throw new Error('Database error');
      });

      const loader = new DataLoader(batchLoadFn);

      await expect(loader.load('1')).rejects.toThrow('Database error');
    });

    test('should clear cache when requested', async () => {
      const batchLoadFn = jest.fn(async (ids: string[]) => {
        return ids.map(id => ({ id, name: `User ${id}` }));
      });

      const loader = new DataLoader(batchLoadFn, { cache: true });

      // Load and cache
      await loader.load('1');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);

      // Clear cache
      loader.clear('1');

      // Load again (should call function again)
      await loader.load('1');
      expect(batchLoadFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('QueryOptimizer Integration', () => {
    test('should create and manage loaders', () => {
      const batchLoadFn = jest.fn();
      
      const loader = queryOptimizer.createLoader('test', batchLoadFn);
      const retrievedLoader = queryOptimizer.getLoader('test');

      expect(loader).toBeDefined();
      expect(retrievedLoader).toBe(loader);
    });

    test('should optimize user queries with relations', async () => {
      performanceTracker.start('batchLoad');
      
      // Mock the batch load function
      const userIds = ['1', '2', '3', '4', '5'];
      
      const results = await queryOptimizer.batchLoadUsersWithRelations(
        userIds,
        ['posts', 'analytics']
      );

      const duration = performanceTracker.end('batchLoad');

      expect(results).toHaveLength(userIds.length);
      expect(duration).toBeLessThan(1000); // Should be fast
      
      // Verify that relations were loaded
      results.forEach(user => {
        expect(user).toHaveProperty('posts');
        expect(user).toHaveProperty('analytics');
      });
    });

    test('should prevent N+1 queries through batching', async () => {
      // Simulate N+1 scenario
      const userIds = Array.from({ length: 100 }, (_, i) => i.toString());
      
      mockDb.clearQueryLog();
      
      // Load users with posts (potential N+1)
      await queryOptimizer.batchLoadUsersWithRelations(userIds, ['posts']);
      
      const queryLog = mockDb.getQueryLog();
      
      // Should have made minimal queries due to batching
      // Instead of 1 + 100 queries, should be ~3-4 queries total
      expect(queryLog.length).toBeLessThan(10);
    });

    test('should handle large datasets efficiently', async () => {
      const largeUserIds = Array.from({ length: 1000 }, (_, i) => i.toString());
      
      performanceTracker.start('largeLoad');
      
      const results = await queryOptimizer.batchLoadUsersWithRelations(
        largeUserIds,
        ['posts']
      );
      
      const duration = performanceTracker.end('largeLoad');
      
      expect(results).toHaveLength(1000);
      expect(duration).toBeLessThan(5000); // Should handle 1000 users in <5s
    });

    test('should provide performance metrics', () => {
      const stats = queryOptimizer.getCacheStats();
      
      expect(stats).toHaveProperty('loaderCount');
      expect(stats).toHaveProperty('cacheEntries');
      expect(stats).toHaveProperty('cacheSize');
      expect(typeof stats.loaderCount).toBe('number');
    });

    test('should clear all caches', () => {
      // Create some loaders and cache data
      const loader1 = queryOptimizer.createLoader('test1', jest.fn());
      const loader2 = queryOptimizer.createLoader('test2', jest.fn());
      
      loader1.prime('key1', { data: 'test' });
      loader2.prime('key2', { data: 'test' });
      
      // Clear all
      queryOptimizer.clearAll();
      
      const stats = queryOptimizer.getCacheStats();
      expect(stats.cacheEntries).toBe(0);
    });
  });

  describe('Performance Optimization', () => {
    test('should execute complex queries efficiently', async () => {
      const complexQuery = {
        sql: 'SELECT * FROM users JOIN posts ON users.id = posts.user_id WHERE users.active = ?',
        params: [true]
      };
      
      performanceTracker.start('complexQuery');
      
      const result = await queryOptimizer.optimizeComplexQuery(
        complexQuery as any,
        {
          enableCache: true,
          cacheKey: 'active-users-posts',
          cacheTTL: 60000
        }
      );
      
      const duration = performanceTracker.end('complexQuery');
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(500); // Should be optimized
    });

    test('should warm up cache effectively', async () => {
      const warmUpQueries = [
        {
          key: 'popular-users',
          query: async () => mockDb.prepare('SELECT * FROM users ORDER BY followers DESC LIMIT 10').all()
        },
        {
          key: 'recent-posts',
          query: async () => mockDb.prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT 20').all()
        }
      ];
      
      performanceTracker.start('warmUp');
      
      await queryOptimizer.warmUpCache(warmUpQueries);
      
      const duration = performanceTracker.end('warmUp');
      
      expect(duration).toBeGreaterThan(0); // Should have done some work
      
      // Subsequent queries should be faster (cached)
      performanceTracker.start('cachedQuery');
      
      await queryOptimizer.optimizeComplexQuery(
        { sql: 'SELECT * FROM users ORDER BY followers DESC LIMIT 10' } as any,
        { enableCache: true, cacheKey: 'popular-users' }
      );
      
      const cachedDuration = performanceTracker.end('cachedQuery');
      expect(cachedDuration).toBeLessThan(duration / 2); // Should be faster
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      const faultyLoader = queryOptimizer.createLoader(
        'faulty',
        async () => {
          throw new Error('Connection timeout');
        }
      );
      
      await expect(faultyLoader.load('test')).rejects.toThrow('Connection timeout');
    });

    test('should handle malformed queries gracefully', async () => {
      const malformedQuery = {
        sql: 'INVALID SQL SYNTAX',
        params: []
      };
      
      await expect(
        queryOptimizer.optimizeComplexQuery(malformedQuery as any)
      ).rejects.toThrow();
    });

    test('should recover from partial failures in batch operations', async () => {
      let callCount = 0;
      const flakyLoader = queryOptimizer.createLoader(
        'flaky',
        async (ids: string[]) => {
          callCount++;
          if (callCount === 1) {
            throw new Error('Temporary failure');
          }
          return ids.map(id => ({ id, name: `User ${id}` }));
        }
      );
      
      // First call should fail
      await expect(flakyLoader.load('1')).rejects.toThrow('Temporary failure');
      
      // Second call should succeed
      const result = await flakyLoader.load('2');
      expect(result).toEqual({ id: '2', name: 'User 2' });
    });
  });

  describe('Memory Management', () => {
    test('should not cause memory leaks with large datasets', async () => {
      const memoryTracker = new (await import('../../utils/testHelpers')).MemoryLeakDetector();
      
      memoryTracker.takeSnapshot('start');
      
      // Process large amount of data
      for (let i = 0; i < 1000; i++) {
        const loader = queryOptimizer.createLoader(
          `temp-${i}`,
          async (ids: string[]) => ids.map(id => ({ id, data: 'x'.repeat(1000) }))
        );
        
        await loader.load('test');
        
        // Clear loader to free memory
        loader.clearAll();
      }
      
      memoryTracker.takeSnapshot('end');
      
      // Should not have significant memory growth
      expect(memoryTracker.detectLeak(100)).toBe(false);
    });
  });
});