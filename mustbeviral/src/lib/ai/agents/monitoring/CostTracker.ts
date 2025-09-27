/**
 * Cost Tracking and Monitoring System
 * Comprehensive cost analysis and optimization for AI platform agents
 * Tracks token usage, API costs, and efficiency metrics in real-time
 */

export interface CostMetrics {
  totalTokensUsed: number;
  totalAPICalls: number;
  totalCostUSD: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  costPerSuccessfulGeneration: number;
}

export interface AgentCostBreakdown {
  agentName: string;
  platform: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  tokensUsed: number;
  estimatedCost: number;
  averageQualityScore: number;
  costEfficiencyRatio: number; // Quality per dollar
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface CostAlert {
  id: string;
  type: 'budget_exceeded' | 'cost_spike' | 'efficiency_drop' | 'error_rate_high';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, unknown>;
  timestamp: Date;
  resolved: boolean;
}

export interface CostBudget {
  daily: number;
  weekly: number;
  monthly: number;
  perRequest: number;
  currency: 'USD';
}

export interface TokenPricing {
  model: string;
  costPerInputToken: number;
  costPerOutputToken: number;
  currency: 'USD';
}

export class CostTracker {
  private metrics: Map<string, CostMetrics> = new Map();
  private agentBreakdowns: Map<string, AgentCostBreakdown> = new Map();
  private alerts: CostAlert[] = [];
  private budgets: CostBudget;
  private pricing: Map<string, TokenPricing> = new Map();
  private startTime: Date = new Date();

  constructor(budgets: CostBudget) {
    this.budgets = budgets;
    this.initializePricing();
  }

  private initializePricing(): void {
    // Cloudflare AI Workers pricing (estimated)
    this.pricing.set('@cf/meta/llama-2-7b-chat-int8', {
      model: '@cf/meta/llama-2-7b-chat-int8',
      costPerInputToken: 0.0000005, // $0.0005 per 1K tokens
      costPerOutputToken: 0.000001, // $0.001 per 1K tokens
      currency: 'USD'
    });

    this.pricing.set('@cf/mistral/mistral-7b-instruct-v0.1', {
      model: '@cf/mistral/mistral-7b-instruct-v0.1',
      costPerInputToken: 0.0000007,
      costPerOutputToken: 0.0000012,
      currency: 'USD'
    });

    this.pricing.set('@cf/microsoft/phi-2', {
      model: '@cf/microsoft/phi-2',
      costPerInputToken: 0.0000003,
      costPerOutputToken: 0.0000008,
      currency: 'USD'
    });
  }

  /**
   * Track a content generation request
   */
  trackRequest(
    agentName: string,
    platform: string,
    inputTokens: number,
    outputTokens: number,
    model: string,
    responseTime: number,
    success: boolean,
    qualityScore?: number
  ): void {
    const cost = this.calculateRequestCost(inputTokens, outputTokens, model);

    // Update global metrics
    this.updateGlobalMetrics(inputTokens + outputTokens, cost, responseTime, success);

    // Update agent-specific breakdown
    this.updateAgentBreakdown(agentName, platform, inputTokens + outputTokens, cost, success, qualityScore);

    // Check for cost alerts
    this.checkCostAlerts(cost, responseTime, success);

    console.log(`[CostTracker] ${agentName} - Tokens: ${inputTokens + outputTokens}, Cost: $${cost.toFixed(4)}, Time: ${responseTime}ms`);
  }

  /**
   * Calculate cost for a specific request
   */
  calculateRequestCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = this.pricing.get(model);
    if (!pricing) {
      console.warn(`[CostTracker] No pricing found for model: ${model}`);
      return 0;
    }

    const inputCost = inputTokens * pricing.costPerInputToken;
    const outputCost = outputTokens * pricing.costPerOutputToken;
    return inputCost + outputCost;
  }

  /**
   * Get real-time cost metrics
   */
  getCurrentMetrics(): CostMetrics {
    const global = this.metrics.get('global');
    return global ?? {
      totalTokensUsed: 0,
      totalAPICalls: 0,
      totalCostUSD: 0,
      averageTokensPerRequest: 0,
      averageCostPerRequest: 0,
      averageResponseTime: 0,
      successRate: 100,
      errorRate: 0,
      costPerSuccessfulGeneration: 0
    };
  }

  /**
   * Get cost breakdown by agent
   */
  getAgentBreakdowns(): AgentCostBreakdown[] {
    return Array.from(this.agentBreakdowns.values());
  }

  /**
   * Get active cost alerts
   */
  getActiveAlerts(): CostAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get cost efficiency ranking
   */
  getCostEfficiencyRanking(): Array<{
    agent: string;
    platform: string;
    efficiencyScore: number;
    qualityPerDollar: number;
  }> {
    return Array.from(this.agentBreakdowns.values())
      .map(breakdown => ({
        agent: breakdown.agentName,
        platform: breakdown.platform,
        efficiencyScore: breakdown.costEfficiencyRatio,
        qualityPerDollar: breakdown.averageQualityScore / breakdown.estimatedCost
      }))
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  }

  /**
   * Get budget utilization
   */
  getBudgetUtilization(): {
    daily: { used: number; remaining: number; percentage: number };
    weekly: { used: number; remaining: number; percentage: number };
    monthly: { used: number; remaining: number; percentage: number };
  } {
    const totalCost = this.getCurrentMetrics().totalCostUSD;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysSinceStart = Math.max(1, (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60 * 24));

    // Simplified calculation - in production, track actual daily/weekly/monthly usage
    const dailyUsed = totalCost / daysSinceStart;
    const weeklyUsed = dailyUsed * 7;
    const monthlyUsed = dailyUsed * 30;

    return {
      daily: {
        used: dailyUsed,
        remaining: Math.max(0, this.budgets.daily - dailyUsed),
        percentage: (dailyUsed / this.budgets.daily) * 100
      },
      weekly: {
        used: weeklyUsed,
        remaining: Math.max(0, this.budgets.weekly - weeklyUsed),
        percentage: (weeklyUsed / this.budgets.weekly) * 100
      },
      monthly: {
        used: monthlyUsed,
        remaining: Math.max(0, this.budgets.monthly - monthlyUsed),
        percentage: (monthlyUsed / this.budgets.monthly) * 100
      }
    };
  }

  /**
   * Generate cost optimization recommendations
   */
  generateOptimizationRecommendations(): Array<{
    type: 'token_reduction' | 'model_optimization' | 'caching' | 'batching' | 'prompt_optimization';
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedSavings: number; // Percentage
    implementation: string;
  }> {
    const recommendations = [];
    const metrics = this.getCurrentMetrics();
    const agentBreakdowns = this.getAgentBreakdowns();

    // Token reduction recommendation
    if (metrics.averageTokensPerRequest > 3000) {
      recommendations.push({
        type: 'token_reduction',
        priority: 'high',
        description: 'High token usage detected. Implement dynamic token allocation.',
        expectedSavings: 35,
        implementation: 'Use TokenOptimizer for adaptive token limits based on content complexity'
      });
    }

    // Model optimization
    const inefficientAgents = agentBreakdowns.filter(agent => agent.costEfficiencyRatio < 50);
    if (inefficientAgents.length > 0) {
      recommendations.push({
        type: 'model_optimization',
        priority: 'high',
        description: `${inefficientAgents.length} agents have low cost efficiency. Consider model switching.`,
        expectedSavings: 25,
        implementation: 'Switch to more efficient models for simple content generation tasks'
      });
    }

    // Caching recommendation
    if (metrics.totalAPICalls > 100) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        description: 'High API call volume. Implement intelligent caching.',
        expectedSavings: 40,
        implementation: 'Deploy semantic similarity caching with 24-hour TTL'
      });
    }

    // Batching recommendation
    recommendations.push({
      type: 'batching',
      priority: 'medium',
      description: 'Optimize request batching for better throughput.',
      expectedSavings: 20,
      implementation: 'Implement request batching with optimal batch sizes per platform'
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Export cost data for analysis
   */
  exportCostData(): {
    summary: CostMetrics;
    agentBreakdowns: AgentCostBreakdown[];
    alerts: CostAlert[];
    budgetUtilization: ReturnType<CostTracker['getBudgetUtilization']>;
    recommendations: ReturnType<CostTracker['generateOptimizationRecommendations']>;
    exportTimestamp: Date;
  } {
    return {
      summary: this.getCurrentMetrics(),
      agentBreakdowns: this.getAgentBreakdowns(),
      alerts: this.getActiveAlerts(),
      budgetUtilization: this.getBudgetUtilization(),
      recommendations: this.generateOptimizationRecommendations(),
      exportTimestamp: new Date()
    };
  }

  private updateGlobalMetrics(tokens: number, cost: number, responseTime: number, success: boolean): void {
    const current = this.metrics.get('global')  ?? {
      totalTokensUsed: 0,
      totalAPICalls: 0,
      totalCostUSD: 0,
      averageTokensPerRequest: 0,
      averageCostPerRequest: 0,
      averageResponseTime: 0,
      successRate: 100,
      errorRate: 0,
      costPerSuccessfulGeneration: 0
    };

    const newTotalCalls = current.totalAPICalls + 1;
    const newTotalTokens = current.totalTokensUsed + tokens;
    const newTotalCost = current.totalCostUSD + cost;
    const newTotalTime = current.averageResponseTime * current.totalAPICalls + responseTime;

    const successfulCalls = success ?
      Math.round(current.successRate * current.totalAPICalls / 100) + 1 :
      Math.round(current.successRate * current.totalAPICalls / 100);

    this.metrics.set('global', {
      totalTokensUsed: newTotalTokens,
      totalAPICalls: newTotalCalls,
      totalCostUSD: newTotalCost,
      averageTokensPerRequest: newTotalTokens / newTotalCalls,
      averageCostPerRequest: newTotalCost / newTotalCalls,
      averageResponseTime: newTotalTime / newTotalCalls,
      successRate: (successfulCalls / newTotalCalls) * 100,
      errorRate: ((newTotalCalls - successfulCalls) / newTotalCalls) * 100,
      costPerSuccessfulGeneration: successfulCalls > 0 ? newTotalCost / successfulCalls : 0
    });
  }

  private updateAgentBreakdown(
    agentName: string,
    platform: string,
    tokens: number,
    cost: number,
    success: boolean,
    qualityScore: number = 75
  ): void {
    const key = `${agentName}-${platform}`;
    const current = this.agentBreakdowns.get(key)  ?? { agentName,
      platform,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      tokensUsed: 0,
      estimatedCost: 0,
      averageQualityScore: 0,
      costEfficiencyRatio: 0,
      timeRange: { start: new Date(), end: new Date() }
    };

    const newTotalRequests = current.totalRequests + 1;
    const newSuccessfulRequests = success ? current.successfulRequests + 1 : current.successfulRequests;
    const newFailedRequests = success ? current.failedRequests : current.failedRequests + 1;
    const newTokensUsed = current.tokensUsed + tokens;
    const newEstimatedCost = current.estimatedCost + cost;
    const newAverageQuality = (current.averageQualityScore * current.totalRequests + qualityScore) / newTotalRequests;
    const newCostEfficiency = newAverageQuality / (newEstimatedCost * 1000); // Quality per $0.001

    this.agentBreakdowns.set(key, {
      ...current,
      totalRequests: newTotalRequests,
      successfulRequests: newSuccessfulRequests,
      failedRequests: newFailedRequests,
      tokensUsed: newTokensUsed,
      estimatedCost: newEstimatedCost,
      averageQualityScore: newAverageQuality,
      costEfficiencyRatio: newCostEfficiency,
      timeRange: { start: current.timeRange.start, end: new Date() }
    });
  }

  private checkCostAlerts(cost: number, responseTime: number, success: boolean): void {
    // Budget exceeded alert
    const budgetUtilization = this.getBudgetUtilization();
    if (budgetUtilization.daily.percentage > 90) {
      this.addAlert({
        type: 'budget_exceeded',
        severity: 'critical',
        message: 'Daily budget 90% exceeded',
        details: { utilization: budgetUtilization.daily }
      });
    }

    // Cost spike alert
    const metrics = this.getCurrentMetrics();
    if (cost > metrics.averageCostPerRequest * 3) {
      this.addAlert({
        type: 'cost_spike',
        severity: 'high',
        message: 'Request cost 3x above average',
        details: { requestCost: cost, averageCost: metrics.averageCostPerRequest }
      });
    }

    // Performance degradation
    if (responseTime > 5000) {
      this.addAlert({
        type: 'efficiency_drop',
        severity: 'medium',
        message: 'Response time exceeds 5 seconds',
        details: { responseTime }
      });
    }

    // High error rate
    if (metrics.errorRate > 10) {
      this.addAlert({
        type: 'error_rate_high',
        severity: 'high',
        message: 'Error rate exceeds 10%',
        details: { errorRate: metrics.errorRate }
      });
    }
  }

  private addAlert(alertData: Omit<CostAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: CostAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };

    this.alerts.push(alert);

    // Keep only the last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * Reset metrics (for testing or new accounting periods)
   */
  resetMetrics(): void {
    this.metrics.clear();
    this.agentBreakdowns.clear();
    this.alerts = [];
    this.startTime = new Date();
  }
}