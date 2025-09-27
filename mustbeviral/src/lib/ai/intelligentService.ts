/**
 * Intelligent AI Service
 * Unified AI interface with cost optimization and intelligent routing
 * Fortune 50-grade AI infrastructure
 */

import { AICostOptimizer, aiCostOptimizer, type RequestContext} from './costOptimizer';
import { ModelRouter, type ModelRequestOptions, type RoutingResult} from './modelRouter';
import { InputSanitizer} from '../security/inputSanitization';
import { logger} from '../monitoring/logger';

export interface AIRequest {
  prompt: string;
  taskType: 'content-generation' | 'analysis' | 'summarization' | 'classification' | 'translation' | 'code-generation';
  complexity: 'low' | 'medium' | 'high';
  maxCost?: number;
  maxLatency?: number;
  qualityThreshold?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  userId?: string;
  cacheKey?: string;
  options?: ModelRequestOptions;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  cost: number;
  latency: number;
  quality: number;
  cached: boolean;
  optimization: {
    originalEstimate: number;
    actualCost: number;
    savings: number;
    efficiency: number;
  };
  routing: {
    selectedModel: string;
    attemptedModels: string[];
    fallbacksUsed: number;
  };
}

export interface CacheEntry {
  content: string;
  model: string;
  cost: number;
  quality: number;
  timestamp: number;
  hitCount: number;
}

export interface AIMetrics {
  totalRequests: number;
  totalCost: number;
  averageCost: number;
  averageLatency: number;
  cacheHitRate: number;
  costSavings: number;
  modelDistribution: Record<string, number>;
  taskTypeDistribution: Record<string, number>;
  qualityScore: number;
  efficiency: number;
}

/**
 * Intelligent AI Service with cost optimization and caching
 */
export class IntelligentAIService {
  private costOptimizer: AICostOptimizer;
  private modelRouter: ModelRouter;
  private responseCache: Map<string, CacheEntry> = new Map();
  private requestHistory: Array<{
    timestamp: number;
    request: AIRequest;
    response: AIResponse;
  }> = [];
  private readonly CACHETTL = 3600000; // 1 hour
  private readonly MAXCACHESIZE = 1000;
  private readonly MAXHISTORY = 10000;

  constructor() {
    this.costOptimizer = aiCostOptimizer;
    this.modelRouter = new ModelRouter(this.costOptimizer);
  }

  /**
   * Execute AI request with optimization and caching
   */
  async executeRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    // Sanitize input to prevent XSS and other security issues
    const sanitizedRequest: AIRequest = {
      ...request,
      prompt: InputSanitizer.sanitizeText(request.prompt, 10000),
      userId: request.userId ? InputSanitizer.sanitizeText(request.userId, 100) : undefined,
    };
    
    // Detect potential security threats
    const threats = InputSanitizer.detectThreats(request.prompt);
    if (threats.length > 0) {
      logger.security('Security threats detected in AI request', { threats });
    }
    
    // Check cache first
    const cacheKey = sanitizedRequest.cacheKey ?? this.generateCacheKey(sanitizedRequest);
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      cached.hitCount++;
      
      const response: AIResponse = {
        content: cached.content,
        model: cached.model,
        provider: 'cache',
        cost: 0,
        latency: Date.now() - startTime,
        quality: cached.quality,
        cached: true,
        optimization: {
          originalEstimate: cached.cost,
          actualCost: 0,
          savings: cached.cost,
          efficiency: 1.0,
        },
        routing: {
          selectedModel: cached.model,
          attemptedModels: [cached.model],
          fallbacksUsed: 0,
        },
      };
      
      this.recordRequest(request, response);
      return response;
    }
    
    // Build request context using sanitized request
    const context: RequestContext = {
      taskType: sanitizedRequest.taskType,
      complexity: sanitizedRequest.complexity,
      maxCost: sanitizedRequest.maxCost ?? 0.10, // Default $0.10 max
      maxLatency: sanitizedRequest.maxLatency ?? 30000, // Default 30s max
      qualityThreshold: sanitizedRequest.qualityThreshold ?? 0.7,
      userId: sanitizedRequest.userId,
      priority: sanitizedRequest.priority ?? 'normal',
    };
    
    // Get cost optimization
    const optimization = await this.costOptimizer.optimizeRequest(context);
    
    // Route request through model router using sanitized prompt
    const routingResult = await this.modelRouter.routeRequest(
      sanitizedRequest.prompt,
      context,
      sanitizedRequest.options
    );
    
    // Calculate optimization metrics
    const savings = optimization.estimatedCost - routingResult.response.cost;
    const efficiency = routingResult.response.quality ?? 0.8 / Math.max(routingResult.response.cost, 0.001);
    
    // Build response with sanitized content
    const response: AIResponse = {
      content: InputSanitizer.sanitizeText(routingResult.response.content, 50000),
      model: routingResult.response.model,
      provider: routingResult.response.provider,
      cost: routingResult.response.cost,
      latency: routingResult.totalLatency,
      quality: routingResult.response.quality ?? 0.8,
      cached: false,
      optimization: {
        originalEstimate: optimization.estimatedCost,
        actualCost: routingResult.response.cost,
        savings: Math.max(0, savings),
        efficiency,
      },
      routing: {
        selectedModel: routingResult.selectedModel,
        attemptedModels: routingResult.attemptedModels,
        fallbacksUsed: routingResult.fallbacksUsed,
      },
    };
    
    // Cache successful responses
    if (routingResult.response.quality && routingResult.response.quality >= 0.7) {
      this.setCache(cacheKey, {
        content: response.content,
        model: response.model,
        cost: response.cost,
        quality: response.quality,
        timestamp: Date.now(),
        hitCount: 0,
      });
    }
    
    this.recordRequest(sanitizedRequest, response);
    return response;
  }

  /**
   * Batch execute multiple requests efficiently
   */
  async batchExecute(requests: AIRequest[]): Promise<AIResponse[]> {
    // Group by similarity for potential batching optimizations
    const groups = this.groupSimilarRequests(requests);
    const results: AIResponse[] = [];
    
    for (const group of groups) {
      // Execute group in parallel with limited concurrency
      const groupPromises = group.map(request => this.executeRequest(request));
      const groupResults = await Promise.all(groupPromises);
      results.push(...groupResults);
    }
    
    return results;
  }

  /**
   * Get comprehensive AI metrics
   */
  getMetrics(): AIMetrics {
    const costMetrics = this.costOptimizer.getMetrics();
    const recentRequests = this.requestHistory.slice(-1000);
    
    // Calculate cache hit rate
    const cachedRequests = recentRequests.filter(r => r.response.cached).length;
    const cacheHitRate = recentRequests.length > 0 ? cachedRequests / recentRequests.length : 0;
    
    // Calculate model distribution
    const modelDistribution: Record<string, number> = {};
    for (const record of recentRequests) {
      modelDistribution[record.response.model] = (modelDistribution[record.response.model]  ?? 0) + 1;
    }
    
    // Calculate task type distribution
    const taskTypeDistribution: Record<string, number> = {};
    for (const record of recentRequests) {
      taskTypeDistribution[record.request.taskType] = (taskTypeDistribution[record.request.taskType]  ?? 0) + 1;
    }
    
    // Calculate quality score
    const qualities = recentRequests.map(r => r.response.quality);
    const qualityScore = qualities.length > 0 
      ? qualities.reduce((sum, q) => sum + q, 0) / qualities.length 
      : 0;
    
    // Calculate average latency
    const latencies = recentRequests.map(r => r.response.latency);
    const averageLatency = latencies.length > 0
      ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
      : 0;
    
    // Calculate cost savings from optimization
    const totalSavings = recentRequests.reduce((sum, r) => sum + r.response.optimization.savings, 0);
    
    return {
      totalRequests: costMetrics.requestCount,
      totalCost: costMetrics.totalCost,
      averageCost: costMetrics.averageCost,
      averageLatency,
      cacheHitRate,
      costSavings: totalSavings,
      modelDistribution,
      taskTypeDistribution,
      qualityScore,
      efficiency: costMetrics.efficiency,
    };
  }

  /**
   * Get cost optimization recommendations
   */
  getOptimizationRecommendations(): Array<{
    type: string;
    description: string;
    estimatedSavings: number;
    effort: string;
  }> {
    return this.costOptimizer.getOptimizationRecommendations();
  }

  /**
   * Get model performance analytics
   */
  getModelAnalytics(): any[] {
    return this.costOptimizer.getModelAnalytics();
  }

  /**
   * Clear response cache
   */
  clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: number;
    totalHits: number;
  } {
    const now = Date.now();
    let oldestEntry = now;
    let totalHits = 0;
    
    for (const entry of this.responseCache.values()) {
      if (entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      totalHits += entry.hitCount;
    }
    
    const recentRequests = this.requestHistory.slice(-1000);
    const cachedRequests = recentRequests.filter(r => r.response.cached).length;
    const hitRate = recentRequests.length > 0 ? cachedRequests / recentRequests.length : 0;
    
    return {
      size: this.responseCache.size,
      hitRate,
      oldestEntry,
      totalHits,
    };
  }

  /**
   * Warm up cache with common requests
   */
  async warmUpCache(requests: Array<{
    prompt: string;
    taskType: AIRequest['taskType'];
    complexity: AIRequest['complexity'];
  }>): Promise<void> {
    const warmUpPromises = requests.map(async(req) => {
      try {
        await this.executeRequest({
          prompt: req.prompt,
          taskType: req.taskType,
          complexity: req.complexity,
          priority: 'low', // Low priority for warmup
        });
      } catch (error) {
        logger.error('Cache warmup failed for request', error as Error, { 
          component: 'ai-service', 
          action: 'cache-warmup',
          metadata: { request: req }
        });
      }
    });
    
    await Promise.all(warmUpPromises);
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: AIRequest): string {
    const key = {
      prompt: request.prompt,
      taskType: request.taskType,
      complexity: request.complexity,
      qualityThreshold: request.qualityThreshold ?? 0.7,
    };
    
    return this.hashObject(key);
  }

  /**
   * Get entry from cache
   */
  private getFromCache(key: string): CacheEntry | null {
    const entry = this.responseCache.get(key);
    
    if (!entry) {
    return null;
  }
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.CACHETTL) {
      this.responseCache.delete(key);
      return null;
    }
    
    return entry;
  }

  /**
   * Set entry in cache
   */
  private setCache(key: string, entry: CacheEntry): void {
    // Remove oldest entries if cache is full
    if (this.responseCache.size >= this.MAXCACHESIZE) {
      const oldestKey = this.findOldestCacheEntry();
      if (oldestKey) {
        this.responseCache.delete(oldestKey);
      }
    }
    
    this.responseCache.set(key, entry);
  }

  /**
   * Find oldest cache entry for eviction
   */
  private findOldestCacheEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.responseCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  /**
   * Record request for analytics
   */
  private recordRequest(request: AIRequest, response: AIResponse): void {
    this.requestHistory.push({
      timestamp: Date.now(),
      request,
      response,
    });
    
    // Maintain history size
    if (this.requestHistory.length > this.MAXHISTORY) {
      this.requestHistory.shift();
    }
  }

  /**
   * Group similar requests for batching
   */
  private groupSimilarRequests(requests: AIRequest[]): AIRequest[][] {
    const groups: Record<string, AIRequest[]> = {};
    
    for (const request of requests) {
      const groupKey = `${request.taskType}_${request.complexity}_${request.priority ?? 'normal'}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      
      groups[groupKey].push(request);
    }
    
    return Object.values(groups);
  }

  /**
   * Hash object for cache key generation
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
}

// Singleton instance
export const intelligentAI = new IntelligentAIService();

// Convenience functions
export async function generateContent(
  prompt: string,
  options?: Partial<AIRequest>
): Promise<string> {
  const response = await intelligentAI.executeRequest({
    prompt,
    taskType: 'content-generation',
    complexity: 'medium',
    ...options,
  });
  
  return response.content;
}

export async function analyzeContent(
  content: string,
  options?: Partial<AIRequest>
): Promise<string> {
  const response = await intelligentAI.executeRequest({
    prompt: `Analyze the following content: ${content}`,
    taskType: 'analysis',
    complexity: 'medium',
    ...options,
  });
  
  return response.content;
}

export async function summarizeContent(
  content: string,
  options?: Partial<AIRequest>
): Promise<string> {
  const response = await intelligentAI.executeRequest({
    prompt: `Summarize the following content: ${content}`,
    taskType: 'summarization',
    complexity: 'low',
    ...options,
  });
  
  return response.content;
}

export default IntelligentAIService;