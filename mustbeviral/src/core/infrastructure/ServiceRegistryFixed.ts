/**
 * Fixed Service Registry - Circular Dependency Resolution
 * Properly configured dependency injection without cycles
 */

import { DIContainer, ServiceLifetime } from './DIContainer';
import { CloudflareEnv } from './adapters/CloudflareUserRepository';

// Service imports
import { UserDomainService } from '../domain/services/UserDomainService';
import { UserApplicationService, UserCommandService, UserQueryService } from '../application/services/UserApplicationService';
import { CloudflareUserRepository } from './adapters/CloudflareUserRepository';
import { IPasswordService, IEmailService, IEventPublisher } from '../interfaces/IPasswordService';

// Infrastructure service implementations
export class BcryptPasswordService implements IPasswordService {
  async hashPassword(password: string): Promise<string> {
    // Would use bcrypt here
    return `hashed_${password}`;
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return hash === `hashed_${password}`;
  }

  generateSalt(): string {
    return Math.random().toString(36);
  }
}

export class CloudflareEmailService implements IEmailService {
  constructor(private env: CloudflareEnv) {}

  async sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
    console.log(`Sending verification email to ${email} for ${name} with token ${token}`);
  }

  async sendPasswordResetEmail(email: string, token: string, name: string): Promise<void> {
    console.log(`Sending password reset email to ${email} for ${name} with token ${token}`);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    console.log(`Sending welcome email to ${email} for ${name}`);
  }
}

export class InMemoryEventPublisher implements IEventPublisher {
  private handlers = new Map<string, Array<(event: any) => Promise<void>>>();

  async publish(event: any): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    await Promise.all(handlers.map(handler => handler(event)));
  }

  subscribe(eventType: string, handler: (event: any) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  unsubscribe(eventType: string, handler: (event: any) => Promise<void>): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}

// Simplified controller for demo
export class UserController {
  constructor(private userService: UserApplicationService) {}

  async register(request: any): Promise<any> {
    return this.userService.registerUser(request.body);
  }

  async login(request: any): Promise<any> {
    return this.userService.authenticateUser(request.body);
  }

  async getProfile(request: any): Promise<any> {
    return this.userService.getUser(request.params.userId);
  }
}

/**
 * Fixed Service Registry Configuration
 */
export class ServiceRegistry {
  private container: DIContainer;

  constructor(env: CloudflareEnv) {
    this.container = new DIContainer();
    this.registerServices(env);
  }

  private registerServices(env: CloudflareEnv): void {
    // Register environment
    this.container.registerInstance('env', env);

    // Register infrastructure services (no dependencies)
    this.container.registerSingleton(
      'passwordService',
      () => new BcryptPasswordService(),
      []
    );

    this.container.registerSingleton(
      'emailService',
      (env: CloudflareEnv) => new CloudflareEmailService(env),
      ['env']
    );

    this.container.registerSingleton(
      'eventPublisher',
      () => new InMemoryEventPublisher(),
      []
    );

    // Register repositories (depends on env only)
    this.container.registerSingleton(
      'userRepository',
      (env: CloudflareEnv) => new CloudflareUserRepository(env),
      ['env']
    );

    // Register domain services (depends on repositories and infrastructure services)
    this.container.registerSingleton(
      'userDomainService',
      (
        userRepository: CloudflareUserRepository,
        passwordService: IPasswordService,
        emailService: IEmailService,
        eventPublisher: IEventPublisher
      ) => new UserDomainService(userRepository, passwordService, emailService, eventPublisher),
      ['userRepository', 'passwordService', 'emailService', 'eventPublisher']
    );

    // Register application services (CQRS pattern - separate command and query)
    this.container.registerSingleton(
      'userCommandService',
      (
        userDomainService: UserDomainService,
        userRepository: CloudflareUserRepository
      ) => new UserCommandService(userDomainService, userRepository),
      ['userDomainService', 'userRepository']
    );

    this.container.registerSingleton(
      'userQueryService',
      (userRepository: CloudflareUserRepository) => new UserQueryService(userRepository),
      ['userRepository']
    );

    // Register combined application service (depends on command and query services)
    this.container.registerSingleton(
      'userApplicationService',
      (
        userCommandService: UserCommandService,
        userQueryService: UserQueryService
      ) => new UserApplicationService(userCommandService, userQueryService),
      ['userCommandService', 'userQueryService']
    );

    // Register API controllers (scoped - new instance per request)
    this.container.registerScoped(
      'userController',
      (userAppService: UserApplicationService) => new UserController(userAppService),
      ['userApplicationService']
    );
  }

  /**
   * Get the configured DI container
   */
  getContainer(): DIContainer {
    return this.container;
  }

  /**
   * Validate all service registrations
   */
  validateServices(): { isValid: boolean; errors: string[] } {
    return this.container.validate();
  }

  /**
   * Get service information for monitoring
   */
  getServiceInfo(): Record<string, any> {
    const services = this.container.getRegisteredServices();
    const serviceInfo: Record<string, any> = {};

    for (const serviceName of services) {
      serviceInfo[serviceName] = this.container.getServiceInfo(serviceName);
    }

    return serviceInfo;
  }

  /**
   * Clear scoped services (call at end of request)
   */
  clearScope(): void {
    this.container.clearScope();
  }
}

/**
 * Factory function to create a configured service registry
 */
export function createServiceRegistry(env: CloudflareEnv): ServiceRegistry {
  return new ServiceRegistry(env);
}