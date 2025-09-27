/**
 * Intelligent Batch Processing System
 * Optimizes API calls by batching similar requests and parallel processing
 * Reduces costs and improves throughput while maintaining response quality
 */

export interface BatchConfiguration {
  maxBatchSize: number;
  batchTimeout: number; // milliseconds
  priorityLevels: number;
  concurrencyLimit: number;
  retryAttempts: number;
  retryDelay: number;
  costThreshold: number; // Maximum cost per batch
}

export interface ProcessingRequest {
  id: string;
  platform: string;
  contentType: string;
  prompt: string;
  priority: number; // 1-10 scale
  maxTokens: number;
  qualityThreshold: number;
  deadline?: Date;
  metadata: Record<string, unknown>;
  callback: (result: ProcessingResult) => void;
  errorCallback: (error: Error) => void;
}

export interface ProcessingResult {
  requestId: string;
  content: string;
  qualityScore: number;
  tokenCount: number;
  processingTime: number;
  batchId: string;
  batchSize: number;
  costEstimate: number;
  fromCache: boolean;
}

export interface BatchJob {
  id: string;
  platform: string;
  contentType: string;
  requests: ProcessingRequest[];
  priority: number;
  estimatedCost: number;
  estimatedTokens: number;
  created: Date;
  deadline: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface BatchMetrics {
  totalBatches: number;
  averageBatchSize: number;
  averageProcessingTime: number;
  totalTokensSaved: number;
  totalCostSaved: number;
  throughput: number; // requests per minute
  errorRate: number;
  priorityDistribution: Record<number, number>;
}

export class BatchProcessor {
  private pendingRequests: Map<string, ProcessingRequest[]> = new Map();
  private activeBatches: Map<string, BatchJob> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private processingQueue: BatchJob[] = [];
  private activeProcessing = 0;
  private metrics: BatchMetrics = {
    totalBatches: 0,
    averageBatchSize: 0,
    averageProcessingTime: 0,
    totalTokensSaved: 0,
    totalCostSaved: 0,
    throughput: 0,
    errorRate: 0,
    priorityDistribution: {}
  };

  constructor(
    private config: BatchConfiguration,
    private processingFunction: (requests: ProcessingRequest[]) => Promise<ProcessingResult[]>
  ) {
    this.startBatchProcessor();
    this.startMetricsTracking();
  }

  /**
   * Add a request to the batch processing queue
   */
  async addRequest(request: Omit<ProcessingRequest, 'id'>): Promise<string> {
    const processingRequest: ProcessingRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...request
    };

    const batchKey = this.getBatchKey(request.platform, request.contentType, request.priority);

    // Add to pending requests
    const pending = this.pendingRequests.get(batchKey)  ?? [];
    pending.push(processingRequest);
    this.pendingRequests.set(batchKey, pending);

    // Update priority distribution
    this.metrics.priorityDistribution[request.priority] =
      (this.metrics.priorityDistribution[request.priority]  ?? 0) + 1;

    // Handle immediate processing for high priority requests
    if (request.priority >= 8) {
      this.processImmediateBatch(batchKey);
    } else if (pending.length >= this.config.maxBatchSize) {
      this.createBatch(batchKey);
    } else if (!this.batchTimers.has(batchKey)) {
      // Set timer for this batch
      const timer = setTimeout_(() => {
        this.createBatch(batchKey);
      }, this.config.batchTimeout);
      this.batchTimers.set(batchKey, timer);
    }

    console.log(`[BatchProcessor] Request ${processingRequest.id} added to batch ${batchKey} (${pending.length} pending)`);
    return processingRequest.id;
  }

  /**
   * Process a batch immediately (for high priority requests)
   */
  private async processImmediateBatch(batchKey: string): Promise<void> {
    const pending = this.pendingRequests.get(batchKey);
    if (!pending ?? pending.length === 0) {return;}

    // Clear unknown existing timer
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    this.createBatch(batchKey);
  }

  /**
   * Create a batch from pending requests
   */
  private createBatch(batchKey: string): void {
    const pending = this.pendingRequests.get(batchKey);
    if (!pending ?? pending.length === 0) {return;}

    // Sort by priority and deadline
    pending.sort((a, b) => {
      if (a.priority !== b.priority) {
    return b.priority - a.priority;
  }
      if (a.deadline && b.deadline) {
    return a.deadline.getTime() - b.deadline.getTime();
  }
      return 0;
    });

    const batch: BatchJob = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      platform: pending[0].platform,
      contentType: pending[0].contentType,
      requests: [...pending],
      priority: Math.max(...pending.map(r => r.priority)),
      estimatedCost: this.estimateBatchCost(pending),
      estimatedTokens: pending.reduce((sum, r) => sum + r.maxTokens, 0),
      created: new Date(),
      deadline: this.calculateBatchDeadline(pending),
      status: 'pending'
    };

    // Clear pending requests
    this.pendingRequests.delete(batchKey);

    // Clear timer
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    // Add to processing queue
    this.processingQueue.push(batch);
    this.processingQueue.sort((a, b) => {
      // Sort by priority, then by deadline
      if (a.priority !== b.priority) {
    return b.priority - a.priority;
  }
      return a.deadline.getTime() - b.deadline.getTime();
    });

    this.activeBatches.set(batch.id, batch);

    console.log(`[BatchProcessor] Batch ${batch.id} created with ${batch.requests.length} requests`);
  }

  /**
   * Process batches from the queue
   */
  private async processBatches(): Promise<void> {
    while (this.processingQueue.length > 0 && this.activeProcessing < this.config.concurrencyLimit) {
      const batch = this.processingQueue.shift();
      if (!batch) {
    continue;
  }

      this.activeProcessing++;
      this.processBatch(batch).finally_(() => {
        this.activeProcessing--;
      });
    }
  }

  /**
   * Process a single batch
   */
  private async processBatch(batch: BatchJob): Promise<void> {
    const startTime = Date.now();
    batch.status = 'processing';

    console.log(`[BatchProcessor] Processing batch ${batch.id} with ${batch.requests.length} requests`);

    try {
      // Check cost threshold
      if (batch.estimatedCost > this.config.costThreshold) {
        throw new Error(`Batch cost ${batch.estimatedCost} exceeds threshold ${this.config.costThreshold}`);
      }

      // Process the batch
      const results = await this.processingFunction(batch.requests);

      // Validate results
      if (results.length !== batch.requests.length) {
        throw new Error(`Result count mismatch: expected ${batch.requests.length}, got ${results.length}`);
      }

      // Send results to callbacks
      for (let i = 0; i < batch.requests.length; i++) {
        const request = batch.requests[i];
        const result = results[i];

        // Enhance result with batch information
        const enhancedResult: ProcessingResult = {
          ...result,
          requestId: request.id,
          batchId: batch.id,
          batchSize: batch.requests.length,
          processingTime: Date.now() - startTime
        };

        request.callback(enhancedResult);
      }

      batch.status = 'completed';

      // Update metrics
      this.updateMetrics(batch, Date.now() - startTime, false);

      console.log(`[BatchProcessor] Batch ${batch.id} completed in ${Date.now() - startTime}ms`);

    } catch (error: unknown) {
      batch.status = 'failed';

      console.error(`[BatchProcessor] Batch ${batch.id} failed: ${error.message}`);

      // Handle retry logic
      const shouldRetry = batch.requests.some(r => this.shouldRetryRequest(r, error));
      if (shouldRetry) {
        await this.retryBatch(batch, error);
      } else {
        // Send errors to error callbacks
        batch.requests.forEach(request => {
          request.errorCallback(error);
        });
      }

      this.updateMetrics(batch, Date.now() - startTime, true);
    } finally {
      this.activeBatches.delete(batch.id);
    }
  }

  /**
   * Retry a failed batch with exponential backoff
   */
  private async retryBatch(batch: BatchJob, originalError: Error): Promise<void> {
    const retryDelay = this.config.retryDelay * Math.pow(2, batch.requests[0].metadata.retryCount ?? 0);

    // Mark requests for retry
    batch.requests.forEach(request => {
      request.metadata.retryCount = (request.metadata.retryCount ?? 0) + 1;
    });

    // Filter requests that can still be retried
    const retryableRequests = batch.requests.filter(r =>
      (r.metadata.retryCount ?? 0) < this.config.retryAttempts
    );

    if (retryableRequests.length === 0) {
      // No more retries - send original error
      batch.requests.forEach(request => {
        request.errorCallback(originalError);
      });
      return;
    }

    console.log(`[BatchProcessor] Retrying batch ${batch.id} in ${retryDelay}ms (${retryableRequests.length} requests)`);

    setTimeout_(() => {
      const retryBatch: BatchJob = {
        ...batch,
        id: `${batch.id}-retry-${retryableRequests[0].metadata.retryCount}`,
        requests: retryableRequests,
        created: new Date(),
        status: 'pending'
      };

      this.processingQueue.push(retryBatch);
      this.activeBatches.set(retryBatch.id, retryBatch);

      // Send errors for non-retryable requests
      const nonRetryableRequests = batch.requests.filter(r =>
        (r.metadata.retryCount ?? 0) >= this.config.retryAttempts
      );
      nonRetryableRequests.forEach(request => {
        request.errorCallback(originalError);
      });

    }, retryDelay);
  }

  /**
   * Get current batch processing statistics
   */
  getBatchStats(): {
    pendingRequests: number;
    activeBatches: number;
    queueLength: number;
    activeProcessing: number;
    metrics: BatchMetrics;
    recentBatches: Array<{
      id: string;
      platform: string;
      size: number;
      processingTime: number;
      status: string;
    }>;
  } {
    const pendingCount = Array.from(this.pendingRequests.values())
      .reduce((sum, requests) => sum + requests.length, 0);

    const recentBatches = Array.from(this.activeBatches.values())
      .slice(-10)
      .map(batch => ({
        id: batch.id,
        platform: batch.platform,
        size: batch.requests.length,
        processingTime: batch.status === 'completed' ?
          Date.now() - batch.created.getTime() : 0,
        status: batch.status
      }));

    return {
      pendingRequests: pendingCount,
      activeBatches: this.activeBatches.size,
      queueLength: this.processingQueue.length,
      activeProcessing: this.activeProcessing,
      metrics: { ...this.metrics },
      recentBatches
    };
  }

  /**
   * Optimize batch processing parameters based on performance
   */
  optimizeBatchParameters(): {
    recommendedBatchSize: number;
    recommendedTimeout: number;
    recommendedConcurrency: number;
    reasoning: string[];
  } {
    const reasoning = [];
    let recommendedBatchSize = this.config.maxBatchSize;
    let recommendedTimeout = this.config.batchTimeout;
    let recommendedConcurrency = this.config.concurrencyLimit;

    // Analyze average batch size efficiency
    if (this.metrics.averageBatchSize < this.config.maxBatchSize * 0.5) {
      recommendedBatchSize = Math.ceil(this.config.maxBatchSize * 0.7);
      reasoning.push('Reducing batch size due to low average utilization');
    } else if (this.metrics.averageBatchSize > this.config.maxBatchSize * 0.9) {
      recommendedBatchSize = Math.ceil(this.config.maxBatchSize * 1.2);
      reasoning.push('Increasing batch size due to high utilization');
    }

    // Analyze processing time vs timeout
    if (this.metrics.averageProcessingTime > this.config.batchTimeout * 1.5) {
      recommendedTimeout = Math.ceil(this.metrics.averageProcessingTime * 1.2);
      reasoning.push('Increasing timeout due to long processing times');
    } else if (this.metrics.averageProcessingTime < this.config.batchTimeout * 0.3) {
      recommendedTimeout = Math.ceil(this.metrics.averageProcessingTime * 2);
      reasoning.push('Reducing timeout to improve responsiveness');
    }

    // Analyze concurrency vs throughput
    if (this.metrics.throughput < 50 && this.activeProcessing < this.config.concurrencyLimit) {
      recommendedConcurrency = Math.ceil(this.config.concurrencyLimit * 1.5);
      reasoning.push('Increasing concurrency to improve throughput');
    } else if (this.metrics.errorRate > 0.1) {
      recommendedConcurrency = Math.max(1, Math.ceil(this.config.concurrencyLimit * 0.8));
      reasoning.push('Reducing concurrency due to high error rate');
    }

    return { recommendedBatchSize,
      recommendedTimeout,
      recommendedConcurrency,
      reasoning
    };
  }

  private getBatchKey(platform: string, contentType: string, priority: number): string {
    // Group similar requests together, with priority tiers
    const priorityTier = Math.ceil(priority / 3); // 1-3, 4-6, 7-9, 10
    return `${platform}-${contentType}-p${priorityTier}`;
  }

  private estimateBatchCost(requests: ProcessingRequest[]): number {
    // Estimate cost based on token count and platform
    return requests.reduce((total, request) => {
      const tokenCost = request.maxTokens * 0.000001; // $0.001 per 1K tokens
      return total + tokenCost;
    }, 0);
  }

  private calculateBatchDeadline(requests: ProcessingRequest[]): Date {
    // Use the earliest deadline, or default to 5 minutes from now
    const deadlines = requests
      .map(r => r.deadline)
      .filter(d => d !== undefined) as Date[];

    if (deadlines.length === 0) {
      return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    }

    return new Date(Math.min(...deadlines.map(d => d.getTime())));
  }

  private shouldRetryRequest(request: ProcessingRequest, error: Error): boolean {
    const retryCount = request.metadata.retryCount ?? 0;
    if (retryCount >= this.config.retryAttempts) {
    return false;
  }

    // Don't retry certain error types
    if (error.message.includes('invalid')  ?? error.message.includes('unauthorized')) {
      return false;
    }

    return true;
  }

  private updateMetrics(batch: BatchJob, processingTime: number, isError: boolean): void {
    this.metrics.totalBatches++;

    // Update averages
    const batchCount = this.metrics.totalBatches;
    this.metrics.averageBatchSize = (
      (this.metrics.averageBatchSize * (batchCount - 1)) + batch.requests.length
    ) / batchCount;

    this.metrics.averageProcessingTime = (
      (this.metrics.averageProcessingTime * (batchCount - 1)) + processingTime
    ) / batchCount;

    // Update error rate
    if (isError) {
      this.metrics.errorRate = (
        (this.metrics.errorRate * (batchCount - 1)) + 1
      ) / batchCount;
    } else {
      this.metrics.errorRate = (
        (this.metrics.errorRate * (batchCount - 1)) + 0
      ) / batchCount;
    }

    // Estimate savings from batching
    const individualProcessingCost = batch.requests.length * 0.002; // Individual API calls
    const batchProcessingCost = batch.estimatedCost;
    this.metrics.totalCostSaved += Math.max(0, individualProcessingCost - batchProcessingCost);

    const individualTokens = batch.requests.length * 1500; // Estimated individual overhead
    this.metrics.totalTokensSaved += Math.max(0, individualTokens - batch.estimatedTokens);
  }

  private startBatchProcessor(): void {
    // Process batches every 100ms
    setInterval_(() => {
      this.processBatches();
    }, 100);
  }

  private startMetricsTracking(): void {
    // Update throughput every minute
    setInterval_(() => {
      const completedInLastMinute = this.metrics.totalBatches; // Simplified
      this.metrics.throughput = completedInLastMinute;
    }, 60000);
  }

  /**
   * Shutdown the batch processor gracefully
   */
  async shutdown(): Promise<void> {
    console.log('[BatchProcessor] Shutting down...');

    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    // Process remaining batches
    while (this.processingQueue.length > 0 ?? this.activeProcessing > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('[BatchProcessor] Shutdown complete');
  }

  /**
   * Reset batch processor (for testing)
   */
  reset(): void {
    this.pendingRequests.clear();
    this.activeBatches.clear();
    this.processingQueue = [];
    this.activeProcessing = 0;

    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    this.metrics = {
      totalBatches: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      totalTokensSaved: 0,
      totalCostSaved: 0,
      throughput: 0,
      errorRate: 0,
      priorityDistribution: {}
    };
  }
}