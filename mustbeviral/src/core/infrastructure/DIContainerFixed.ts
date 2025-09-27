/**
 * Fixed Dependency Injection Container
 * Properly handles parallel dependency resolution without false circular dependency detection
 */

export enum ServiceLifetime {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient',
  SCOPED = 'scoped'
}

export type ServiceFactory<T> = (...dependencies: any[]) => T;
export type AsyncServiceFactory<T> = (...dependencies: any[]) => Promise<T>;

interface ServiceRegistration {
  name: string;
  factory: ServiceFactory<any> | AsyncServiceFactory<any>;
  dependencies: string[];
  lifetime: ServiceLifetime;
  instance?: any;
  isAsync: boolean;
}

interface ServiceInfo {
  name: string;
  dependencies: string[];
  lifetime: string;
  hasInstance: boolean;
}

export class DIContainer {
  private services = new Map<string, ServiceRegistration>();
  private singletonInstances = new Map<string, any>();
  private scopedInstances = new Map<string, any>();
  
  // Use thread-local resolution tracking to avoid conflicts in parallel resolution
  private activeResolutions = new Set<string>();

  constructor() {}

  /**
   * Register a service with specific lifetime
   */
  register(config: {
    name: string;
    factory: ServiceFactory<any> | AsyncServiceFactory<any>;
    dependencies?: string[];
    lifetime?: ServiceLifetime;
    isAsync?: boolean;
  }): this {
    this.services.set(config.name, {
      name: config.name,
      factory: config.factory,
      dependencies: config.dependencies ?? [],
      lifetime: config.lifetime ?? ServiceLifetime.SINGLETON,
      isAsync: config.isAsync ?? false
    });
    return this;
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(
    name: string,
    factory: ServiceFactory<T> | AsyncServiceFactory<T>,
    dependencies: string[] = [],
    isAsync = false
  ): this {
    return this.register({
      name,
      factory,
      dependencies,
      lifetime: ServiceLifetime.SINGLETON,
      isAsync
    });
  }

  /**
   * Register a transient service
   */
  registerTransient<T>(
    name: string,
    factory: ServiceFactory<T> | AsyncServiceFactory<T>,
    dependencies: string[] = [],
    isAsync = false
  ): this {
    return this.register({
      name,
      factory,
      dependencies,
      lifetime: ServiceLifetime.TRANSIENT,
      isAsync
    });
  }

  /**
   * Register a scoped service
   */
  registerScoped<T>(
    name: string,
    factory: ServiceFactory<T> | AsyncServiceFactory<T>,
    dependencies: string[] = [],
    isAsync = false
  ): this {
    return this.register({
      name,
      factory,
      dependencies,
      lifetime: ServiceLifetime.SCOPED,
      isAsync
    });
  }

  /**
   * Register a service instance directly
   */
  registerInstance<T>(name: string, instance: T): this {
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
   * Resolve a service by name with improved circular dependency detection
   */
  async resolve<T>(name: string, resolutionPath: string[] = []): Promise<T> {
    // Check for circular dependencies using the resolution path
    if (resolutionPath.includes(name)) {
      const cycle = [...resolutionPath, name].join(' -> ');
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

    // Add current service to resolution path for dependency resolution
    const newResolutionPath = [...resolutionPath, name];

    try {
      // Resolve dependencies sequentially to maintain proper resolution path
      const dependencies: any[] = [];
      for (const dep of registration.dependencies) {
        const dependency = await this.resolve(dep, newResolutionPath);
        dependencies.push(dependency);
      }

      // Create instance
      const instance = registration.isAsync
        ? await (registration.factory as AsyncServiceFactory<T>)(...dependencies)
        : (registration.factory as ServiceFactory<T>)(...dependencies);

      // Store instance based on lifetime
      this.storeInstance(name, instance, registration.lifetime);

      return instance;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get existing instance if available
   */
  private getExistingInstance(name: string, lifetime: ServiceLifetime): any {
    switch (lifetime) {
      case ServiceLifetime.SINGLETON:
        return this.singletonInstances.get(name);
      case ServiceLifetime.SCOPED:
        return this.scopedInstances.get(name);
      case ServiceLifetime.TRANSIENT:
        return undefined; // Always create new instance
      default:
        return undefined;
    }
  }

  /**
   * Store instance based on lifetime
   */
  private storeInstance(name: string, instance: any, lifetime: ServiceLifetime): void {
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

  /**
   * Clear scoped instances
   */
  clearScope(): void {
    this.scopedInstances.clear();
  }

  /**
   * Validate all service registrations
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const registeredServices = new Set(this.services.keys());

    for (const [serviceName, registration] of this.services) {
      // Check if all dependencies are registered
      for (const dependency of registration.dependencies) {
        if (!registeredServices.has(dependency)) {
          errors.push(`Service '${serviceName}' depends on unregistered service '${dependency}'`);
        }
      }

      // Check for circular dependencies using graph traversal
      try {
        this.detectCircularDependency(serviceName, new Set(), new Set());
      } catch (error) {
        errors.push(`${error.message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Detect circular dependencies using depth-first search
   */
  private detectCircularDependency(
    serviceName: string,
    visiting: Set<string>,
    visited: Set<string>
  ): void {
    if (visiting.has(serviceName)) {
      throw new Error(`Circular dependency detected involving service '${serviceName}'`);
    }

    if (visited.has(serviceName)) {
      return; // Already checked this service
    }

    const registration = this.services.get(serviceName);
    if (!registration) {
      return; // Service not registered
    }

    visiting.add(serviceName);

    for (const dependency of registration.dependencies) {
      this.detectCircularDependency(dependency, visiting, visited);
    }

    visiting.delete(serviceName);
    visited.add(serviceName);
  }

  /**
   * Get list of registered services
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get service information for monitoring
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
      hasInstance: this.getExistingInstance(name, registration.lifetime) !== undefined
    };
  }

  /**
   * Check if a service is registered
   */
  isRegistered(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get service count
   */
  getServiceCount(): number {
    return this.services.size;
  }

  /**
   * Clear all instances and registrations
   */
  dispose(): void {
    this.singletonInstances.clear();
    this.scopedInstances.clear();
    this.services.clear();
    this.activeResolutions.clear();
  }
}