/**
 * AI Cost Optimization Engine
 * Intelligent model selection and fallback chain for cost efficiency
 * Fortune 50-grade AI cost management
 */

export interface ModelConfig {
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'local';
  costPerToken: number;
  maxTokens: number;
  latency: number; // average response time in ms
  qualityScore: number; // 0-1 quality rating
  capabilities: ModelCapability[];
  enabled: boolean;
}

export interface ModelCapability {
  type: 'text-generation' | 'code-generation' | 'analysis' | 'summarization' | 'translation' | 'classification';
  performance: number; // 0-1 performance rating for this capability
}

export interface RequestContext {
  taskType: string;
  complexity: 'low' | 'medium' | 'high';
  maxCost: number;
  maxLatency: number;
  qualityThreshold: number;
  userId?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface CostMetrics {
  totalCost: number;
  requestCount: number;
  averageCost: number;
  costByModel: Record<string, number>;
  costByTask: Record<string, number>;
  savings: number; // amount saved through optimization
  efficiency: number; // cost efficiency score 0-1
}

export interface OptimizationResult {
  selectedModel: ModelConfig;
  estimatedCost: number;
  estimatedLatency: number;
  confidence: number;
  fallbackChain: ModelConfig[];
  reasoning: string;
}

/**
 * AI Cost Optimizer with intelligent model selection
 */
export class AICostOptimizer {
  private models: Map<string, ModelConfig> = new Map();
  private requestHistory: Array<{
    timestamp: number;
    model: string;
    taskType: string;
    cost: number;
    latency: number;
    success: boolean;
    quality: number;
  }> = [];
  private costMetrics: CostMetrics;
  private readonly MAX_HISTORY = 10000;
  private requestQueue: Map<string, Array<{
    request: any;
    resolve: Function;
    reject: Function;
    timestamp: number;
  }>> = new Map();
  private batchTimer?: NodeJS.Timeout;
  private readonly BATCH_DELAY = 50; // ms
  private readonly MAX_BATCH_SIZE = 10;

  constructor() {
    this.costMetrics = {
      totalCost: 0,
      requestCount: 0,
      averageCost: 0,
      costByModel: {},
      costByTask: {},
      savings: 0,
      efficiency: 0,
    };

    this.initializeModels();
  }

  /**
   * Find optimal model for request
   */
  async optimizeRequest(context: RequestContext): Promise<OptimizationResult> {
    const candidates = this.getCandidateModels(context);
    
    if (candidates.length === 0) {
      throw new Error('No suitable models available for request');
    }

    // Score each candidate with historical performance data
    const scoredCandidates = candidates.map(model => ({
      model,
      score: this.calculateScore(model, context),
      estimatedCost: this.estimateCost(model, context),
      estimatedLatency: this.estimateLatency(model, context),
      historicalPerformance: this.getHistoricalPerformance(model.name, context.taskType),
    }));

    // Sort by composite score including historical performance
    scoredCandidates.sort((a, b) => {
      const scoreA = a.score * 0.7 + a.historicalPerformance * 0.3;
      const scoreB = b.score * 0.7 + b.historicalPerformance * 0.3;
      return scoreB - scoreA;
    });

    const selected = scoredCandidates[0];
    const fallbackChain = scoredCandidates.slice(1, 4).map(c => c.model);

    return {
      selectedModel: selected.model,
      estimatedCost: selected.estimatedCost,
      estimatedLatency: selected.estimatedLatency,
      confidence: selected.score,
      fallbackChain,
      reasoning: this.generateReasoning(selected, context),
    };
  }

  /**
   * Batch similar requests for cost optimization
   */
  async batchRequest<T>(
    taskType: string,
    request: any,
    processFn: (requests: any[]) => Promise<T[]>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const batchKey = this.generateBatchKey(taskType, request);
      
      if (!this.requestQueue.has(batchKey)) {
        this.requestQueue.set(batchKey, []);
      }

      const queue = this.requestQueue.get(batchKey)!;
      queue.push({
        request,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Process immediately if batch is full
      if (queue.length >= this.MAX_BATCH_SIZE) {
        this.processBatch(batchKey, processFn);
        return;
      }

      // Schedule batch processing
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processAllBatches(processFn);
        }, this.BATCH_DELAY);
      }
    });
  }

  /**
   * Process a specific batch
   */
  private async processBatch<T>(
    batchKey: string,
    processFn: (requests: any[]) => Promise<T[]>
  ): Promise<void> {
    const queue = this.requestQueue.get(batchKey);
    if (!queue || queue.length === 0) return;

    // Remove from queue
    this.requestQueue.delete(batchKey);

    try {
      const requests = queue.map(item => item.request);
      const results = await processFn(requests);

      // Resolve all promises with their respective results
      queue.forEach((item, index) => {
        if (results[index] !== undefined) {
          item.resolve(results[index]);
        } else {
          item.reject(new Error('No result for request'));
        }
      });

    } catch (error) {
      // Reject all promises in the batch
      queue.forEach(item => item.reject(error));
    }
  }

  /**
   * Process all pending batches
   */
  private async processAllBatches<T>(
    processFn: (requests: any[]) => Promise<T[]>
  ): Promise<void> {
    this.batchTimer = undefined;

    const batchKeys = Array.from(this.requestQueue.keys());
    
    for (const batchKey of batchKeys) {
      await this.processBatch(batchKey, processFn);
    }
  }

  /**
   * Generate batch key for grouping similar requests
   */
  private generateBatchKey(taskType: string, request: any): string {
    // Group by task type and similar complexity
    const complexity = this.estimateRequestComplexity(request);
    return `${taskType}:${complexity}`;
  }

  /**
   * Estimate request complexity for batching
   */
  private estimateRequestComplexity(request: any): string {
    if (typeof request === 'string') {
      const length = request.length;
      if (length < 100) return 'simple';
      if (length < 500) return 'medium';
      return 'complex';
    }
    
    return 'medium';
  }

  /**
   * Get historical performance for model and task type
   */
  private getHistoricalPerformance(modelName: string, taskType: string): number {
    const relevantHistory = this.requestHistory.filter(
      record => record.model === modelName && record.taskType === taskType
    );

    if (relevantHistory.length === 0) return 0.5; // Neutral score for unknown combinations

    const recentHistory = relevantHistory.slice(-50); // Last 50 requests
    const successRate = recentHistory.filter(r => r.success).length / recentHistory.length;
    const avgQuality = recentHistory.reduce((sum, r) => sum + r.quality, 0) / recentHistory.length;
    const avgCost = recentHistory.reduce((sum, r) => sum + r.cost, 0) / recentHistory.length;

    // Composite performance score (higher is better)
    const performanceScore = (successRate * 0.4) + (avgQuality * 0.4) + ((1 - avgCost) * 0.2);
    return Math.max(0, Math.min(1, performanceScore));
  }

  /**
   * Record request completion for learning
   */
  recordRequest(
    modelName: string,
    taskType: string,
    actualCost: number,
    actualLatency: number,
    success: boolean,
    quality: number
  ): void {
    const record = {
      timestamp: Date.now(),
      model: modelName,
      taskType,
      cost: actualCost,
      latency: actualLatency,
      success,
      quality,
    };

    this.requestHistory.push(record);

    // Maintain history size
    if (this.requestHistory.length > this.MAX_HISTORY) {
      this.requestHistory.shift();
    }

    // Update metrics
    this.updateMetrics(record);

    // Update model performance
    this.updateModelPerformance(modelName, record);
  }

  /**
   * Get cost optimization recommendations
   */
  getOptimizationRecommendations(): Array<{
    type: 'model-switch' | 'request-batching' | 'caching' | 'task-simplification';
    description: string;
    estimatedSavings: number;
    effort: 'low' | 'medium' | 'high';
  }> {
    const recommendations = [];

    // Analyze model usage patterns
    const modelUsage = this.analyzeModelUsage();
    
    // Expensive model overuse
    const expensiveOveruse = Object.entries(modelUsage)
      .filter(([, usage]) => usage.averageCost > 0.01 && usage.requestCount > 100)
      .sort((a, b) => b[1].totalCost - a[1].totalCost);

    if (expensiveOveruse.length > 0) {
      const [modelName, usage] = expensiveOveruse[0];
      recommendations.push({
        type: 'model-switch',
        description: `Consider switching from ${modelName} to cheaper alternatives for routine tasks`,
        estimatedSavings: usage.totalCost * 0.3,
        effort: 'low',
      });
    }

    // Request batching opportunities
    const batchingOpportunities = this.identifyBatchingOpportunities();
    if (batchingOpportunities > 0) {
      recommendations.push({
        type: 'request-batching',
        description: `Batch ${batchingOpportunities} similar requests to reduce overhead`,
        estimatedSavings: batchingOpportunities * 0.002,
        effort: 'medium',
      });
    }

    // Caching opportunities
    const cachingOpportunities = this.identifyCachingOpportunities();
    if (cachingOpportunities.count > 0) {
      recommendations.push({
        type: 'caching',
        description: `Cache ${cachingOpportunities.count} repeated requests`,
        estimatedSavings: cachingOpportunities.potentialSavings,
        effort: 'low',
      });
    }

    return recommendations;
  }

  /**
   * Get current cost metrics
   */
  getMetrics(): CostMetrics {
    return { ...this.costMetrics };
  }

  /**
   * Get model performance analytics
   */
  getModelAnalytics(): Array<{
    name: string;
    requestCount: number;
    totalCost: number;
    averageCost: number;
    averageLatency: number;
    successRate: number;
    averageQuality: number;
    efficiency: number;
  }> {
    const modelStats = new Map<string, {
      count: number;
      totalCost: number;
      totalLatency: number;
      successes: number;
      totalQuality: number;
    }>();

    // Aggregate stats from history
    for (const record of this.requestHistory) {
      const stats = modelStats.get(record.model) || {
        count: 0,
        totalCost: 0,
        totalLatency: 0,
        successes: 0,
        totalQuality: 0,
      };

      stats.count++;
      stats.totalCost += record.cost;
      stats.totalLatency += record.latency;
      if (record.success) stats.successes++;
      stats.totalQuality += record.quality;

      modelStats.set(record.model, stats);
    }

    // Convert to analytics format
    return Array.from(modelStats.entries()).map(([name, stats]) => {
      const averageCost = stats.totalCost / stats.count;
      const averageLatency = stats.totalLatency / stats.count;
      const successRate = stats.successes / stats.count;
      const averageQuality = stats.totalQuality / stats.count;
      const efficiency = averageQuality / averageCost; // quality per dollar

      return {
        name,
        requestCount: stats.count,
        totalCost: stats.totalCost,
        averageCost,
        averageLatency,
        successRate,
        averageQuality,
        efficiency,
      };
    }).sort((a, b) => b.efficiency - a.efficiency);
  }

  /**
   * Initialize available models
   */
  private initializeModels(): void {
    const models: ModelConfig[] = [
      {
        name: 'gpt-4o',
        provider: 'openai',
        costPerToken: 0.00003,
        maxTokens: 128000,
        latency: 2000,
        qualityScore: 0.95,
        capabilities: [
          { type: 'text-generation', performance: 0.95 },
          { type: 'code-generation', performance: 0.90 },
          { type: 'analysis', performance: 0.92 },
          { type: 'summarization', performance: 0.88 },
        ],
        enabled: true,
      },
      {
        name: 'gpt-4o-mini',
        provider: 'openai',
        costPerToken: 0.00000015,
        maxTokens: 128000,
        latency: 1500,
        qualityScore: 0.85,
        capabilities: [
          { type: 'text-generation', performance: 0.85 },
          { type: 'analysis', performance: 0.80 },
          { type: 'summarization', performance: 0.88 },
          { type: 'classification', performance: 0.85 },
        ],
        enabled: true,
      },
      {
        name: 'claude-3-5-sonnet',
        provider: 'anthropic',
        costPerToken: 0.000015,
        maxTokens: 200000,
        latency: 2500,
        qualityScore: 0.93,
        capabilities: [
          { type: 'text-generation', performance: 0.93 },
          { type: 'code-generation', performance: 0.95 },
          { type: 'analysis', performance: 0.94 },
          { type: 'summarization', performance: 0.90 },
        ],
        enabled: true,
      },
      {
        name: 'claude-3-haiku',
        provider: 'anthropic',
        costPerToken: 0.00000025,
        maxTokens: 200000,
        latency: 1000,
        qualityScore: 0.78,
        capabilities: [
          { type: 'text-generation', performance: 0.78 },
          { type: 'summarization', performance: 0.82 },
          { type: 'classification', performance: 0.80 },
          { type: 'translation', performance: 0.75 },
        ],
        enabled: true,
      },
      {
        name: 'gemini-1.5-pro',
        provider: 'google',
        costPerToken: 0.00000125,
        maxTokens: 2000000,
        latency: 3000,
        qualityScore: 0.88,
        capabilities: [
          { type: 'text-generation', performance: 0.88 },
          { type: 'analysis', performance: 0.85 },
          { type: 'summarization', performance: 0.87 },
          { type: 'translation', performance: 0.90 },
        ],
        enabled: true,
      },
      {
        name: 'gemini-1.5-flash',
        provider: 'google',
        costPerToken: 0.000000075,
        maxTokens: 1000000,
        latency: 800,
        qualityScore: 0.75,
        capabilities: [
          { type: 'text-generation', performance: 0.75 },
          { type: 'classification', performance: 0.80 },
          { type: 'summarization', performance: 0.78 },
        ],
        enabled: true,
      },
    ];

    for (const model of models) {
      this.models.set(model.name, model);
    }
  }

  /**
   * Get candidate models for request
   */
  private getCandidateModels(context: RequestContext): ModelConfig[] {
    return Array.from(this.models.values())
      .filter(model => {
        if (!model.enabled) return false;
        
        // Check capability match
        const hasCapability = model.capabilities.some(
          cap => cap.type === context.taskType || 
                 (context.taskType === 'content-generation' && cap.type === 'text-generation')
        );
        if (!hasCapability) return false;

        // Check cost constraint
        const estimatedCost = this.estimateCost(model, context);
        if (estimatedCost > context.maxCost) return false;

        // Check latency constraint
        if (model.latency > context.maxLatency) return false;

        // Check quality threshold
        if (model.qualityScore < context.qualityThreshold) return false;

        return true;
      });
  }

  /**
   * Calculate model score for request
   */
  private calculateScore(model: ModelConfig, context: RequestContext): number {
    let score = 0;

    // Quality score (40%)
    score += model.qualityScore * 0.4;

    // Cost efficiency (30%)
    const costEfficiency = 1 - (model.costPerToken / 0.00003); // normalized to GPT-4 cost
    score += Math.max(0, costEfficiency) * 0.3;

    // Latency score (20%)
    const latencyScore = 1 - (model.latency / 5000); // normalized to 5s max
    score += Math.max(0, latencyScore) * 0.2;

    // Capability match (10%)
    const capability = model.capabilities.find(
      cap => cap.type === context.taskType ||
             (context.taskType === 'content-generation' && cap.type === 'text-generation')
    );
    if (capability) {
      score += capability.performance * 0.1;
    }

    // Priority adjustments
    if (context.priority === 'critical') {
      score += model.qualityScore * 0.2; // Boost quality for critical requests
    } else if (context.priority === 'low') {
      score += costEfficiency * 0.2; // Boost cost efficiency for low priority
    }

    return Math.min(1, score);
  }

  /**
   * Estimate cost for model and request
   */
  private estimateCost(model: ModelConfig, context: RequestContext): number {
    // Estimate token count based on complexity
    const baseTokens = {
      low: 500,
      medium: 2000,
      high: 8000,
    }[context.complexity];

    const estimatedTokens = baseTokens * 1.5; // Input + output tokens
    return estimatedTokens * model.costPerToken;
  }

  /**
   * Estimate latency for model and request
   */
  private estimateLatency(model: ModelConfig, context: RequestContext): number {
    const complexityMultiplier = {
      low: 1,
      medium: 1.5,
      high: 2.5,
    }[context.complexity];

    return model.latency * complexityMultiplier;
  }

  /**
   * Generate reasoning for model selection
   */
  private generateReasoning(selected: any, context: RequestContext): string {
    const reasons = [];

    if (selected.model.costPerToken < 0.000001) {
      reasons.push('selected for cost efficiency');
    }
    if (selected.model.latency < 1500) {
      reasons.push('selected for fast response');
    }
    if (selected.model.qualityScore > 0.9) {
      reasons.push('selected for high quality output');
    }
    if (context.priority === 'critical') {
      reasons.push('prioritized quality for critical request');
    }

    return `${selected.model.name} ${reasons.join(', ')}`;
  }

  /**
   * Update cost metrics
   */
  private updateMetrics(record: any): void {
    this.costMetrics.totalCost += record.cost;
    this.costMetrics.requestCount++;
    this.costMetrics.averageCost = this.costMetrics.totalCost / this.costMetrics.requestCount;

    // Update by model
    this.costMetrics.costByModel[record.model] = 
      (this.costMetrics.costByModel[record.model] || 0) + record.cost;

    // Update by task
    this.costMetrics.costByTask[record.taskType] = 
      (this.costMetrics.costByTask[record.taskType] || 0) + record.cost;

    // Calculate efficiency
    const recentRequests = this.requestHistory.slice(-1000);
    const avgQuality = recentRequests.reduce((sum, r) => sum + r.quality, 0) / recentRequests.length;
    const avgCost = recentRequests.reduce((sum, r) => sum + r.cost, 0) / recentRequests.length;
    this.costMetrics.efficiency = avgQuality / (avgCost * 1000); // Quality per $0.001
  }

  /**
   * Update model performance based on actual results
   */
  private updateModelPerformance(modelName: string, record: any): void {
    const model = this.models.get(modelName);
    if (!model) return;

    // Simple learning: adjust quality score based on actual performance
    const actualQualityDiff = record.quality - model.qualityScore;
    model.qualityScore += actualQualityDiff * 0.01; // Small adjustment
    model.qualityScore = Math.max(0, Math.min(1, model.qualityScore));
  }

  /**
   * Analyze model usage patterns
   */
  private analyzeModelUsage(): Record<string, {
    requestCount: number;
    totalCost: number;
    averageCost: number;
  }> {
    const usage: Record<string, {
      requestCount: number;
      totalCost: number;
      averageCost: number;
    }> = {};

    for (const record of this.requestHistory) {
      if (!usage[record.model]) {
        usage[record.model] = {
          requestCount: 0,
          totalCost: 0,
          averageCost: 0,
        };
      }

      usage[record.model].requestCount++;
      usage[record.model].totalCost += record.cost;
      usage[record.model].averageCost = 
        usage[record.model].totalCost / usage[record.model].requestCount;
    }

    return usage;
  }

  /**
   * Identify batching opportunities
   */
  private identifyBatchingOpportunities(): number {
    const recentRequests = this.requestHistory.slice(-1000);
    const taskGroups = new Map<string, number>();

    for (const record of recentRequests) {
      const key = `${record.taskType}_${record.model}`;
      taskGroups.set(key, (taskGroups.get(key) || 0) + 1);
    }

    return Array.from(taskGroups.values())
      .filter(count => count >= 5)
      .reduce((sum, count) => sum + Math.floor(count / 5), 0);
  }

  /**
   * Identify caching opportunities
   */
  private identifyCachingOpportunities(): {
    count: number;
    potentialSavings: number;
  } {
    const recentRequests = this.requestHistory.slice(-1000);
    const requestPatterns = new Map<string, {
      count: number;
      totalCost: number;
    }>();

    for (const record of recentRequests) {
      // Simple pattern: same task type + similar timing
      const pattern = `${record.taskType}_${Math.floor(record.timestamp / 3600000)}`; // Hour bucket
      const existing = requestPatterns.get(pattern) || { count: 0, totalCost: 0 };
      existing.count++;
      existing.totalCost += record.cost;
      requestPatterns.set(pattern, existing);
    }

    let cachingOpportunities = 0;
    let potentialSavings = 0;

    for (const [, pattern] of requestPatterns) {
      if (pattern.count >= 3) {
        cachingOpportunities += pattern.count - 1; // First request still needed
        potentialSavings += pattern.totalCost * 0.8; // 80% savings from caching
      }
    }

    return { count: cachingOpportunities, potentialSavings };
  }
}

// Singleton instance
export const aiCostOptimizer = new AICostOptimizer();

export default AICostOptimizer;