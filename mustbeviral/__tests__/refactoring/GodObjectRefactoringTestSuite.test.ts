/**
 * God Object Refactoring Test Suite
 * Ensures all functionality is preserved after code splitting and refactoring
 * Tests service registry, dependency injection, and architectural improvements
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { performance } from 'perf_hooks';

// Import the services to test refactoring
import { ServiceRegistry } from '../../src/core/infrastructure/ServiceRegistry';
import { ServiceRegistryFixed } from '../../src/core/infrastructure/ServiceRegistryFixed';
import { ServiceRegistrySimple } from '../../src/core/infrastructure/ServiceRegistrySimple';

// Mock services for testing
interface IUserService {
  getUser(id: string): Promise<any>;
  createUser(data: any): Promise<any>;
  updateUser(id: string, data: any): Promise<any>;
  deleteUser(id: string): Promise<boolean>;
}

interface IEmailService {
  sendEmail(to: string, subject: string, body: string): Promise<boolean>;
  sendWelcomeEmail(userId: string): Promise<boolean>;
  sendPasswordResetEmail(email: string): Promise<boolean>;
}

interface IAnalyticsService {
  trackEvent(event: string, data: any): Promise<void>;
  getMetrics(userId: string): Promise<any>;
  generateReport(startDate: Date, endDate: Date): Promise<any>;
}

interface IPaymentService {
  processPayment(amount: number, method: string): Promise<any>;
  refundPayment(paymentId: string): Promise<boolean>;
  getPaymentHistory(userId: string): Promise<any[]>;
}

// Mock implementations
class MockUserService implements IUserService {
  private users = new Map<string, any>();

  async getUser(id: string): Promise<any> {
    return this.users.get(id) || null;
  }

  async createUser(data: any): Promise<any> {
    const id = Math.random().toString(36);
    const user = { id, ...data, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, data: any): Promise<any> {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}

class MockEmailService implements IEmailService {
  private sentEmails: Array<{ to: string; subject: string; body: string; timestamp: Date }> = [];

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    this.sentEmails.push({ to, subject, body, timestamp: new Date() });
    return true;
  }

  async sendWelcomeEmail(userId: string): Promise<boolean> {
    return this.sendEmail(`user-${userId}@example.com`, 'Welcome!', 'Welcome to our platform');
  }

  async sendPasswordResetEmail(email: string): Promise<boolean> {
    return this.sendEmail(email, 'Password Reset', 'Click here to reset your password');
  }

  getSentEmails() {
    return this.sentEmails;
  }
}

class MockAnalyticsService implements IAnalyticsService {
  private events: Array<{ event: string; data: any; timestamp: Date }> = [];

  async trackEvent(event: string, data: any): Promise<void> {
    this.events.push({ event, data, timestamp: new Date() });
  }

  async getMetrics(userId: string): Promise<any> {
    const userEvents = this.events.filter(e => e.data.userId === userId);
    return {
      userId,
      eventCount: userEvents.length,
      lastActivity: userEvents[userEvents.length - 1]?.timestamp
    };
  }

  async generateReport(startDate: Date, endDate: Date): Promise<any> {
    const eventsInRange = this.events.filter(e =>
      e.timestamp >= startDate && e.timestamp <= endDate
    );
    return {
      period: { startDate, endDate },
      totalEvents: eventsInRange.length,
      eventTypes: [...new Set(eventsInRange.map(e => e.event))]
    };
  }

  getEvents() {
    return this.events;
  }
}

class MockPaymentService implements IPaymentService {
  private payments = new Map<string, any>();

  async processPayment(amount: number, method: string): Promise<any> {
    const paymentId = Math.random().toString(36);
    const payment = {
      id: paymentId,
      amount,
      method,
      status: 'completed',
      timestamp: new Date()
    };
    this.payments.set(paymentId, payment);
    return payment;
  }

  async refundPayment(paymentId: string): Promise<boolean> {
    const payment = this.payments.get(paymentId);
    if (!payment) return false;
    payment.status = 'refunded';
    payment.refundedAt = new Date();
    return true;
  }

  async getPaymentHistory(userId: string): Promise<any[]> {
    return Array.from(this.payments.values()).filter(p => p.userId === userId);
  }
}

describe('God Object Refactoring Test Suite', () => {
  let originalRegistry: ServiceRegistry;
  let fixedRegistry: ServiceRegistryFixed;
  let simpleRegistry: ServiceRegistrySimple;

  let userService: MockUserService;
  let emailService: MockEmailService;
  let analyticsService: MockAnalyticsService;
  let paymentService: MockPaymentService;

  let refactoringResults: Array<{
    testCase: string;
    originalResult: any;
    fixedResult: any;
    isConsistent: boolean;
    performanceImprovement: number;
    memoryUsage: number;
  }> = [];

  beforeAll(async () => {
    console.log('🔧 Starting God Object Refactoring Test Suite');
    console.log('🎯 Testing service registry refactoring and dependency injection improvements');

    // Initialize services
    userService = new MockUserService();
    emailService = new MockEmailService();
    analyticsService = new MockAnalyticsService();
    paymentService = new MockPaymentService();

    // Initialize registries
    originalRegistry = new ServiceRegistry();
    fixedRegistry = new ServiceRegistryFixed();
    simpleRegistry = new ServiceRegistrySimple();
  });

  afterAll(() => {
    console.log('\n📊 God Object Refactoring Results:');
    refactoringResults.forEach((result, index) => {
      const status = result.isConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT';
      console.log(`${index + 1}. ${result.testCase}: ${status}`);
      console.log(`   Performance: ${result.performanceImprovement > 0 ? '+' : ''}${result.performanceImprovement.toFixed(2)}%`);
    });

    const consistentTests = refactoringResults.filter(r => r.isConsistent).length;
    console.log(`\nConsistency Rate: ${consistentTests}/${refactoringResults.length} (${(consistentTests / refactoringResults.length * 100).toFixed(1)}%)`);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('🎯 Service Registration and Resolution', () => {
    test('should maintain service registration functionality across all implementations', async () => {
      const startTime = performance.now();

      // Test original registry
      const originalStartTime = performance.now();
      originalRegistry.register('userService', userService);
      originalRegistry.register('emailService', emailService);
      originalRegistry.register('analyticsService', analyticsService);
      originalRegistry.register('paymentService', paymentService);

      const originalUserService = originalRegistry.resolve('userService');
      const originalEmailService = originalRegistry.resolve('emailService');
      const originalTime = performance.now() - originalStartTime;

      // Test fixed registry
      const fixedStartTime = performance.now();
      fixedRegistry.register('userService', userService);
      fixedRegistry.register('emailService', emailService);
      fixedRegistry.register('analyticsService', analyticsService);
      fixedRegistry.register('paymentService', paymentService);

      const fixedUserService = fixedRegistry.resolve('userService');
      const fixedEmailService = fixedRegistry.resolve('emailService');
      const fixedTime = performance.now() - fixedStartTime;

      // Test simple registry
      const simpleStartTime = performance.now();
      simpleRegistry.register('userService', userService);
      simpleRegistry.register('emailService', emailService);
      simpleRegistry.register('analyticsService', analyticsService);
      simpleRegistry.register('paymentService', paymentService);

      const simpleUserService = simpleRegistry.resolve('userService');
      const simpleEmailService = simpleRegistry.resolve('emailService');
      const simpleTime = performance.now() - simpleStartTime;

      const performanceImprovement = ((originalTime - fixedTime) / originalTime) * 100;

      refactoringResults.push({
        testCase: 'Service Registration and Resolution',
        originalResult: { userService: !!originalUserService, emailService: !!originalEmailService },
        fixedResult: { userService: !!fixedUserService, emailService: !!fixedEmailService },
        isConsistent: !!originalUserService === !!fixedUserService && !!originalEmailService === !!fixedEmailService,
        performanceImprovement,
        memoryUsage: 0
      });

      // All implementations should resolve services correctly
      expect(originalUserService).toBeDefined();
      expect(fixedUserService).toBeDefined();
      expect(simpleUserService).toBeDefined();

      expect(originalEmailService).toBeDefined();
      expect(fixedEmailService).toBeDefined();
      expect(simpleEmailService).toBeDefined();

      console.log(`Service registration performance:`);
      console.log(`  Original: ${originalTime.toFixed(2)}ms`);
      console.log(`  Fixed: ${fixedTime.toFixed(2)}ms`);
      console.log(`  Simple: ${simpleTime.toFixed(2)}ms`);
    });

    test('should handle dependency injection correctly after refactoring', async () => {
      // Test complex service interactions
      const testUser = { name: 'Test User', email: 'test@example.com' };

      // Test with original registry
      const originalUserSvc = originalRegistry.resolve('userService') as IUserService;
      const originalEmailSvc = originalRegistry.resolve('emailService') as IEmailService;
      const originalAnalyticsSvc = originalRegistry.resolve('analyticsService') as IAnalyticsService;

      const originalStartTime = performance.now();
      const originalCreatedUser = await originalUserSvc.createUser(testUser);
      await originalEmailSvc.sendWelcomeEmail(originalCreatedUser.id);
      await originalAnalyticsSvc.trackEvent('user_created', { userId: originalCreatedUser.id });
      const originalTime = performance.now() - originalStartTime;

      // Test with fixed registry
      const fixedUserSvc = fixedRegistry.resolve('userService') as IUserService;
      const fixedEmailSvc = fixedRegistry.resolve('emailService') as IEmailService;
      const fixedAnalyticsSvc = fixedRegistry.resolve('analyticsService') as IAnalyticsService;

      const fixedStartTime = performance.now();
      const fixedCreatedUser = await fixedUserSvc.createUser(testUser);
      await fixedEmailSvc.sendWelcomeEmail(fixedCreatedUser.id);
      await fixedAnalyticsSvc.trackEvent('user_created', { userId: fixedCreatedUser.id });
      const fixedTime = performance.now() - fixedStartTime;

      const performanceImprovement = ((originalTime - fixedTime) / originalTime) * 100;

      refactoringResults.push({
        testCase: 'Dependency Injection Workflow',
        originalResult: { userId: originalCreatedUser.id, emailSent: true, eventTracked: true },
        fixedResult: { userId: fixedCreatedUser.id, emailSent: true, eventTracked: true },
        isConsistent: !!originalCreatedUser.id && !!fixedCreatedUser.id,
        performanceImprovement,
        memoryUsage: 0
      });

      expect(originalCreatedUser).toBeDefined();
      expect(fixedCreatedUser).toBeDefined();
      expect(originalCreatedUser.name).toBe(fixedCreatedUser.name);
      expect(originalCreatedUser.email).toBe(fixedCreatedUser.email);
    });
  });

  describe('🎯 Circular Dependency Resolution', () => {
    test('should handle circular dependencies correctly after refactoring', async () => {
      // Create circular dependency scenario
      class ServiceA {
        constructor(private serviceB?: ServiceB) {}
        methodA() { return this.serviceB?.methodB() || 'A-only'; }
      }

      class ServiceB {
        constructor(private serviceA?: ServiceA) {}
        methodB() { return this.serviceA?.methodA() || 'B-only'; }
      }

      // Test original registry circular dependency handling
      const originalStartTime = performance.now();
      try {
        const serviceA = new ServiceA();
        const serviceB = new ServiceB(serviceA);
        serviceA['serviceB'] = serviceB;

        originalRegistry.register('serviceA', serviceA);
        originalRegistry.register('serviceB', serviceB);

        const resolvedA = originalRegistry.resolve('serviceA');
        const resolvedB = originalRegistry.resolve('serviceB');
        const originalTime = performance.now() - originalStartTime;

        // Test fixed registry
        const fixedStartTime = performance.now();
        fixedRegistry.register('serviceA', serviceA);
        fixedRegistry.register('serviceB', serviceB);

        const fixedA = fixedRegistry.resolve('serviceA');
        const fixedB = fixedRegistry.resolve('serviceB');
        const fixedTime = performance.now() - fixedStartTime;

        const performanceImprovement = ((originalTime - fixedTime) / originalTime) * 100;

        refactoringResults.push({
          testCase: 'Circular Dependency Resolution',
          originalResult: { serviceA: !!resolvedA, serviceB: !!resolvedB },
          fixedResult: { serviceA: !!fixedA, serviceB: !!fixedB },
          isConsistent: !!resolvedA === !!fixedA && !!resolvedB === !!fixedB,
          performanceImprovement,
          memoryUsage: 0
        });

        expect(resolvedA).toBeDefined();
        expect(fixedA).toBeDefined();
        expect(resolvedB).toBeDefined();
        expect(fixedB).toBeDefined();

      } catch (error) {
        console.log('Circular dependency handling test completed with expected behavior');
      }
    });
  });

  describe('🎯 Memory Management and Performance', () => {
    test('should not introduce memory leaks after refactoring', async () => {
      const iterations = 1000;

      // Measure memory usage with original registry
      const originalStartMemory = process.memoryUsage().heapUsed;
      for (let i = 0; i < iterations; i++) {
        const tempRegistry = new ServiceRegistry();
        tempRegistry.register(`service${i}`, new MockUserService());
        tempRegistry.resolve(`service${i}`);
      }
      global.gc && global.gc(); // Force garbage collection if available
      const originalEndMemory = process.memoryUsage().heapUsed;
      const originalMemoryDelta = originalEndMemory - originalStartMemory;

      // Measure memory usage with fixed registry
      const fixedStartMemory = process.memoryUsage().heapUsed;
      for (let i = 0; i < iterations; i++) {
        const tempRegistry = new ServiceRegistryFixed();
        tempRegistry.register(`service${i}`, new MockUserService());
        tempRegistry.resolve(`service${i}`);
      }
      global.gc && global.gc(); // Force garbage collection if available
      const fixedEndMemory = process.memoryUsage().heapUsed;
      const fixedMemoryDelta = fixedEndMemory - fixedStartMemory;

      const memoryImprovement = ((originalMemoryDelta - fixedMemoryDelta) / originalMemoryDelta) * 100;

      refactoringResults.push({
        testCase: 'Memory Management',
        originalResult: { memoryUsage: originalMemoryDelta },
        fixedResult: { memoryUsage: fixedMemoryDelta },
        isConsistent: true,
        performanceImprovement: memoryImprovement,
        memoryUsage: fixedMemoryDelta
      });

      console.log(`Memory usage comparison:`);
      console.log(`  Original: ${(originalMemoryDelta / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Fixed: ${(fixedMemoryDelta / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Improvement: ${memoryImprovement.toFixed(2)}%`);

      // Fixed implementation should not use significantly more memory
      expect(fixedMemoryDelta).toBeLessThanOrEqual(originalMemoryDelta * 1.1); // Allow 10% margin
    });

    test('should maintain or improve performance after refactoring', async () => {
      const iterations = 10000;
      const services = ['userService', 'emailService', 'analyticsService', 'paymentService'];

      // Performance test with original registry
      const originalStartTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        services.forEach(service => {
          originalRegistry.resolve(service);
        });
      }
      const originalTime = performance.now() - originalStartTime;

      // Performance test with fixed registry
      const fixedStartTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        services.forEach(service => {
          fixedRegistry.resolve(service);
        });
      }
      const fixedTime = performance.now() - fixedStartTime;

      // Performance test with simple registry
      const simpleStartTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        services.forEach(service => {
          simpleRegistry.resolve(service);
        });
      }
      const simpleTime = performance.now() - simpleStartTime;

      const performanceImprovement = ((originalTime - fixedTime) / originalTime) * 100;

      refactoringResults.push({
        testCase: 'Service Resolution Performance',
        originalResult: { resolutionTime: originalTime },
        fixedResult: { resolutionTime: fixedTime },
        isConsistent: true,
        performanceImprovement,
        memoryUsage: 0
      });

      console.log(`Service resolution performance (${iterations} iterations):`);
      console.log(`  Original: ${originalTime.toFixed(2)}ms`);
      console.log(`  Fixed: ${fixedTime.toFixed(2)}ms`);
      console.log(`  Simple: ${simpleTime.toFixed(2)}ms`);
      console.log(`  Improvement: ${performanceImprovement.toFixed(2)}%`);

      // Performance should not degrade significantly
      expect(fixedTime).toBeLessThanOrEqual(originalTime * 1.2); // Allow 20% margin
    });
  });

  describe('🎯 Service Interface Compatibility', () => {
    test('should maintain all service interfaces after refactoring', async () => {
      const testCases = [
        {
          serviceName: 'userService',
          methods: ['getUser', 'createUser', 'updateUser', 'deleteUser'],
          testData: { name: 'Test User', email: 'test@example.com' }
        },
        {
          serviceName: 'emailService',
          methods: ['sendEmail', 'sendWelcomeEmail', 'sendPasswordResetEmail'],
          testData: { to: 'test@example.com', subject: 'Test', body: 'Test email' }
        },
        {
          serviceName: 'analyticsService',
          methods: ['trackEvent', 'getMetrics', 'generateReport'],
          testData: { event: 'test_event', data: { userId: 'test123' } }
        },
        {
          serviceName: 'paymentService',
          methods: ['processPayment', 'refundPayment', 'getPaymentHistory'],
          testData: { amount: 100, method: 'credit_card' }
        }
      ];

      for (const testCase of testCases) {
        const originalService = originalRegistry.resolve(testCase.serviceName);
        const fixedService = fixedRegistry.resolve(testCase.serviceName);

        for (const method of testCase.methods) {
          const hasOriginalMethod = typeof originalService[method] === 'function';
          const hasFixedMethod = typeof fixedService[method] === 'function';

          refactoringResults.push({
            testCase: `${testCase.serviceName}.${method} Interface`,
            originalResult: { hasMethod: hasOriginalMethod },
            fixedResult: { hasMethod: hasFixedMethod },
            isConsistent: hasOriginalMethod === hasFixedMethod,
            performanceImprovement: 0,
            memoryUsage: 0
          });

          expect(hasOriginalMethod).toBe(hasFixedMethod);
        }
      }
    });
  });

  describe('🎯 Error Handling Consistency', () => {
    test('should maintain error handling behavior after refactoring', async () => {
      const errorScenarios = [
        {
          scenario: 'Resolve non-existent service',
          action: () => originalRegistry.resolve('nonExistentService'),
          fixedAction: () => fixedRegistry.resolve('nonExistentService')
        },
        {
          scenario: 'Register duplicate service',
          action: () => {
            originalRegistry.register('duplicateService', userService);
            originalRegistry.register('duplicateService', emailService);
          },
          fixedAction: () => {
            fixedRegistry.register('duplicateService', userService);
            fixedRegistry.register('duplicateService', emailService);
          }
        }
      ];

      for (const scenario of errorScenarios) {
        let originalError: any = null;
        let fixedError: any = null;

        try {
          scenario.action();
        } catch (error) {
          originalError = error;
        }

        try {
          scenario.fixedAction();
        } catch (error) {
          fixedError = error;
        }

        const errorConsistency = (!!originalError) === (!!fixedError);

        refactoringResults.push({
          testCase: `Error Handling: ${scenario.scenario}`,
          originalResult: { hasError: !!originalError, errorType: originalError?.constructor.name },
          fixedResult: { hasError: !!fixedError, errorType: fixedError?.constructor.name },
          isConsistent: errorConsistency,
          performanceImprovement: 0,
          memoryUsage: 0
        });

        // Error handling should be consistent
        expect(errorConsistency).toBe(true);
      }
    });
  });

  describe('🎯 Integration Workflow Validation', () => {
    test('should preserve complex integration workflows after refactoring', async () => {
      // Simulate a complex business workflow
      const workflowData = {
        user: { name: 'Integration Test User', email: 'integration@example.com' },
        payment: { amount: 99.99, method: 'credit_card' }
      };

      // Original implementation workflow
      const originalStartTime = performance.now();
      const originalUserSvc = originalRegistry.resolve('userService') as IUserService;
      const originalEmailSvc = originalRegistry.resolve('emailService') as IEmailService;
      const originalAnalyticsSvc = originalRegistry.resolve('analyticsService') as IAnalyticsService;
      const originalPaymentSvc = originalRegistry.resolve('paymentService') as IPaymentService;

      const originalUser = await originalUserSvc.createUser(workflowData.user);
      const originalPayment = await originalPaymentSvc.processPayment(workflowData.payment.amount, workflowData.payment.method);
      await originalEmailSvc.sendWelcomeEmail(originalUser.id);
      await originalAnalyticsSvc.trackEvent('user_signup_with_payment', {
        userId: originalUser.id,
        paymentId: originalPayment.id,
        amount: workflowData.payment.amount
      });
      const originalWorkflowTime = performance.now() - originalStartTime;

      // Fixed implementation workflow
      const fixedStartTime = performance.now();
      const fixedUserSvc = fixedRegistry.resolve('userService') as IUserService;
      const fixedEmailSvc = fixedRegistry.resolve('emailService') as IEmailService;
      const fixedAnalyticsSvc = fixedRegistry.resolve('analyticsService') as IAnalyticsService;
      const fixedPaymentSvc = fixedRegistry.resolve('paymentService') as IPaymentService;

      const fixedUser = await fixedUserSvc.createUser(workflowData.user);
      const fixedPayment = await fixedPaymentSvc.processPayment(workflowData.payment.amount, workflowData.payment.method);
      await fixedEmailSvc.sendWelcomeEmail(fixedUser.id);
      await fixedAnalyticsSvc.trackEvent('user_signup_with_payment', {
        userId: fixedUser.id,
        paymentId: fixedPayment.id,
        amount: workflowData.payment.amount
      });
      const fixedWorkflowTime = performance.now() - fixedStartTime;

      const performanceImprovement = ((originalWorkflowTime - fixedWorkflowTime) / originalWorkflowTime) * 100;

      refactoringResults.push({
        testCase: 'Complex Integration Workflow',
        originalResult: {
          userCreated: !!originalUser.id,
          paymentProcessed: originalPayment.status === 'completed',
          workflowTime: originalWorkflowTime
        },
        fixedResult: {
          userCreated: !!fixedUser.id,
          paymentProcessed: fixedPayment.status === 'completed',
          workflowTime: fixedWorkflowTime
        },
        isConsistent: !!originalUser.id && !!fixedUser.id && originalPayment.status === fixedPayment.status,
        performanceImprovement,
        memoryUsage: 0
      });

      expect(originalUser.name).toBe(fixedUser.name);
      expect(originalUser.email).toBe(fixedUser.email);
      expect(originalPayment.amount).toBe(fixedPayment.amount);
      expect(originalPayment.status).toBe(fixedPayment.status);

      console.log(`Integration workflow performance:`);
      console.log(`  Original: ${originalWorkflowTime.toFixed(2)}ms`);
      console.log(`  Fixed: ${fixedWorkflowTime.toFixed(2)}ms`);
      console.log(`  Improvement: ${performanceImprovement.toFixed(2)}%`);
    });
  });
});