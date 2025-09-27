/**
 * Service Registry - Central Service Configuration
 * Registers all services with the DI container
 * Implements proper service lifetime management and dependency resolution
 */

import { DIContainer, ServiceLifetime} from './DIContainer';
import { CloudflareEnv} from './adapters/CloudflareUserRepository';

// Service imports
import { UserDomainService} from '../domain/services/UserDomainService';
import { UserApplicationService, UserCommandService, UserQueryService} from '../application/services/UserApplicationService';
import { CloudflareUserRepository} from './adapters/CloudflareUserRepository';

// Import infrastructure service interfaces
import { IPasswordService, IEmailService, IEventPublisher} from '../interfaces/IPasswordService';

// Service implementations (simplified for demo)
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
    // Would integrate with email service (Resend, SendGrid, etc.)
  }

  async sendPasswordResetEmail(email: string, token: string, name: string): Promise<void> {
    console.log(`Sending password reset email to ${email} for ${name} with token ${token}`);
    // Would integrate with email service
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    console.log(`Sending welcome email to ${email} for ${name}`);
    // Would integrate with email service
  }
}

export class InMemoryEventPublisher implements IEventPublisher {
  private handlers = new Map<string, Array<(event: any) => Promise<void>>>();

  async publish(event: any): Promise<void> {
    const handlers = this.handlers.get(event.type)  ?? [];
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

// Content Domain Services (interfaces for now)
export interface IContentGenerationService {
  generateContent(request: any): Promise<any>;
  optimizeContent(content: string, platform: string): Promise<any>;
}

export interface IContentAnalysisService {
  analyzeContent(content: string): Promise<any>;
  predictVirality(content: string): Promise<any>;
}

export interface ICampaignManagementService {
  createCampaign(campaign: any): Promise<any>;
  scheduleCampaign(campaignId: string, schedule: any): Promise<void>;
}

// Simplified implementations
export class AIContentGenerationService implements IContentGenerationService {
  constructor(private env: CloudflareEnv) {}

  async generateContent(request: any): Promise<any> {
    return {
      content: `Generated content for ${request.topic}`,
      metadata: {
        model: 'llama-2-7b',
        tokensUsed: 150
      }
    };
  }

  async optimizeContent(content: string, platform: string): Promise<any> {
    return {
      optimizedContent: `Optimized for ${platform}: ${content}`,
      improvements: ['Added hashtags', 'Improved hook', 'Better CTA']
    };
  }
}

export class ContentAnalysisService implements IContentAnalysisService {
  async analyzeContent(content: string): Promise<any> {
    return {
      sentiment: 'positive',
      engagementScore: 85,
      viralPotential: 'high',
      recommendations: ['Add more emojis', 'Include trending hashtags']
    };
  }

  async predictVirality(content: string): Promise<any> {
    return {
      score: 0.78,
      factors: ['trending topic', 'emotional hook', 'shareable format'],
      expectedReach: 50000
    };
  }
}

export class CampaignManagementService implements ICampaignManagementService {
  async createCampaign(campaign: any): Promise<any> {
    return {
      id: crypto.randomUUID(),
      ...campaign,
      status: 'draft',
      createdAt: new Date()
    };
  }

  async scheduleCampaign(campaignId: string, schedule: any): Promise<void> {
    console.log(`Scheduling campaign ${campaignId} with schedule:`, schedule);
  }
}

/**
 * Service Registry Configuration
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

    // Register infrastructure services
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

    // Register repositories
    this.container.registerSingleton(
      'userRepository',
      (env: CloudflareEnv) => new CloudflareUserRepository(env),
      ['env']
    );

    // Register domain services
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

    // Register application services
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

    this.container.registerSingleton(
      'userApplicationService',
      (
        userCommandService: UserCommandService,
        userQueryService: UserQueryService
      ) => new UserApplicationService(userCommandService, userQueryService),
      ['userCommandService', 'userQueryService']
    );

    // Register content services
    this.container.registerSingleton(
      'contentGenerationService',
      (env: CloudflareEnv) => new AIContentGenerationService(env),
      ['env']
    );

    this.container.registerSingleton(
      'contentAnalysisService',
      () => new ContentAnalysisService(),
      []
    );

    this.container.registerSingleton(
      'campaignManagementService',
      () => new CampaignManagementService(),
      []
    );

    // Register API controllers (would be implemented separately)
    this.container.registerScoped(
      'userController',
      (userAppService: UserApplicationService) => new UserController(userAppService),
      ['userApplicationService']
    );

    this.container.registerScoped(
      'contentController',
      (
        contentGenService: IContentGenerationService,
        contentAnalysisService: IContentAnalysisService
      ) => new ContentController(contentGenService, contentAnalysisService),
      ['contentGenerationService', 'contentAnalysisService']
    );

    this.container.registerScoped(
      'campaignController',
      (campaignService: ICampaignManagementService) => new CampaignController(campaignService),
      ['campaignManagementService']
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

// Simplified controller implementations for demo
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

export class ContentController {
  constructor(
    private contentGenerationService: IContentGenerationService,
    private contentAnalysisService: IContentAnalysisService
  ) {}

  async generateContent(request: any): Promise<any> {
    return this.contentGenerationService.generateContent(request.body);
  }

  async analyzeContent(request: any): Promise<any> {
    return this.contentAnalysisService.analyzeContent(request.body.content);
  }
}

export class CampaignController {
  constructor(private campaignService: ICampaignManagementService) {}

  async createCampaign(request: any): Promise<any> {
    return this.campaignService.createCampaign(request.body);
  }

  async scheduleCampaign(request: any): Promise<any> {
    return this.campaignService.scheduleCampaign(request.params.id, request.body);
  }
}

/**
 * Factory function to create a configured service registry
 */
export function createServiceRegistry(env: CloudflareEnv): ServiceRegistry {
  return new ServiceRegistry(env);
}

/**
 * Global service registry instance (for convenience)
 */
let globalServiceRegistry: ServiceRegistry | null = null;

export function setGlobalServiceRegistry(registry: ServiceRegistry): void {
  globalServiceRegistry = registry;
}

export function getGlobalServiceRegistry(): ServiceRegistry {
  if (!globalServiceRegistry) {
    throw new Error('Global service registry not initialized');
  }
  return globalServiceRegistry;
}