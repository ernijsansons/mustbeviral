/**
 * Advanced Testing Utilities
 * Fortune 50-grade testing helpers and mocks
 */

import { jest } from '@jest/globals';

// Mock WebSocket for collaboration testing
export class MockWebSocket {
  public readyState: number = 1; // OPEN
  public onopen?: () => void;
  public onmessage?: (event: { data: string }) => void;
  public onclose?: (event: { code: number; reason: string }) => void;
  public onerror?: (error: Error) => void;
  
  private messageQueue: string[] = [];
  private isConnected = false;

  constructor(public url: string) {
    // Simulate connection
    setTimeout(() => {
      this.isConnected = true;
      this.onopen?.();
    }, 10);
  }

  send(data: string): void {
    if (this.readyState === 1) {
      this.messageQueue.push(data);
      // Simulate echo for testing
      setTimeout(() => {
        this.onmessage?.({ data });
      }, 5);
    }
  }

  close(code = 1000, reason = 'Normal closure'): void {
    this.readyState = 3; // CLOSED
    this.isConnected = false;
    this.onclose?.({ code, reason });
  }

  // Test helper methods
  simulateMessage(data: any): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateError(error: Error): void {
    this.onerror?.(error);
  }

  getMessageQueue(): string[] {
    return [...this.messageQueue];
  }

  clearMessageQueue(): void {
    this.messageQueue = [];
  }
}

// Mock AI providers for cost optimization testing
export class MockAIProvider {
  constructor(
    public name: string,
    public latency: number = 1000,
    public errorRate: number = 0.05,
    public cost: number = 0.001
  ) {}

  async executeRequest(model: string, prompt: string): Promise<{
    content: string;
    usage: { totalTokens: number };
    latency: number;
    cost: number;
  }> {
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, this.latency + Math.random() * 500));

    // Simulate random errors
    if (Math.random() < this.errorRate) {
      throw new Error(`${this.name} API error`);
    }

    const tokens = Math.floor(prompt.length / 4) + 100;
    const actualLatency = this.latency + Math.random() * 500;

    return {
      content: `Mock ${this.name} response to: ${prompt.substring(0, 50)}...`,
      usage: { totalTokens: tokens },
      latency: actualLatency,
      cost: tokens * this.cost,
    };
  }

  async isHealthy(): Promise<boolean> {
    return Math.random() > this.errorRate;
  }
}

// Database test utilities
export class MockDatabase {
  private data: Map<string, any[]> = new Map();
  private queryLog: Array<{ query: string; params: any[]; timestamp: number }> = [];

  async prepare(query: string) {
    return {
      bind: (...params: any[]) => ({
        all: () => this.executeQuery(query, params),
        first: () => this.executeQuery(query, params).then(results => results[0]),
      }),
    };
  }

  async batch(statements: any[]): Promise<any[]> {
    const results = [];
    for (const statement of statements) {
      results.push(await statement.all());
    }
    return results;
  }

  private async executeQuery(query: string, params: any[] = []): Promise<any[]> {
    this.queryLog.push({ query, params, timestamp: Date.now() });

    // Simulate query processing delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

    // Mock responses based on query type
    if (query.includes('SELECT * FROM users')) {
      return this.getMockUsers();
    } else if (query.includes('SELECT * FROM posts')) {
      return this.getMockPosts();
    } else if (query.includes('INSERT')) {
      return [{ success: true, meta: { last_row_id: Date.now() } }];
    }

    return [];
  }

  private getMockUsers(): any[] {
    return [
      { id: '1', username: 'user1', email: 'user1@example.com', created_at: Date.now() },
      { id: '2', username: 'user2', email: 'user2@example.com', created_at: Date.now() },
    ];
  }

  private getMockPosts(): any[] {
    return [
      { id: '1', user_id: '1', content: 'Test post 1', created_at: Date.now() },
      { id: '2', user_id: '2', content: 'Test post 2', created_at: Date.now() },
    ];
  }

  getQueryLog(): Array<{ query: string; params: any[]; timestamp: number }> {
    return [...this.queryLog];
  }

  clearQueryLog(): void {
    this.queryLog = [];
  }

  setMockData(table: string, data: any[]): void {
    this.data.set(table, data);
  }
}

// Performance testing utilities
export class PerformanceTracker {
  private measurements: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  start(label: string): void {
    this.startTimes.set(label, performance.now());
  }

  end(label: string): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      throw new Error(`No start time found for label: ${label}`);
    }

    const duration = performance.now() - startTime;
    
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    this.measurements.get(label)!.push(duration);
    
    this.startTimes.delete(label);
    return duration;
  }

  getStats(label: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
  } {
    const measurements = this.measurements.get(label);
    if (!measurements || measurements.length === 0) {
      throw new Error(`No measurements found for label: ${label}`);
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = sorted.length;
    const avg = sorted.reduce((sum, val) => sum + val, 0) / count;
    const min = sorted[0];
    const max = sorted[count - 1];
    const p95Index = Math.floor(count * 0.95);
    const p95 = sorted[p95Index];

    return { count, avg, min, max, p95 };
  }

  clear(): void {
    this.measurements.clear();
    this.startTimes.clear();
  }
}

// Memory leak detection
export class MemoryLeakDetector {
  private initialMemory: number;
  private snapshots: Array<{ timestamp: number; memory: number }> = [];

  constructor() {
    this.initialMemory = this.getCurrentMemory();
  }

  takeSnapshot(label?: string): void {
    const memory = this.getCurrentMemory();
    this.snapshots.push({
      timestamp: Date.now(),
      memory,
    });

    if (label) {
      console.log(`Memory snapshot [${label}]: ${memory.toFixed(2)}MB`);
    }
  }

  getMemoryDelta(): number {
    return this.getCurrentMemory() - this.initialMemory;
  }

  detectLeak(threshold: number = 50): boolean {
    const delta = this.getMemoryDelta();
    return delta > threshold;
  }

  getReport(): {
    initialMemory: number;
    currentMemory: number;
    delta: number;
    snapshots: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    const currentMemory = this.getCurrentMemory();
    const delta = currentMemory - this.initialMemory;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (this.snapshots.length > 1) {
      const recent = this.snapshots.slice(-5);
      const firstRecent = recent[0].memory;
      const lastRecent = recent[recent.length - 1].memory;
      const trendDelta = lastRecent - firstRecent;
      
      if (trendDelta > 10) {trend = 'increasing';}
      else if (trendDelta < -10) {trend = 'decreasing';}
    }

    return {
      initialMemory: this.initialMemory,
      currentMemory,
      delta,
      snapshots: this.snapshots.length,
      trend,
    };
  }

  private getCurrentMemory(): number {
    // In browser environment, this would use performance.memory
    // In Node.js, this would use process.memoryUsage()
    return typeof window !== 'undefined' && 'memory' in performance
      ? (performance as any).memory.usedJSHeapSize / 1024 / 1024
      : 0;
  }
}

// Load testing utilities
export class LoadTestRunner {
  private results: Array<{
    concurrent: number;
    totalRequests: number;
    duration: number;
    successRate: number;
    avgLatency: number;
    errorsPerSecond: number;
  }> = [];

  async runLoadTest(
    testFunction: () => Promise<void>,
    options: {
      concurrency: number;
      duration: number; // in milliseconds
      rampUp?: number; // ramp up time
    }
  ): Promise<void> {
    const { concurrency, duration, rampUp = 0 } = options;
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    let activeRequests = 0;
    let completedRequests = 0;
    let errors = 0;
    const latencies: number[] = [];

    // Ramp up gradually if specified
    const rampUpInterval = rampUp / concurrency;
    
    const workers: Promise<void>[] = [];
    
    for (let i = 0; i < concurrency; i++) {
      const delay = rampUp > 0 ? i * rampUpInterval : 0;
      
      const worker = new Promise<void>((resolve) => {
        setTimeout(async () => {
          while (Date.now() < endTime) {
            activeRequests++;
            const requestStart = Date.now();
            
            try {
              await testFunction();
              const latency = Date.now() - requestStart;
              latencies.push(latency);
              completedRequests++;
            } catch (error) {
              errors++;
            } finally {
              activeRequests--;
            }
          }
          resolve();
        }, delay);
      });
      
      workers.push(worker);
    }

    await Promise.all(workers);

    // Calculate results
    const totalDuration = Date.now() - startTime;
    const successRate = completedRequests / (completedRequests + errors);
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length 
      : 0;
    const errorsPerSecond = errors / (totalDuration / 1000);

    this.results.push({
      concurrent: concurrency,
      totalRequests: completedRequests + errors,
      duration: totalDuration,
      successRate,
      avgLatency,
      errorsPerSecond,
    });
  }

  getResults(): Array<{
    concurrent: number;
    totalRequests: number;
    duration: number;
    successRate: number;
    avgLatency: number;
    errorsPerSecond: number;
  }> {
    return [...this.results];
  }

  clear(): void {
    this.results = [];
  }
}

// Test data generators
export class TestDataGenerator {
  static generateUser(overrides: Partial<any> = {}): any {
    return {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: `testuser_${Math.random().toString(36).substr(2, 8)}`,
      email: `test${Math.random()}@example.com`,
      createdAt: Date.now(),
      status: 'active',
      ...overrides,
    };
  }

  static generatePost(userId?: string, overrides: Partial<any> = {}): any {
    return {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId || this.generateUser().id,
      content: `Test post content ${Math.random().toString(36).substr(2, 20)}`,
      title: `Test Post ${Math.random().toString(36).substr(2, 10)}`,
      createdAt: Date.now(),
      status: 'published',
      ...overrides,
    };
  }

  static generateComment(postId?: string, userId?: string, overrides: Partial<any> = {}): any {
    return {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      postId: postId || this.generatePost().id,
      userId: userId || this.generateUser().id,
      content: `Test comment ${Math.random().toString(36).substr(2, 30)}`,
      createdAt: Date.now(),
      ...overrides,
    };
  }

  static generateLargeDataset<T>(generator: () => T, count: number): T[] {
    return Array.from({ length: count }, generator);
  }
}

// Environment-specific test utilities
export const testUtils = {
  // Setup mock globals
  setupMocks(): void {
    if (typeof global !== 'undefined') {
      (global as any).WebSocket = MockWebSocket;
      (global as any).performance = {
        now: () => Date.now(),
        memory: { usedJSHeapSize: 0 },
      };
    }
  },

  // Clean up after tests
  cleanup(): void {
    jest.clearAllMocks();
    jest.clearAllTimers();
    if (typeof global !== 'undefined') {
      delete (global as any).WebSocket;
      delete (global as any).performance;
    }
  },

  // Wait for async operations
  waitFor(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Wait for condition
  async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) {return;}
      await this.waitFor(interval);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  // Assert no console errors
  expectNoConsoleErrors(): void {
    const originalError = console.error;
    const errors: string[] = [];
    
    console.error = (...args: any[]) => {
      errors.push(args.join(' '));
      originalError(...args);
    };
    
    return {
      verify: () => {
        console.error = originalError;
        if (errors.length > 0) {
          throw new Error(`Console errors found: ${errors.join(', ')}`);
        }
      },
    };
  },
};

export {
  MockWebSocket,
  MockAIProvider,
  MockDatabase,
  PerformanceTracker,
  MemoryLeakDetector,
  LoadTestRunner,
  TestDataGenerator,
};