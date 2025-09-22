export interface GraphQLService {
  name: string;
  url: string;
  schema: string;
  version: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastHealthCheck: number;
  responseTime: number;
  entities: EntityDefinition[];
  directives: DirectiveDefinition[];
  metadata: ServiceMetadata;
}

export interface ServiceMetadata {
  owner: string;
  description: string;
  documentation?: string;
  tags: string[];
  capabilities: string[];
  dependencies: string[];
  sla: SLAConfig;
}

export interface SLAConfig {
  availability: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
}

export interface EntityDefinition {
  type: string;
  keyFields: string[];
  resolveReference: boolean;
  extendsEntity: boolean;
  shareable: boolean;
  resolvable: boolean;
}

export interface DirectiveDefinition {
  name: string;
  locations: string[];
  args: DirectiveArg[];
  repeatable: boolean;
}

export interface DirectiveArg {
  name: string;
  type: string;
  defaultValue?: unknown;
  required: boolean;
}

export interface FederationConfig {
  gateway: GatewayConfig;
  services: GraphQLService[];
  supergraph: SupergraphConfig;
  composition: CompositionConfig;
  execution: ExecutionConfig;
}

export interface GatewayConfig {
  port: number;
  path: string;
  playground: boolean;
  introspection: boolean;
  cors: CORSConfig;
  rateLimiting: RateLimitConfig;
  caching: CacheConfig;
  security: SecurityConfig;
}

export interface CORSConfig {
  origin: string | string[] | boolean;
  credentials: boolean;
  methods: string[];
  headers: string[];
}

export interface RateLimitConfig {
  max: number;
  windowMs: number;
  keyGenerator?: (req: unknown) => string;
  skipSuccessfulRequests?: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  keyPrefix: string;
  redis?: RedisConfig;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database?: number;
}

export interface SecurityConfig {
  authentication: AuthConfig;
  authorization: AuthzConfig;
  validation: ValidationConfig;
}

export interface AuthConfig {
  jwt?: JWTConfig;
  apiKey?: APIKeyConfig;
  oauth?: OAuthConfig;
}

export interface JWTConfig {
  secret: string;
  issuer: string;
  audience: string;
  algorithms: string[];
}

export interface APIKeyConfig {
  header: string;
  query?: string;
  validKeys: string[];
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scopeRequired: string[];
}

export interface AuthzConfig {
  enabled: boolean;
  rules: AuthzRule[];
  defaultPermission: 'allow' | 'deny';
}

export interface AuthzRule {
  operation: string;
  resource: string;
  permissions: string[];
  conditions?: AuthzCondition[];
}

export interface AuthzCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'lt';
  value: unknown;
}

export interface ValidationConfig {
  maxDepth: number;
  maxAliases: number;
  maxDirectives: number;
  maxTokens: number;
  disableIntrospection: boolean;
}

export interface SupergraphConfig {
  schema: string;
  version: string;
  composition: CompositionResult;
  entities: FederatedEntity[];
  lastUpdated: number;
}

export interface CompositionResult {
  success: boolean;
  errors: CompositionError[];
  warnings: CompositionWarning[];
  hints: CompositionHint[];
}

export interface CompositionError {
  code: string;
  message: string;
  service?: string;
  coordinate?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface CompositionWarning extends CompositionError {}
export interface CompositionHint extends CompositionError {}

export interface FederatedEntity {
  type: string;
  keyFields: string[];
  services: string[];
  resolvable: boolean;
  shareable: boolean;
}

export interface CompositionConfig {
  strict: boolean;
  preserveDirectives: string[];
  allowedDirectives: string[];
  deprecatedDirectives: string[];
  customTransformers: CompositionTransformer[];
}

export interface CompositionTransformer {
  name: string;
  phase: 'validation' | 'transformation' | 'optimization';
  priority: number;
  transform: (schema: unknown) => unknown;
}

export interface ExecutionConfig {
  parallelization: boolean;
  caching: boolean;
  tracing: boolean;
  metrics: boolean;
  timeout: number;
  maxComplexity: number;
  maxDepth: number;
  batchRequests: boolean;
  queryPlanning: QueryPlanningConfig;
}

export interface QueryPlanningConfig {
  strategy: 'greedy' | 'dynamic' | 'cost-based';
  cacheSize: number;
  optimizations: QueryOptimization[];
}

export interface QueryOptimization {
  name: string;
  enabled: boolean;
  priority: number;
}

export interface QueryPlan {
  id: string;
  query: string;
  variables: Record<string, unknown>;
  complexity: number;
  depth: number;
  nodes: QueryPlanNode[];
  parallelNodes: QueryPlanNode[][];
  estimatedCost: number;
  cacheKey?: string;
}

export interface QueryPlanNode {
  service: string;
  operation: string;
  selections: string[];
  variables: Record<string, unknown>;
  requires: string[];
  provides: string[];
  entityFetches: EntityFetch[];
}

export interface EntityFetch {
  service: string;
  typeName: string;
  representations: unknown[];
  selectionSet: string;
}

export interface ExecutionResult {
  data?: unknown;
  errors?: GraphQLError[];
  extensions?: Record<string, unknown>;
  metrics: ExecutionMetrics;
}

export interface GraphQLError {
  message: string;
  locations?: ErrorLocation[];
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

export interface ErrorLocation {
  line: number;
  column: number;
}

export interface ExecutionMetrics {
  duration: number;
  complexity: number;
  depth: number;
  serviceCallCount: number;
  serviceCalls: ServiceCall[];
  cacheHits: number;
  cacheMisses: number;
}

export interface ServiceCall {
  service: string;
  operation: string;
  duration: number;
  size: number;
  cached: boolean;
  error?: string;
}

export interface Subscription {
  id: string;
  query: string;
  variables: Record<string, unknown>;
  connectionId: string;
  services: string[];
  filters: SubscriptionFilter[];
  status: 'active' | 'paused' | 'error';
  createdAt: number;
  lastEvent: number;
}

export interface SubscriptionFilter {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'contains';
  value: unknown;
}

export interface FederationMetrics {
  requests: RequestMetrics;
  services: ServiceMetrics[];
  composition: CompositionMetrics;
  gateway: GatewayMetrics;
}

export interface RequestMetrics {
  total: number;
  successful: number;
  failed: number;
  averageDuration: number;
  complexityDistribution: Record<string, number>;
  errorRate: number;
}

export interface ServiceMetrics {
  name: string;
  requests: number;
  errors: number;
  averageResponseTime: number;
  availability: number;
  lastError?: string;
}

export interface CompositionMetrics {
  lastComposition: number;
  compositionDuration: number;
  schemaSize: number;
  entityCount: number;
  serviceCount: number;
}

export interface GatewayMetrics {
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queryPlanCacheSize: number;
  queryPlanCacheHitRate: number;
}

export class GraphQLFederationGateway {
  private services: Map<string, GraphQLService> = new Map();
  private supergraph: SupergraphConfig | null = null;
  private queryPlanCache: Map<string, QueryPlan> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private metrics: FederationMetrics = this.initializeMetrics();

  constructor(private config: FederationConfig) {
    this.initializeServices();
    this.startHealthMonitoring();
    this.startMetricsCollection();
  }

  async registerService(service: GraphQLService): Promise<void> {
    this.services.set(service.name, service);
    await this.recomposeSupergraph();
  }

  async unregisterService(serviceName: string): Promise<void> {
    this.services.delete(serviceName);
    await this.recomposeSupergraph();
  }

  async updateService(service: GraphQLService): Promise<void> {
    const existing = this.services.get(service.name);
    if (existing && existing.version !== service.version) {
      this.services.set(service.name, service);
      await this.recomposeSupergraph();
    }
  }

  async executeQuery(
    query: string,
    variables: Record<string, unknown> = {},
    context: unknown = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      await this.validateQuery(query, variables);
      await this.authenticate(context);
      await this.authorize(query, context);

      const queryPlan = await this.createQueryPlan(query, variables);
      const result = await this.executeQueryPlan(queryPlan, context);

      const metrics: ExecutionMetrics = {
        duration: Date.now() - startTime,
        complexity: queryPlan.complexity,
        depth: queryPlan.depth,
        serviceCallCount: queryPlan.nodes.length,
        serviceCalls: [], // Populated during execution
        cacheHits: 0,
        cacheMisses: 0
      };

      this.recordMetrics(metrics, true);

      return {
        data: result.data,
        errors: result.errors,
        extensions: {
          tracing: this.config.execution.tracing ? metrics : undefined
        },
        metrics
      };

    } catch (error: unknown) {
      const metrics: ExecutionMetrics = {
        duration: Date.now() - startTime,
        complexity: 0,
        depth: 0,
        serviceCallCount: 0,
        serviceCalls: [],
        cacheHits: 0,
        cacheMisses: 0
      };

      this.recordMetrics(metrics, false);

      return {
        errors: [{
          message: (error as Error).message,
          extensions: { code: 'INTERNAL_ERROR' }
        }],
        metrics
      };
    }
  }

  async executeSubscription(
    query: string,
    variables: Record<string, unknown> = {},
    connectionId: string,
    context: unknown = {}
  ): Promise<string> {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: Subscription = {
      id: subscriptionId,
      query,
      variables,
      connectionId,
      services: this.extractServicesFromQuery(query),
      filters: [],
      status: 'active',
      createdAt: Date.now(),
      lastEvent: Date.now()
    };

    this.subscriptions.set(subscriptionId, subscription);
    await this.setupSubscriptionListeners(subscription);

    return subscriptionId;
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.status = 'paused';
      this.subscriptions.delete(subscriptionId);
      await this.cleanupSubscriptionListeners(subscription);
    }
  }

  async getSupergraphSchema(): Promise<string> {
    return this.supergraph?.schema || '';
  }

  async introspectServices(): Promise<GraphQLService[]> {
    const services: GraphQLService[] = [];

    for (const service of this.services.values()) {
      try {
        const introspection = await this.introspectService(service);
        services.push({
          ...service,
          schema: introspection.schema,
          entities: introspection.entities,
          directives: introspection.directives
        });
      } catch (error: unknown) {
        console.error(`Failed to introspect service ${service.name}:`, error);
      }
    }

    return services;
  }

  getMetrics(): FederationMetrics {
    return { ...this.metrics };
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    await Promise.all(
      Array.from(this.services.values()).map(async service => {
        try {
          await this.checkServiceHealth(service);
          health[service.name] = service.status === 'healthy';
        } catch (error: unknown) {
          health[service.name] = false;
        }
      })
    );

    return health;
  }

  private async recomposeSupergraph(): Promise<void> {
    try {
      const services = Array.from(this.services.values());
      const composition = await this.composeSupergraph(services);

      if (composition.success) {
        this.supergraph = {
          schema: composition.schema!,
          version: this.generateVersion(),
          composition: {
            success: true,
            errors: [],
            warnings: composition.warnings || [],
            hints: composition.hints || []
          },
          entities: await this.extractEntities(composition.schema!),
          lastUpdated: Date.now()
        };

        this.queryPlanCache.clear();
      } else {
        console.error('Supergraph composition failed:', composition.errors);
      }
    } catch (error: unknown) {
      console.error('Failed to recompose supergraph:', error);
    }
  }

  private async composeSupergraph(services: GraphQLService[]): Promise<{
    success: boolean;
    schema?: string;
    errors?: CompositionError[];
    warnings?: CompositionWarning[];
    hints?: CompositionHint[];
  }> {
    try {
      const schemas = services.map(s => s.schema);
      const composedSchema = this.mergeSchemas(schemas);

      return {
        success: true,
        schema: composedSchema,
        warnings: [],
        hints: []
      };
    } catch (error: unknown) {
      return {
        success: false,
        errors: [{
          code: 'COMPOSITION_FAILED',
          message: (error as Error).message,
          severity: 'error'
        }]
      };
    }
  }

  private mergeSchemas(schemas: string[]): string {
    return schemas.join('\n\n');
  }

  private async extractEntities(schema: string): Promise<FederatedEntity[]> {
    return [];
  }

  private async validateQuery(query: string, variables: Record<string, unknown>): Promise<void> {
    const validation = this.config.gateway.security.validation;

    if (this.calculateQueryDepth(query) > validation.maxDepth) {
      throw new Error(`Query depth exceeds maximum of ${validation.maxDepth}`);
    }

    if (this.calculateQueryComplexity(query) > this.config.execution.maxComplexity) {
      throw new Error(`Query complexity exceeds maximum of ${this.config.execution.maxComplexity}`);
    }
  }

  private async authenticate(context: unknown): Promise<void> {
    const authConfig = this.config.gateway.security.authentication;

    if (authConfig.jwt) {
      await this.validateJWT(context.token, authConfig.jwt);
    }

    if (authConfig.apiKey) {
      await this.validateAPIKey(context.apiKey, authConfig.apiKey);
    }
  }

  private async authorize(query: string, context: unknown): Promise<void> {
    const authzConfig = this.config.gateway.security.authorization;

    if (!authzConfig.enabled) return;

    const operation = this.extractOperation(query);
    const resource = this.extractResource(query);

    const hasPermission = authzConfig.rules.some(rule => {
      return rule.operation === operation &&
             rule.resource === resource &&
             this.checkPermissions(context.user, rule.permissions);
    });

    if (!hasPermission && authzConfig.defaultPermission === 'deny') {
      throw new Error('Access denied');
    }
  }

  private async createQueryPlan(query: string, variables: Record<string, unknown>): Promise<QueryPlan> {
    const cacheKey = this.generateQueryPlanCacheKey(query, variables);
    const cached = this.queryPlanCache.get(cacheKey);

    if (cached) {
      this.metrics.gateway.queryPlanCacheHitRate++;
      return cached;
    }

    const plan: QueryPlan = {
      id: this.generateQueryPlanId(),
      query,
      variables,
      complexity: this.calculateQueryComplexity(query),
      depth: this.calculateQueryDepth(query),
      nodes: await this.planQueryExecution(query),
      parallelNodes: [],
      estimatedCost: 0,
      cacheKey
    };

    plan.parallelNodes = this.identifyParallelNodes(plan.nodes);
    plan.estimatedCost = this.estimateExecutionCost(plan);

    this.queryPlanCache.set(cacheKey, plan);
    return plan;
  }

  private async planQueryExecution(query: string): Promise<QueryPlanNode[]> {
    const nodes: QueryPlanNode[] = [];

    for (const service of this.services.values()) {
      const selections = this.extractSelectionsForService(query, service.name);
      if (selections.length > 0) {
        nodes.push({
          service: service.name,
          operation: 'query',
          selections,
          variables: {},
          requires: [],
          provides: [],
          entityFetches: []
        });
      }
    }

    return nodes;
  }

  private async executeQueryPlan(plan: QueryPlan, context: unknown): Promise<ExecutionResult> {
    const results: unknown[] = [];
    const errors: GraphQLError[] = [];

    for (const parallelGroup of plan.parallelNodes.length > 0 ? plan.parallelNodes : [plan.nodes]) {
      const groupResults = await Promise.allSettled(
        parallelGroup.map(node => this.executeNode(node, context))
      );

      groupResults.forEach((result, _index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push({
            message: result.reason.message,
            extensions: { service: parallelGroup[index].service }
          });
        }
      });
    }

    return {
      data: this.mergeResults(results),
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async executeNode(node: QueryPlanNode, context: unknown): Promise<unknown> {
    const service = this.services.get(node.service);
    if (!service) {
      throw new Error(`Service not found: ${node.service}`);
    }

    const query = this.buildServiceQuery(node);
    const response = await this.callService(service, query, node.variables);

    return response.data;
  }

  private async callService(
    service: GraphQLService,
    query: string,
    variables: Record<string, unknown>
  ): Promise<unknown> {
    const response = await fetch(service.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ _query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`Service ${service.name} returned ${response.status}`);
    }

    return response.json();
  }

  private identifyParallelNodes(nodes: QueryPlanNode[]): QueryPlanNode[][] {
    return [nodes];
  }

  private estimateExecutionCost(plan: QueryPlan): number {
    return plan.nodes.reduce((cost, _node) => cost + node.selections.length, 0);
  }

  private mergeResults(results: unknown[]): unknown {
    return results.reduce((merged, _result) => ({
      ...merged,
      ...result
    }), {});
  }

  private buildServiceQuery(node: QueryPlanNode): string {
    return `query { ${node.selections.join(' ')} }`;
  }

  private extractSelectionsForService(query: string, serviceName: string): string[] {
    return ['field1', 'field2'];
  }

  private extractServicesFromQuery(query: string): string[] {
    return Array.from(this.services.keys());
  }

  private async setupSubscriptionListeners(subscription: Subscription): Promise<void> {
    // Setup WebSocket or Server-Sent Events listeners
  }

  private async cleanupSubscriptionListeners(subscription: Subscription): Promise<void> {
    // Cleanup subscription listeners
  }

  private async introspectService(service: GraphQLService): Promise<{
    schema: string;
    entities: EntityDefinition[];
    directives: DirectiveDefinition[];
  }> {
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          types {
            name
            kind
            fields {
              name
              type {
                name
                kind
              }
            }
          }
        }
      }
    `;

    const response = await this.callService(service, introspectionQuery, {});

    return {
      schema: this.buildSchemaFromIntrospection(response.data),
      entities: [],
      directives: []
    };
  }

  private buildSchemaFromIntrospection(introspectionResult: unknown): string {
    return 'type Query { hello: String }';
  }

  private async checkServiceHealth(service: GraphQLService): Promise<void> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${service.url}/health`, {
        method: 'GET',
        timeout: 5000
      });

      service.responseTime = Date.now() - startTime;
      service.status = response.ok ? 'healthy' : 'unhealthy';
      service.lastHealthCheck = Date.now();

    } catch (error: unknown) {
      service.status = 'unhealthy';
      service.responseTime = Date.now() - startTime;
      service.lastHealthCheck = Date.now();
    }

    this.services.set(service.name, service);
  }

  private calculateQueryDepth(query: string): number {
    return (query.match(/{/g) || []).length;
  }

  private calculateQueryComplexity(query: string): number {
    return query.split(' ').length;
  }

  private async validateJWT(token: string, config: JWTConfig): Promise<void> {
    // JWT validation logic
  }

  private async validateAPIKey(apiKey: string, config: APIKeyConfig): Promise<void> {
    if (!config.validKeys.includes(apiKey)) {
      throw new Error('Invalid API key');
    }
  }

  private extractOperation(query: string): string {
    return query.includes('mutation') ? 'mutation' : 'query';
  }

  private extractResource(query: string): string {
    return 'default';
  }

  private checkPermissions(user: unknown, requiredPermissions: string[]): boolean {
    return requiredPermissions.every(perm => user.permissions?.includes(perm));
  }

  private generateQueryPlanCacheKey(query: string, variables: Record<string, unknown>): string {
    return btoa(query + JSON.stringify(variables));
  }

  private generateQueryPlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateVersion(): string {
    return Date.now().toString();
  }

  private initializeServices(): void {
    this.config.services.forEach(service => {
      this.services.set(service.name, service);
    });
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.healthCheck();
    }, 30000); // Every 30 seconds
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics();
    }, 10000); // Every 10 seconds
  }

  private recordMetrics(executionMetrics: ExecutionMetrics, success: boolean): void {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    this.metrics.requests.averageDuration =
      (this.metrics.requests.averageDuration + executionMetrics.duration) / 2;

    this.metrics.requests.errorRate =
      this.metrics.requests.failed / this.metrics.requests.total;
  }

  private updateMetrics(): void {
    this.metrics.gateway.uptime = Date.now();
    this.metrics.gateway.queryPlanCacheSize = this.queryPlanCache.size;
    this.metrics.gateway.activeConnections = this.subscriptions.size;

    this.metrics.services = Array.from(this.services.values()).map(service => ({
      name: service.name,
      requests: 0,
      errors: 0,
      averageResponseTime: service.responseTime,
      availability: service.status === 'healthy' ? 100 : 0,
      lastError: service.status === 'unhealthy' ? 'Service unhealthy' : undefined
    }));
  }

  private initializeMetrics(): FederationMetrics {
    return {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageDuration: 0,
        complexityDistribution: {},
        errorRate: 0
      },
      services: [],
      composition: {
        lastComposition: 0,
        compositionDuration: 0,
        schemaSize: 0,
        entityCount: 0,
        serviceCount: 0
      },
      gateway: {
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0,
        queryPlanCacheSize: 0,
        queryPlanCacheHitRate: 0
      }
    };
  }
}