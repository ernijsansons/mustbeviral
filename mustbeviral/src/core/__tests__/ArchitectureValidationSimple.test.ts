/**
 * Simple Architecture Validation Tests
 * Validates clean microservices architecture without circular dependencies
 */

import { DIContainer, ServiceLifetime} from '../infrastructure/DIContainerFixed';
import { createSimpleServiceRegistry, SimpleUserApplicationService} from '../infrastructure/ServiceRegistrySimple';

// Mock environment for testing
const mockEnv = {
  DB: {} as D1Database,
  USER_CACHE: {} as KVNamespace,
  ANALYTICS: {} as AnalyticsEngineDataset
};

describe('Simple Architecture Validation', _() => {
  describe('Dependency Injection Container', _() => {
    let container: DIContainer;

    beforeEach_(() => {
      container = new DIContainer();
    });

    test('should register and resolve services without circular dependencies', async() => {
      container.registerSingleton(
        'testService',
        () => ({ value: 'test' }),
        []
      );

      const service = await container.resolve('testService');
      expect(service).toEqual({ value: 'test' });
    });

    test('should handle service dependencies in correct order', async() => {
      // Register dependency first
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

    test('should detect circular dependencies', async() => {
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
  });

  describe('Service Registry Integration', _() => {
    test('should create registry without circular dependencies', _() => {
      const serviceRegistry = createSimpleServiceRegistry(mockEnv);
      const validation = serviceRegistry.validateServices();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should resolve all core services successfully', async() => {
      const serviceRegistry = createSimpleServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      const services = [
        'passwordService',
        'emailService', 
        'eventPublisher',
        'userRepository',
        'userDomainService',
        'userCommandService',
        'userQueryService',
        'userApplicationService',
        'userController'
      ];

      for (const serviceName of services) {
        const service = await container.resolve(serviceName);
        expect(service).toBeDefined();
        expect(service).not.toBeNull();
      }
    });

    test('should maintain proper dependency hierarchy', async() => {
      const serviceRegistry = createSimpleServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      const userAppService = await container.resolve<SimpleUserApplicationService>('userApplicationService');
      
      expect(userAppService.commands).toBeDefined();
      expect(userAppService.queries).toBeDefined();
      expect(userAppService.commands).not.toBe(userAppService.queries);
    });

    test('should support CQRS pattern', async() => {
      const serviceRegistry = createSimpleServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      const userAppService = await container.resolve<SimpleUserApplicationService>('userApplicationService');
      
      // Test command execution
      expect(typeof userAppService.registerUser).toBe('function');
      expect(typeof userAppService.authenticateUser).toBe('function');
      
      // Test query execution
      expect(typeof userAppService.getUser).toBe('function');
      expect(typeof userAppService.getUserByEmail).toBe('function');
    });

    test('should handle scoped services correctly', async() => {
      const serviceRegistry = createSimpleServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      // Get controller instances within same scope
      const controller1 = await container.resolve('userController');
      const controller2 = await container.resolve('userController');
      expect(controller1).toBe(controller2);

      // Clear scope and get new instance
      serviceRegistry.clearScope();
      const controller3 = await container.resolve('userController');
      expect(controller3).not.toBe(controller1);
    });
  });

  describe('Architecture Principles Validation', _() => {
    test('should enforce proper layer separation', async() => {
      const serviceRegistry = createSimpleServiceRegistry(mockEnv);
      const serviceInfo = serviceRegistry.getServiceInfo();

      // Domain service should not depend on application services
      const domainServiceDeps = serviceInfo.userDomainService.dependencies;
      expect(domainServiceDeps).not.toContain('userApplicationService');
      expect(domainServiceDeps).not.toContain('userCommandService');
      expect(domainServiceDeps).not.toContain('userQueryService');

      // Application service should depend on domain service
      const appServiceDeps = serviceInfo.userApplicationService.dependencies;
      expect(appServiceDeps).toContain('userCommandService');
      expect(appServiceDeps).toContain('userQueryService');
    });

    test('should follow dependency inversion principle', async() => {
      const serviceRegistry = createSimpleServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      // All services should be resolvable through interfaces
      const services = [
        'userRepository',
        'passwordService',
        'emailService',
        'eventPublisher',
        'userDomainService'
      ];

      for (const serviceName of services) {
        const service = await container.resolve(serviceName);
        expect(service).toBeDefined();
      }
    });

    test('should support single responsibility principle', async() => {
      const serviceRegistry = createSimpleServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      const userDomainService = await container.resolve('userDomainService');
      
      // Domain service should only have domain-related methods
      expect(typeof userDomainService.registerUser).toBe('function');
      expect(typeof userDomainService.authenticateUser).toBe('function');
      expect(typeof userDomainService.verifyEmail).toBe('function');

      // Should not have infrastructure concerns
      expect(userDomainService.sendEmail).toBeUndefined();
      expect(userDomainService.hashPassword).toBeUndefined();
    });
  });

  describe('Performance and Resilience', _() => {
    test('should handle multiple service resolutions efficiently', async() => {
      const serviceRegistry = createSimpleServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      const startTime = Date.now();
      
      // Resolve services multiple times in parallel
      const promises = Array(50).fill(0).map(() => 
        container.resolve('userApplicationService')
      );
      
      const services = await Promise.all(promises);
      const endTime = Date.now();
      
      // All services should be defined (singleton behavior verified else {
    where)
  }
      expect(services.every(s => s !== undefined)).toBe(true);
      
      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(500);
    });

    test('should validate service registrations', _() => {
      const serviceRegistry = createSimpleServiceRegistry(mockEnv);
      const validation = serviceRegistry.validateServices();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    test('should provide service information for monitoring', _() => {
      const serviceRegistry = createSimpleServiceRegistry(mockEnv);
      const serviceInfo = serviceRegistry.getServiceInfo();

      expect(Object.keys(serviceInfo)).toContain('userApplicationService');
      expect(Object.keys(serviceInfo)).toContain('userDomainService');
      expect(Object.keys(serviceInfo)).toContain('userRepository');
      
      // Each service should have dependency information
      Object.values(serviceInfo).forEach((info: any) => {
        expect(info).toHaveProperty('dependencies');
        expect(info).toHaveProperty('lifetime');
      });
    });
  });

  describe('Integration Testing', _() => {
    test('should execute complete user registration flow', async() => {
      const serviceRegistry = createSimpleServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      const userAppService = await container.resolve<SimpleUserApplicationService>('userApplicationService');
      
      const registrationCommand = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
        acceptedTerms: true
      };

      const result = await userAppService.registerUser(registrationCommand);
      
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.requiresEmailVerification).toBe(true);
    });

    test('should execute user authentication flow', async() => {
      const serviceRegistry = createSimpleServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      const userAppService = await container.resolve<SimpleUserApplicationService>('userApplicationService');
      
      const authCommand = {
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };

      // This will return unsuccessful auth since no user exists in our mock
      const result = await userAppService.authenticateUser(authCommand);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle controller requests', async() => {
      const serviceRegistry = createSimpleServiceRegistry(mockEnv);
      const container = serviceRegistry.getContainer();

      const userController = await container.resolve('userController');
      
      expect(typeof userController.register).toBe('function');
      expect(typeof userController.login).toBe('function');
      expect(typeof userController.getProfile).toBe('function');
    });
  });
});

describe('Clean Architecture Validation', _() => {
  test('should maintain clear architectural boundaries', _() => {
    const serviceRegistry = createSimpleServiceRegistry(mockEnv);
    const serviceInfo = serviceRegistry.getServiceInfo();

    // Infrastructure services should have minimal dependencies
    expect(serviceInfo.passwordService.dependencies).toEqual([]);
    expect(serviceInfo.eventPublisher.dependencies).toEqual([]);
    expect(serviceInfo.emailService.dependencies).toEqual(['env']);

    // Repository should only depend on infrastructure
    expect(serviceInfo.userRepository.dependencies).toEqual(['env']);

    // Domain service should depend on repository and infrastructure
    expect(serviceInfo.userDomainService.dependencies).toEqual([
      'userRepository',
      'passwordService', 
      'emailService',
      'eventPublisher'
    ]);
  });

  test('should support microservices deployment patterns', async() => {
    // Each service should be independently testable and deployable
    const serviceRegistry = createSimpleServiceRegistry(mockEnv);
    const container = serviceRegistry.getContainer();

    const userService = await container.resolve<SimpleUserApplicationService>('userApplicationService');
    
    // Service should work independently with its dependencies
    expect(userService).toBeDefined();
    expect(userService.commands).toBeDefined();
    expect(userService.queries).toBeDefined();
  });
});