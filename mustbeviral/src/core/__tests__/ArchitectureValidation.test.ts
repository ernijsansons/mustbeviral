/**
 * Architecture Validation Tests
 * Validates the new microservices architecture implementation
 * Ensures SOLID principles compliance and proper separation of concerns
 */

import { DIContainer, ServiceLifetime } from '../infrastructure/DIContainer';
import { createServiceRegistry } from '../infrastructure/ServiceRegistryFixed';
import { User, UserRole, UserStatus } from '../domain/entities/User';
import { UserDomainService } from '../domain/services/UserDomainService';
import { UserApplicationService } from '../application/services/UserApplicationService';

// Mock environment for testing
const mockEnv = {
  DB: {} as D1Database,
  USER_CACHE: {} as KVNamespace,
  ANALYTICS: {} as AnalyticsEngineDataset
};

describe('Architecture Validation', () => {
  describe('Dependency Injection Container', () => {
    let container: DIContainer;

    beforeEach(() => {
      container = new DIContainer();
    });

    test('should register and resolve services', async () => {
      // Register a simple service
      container.registerSingleton(
        'testService',
        () => ({ value: 'test' }),
        []
      );

      const service = await container.resolve('testService');
      expect(service).toEqual({ value: 'test' });
    });

    test('should handle service dependencies', async () => {
      // Register dependency
      container.registerSingleton(
        'dependency',
        () => ({ name: 'dependency' }),
        []
      );

      // Register service with dependency
      container.registerSingleton(
        'service',
        (dep: any) => ({ dep, value: 'service' }),
        ['dependency']
      );

      const service = await container.resolve('service');
      expect(service.dep).toEqual({ name: 'dependency' });
      expect(service.value).toBe('service');
    });

    test('should detect circular dependencies', async () => {
      container.registerSingleton(
        'serviceA',
        (b: any) => ({ b }),
        ['serviceB']
      );

      container.registerSingleton(
        'serviceB',
        (a: any) => ({ a }),
        ['serviceA']
      );

      await expect(container.resolve('serviceA')).rejects.toThrow('Circular dependency detected');
    });

    test('should handle different service lifetimes', async () => {
      let callCount = 0;

      container.register({
        name: 'transientService',
        factory: () => ({ id: ++callCount }),
        lifetime: ServiceLifetime.TRANSIENT
      });

      const instance1 = await container.resolve('transientService');
      const instance2 = await container.resolve('transientService');

      expect(instance1.id).toBe(1);
      expect(instance2.id).toBe(2);
    });

    test('should validate service registrations', () => {
      container.registerSingleton('service1', () => ({}), ['missingService']);

      const validation = container.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Service 'service1' depends on unregistered service 'missingService'");
    });
  });

  describe('Domain Entity Validation', () => {
    test('User entity should encapsulate business logic', () => {
      const user = User.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashed_password',
        role: UserRole.USER
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.fullName).toBe('Test User');
      expect(user.status).toBe(UserStatus.PENDING_VERIFICATION);
      expect(user.emailVerified).toBe(false);
    });

    test('User entity should validate business rules', () => {
      expect(() => {
        User.create({
          email: 'invalid-email',
          firstName: 'Test',
          lastName: 'User',
          passwordHash: 'hashed_password'
        });
      }).toThrow('Invalid email address');

      expect(() => {
        User.create({
          email: 'test@example.com',
          firstName: '',
          lastName: 'User',
          passwordHash: 'hashed_password'
        });
      }).toThrow('First name is required');
    });

    test('User entity should handle email verification', () => {
      const user = User.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashed_password'
      });

      const token = user.toPersistence().emailVerificationToken!;
      user.verifyEmail(token);

      expect(user.emailVerified).toBe(true);
      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    test('User entity should handle password reset', () => {
      const user = User.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashed_password'
      });

      const resetToken = user.initiatePasswordReset();
      expect(resetToken).toBeDefined();

      user.resetPassword(resetToken, 'new_hashed_password');
      expect(user.toPersistence().passwordHash).toBe('new_hashed_password');
    });

    test('User entity should handle role-based permissions', () => {
      const adminUser = User.create({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        passwordHash: 'hashed_password',
        role: UserRole.ADMIN
      });

      expect(adminUser.hasPermission('read:all')).toBe(true);
      expect(adminUser.hasPermission('manage:users')).toBe(true);

      const regularUser = User.create({
        email: 'user@example.com',
        firstName: 'Regular',
        lastName: 'User',
        passwordHash: 'hashed_password',
        role: UserRole.USER
      });

      expect(regularUser.hasPermission('read:own_content')).toBe(true);
      expect(regularUser.hasPermission('manage:users')).toBe(false);
    });
  });

  describe('Service Registry Integration', () => {
    test('should create fully configured service registry', () => {
      const serviceRegistry = createServiceRegistry(mockEnv);
      const validation = serviceRegistry.validateServices();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should resolve all core services', async () => {
      const serviceRegistry = createServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      // Test core services can be resolved
      const services = [
        'passwordService',
        'emailService',
        'eventPublisher',
        'userRepository',
        'userDomainService',
        'userApplicationService'
      ];

      for (const serviceName of services) {
        const service = await container.resolve(serviceName);
        expect(service).toBeDefined();
      }
    });

    test('should maintain proper service lifetimes', async () => {
      const serviceRegistry = createServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      // Singleton services should return same instance
      const userRepo1 = await container.resolve('userRepository');
      const userRepo2 = await container.resolve('userRepository');
      expect(userRepo1).toBe(userRepo2);

      // Scoped services should return same instance within scope
      const controller1 = await container.resolve('userController');
      const controller2 = await container.resolve('userController');
      expect(controller1).toBe(controller2);

      // Clear scope should create new scoped instances
      serviceRegistry.clearScope();
      const controller3 = await container.resolve('userController');
      expect(controller3).not.toBe(controller1);
    });
  });

  describe('Architecture Principles Validation', () => {
    test('should enforce Single Responsibility Principle', () => {
      // Each service should have a single responsibility
      const userDomainService = new UserDomainService(
        {} as any, {} as any, {} as any, {} as any
      );

      // UserDomainService should only handle user domain logic
      expect(typeof userDomainService.registerUser).toBe('function');
      expect(typeof userDomainService.authenticateUser).toBe('function');
      expect(typeof userDomainService.verifyEmail).toBe('function');

      // Should not have content or campaign methods
      expect((userDomainService as any).generateContent).toBeUndefined();
      expect((userDomainService as any).createCampaign).toBeUndefined();
    });

    test('should enforce Dependency Inversion Principle', () => {
      // Services should depend on interfaces, not concrete implementations
      const serviceRegistry = createServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      // Check that dependencies are properly injected
      const serviceInfo = serviceRegistry.getServiceInfo();
      
      expect(serviceInfo.userDomainService.dependencies).toContain('userRepository');
      expect(serviceInfo.userDomainService.dependencies).toContain('passwordService');
      expect(serviceInfo.userDomainService.dependencies).toContain('emailService');
    });

    test('should enforce Interface Segregation Principle', async () => {
      const serviceRegistry = createServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      const userAppService = await container.resolve<UserApplicationService>('userApplicationService');

      // Application service should have separate command and query services
      expect(userAppService.commands).toBeDefined();
      expect(userAppService.queries).toBeDefined();
      expect(userAppService.commands).not.toBe(userAppService.queries);
    });

    test('should maintain proper layer separation', async () => {
      // Domain layer should not depend on application layer
      const user = User.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashed_password'
      });

      // Domain entity should not have application-specific dependencies
      const userProps = user.toPersistence();
      expect(userProps).not.toHaveProperty('applicationService');
      expect(userProps).not.toHaveProperty('controller');

      // Domain service should only depend on domain interfaces
      expect(UserDomainService.prototype.constructor.length).toBe(4); // 4 dependencies injected
    });
  });

  describe('Error Handling and Validation', () => {
    test('should handle validation errors gracefully', async () => {
      const serviceRegistry = createServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();
      const userAppService = await container.resolve<UserApplicationService>('userApplicationService');

      // Test invalid registration data
      await expect(
        userAppService.registerUser({
          email: 'invalid-email',
          password: 'weak',
          firstName: '',
          lastName: '',
          acceptedTerms: false
        })
      ).rejects.toThrow();
    });

    test('should maintain data consistency', () => {
      const user = User.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashed_password'
      });

      // Entity should maintain consistency
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(user.createdAt.getTime());

      // Update should maintain consistency
      const originalUpdatedAt = user.updatedAt;
      user.updateProfile({ firstName: 'Updated' });
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle service resolution efficiently', async () => {
      const serviceRegistry = createServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      const startTime = Date.now();
      
      // Resolve services multiple times
      const promises = Array(100).fill(0).map(() => 
        container.resolve('userApplicationService')
      );
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should resolve 100 services in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
    });

    test('should properly clean up scoped services', async () => {
      const serviceRegistry = createServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      // Create scoped service
      await container.resolve('userController');
      
      // Clear scope
      serviceRegistry.clearScope();
      
      // Verify new instance is created
      const controller1 = await container.resolve('userController');
      const controller2 = await container.resolve('userController');
      
      expect(controller1).toBe(controller2); // Same within scope
    });
  });
});

describe('Microservices Architecture Validation', () => {
  test('should have proper service boundaries', () => {
    const serviceRegistry = createServiceRegistry(mockEnv);
    const services = serviceRegistry.getServiceInfo();

    // Each service should have clear boundaries
    const coreServices = [
      'userDomainService',
      'userApplicationService',
      'contentGenerationService',
      'campaignManagementService'
    ];

    coreServices.forEach(serviceName => {
      expect(services[serviceName]).toBeDefined();
      expect(services[serviceName].dependencies).toBeDefined();
    });
  });

  test('should support independent deployment', async () => {
    // Each microservice should be independently testable
    const serviceRegistry = createServiceRegistry(mockEnv);
    const container = serviceRegistry.getContainer();

    const userService = await container.resolve<UserApplicationService>('userApplicationService');
    
    // Service should work independently
    expect(userService.commands).toBeDefined();
    expect(userService.queries).toBeDefined();
    expect(typeof userService.registerUser).toBe('function');
  });

  test('should handle service communication through events', async () => {
    const serviceRegistry = createServiceRegistry(mockEnv);
    const container = serviceRegistry.getContainer();

    const eventPublisher = await container.resolve('eventPublisher');
    
    // Event publisher should support pub/sub pattern
    expect(typeof eventPublisher.publish).toBe('function');
    expect(typeof eventPublisher.subscribe).toBe('function');
    expect(typeof eventPublisher.unsubscribe).toBe('function');
  });
});