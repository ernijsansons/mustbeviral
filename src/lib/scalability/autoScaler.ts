/**
 * Auto-Scaling and Load Management
 * Intelligent scaling decisions and resource optimization for Cloudflare Workers
 */

import { CloudflareEnv } from '../cloudflare';
import { getPerformanceMonitor } from '../monitoring/performanceMonitor';
import { getConnectionPool } from '../database/connectionPool';

export interface ScalingMetrics {
  cpuUsage: number;
  memoryUsage: number;
  requestsPerSecond: number;
  responseTime: number;
  errorRate: number;
  queueDepth: number;
  connectionPoolUsage: number;
  cacheHitRate: number;
}

export interface ScalingDecision {
  action: 'scale_up' | 'scale_down' | 'maintain' | 'throttle';
  reason: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  recommendedActions: string[];
  metrics: ScalingMetrics;
  timestamp: Date;
}

export interface ScalingConfig {
  thresholds: {
    responseTime: {
      scaleUp: number;
      scaleDown: number;
    };
    errorRate: {
      scaleUp: number;
      critical: number;
    };
    requestsPerSecond: {
      scaleUp: number;
      scaleDown: number;
    };
    resourceUsage: {
      memory: number;
      connections: number;
    };
  };
  scaling: {
    minInstances: number;
    maxInstances: number;
    cooldownPeriod: number;
    aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  };
  monitoring: {
    evaluationInterval: number;
    metricsWindow: number;
    anomalyDetection: boolean;
  };
}

export interface LoadBalancingStrategy {
  type: 'round_robin' | 'least_connections' | 'weighted' | 'adaptive';
  weights?: Record<string, number>;
  healthCheckEnabled: boolean;
  failoverEnabled: boolean;
}

export class AutoScaler {
  private env: CloudflareEnv;
  private config: ScalingConfig;
  private scalingHistory: ScalingDecision[] = [];
  private lastScalingAction?: Date;
  private resourceMonitor: ResourceMonitor;
  private readonly MAX_HISTORY = 100;

  constructor(env: CloudflareEnv, config?: Partial<ScalingConfig>) {
    this.env = env;
    this.config = {
      thresholds: {
        responseTime: {
          scaleUp: 2000, // 2 seconds
          scaleDown: 500  // 0.5 seconds
        },
        errorRate: {
          scaleUp: 5,    // 5%
          critical: 10   // 10%
        },
        requestsPerSecond: {
          scaleUp: 100,
          scaleDown: 20
        },
        resourceUsage: {
          memory: 80,      // 80%
          connections: 80   // 80% of pool
        }
      },
      scaling: {
        minInstances: 1,
        maxInstances: 100,
        cooldownPeriod: 300000, // 5 minutes
        aggressiveness: 'moderate'
      },
      monitoring: {
        evaluationInterval: 30000, // 30 seconds
        metricsWindow: 300000,     // 5 minutes
        anomalyDetection: true
      },
      ...config
    };

    this.resourceMonitor = new ResourceMonitor(env);
    this.startScalingEvaluation();
  }

  /**
   * Evaluate current scaling needs
   */
  async evaluateScaling(): Promise<ScalingDecision> {
    try {
      // Collect current metrics
      const metrics = await this.collectMetrics();

      // Analyze scaling needs
      const decision = this.analyzeScalingNeeds(metrics);

      // Store decision in history
      this.addToHistory(decision);

      // Execute scaling action if needed
      if (decision.action !== 'maintain') {
        await this.executeScalingAction(decision);
      }

      return decision;

    } catch (error: unknown) {
      console.error('LOG: AUTO-SCALER-ERROR-1 - Scaling evaluation failed:', error);

      return {
        action: 'maintain',
        reason: `Scaling evaluation failed: ${error.message}`,
        confidence: 0,
        urgency: 'low',
        recommendedActions: ['Check monitoring systems', 'Review error logs'],
        metrics: await this.getDefaultMetrics(),
        timestamp: new Date()
      };
    }
  }

  /**
   * Get scaling recommendations
   */
  getScalingRecommendations(): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    insights: string[];
  } {
    const recentDecisions = this.scalingHistory.slice(-10);
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    const insights: string[] = [];

    // Analyze recent patterns
    const scaleUpCount = recentDecisions.filter(d => d.action === 'scale_up').length;
    const scaleDownCount = recentDecisions.filter(d => d.action === 'scale_down').length;
    const highUrgencyCount = recentDecisions.filter(d => d.urgency === 'critical' || d.urgency === 'high').length;

    if (scaleUpCount > 5) {
      immediate.push('Consider increasing base capacity');
      shortTerm.push('Review traffic patterns for predictable scaling');
      insights.push('Frequent scale-up events detected - may indicate under-provisioning');
    }

    if (scaleDownCount > 5) {
      shortTerm.push('Optimize resource allocation to reduce over-provisioning');
      insights.push('Frequent scale-down events - resources may be over-allocated');
    }

    if (highUrgencyCount > 3) {
      immediate.push('Implement pre-emptive scaling based on traffic predictions');
      immediate.push('Review and tune scaling thresholds');
      insights.push('High urgency scaling events suggest reactive rather than proactive scaling');
    }

    // Performance-based recommendations
    const avgResponseTime = recentDecisions.reduce((sum, _d) => sum + d.metrics.responseTime, 0) / recentDecisions.length;
    if (avgResponseTime > this.config.thresholds.responseTime.scaleUp) {
      immediate.push('Investigate performance bottlenecks');
      shortTerm.push('Consider performance optimization before scaling');
    }

    // Resource optimization
    const avgCacheHitRate = recentDecisions.reduce((sum, _d) => sum + d.metrics.cacheHitRate, 0) / recentDecisions.length;
    if (avgCacheHitRate < 70) {
      shortTerm.push('Improve caching strategy to reduce backend load');
      longTerm.push('Implement edge caching and CDN optimization');
    }

    // Long-term architecture recommendations
    longTerm.push('Consider implementing auto-scaling policies in infrastructure');
    longTerm.push('Evaluate serverless architecture for better cost optimization');
    longTerm.push('Implement predictive scaling based on historical patterns');

    return { _immediate,
      shortTerm,
      longTerm,
      insights
    };
  }

  /**
   * Get current resource utilization
   */
  async getResourceUtilization(): Promise<{
    current: ScalingMetrics;
    utilization: {
      cpu: number;
      memory: number;
      network: number;
      storage: number;
    };
    capacity: {
      remaining: number;
      projected: number;
      timeToCapacity: number; // minutes
    };
  }> {
    const metrics = await this.collectMetrics();

    // Calculate utilization percentages
    const utilization = {
      cpu: Math.min(metrics.cpuUsage, 100),
      memory: Math.min(metrics.memoryUsage, 100),
      network: Math.min((metrics.requestsPerSecond / this.config.thresholds.requestsPerSecond.scaleUp) * 100, 100),
      storage: Math.min(metrics.connectionPoolUsage, 100)
    };

    // Calculate capacity projections
    const avgUtilization = (utilization.cpu + utilization.memory + utilization.network + utilization.storage) / 4;
    const remaining = Math.max(0, 100 - avgUtilization);

    // Simple projection based on current growth rate
    const recentMetrics = this.scalingHistory.slice(-5).map(d => d.metrics);
    const growthRate = this.calculateGrowthRate(recentMetrics);
    const timeToCapacity = remaining > 0 && growthRate > 0 ? remaining / growthRate : Infinity;

    return {
      current: metrics,
      utilization,
      capacity: { _remaining,
        projected: Math.min(100, avgUtilization + (growthRate * 30)), // 30 minutes projection
        timeToCapacity: Math.min(timeToCapacity, 1440) // Cap at 24 hours
      }
    };
  }

  /**
   * Force scaling action
   */
  async forceScalingAction(action: 'scale_up' | 'scale_down', reason: string): Promise<void> {
    const metrics = await this.collectMetrics();

    const decision: ScalingDecision = { _action,
      reason: `Manual: ${reason}`,
      confidence: 100,
      urgency: 'high',
      recommendedActions: [`Execute ${action} immediately`],
      metrics,
      timestamp: new Date()
    };

    await this.executeScalingAction(decision);
    this.addToHistory(decision);

    console.log(`LOG: AUTO-SCALER-FORCE-1 - Forced scaling action: ${action} (${reason})`);
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<ScalingMetrics> {
    try {
      const perfMonitor = getPerformanceMonitor(this.env);
      const perfMetrics = perfMonitor.getCurrentMetrics();

      const connectionPool = getConnectionPool(this.env);
      const poolMetrics = connectionPool.getMetrics();

      // Resource monitoring
      const resourceMetrics = await this.resourceMonitor.getResourceMetrics();

      return {
        cpuUsage: resourceMetrics.cpuUsage,
        memoryUsage: resourceMetrics.memoryUsage,
        requestsPerSecond: perfMetrics.throughput.requestsPerSecond,
        responseTime: perfMetrics.responseTime.avg,
        errorRate: perfMetrics.errors.rate,
        queueDepth: 0, // Would be implemented based on actual queue
        connectionPoolUsage: (poolMetrics.activeConnections / poolMetrics.totalConnections) * 100,
        cacheHitRate: perfMetrics.resources.cacheHitRate
      };

    } catch (error: unknown) {
      console.error('LOG: AUTO-SCALER-METRICS-ERROR-1 - Failed to collect metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Analyze scaling needs based on metrics
   */
  private analyzeScalingNeeds(metrics: ScalingMetrics): ScalingDecision {
    const issues: string[] = [];
    const actions: string[] = [];
    let urgency: ScalingDecision['urgency'] = 'low';
    let confidence = 0;
    let action: ScalingDecision['action'] = 'maintain';

    // Check response time
    if (metrics.responseTime > this.config.thresholds.responseTime.scaleUp) {
      issues.push(`High response time: ${metrics.responseTime}ms`);
      actions.push('Scale up to reduce response time');
      urgency = this.escalateUrgency(urgency, 'medium');
      confidence += 25;
    }

    // Check error rate
    if (metrics.errorRate > this.config.thresholds.errorRate.critical) {
      issues.push(`Critical error rate: ${metrics.errorRate}%`);
      actions.push('Immediate scale up - critical error rate');
      urgency = 'critical';
      confidence += 40;
    } else if (metrics.errorRate > this.config.thresholds.errorRate.scaleUp) {
      issues.push(`High error rate: ${metrics.errorRate}%`);
      actions.push('Scale up to handle error rate');
      urgency = this.escalateUrgency(urgency, 'high');
      confidence += 30;
    }

    // Check request volume
    if (metrics.requestsPerSecond > this.config.thresholds.requestsPerSecond.scaleUp) {
      issues.push(`High request volume: ${metrics.requestsPerSecond} RPS`);
      actions.push('Scale up for increased traffic');
      urgency = this.escalateUrgency(urgency, 'medium');
      confidence += 20;
    }

    // Check resource usage
    if (metrics.memoryUsage > this.config.thresholds.resourceUsage.memory) {
      issues.push(`High memory usage: ${metrics.memoryUsage}%`);
      actions.push('Scale up for memory pressure');
      urgency = this.escalateUrgency(urgency, 'high');
      confidence += 35;
    }

    if (metrics.connectionPoolUsage > this.config.thresholds.resourceUsage.connections) {
      issues.push(`High connection pool usage: ${metrics.connectionPoolUsage}%`);
      actions.push('Scale up database connections');
      urgency = this.escalateUrgency(urgency, 'medium');
      confidence += 25;
    }

    // Check for scale down opportunities
    if (issues.length === 0) {
      if (metrics.responseTime < this.config.thresholds.responseTime.scaleDown &&
          metrics.requestsPerSecond < this.config.thresholds.requestsPerSecond.scaleDown &&
          metrics.errorRate < 1) {
        issues.push('Low resource utilization detected');
        actions.push('Consider scaling down to optimize costs');
        action = 'scale_down';
        urgency = 'low';
        confidence = 60;
      }
    }

    // Determine action
    if (confidence > 70 && urgency === 'critical') {
      action = 'scale_up';
    } else if (confidence > 50 && (urgency === 'high' || urgency === 'medium')) {
      action = 'scale_up';
    } else if (confidence > 30 && urgency === 'medium') {
      action = 'scale_up';
    }

    // Check cooldown period
    if (this.lastScalingAction && action !== 'maintain') {
      const timeSinceLastAction = Date.now() - this.lastScalingAction.getTime();
      if (timeSinceLastAction < this.config.scaling.cooldownPeriod) {
        action = 'maintain';
        actions.unshift(`Cooldown period active (${Math.ceil((this.config.scaling.cooldownPeriod - timeSinceLastAction) / 1000)}s remaining)`);
        urgency = 'low';
      }
    }

    const reason = issues.length > 0 ? issues.join('; ') : 'All metrics within normal ranges';

    return { _action,
      reason,
      confidence,
      urgency,
      recommendedActions: actions,
      metrics,
      timestamp: new Date()
    };
  }

  /**
   * Execute scaling action
   */
  private async executeScalingAction(decision: ScalingDecision): Promise<void> {
    try {
      console.log(`LOG: AUTO-SCALER-ACTION-1 - Executing ${decision.action}: ${decision.reason}`);

      switch (decision.action) {
        case 'scale_up':
          await this.scaleUp(decision);
          break;
        case 'scale_down':
          await this.scaleDown(decision);
          break;
        case 'throttle':
          await this.enableThrottling(decision);
          break;
        default:
          // Maintain - no action needed
          break;
      }

      this.lastScalingAction = new Date();

    } catch (error: unknown) {
      console.error(`LOG: AUTO-SCALER-ACTION-ERROR-1 - Failed to execute ${decision.action}:`, error);
    }
  }

  /**
   * Scale up operations
   */
  private async scaleUp(decision: ScalingDecision): Promise<void> {
    // In Cloudflare Workers, scaling is automatic, but we can:
    // 1. Increase connection pool size
    // 2. Pre-warm caches
    // 3. Adjust rate limits
    // 4. Send alerts for manual scaling

    console.log('LOG: AUTO-SCALER-SCALE-UP-1 - Initiating scale up operations');

    // Increase database connection pool
    const connectionPool = getConnectionPool(this.env);
    // connectionPool.increasePoolSize(); // Would implement if available

    // Store scaling event for monitoring
    await this.storeScalingEvent('scale_up', decision);

    // Alert external systems
    await this.sendScalingAlert('scale_up', decision);
  }

  /**
   * Scale down operations
   */
  private async scaleDown(decision: ScalingDecision): Promise<void> {
    console.log('LOG: AUTO-SCALER-SCALE-DOWN-1 - Initiating scale down operations');

    // Reduce resource allocation
    const connectionPool = getConnectionPool(this.env);
    await connectionPool.cleanupIdleConnections();

    // Store scaling event
    await this.storeScalingEvent('scale_down', decision);
  }

  /**
   * Enable throttling
   */
  private async enableThrottling(decision: ScalingDecision): Promise<void> {
    console.log('LOG: AUTO-SCALER-THROTTLE-1 - Enabling request throttling');

    // Implement rate limiting or request queuing
    // This would integrate with the rate limiter to reduce allowed requests

    await this.storeScalingEvent('throttle', decision);
    await this.sendScalingAlert('throttle', decision);
  }

  /**
   * Store scaling event for audit
   */
  private async storeScalingEvent(action: string, decision: ScalingDecision): Promise<void> {
    try {
      const event = { _action,
        decision,
        timestamp: new Date().toISOString()
      };

      await this.env.TRENDS_CACHE.put(
        `scaling_event_${Date.now()}`,
        JSON.stringify(event),
        { expirationTtl: 86400 } // 24 hours
      );

    } catch (error: unknown) {
      console.error('LOG: AUTO-SCALER-STORE-ERROR-1 - Failed to store scaling event:', error);
    }
  }

  /**
   * Send scaling alert
   */
  private async sendScalingAlert(action: string, decision: ScalingDecision): Promise<void> {
    try {
      console.log(`🔄 AUTO-SCALING ALERT: ${action.toUpperCase()} - ${decision.reason}`, {
        urgency: decision.urgency,
        confidence: decision.confidence,
        metrics: decision.metrics
      });

      // In production: send to monitoring systems, Slack, etc.

    } catch (error: unknown) {
      console.error('LOG: AUTO-SCALER-ALERT-ERROR-1 - Failed to send scaling alert:', error);
    }
  }

  /**
   * Start scaling evaluation timer
   */
  private startScalingEvaluation(): void {
    setInterval(async () => {
      try {
        await this.evaluateScaling();
      } catch (error: unknown) {
        console.error('LOG: AUTO-SCALER-EVAL-ERROR-1 - Periodic scaling evaluation failed:', error);
      }
    }, this.config.monitoring.evaluationInterval);
  }

  /**
   * Utility methods
   */
  private escalateUrgency(current: ScalingDecision['urgency'], new_urgency: ScalingDecision['urgency']): ScalingDecision['urgency'] {
    const urgencyLevels = { low: 0, medium: 1, high: 2, critical: 3 };
    return urgencyLevels[new_urgency] > urgencyLevels[current] ? new_urgency : current;
  }

  private calculateGrowthRate(metrics: ScalingMetrics[]): number {
    if (metrics.length < 2) return 0;

    const latest = metrics[metrics.length - 1];
    const previous = metrics[0];

    return (latest.requestsPerSecond - previous.requestsPerSecond) / metrics.length;
  }

  private getDefaultMetrics(): ScalingMetrics {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      requestsPerSecond: 0,
      responseTime: 0,
      errorRate: 0,
      queueDepth: 0,
      connectionPoolUsage: 0,
      cacheHitRate: 0
    };
  }

  private addToHistory(decision: ScalingDecision): void {
    this.scalingHistory.push(decision);
    if (this.scalingHistory.length > this.MAX_HISTORY) {
      this.scalingHistory = this.scalingHistory.slice(-this.MAX_HISTORY);
    }
  }
}

/**
 * Resource monitoring for auto-scaling
 */
class ResourceMonitor {
  private env: CloudflareEnv;

  constructor(env: CloudflareEnv) {
    this.env = env;
  }

  async getResourceMetrics(): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    networkUsage: number;
    storageUsage: number;
  }> {
    // Cloudflare Workers don't expose these metrics directly
    // This is a placeholder for integration with external monitoring
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      networkUsage: 0,
      storageUsage: 0
    };
  }
}

/**
 * Load balancing utilities
 */
export class LoadBalancer {
  private strategy: LoadBalancingStrategy;
  private healthyEndpoints: string[] = [];
  private endpointWeights: Map<string, number> = new Map();

  constructor(strategy: LoadBalancingStrategy) {
    this.strategy = strategy;
  }

  /**
   * Select best endpoint based on strategy
   */
  selectEndpoint(endpoints: string[]): string {
    const healthy = endpoints.filter(ep => this.isEndpointHealthy(ep));

    if (healthy.length === 0) {
      throw new Error('No healthy endpoints available');
    }

    switch (this.strategy.type) {
      case 'round_robin':
        return this.roundRobinSelection(healthy);
      case 'least_connections':
        return this.leastConnectionsSelection(healthy);
      case 'weighted':
        return this.weightedSelection(healthy);
      case 'adaptive':
        return this.adaptiveSelection(healthy);
      default:
        return healthy[0];
    }
  }

  private isEndpointHealthy(endpoint: string): boolean {
    return this.healthyEndpoints.includes(endpoint);
  }

  private roundRobinSelection(endpoints: string[]): string {
    // Simple round-robin implementation
    const index = Date.now() % endpoints.length;
    return endpoints[index];
  }

  private leastConnectionsSelection(endpoints: string[]): string {
    // Would track connection counts per endpoint
    return endpoints[0]; // Placeholder
  }

  private weightedSelection(endpoints: string[]): string {
    // Select based on weights
    const weights = this.strategy.weights || {};
    const weighted = endpoints.filter(ep => weights[ep] && weights[ep] > 0);
    return weighted[0] || endpoints[0];
  }

  private adaptiveSelection(endpoints: string[]): string {
    // Select based on performance metrics
    return endpoints[0]; // Placeholder
  }
}

/**
 * Global auto-scaler instance
 */
let globalAutoScaler: AutoScaler | null = null;

/**
 * Get or create global auto-scaler
 */
export function getAutoScaler(env: CloudflareEnv, config?: Partial<ScalingConfig>): AutoScaler {
  if (!globalAutoScaler) {
    globalAutoScaler = new AutoScaler(env, config);
  }
  return globalAutoScaler;
}