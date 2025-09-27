/**
 * Simplified Service Registry - No Circular Dependencies
 * Minimal service registration for architecture validation
 */

import { DIContainer, ServiceLifetime} from './DIContainerFixed';
import { logger} from '../../lib/monitoring/logger';

// Mock environment for testing
export interface CloudflareEnv {
  DB: D1Database;
  USER_CACHE?: KVNamespace;
  ANALYTICS?: AnalyticsEngineDataset;
}

// Simplified implementations for testing
export class SimplePasswordService {
  async hashPassword(password: string): Promise<string> {
    return `hashed_${password}`;
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return hash === `hashed_${password}`;
  }

  generateSalt(): string {
    return Math.random().toString(36);
  }
}

export class SimpleEmailService {
  constructor(private env: CloudflareEnv) {}

  async sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
    logger.info('Verification email sent', {
      component: 'SimpleEmailService',
      action: 'sendVerificationEmail',
      metadata: { email }
    });
  }

  async sendPasswordResetEmail(email: string, token: string, name: string): Promise<void> {
    logger.info('Password reset email sent', {
      component: 'SimpleEmailService',
      action: 'sendPasswordResetEmail',
      metadata: { email }
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    logger.info('Welcome email sent', {
      component: 'SimpleEmailService',
      action: 'sendWelcomeEmail',
      metadata: { email }
    });
  }
}

export class SimpleEventPublisher {
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

export class SimpleUserRepository {
  constructor(private env: CloudflareEnv) {}

  async findById(id: string): Promise<any> {
    return null;
  }

  async exists(id: string): Promise<boolean> {
    return false;
  }

  async create(userData: any): Promise<any> {
    return { id: crypto.randomUUID(), ...userData };
  }

  async update(id: string, data: any): Promise<any> {
    return { id, ...data };
  }

  async delete(id: string): Promise<boolean> {
    return true;
  }

  async findAll(): Promise<any[]> {
    return [];
  }

  async findByEmail(email: string): Promise<any> {
    return null;
  }
}

export class SimpleUserDomainService {
  constructor(
    private userRepository: SimpleUserRepository,
    private passwordService: SimplePasswordService,
    private emailService: SimpleEmailService,
    private eventPublisher: SimpleEventPublisher
  ) {}

  async registerUser(command: any): Promise<any> {
    const hashedPassword = await this.passwordService.hashPassword(command.password);
    const user = await this.userRepository.create({
      ...command,
      passwordHash: hashedPassword
    });

    await this.emailService.sendVerificationEmail(user.email, 'token', user.firstName);
    await this.eventPublisher.publish({
      type: 'UserRegistered',
      userId: user.id,
      email: user.email
    });

    return { user, requiresEmailVerification: true };
  }

  async authenticateUser(command: any): Promise<any> {
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const isValid = await this.passwordService.verifyPassword(command.password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    return {
      success: true,
      user,
      token: 'jwt_token',
      refreshToken: 'refresh_token',
      expiresIn: 3600
    };
  }

  async verifyEmail(userId: string, token: string): Promise<void> {
    // Implementation for email verification
  }

  async updateUserProfile(command: any): Promise<any> {
    return this.userRepository.update(command.userId, command);
  }

  async changeUserRole(command: any): Promise<void> {
    await this.userRepository.update(command.userId, { role: command.newRole });
  }

  async initiatePasswordReset(command: any): Promise<void> {
    // Implementation for password reset initiation
  }

  async confirmPasswordReset(command: any): Promise<void> {
    // Implementation for password reset confirmation
  }
}

export class SimpleUserCommandService {
  readonly name = 'UserCommandService';
  readonly version = '1.0.0';

  constructor(
    private userDomainService: SimpleUserDomainService
  ) {}

  async execute(command: any): Promise<any> {
    const commandType = command.type;

    switch (commandType) {
      case 'REGISTER_USER':
        return this.userDomainService.registerUser(command.payload);
      case 'AUTHENTICATE_USER':
        return this.userDomainService.authenticateUser(command.payload);
      case 'VERIFY_EMAIL':
        return this.userDomainService.verifyEmail(command.payload.userId, command.payload.token);
      default:
        throw new Error(`Unknown command type: ${commandType}`);
    }
  }
}

export class SimpleUserQueryService {
  readonly name = 'UserQueryService';
  readonly version = '1.0.0';

  constructor(
    private userRepository: SimpleUserRepository
  ) {}

  async execute(query: any): Promise<any> {
    const queryType = query.type;

    switch (queryType) {
      case 'GET_USER':
        return this.userRepository.findById(query.payload.userId);
      case 'GET_USER_BY_EMAIL':
        return this.userRepository.findByEmail(query.payload.email);
      case 'SEARCH_USERS':
        return this.userRepository.findAll();
      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }
  }
}

export class SimpleUserApplicationService {
  public readonly commands: SimpleUserCommandService;
  public readonly queries: SimpleUserQueryService;

  constructor(
    userCommandService: SimpleUserCommandService,
    userQueryService: SimpleUserQueryService
  ) {
    this.commands = userCommandService;
    this.queries = userQueryService;
  }

  async registerUser(command: any): Promise<any> {
    return this.commands.execute({ type: 'REGISTER_USER', payload: command });
  }

  async authenticateUser(command: any): Promise<any> {
    return this.commands.execute({ type: 'AUTHENTICATE_USER', payload: command });
  }

  async getUser(userId: string): Promise<any> {
    return this.queries.execute({ type: 'GET_USER', payload: { userId } });
  }

  async getUserByEmail(email: string): Promise<any> {
    return this.queries.execute({ type: 'GET_USER_BY_EMAIL', payload: { email } });
  }
}

export class SimpleUserController {
  constructor(private userService: SimpleUserApplicationService) {}

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
 * Simple Service Registry - Clean Dependencies
 */
export class SimpleServiceRegistry {
  private container: DIContainer;

  constructor(env: CloudflareEnv) {
    this.container = new DIContainer();
    this.registerServices(env);
  }

  private registerServices(env: CloudflareEnv): void {
    // Register environment
    this.container.registerInstance('env', env);

    // Layer 1: Infrastructure services (no dependencies on domain)
    this.container.registerSingleton(
      'passwordService',
      () => new SimplePasswordService(),
      []
    );

    this.container.registerSingleton(
      'emailService',
      (env: CloudflareEnv) => new SimpleEmailService(env),
      ['env']
    );

    this.container.registerSingleton(
      'eventPublisher',
      () => new SimpleEventPublisher(),
      []
    );

    // Layer 2: Data access (depends only on infrastructure)
    this.container.registerSingleton(
      'userRepository',
      (env: CloudflareEnv) => new SimpleUserRepository(env),
      ['env']
    );

    // Layer 3: Domain services (depends on data access and infrastructure)
    this.container.registerSingleton(
      'userDomainService',
      (
        userRepository: SimpleUserRepository,
        passwordService: SimplePasswordService,
        emailService: SimpleEmailService,
        eventPublisher: SimpleEventPublisher
      ) => new SimpleUserDomainService(userRepository, passwordService, emailService, eventPublisher),
      ['userRepository', 'passwordService', 'emailService', 'eventPublisher']
    );

    // Layer 4: Application services (CQRS - depends only on domain)
    this.container.registerSingleton(
      'userCommandService',
      (userDomainService: SimpleUserDomainService) => new SimpleUserCommandService(userDomainService),
      ['userDomainService']
    );

    this.container.registerSingleton(
      'userQueryService',
      (userRepository: SimpleUserRepository) => new SimpleUserQueryService(userRepository),
      ['userRepository']
    );

    // Layer 5: Combined application service (depends on CQRS services)
    this.container.registerSingleton(
      'userApplicationService',
      (
        userCommandService: SimpleUserCommandService,
        userQueryService: SimpleUserQueryService
      ) => new SimpleUserApplicationService(userCommandService, userQueryService),
      ['userCommandService', 'userQueryService']
    );

    // Layer 6: Controllers (scoped - depends on application services)
    this.container.registerScoped(
      'userController',
      (userAppService: SimpleUserApplicationService) => new SimpleUserController(userAppService),
      ['userApplicationService']
    );
  }

  getContainer(): DIContainer {
    return this.container;
  }

  validateServices(): { isValid: boolean; errors: string[] } {
    return this.container.validate();
  }

  getServiceInfo(): Record<string, any> {
    const services = this.container.getRegisteredServices();
    const serviceInfo: Record<string, any> = {};

    for (const serviceName of services) {
      serviceInfo[serviceName] = this.container.getServiceInfo(serviceName);
    }

    return serviceInfo;
  }

  clearScope(): void {
    this.container.clearScope();
  }
}

/**
 * Factory function to create a simple service registry
 */
export function createSimpleServiceRegistry(env: CloudflareEnv): SimpleServiceRegistry {
  return new SimpleServiceRegistry(env);
}