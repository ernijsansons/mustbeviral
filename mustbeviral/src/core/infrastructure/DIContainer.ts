/**
 * Dependency Injection Container
 * Implements Dependency Inversion Principle and Service Locator Pattern
 * Provides centralized dependency management and lifecycle control
 */

export type Constructor<T = {}> = new (...args: any[]) => T;
export type ServiceFactory<T> = (...deps: any[]) => T;
export type AsyncServiceFactory<T> = (...deps: any[]) => Promise<T>;

export enum ServiceLifetime {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient',
  SCOPED = 'scoped'
}

export interface ServiceRegistration<T> {
  name: string;
  factory: ServiceFactory<T> | AsyncServiceFactory<T>;
  dependencies: string[];
  lifetime: ServiceLifetime;
  instance?: T;
  isAsync: boolean;
}

export interface ServiceDescriptor<T> {
  name: string;
  factory: ServiceFactory<T> | AsyncServiceFactory<T>;
  dependencies?: string[];
  lifetime?: ServiceLifetime;
}

/**
 * Dependency Injection Container
 * Manages service registration, resolution, and lifecycle
 */
export class DIContainer {
  private services = new Map<string, ServiceRegistration<any>>();
  private singletonInstances = new Map<string, any>();
  private scopedInstances = new Map<string, any>();
  private resolutionStack: string[] = [];

  /**
   * Register a service with the container
   */
  register<T>(descriptor: ServiceDescriptor<T>): this {
    const registration: ServiceRegistration<T> = {
      name: descriptor.name,
      factory: descriptor.factory,
      dependencies: descriptor.dependencies ?? [],
      lifetime: descriptor.lifetime ?? ServiceLifetime.TRANSIENT,
      isAsync: this.isAsyncFactory(descriptor.factory)
    };

    this.services.set(descriptor.name, registration);
    return this;
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(
    name: string, 
    factory: ServiceFactory<T> | AsyncServiceFactory<T>, 
    dependencies: string[] = []
  ): this {
    return this.register({
      name,
      factory,
      dependencies,
      lifetime: ServiceLifetime.SINGLETON
    });
  }

  /**
   * Register a transient service
   */
  registerTransient<T>(
    name: string, 
    factory: ServiceFactory<T> | AsyncServiceFactory<T>, 
    dependencies: string[] = []
  ): this {
    return this.register({
      name,
      factory,
      dependencies,
      lifetime: ServiceLifetime.TRANSIENT
    });
  }

  /**
   * Register a scoped service
   */
  registerScoped<T>(
    name: string, 
    factory: ServiceFactory<T> | AsyncServiceFactory<T>, 
    dependencies: string[] = []
  ): this {
    return this.register({
      name,
      factory,
      dependencies,
      lifetime: ServiceLifetime.SCOPED
    });
  }

  /**
   * Register a service from a constructor
   */
  registerClass<T>(
    name: string,
    constructor: Constructor<T>,
    dependencies: string[] = [],
    lifetime: ServiceLifetime = ServiceLifetime.TRANSIENT
  ): this {
    const factory = (...deps: any[]) => new constructor(...deps);
    return this.register({
      name,
      factory,
      dependencies,
      lifetime
    });
  }

  /**
   * Register a service instance
   */
  registerInstance<T>(name: string, instance: T): this {
    this.singletonInstances.set(name, instance);
    this.services.set(name, {
      name,
      factory: () => instance,
      dependencies: [],
      lifetime: ServiceLifetime.SINGLETON,
      instance,
      isAsync: false
    });
    return this;
  }

  /**
   * Resolve a service by name
   */
  async resolve<T>(name: string): Promise<T> {
    if (this.resolutionStack.includes(name)) {
      const cycle = [...this.resolutionStack, name].join(' -> ');
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    const registration = this.services.get(name);
    if (!registration) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Check for existing instances based on lifetime
    const existingInstance = this.getExistingInstance(name, registration.lifetime);
    if (existingInstance) {
      return existingInstance;
    }

    // Track resolution to detect circular dependencies
    this.resolutionStack.push(name);

    try {
      // Resolve dependencies
      const dependencies = await Promise.all(
        registration.dependencies.map(dep => this.resolve(dep))
      );

      // Create instance
      const instance = registration.isAsync
        ? await (registration.factory as AsyncServiceFactory<T>)(...dependencies)
        : (registration.factory as ServiceFactory<T>)(...dependencies);

      // Store instance based on lifetime
      this.storeInstance(name, instance, registration.lifetime);

      return instance;
    } finally {
      this.resolutionStack.pop();
    }
  }

  /**
   * Resolve a service synchronously (for non-async services only)
   */
  resolveSync<T>(name: string): T {
    if (this.resolutionStack.includes(name)) {
      const cycle = [...this.resolutionStack, name].join(' -> ');
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    const registration = this.services.get(name);
    if (!registration) {
      throw new Error(`Service '${name}' is not registered`);
    }

    if (registration.isAsync) {
      throw new Error(`Service '${name}' is async and cannot be resolved synchronously`);
    }

    // Check for existing instances based on lifetime
    const existingInstance = this.getExistingInstance(name, registration.lifetime);
    if (existingInstance) {
      return existingInstance;
    }

    // Track resolution to detect circular dependencies
    this.resolutionStack.push(name);

    try {
      // Resolve dependencies synchronously
      const dependencies = registration.dependencies.map(dep => this.resolveSync(dep));

      // Create instance
      const instance = (registration.factory as ServiceFactory<T>)(...dependencies);

      // Store instance based on lifetime
      this.storeInstance(name, instance, registration.lifetime);

      return instance;
    } finally {
      this.resolutionStack.pop();
    }
  }

  /**
   * Try to resolve a service, return null if not found
   */
  async tryResolve<T>(name: string): Promise<T | null> {
    try {
      return await this.resolve<T>(name);
    } catch {
      return null;
    }
  }

  /**
   * Check if a service is registered
   */
  isRegistered(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Clear scoped instances (typically called at the end of a request scope)
   */
  clearScope(): void {
    this.scopedInstances.clear();
  }

  /**
   * Clear all instances and registrations
   */
  clear(): void {
    this.services.clear();
    this.singletonInstances.clear();
    this.scopedInstances.clear();
    this.resolutionStack = [];
  }

  /**
   * Validate all registrations (check for missing dependencies)
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [name, registration] of this.services.entries()) {
      // Check if all dependencies are registered
      for (const dep of registration.dependencies) {
        if (!this.services.has(dep)) {
          errors.push(`Service '${name}' depends on unregistered service '${dep}'`);
        }
      }

      // Check for potential circular dependencies
      try {
        this.validateCircularDependencies(name, new Set());
      } catch (error) {
        errors.push(`Circular dependency involving service '${name}': ${(error as Error).message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get service registration information
   */
  getServiceInfo(name: string): ServiceInfo | null {
    const registration = this.services.get(name);
    if (!registration) {
      return null;
    }

    return {
      name: registration.name,
      dependencies: [...registration.dependencies],
      lifetime: registration.lifetime,
      isAsync: registration.isAsync,
      hasInstance: this.hasInstance(name, registration.lifetime)
    };
  }

  /**
   * Create a child container with inherited services
   */
  createChildContainer(): DIContainer {
    const child = new DIContainer();
    
    // Copy all service registrations to child
    for (const [name, registration] of this.services.entries()) {
      child.services.set(name, { ...registration });
    }

    // Copy singleton instances (shared across scopes)
    for (const [name, instance] of this.singletonInstances.entries()) {
      child.singletonInstances.set(name, instance);
    }

    return child;
  }

  // Private methods
  private isAsyncFactory<T>(factory: ServiceFactory<T> | AsyncServiceFactory<T>): boolean {
    return factory.constructor.name === 'AsyncFunction';
  }

  private getExistingInstance<T>(name: string, lifetime: ServiceLifetime): T | null {
    switch(lifetime) {
      case ServiceLifetime.SINGLETON:
        return this.singletonInstances.get(name)  ?? null;
      case ServiceLifetime.SCOPED:
        return this.scopedInstances.get(name)  ?? null;
      case ServiceLifetime.TRANSIENT:
        return null; // Always create new instance
      default:
        return null;
    }
  }

  private storeInstance<T>(name: string, instance: T, lifetime: ServiceLifetime): void {
    switch (lifetime) {
      case ServiceLifetime.SINGLETON:
        this.singletonInstances.set(name, instance);
        break;
      case ServiceLifetime.SCOPED:
        this.scopedInstances.set(name, instance);
        break;
      case ServiceLifetime.TRANSIENT:
        // Don't store transient instances
        break;
    }
  }

  private hasInstance(name: string, lifetime: ServiceLifetime): boolean {
    switch (lifetime) {
      case ServiceLifetime.SINGLETON:
        return this.singletonInstances.has(name);
      case ServiceLifetime.SCOPED:
        return this.scopedInstances.has(name);
      case ServiceLifetime.TRANSIENT:
        return false;
      default:
        return false;
    }
  }

  private validateCircularDependencies(serviceName: string, visited: Set<string>): void {
    if (visited.has(serviceName)) {
      throw new Error(`Circular dependency detected involving ${serviceName}`);
    }

    const registration = this.services.get(serviceName);
    if (!registration) {
      return;
    }

    visited.add(serviceName);

    for (const dep of registration.dependencies) {
      this.validateCircularDependencies(dep, new Set(visited));
    }
  }
}

// Supporting interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ServiceInfo {
  name: string;
  dependencies: string[];
  lifetime: ServiceLifetime;
  isAsync: boolean;
  hasInstance: boolean;
}

// Global container instance
let globalContainer: DIContainer | null = null;

/**
 * Get or create the global DI container
 */
export function getGlobalContainer(): DIContainer {
  if (!globalContainer) {
    globalContainer = new DIContainer();
  }
  return globalContainer;
}

/**
 * Set the global DI container
 */
export function setGlobalContainer(container: DIContainer): void {
  globalContainer = container;
}

/**
 * Clear the global DI container
 */
export function clearGlobalContainer(): void {
  globalContainer = null;
}

// Decorator for automatic service registration
export function injectable<T>(name: string, dependencies: string[] = [], lifetime: ServiceLifetime = ServiceLifetime.TRANSIENT) {
  return function (constructor: Constructor<T>) {
    const container = getGlobalContainer();
    container.registerClass(name, constructor, dependencies, lifetime);
    return constructor;
  };
}

// Decorator for dependency injection
export function inject(serviceName: string) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // This would typically be used with a reflection metadata library
    // For now, it serves as a marker for future enhancement
    Reflect.defineMetadata('inject', serviceName, target, parameterIndex);
  };
}

export default DIContainer;