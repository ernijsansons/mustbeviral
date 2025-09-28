import { AIProviderType } from './types';

export interface CostEntry {
  timestamp: Date;
  provider: AIProviderType;
  model: string;
  cost: number;
  tokensUsed: number;
  requestId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface CostSummary {
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  averageCostPerRequest: number;
  averageCostPerToken: number;
  lastRequest: Date;
}

export interface CostBudget {
  daily?: number;
  weekly?: number;
  monthly?: number;
}

export interface CostAlert {
  type: 'daily' | 'weekly' | 'monthly' | 'threshold';
  threshold: number;
  current: number;
  percentage: number;
  provider?: AIProviderType;
  triggered: Date;
}

export class CostTracker {
  private costEntries: CostEntry[] = [];
  private budgets: Map<AIProviderType, CostBudget> = new Map();
  private maxEntries = 10000; // Keep last 10k entries in memory
  private alertThresholds = {
    warning: 0.8, // 80%
    critical: 0.95 // 95%
  };

  constructor() {
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  async trackUsage(
    provider: AIProviderType,
    cost: number,
    tokensUsed: number,
    model = 'unknown',
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry: CostEntry = {
      timestamp: new Date(),
      provider,
      model,
      cost,
      tokensUsed,
      requestId: this.generateRequestId(),
      userId,
      metadata
    };

    this.costEntries.push(entry);

    // Maintain max entries limit
    if (this.costEntries.length > this.maxEntries) {
      this.costEntries.shift();
    }

    // Check for budget alerts
    await this.checkBudgetAlerts(provider, cost);
  }

  async getCostSummary(): Promise<Record<AIProviderType, CostSummary>> {
    const summary: Record<string, CostSummary> = {};

    // Group by provider
    const providerGroups = this.groupByProvider();

    for (const [provider, entries] of providerGroups) {
      const totalCost = entries.reduce((sum, entry) => sum + entry.cost, 0);
      const totalTokens = entries.reduce((sum, entry) => sum + entry.tokensUsed, 0);
      const requestCount = entries.length;

      summary[provider] = {
        totalCost,
        totalTokens,
        requestCount,
        averageCostPerRequest: requestCount > 0 ? totalCost / requestCount : 0,
        averageCostPerToken: totalTokens > 0 ? totalCost / totalTokens : 0,
        lastRequest: entries.length > 0 ? entries[entries.length - 1].timestamp : new Date(0)
      };
    }

    return summary as Record<AIProviderType, CostSummary>;
  }

  async getCostsByTimeRange(
    startDate: Date,
    endDate: Date,
    provider?: AIProviderType
  ): Promise<CostEntry[]> {
    return this.costEntries.filter(entry => {
      const inTimeRange = entry.timestamp >= startDate && entry.timestamp <= endDate;
      const matchesProvider = !provider || entry.provider === provider;
      return inTimeRange && matchesProvider;
    });
  }

  async getDailyCosts(
    days = 30,
    provider?: AIProviderType
  ): Promise<Array<{ date: string; cost: number; tokens: number; requests: number }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const entries = await this.getCostsByTimeRange(startDate, endDate, provider);

    // Group by day
    const dailyCosts: Record<string, { cost: number; tokens: number; requests: number }> = {};

    for (const entry of entries) {
      const dateKey = entry.timestamp.toISOString().split('T')[0];

      if (!dailyCosts[dateKey]) {
        dailyCosts[dateKey] = { cost: 0, tokens: 0, requests: 0 };
      }

      dailyCosts[dateKey].cost += entry.cost;
      dailyCosts[dateKey].tokens += entry.tokensUsed;
      dailyCosts[dateKey].requests += 1;
    }

    // Convert to array and sort by date
    return Object.entries(dailyCosts)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getTopModels(
    limit = 10,
    provider?: AIProviderType
  ): Promise<Array<{ model: string; cost: number; tokens: number; requests: number }>> {
    const entries = provider
      ? this.costEntries.filter(entry => entry.provider === provider)
      : this.costEntries;

    const modelStats: Record<string, { cost: number; tokens: number; requests: number }> = {};

    for (const entry of entries) {
      const key = `${entry.provider}:${entry.model}`;

      if (!modelStats[key]) {
        modelStats[key] = { cost: 0, tokens: 0, requests: 0 };
      }

      modelStats[key].cost += entry.cost;
      modelStats[key].tokens += entry.tokensUsed;
      modelStats[key].requests += 1;
    }

    return Object.entries(modelStats)
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  async getTopUsers(
    limit = 10,
    provider?: AIProviderType
  ): Promise<Array<{ userId: string; cost: number; tokens: number; requests: number }>> {
    const entries = provider
      ? this.costEntries.filter(entry => entry.provider === provider)
      : this.costEntries;

    const userStats: Record<string, { cost: number; tokens: number; requests: number }> = {};

    for (const entry of entries) {
      const userId = entry.userId || 'anonymous';

      if (!userStats[userId]) {
        userStats[userId] = { cost: 0, tokens: 0, requests: 0 };
      }

      userStats[userId].cost += entry.cost;
      userStats[userId].tokens += entry.tokensUsed;
      userStats[userId].requests += 1;
    }

    return Object.entries(userStats)
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  setBudget(provider: AIProviderType, budget: CostBudget): void {
    this.budgets.set(provider, budget);
  }

  getBudget(provider: AIProviderType): CostBudget | undefined {
    return this.budgets.get(provider);
  }

  async getBudgetStatus(provider: AIProviderType): Promise<{
    daily?: { spent: number; budget: number; percentage: number };
    weekly?: { spent: number; budget: number; percentage: number };
    monthly?: { spent: number; budget: number; percentage: number };
  }> {
    const budget = this.budgets.get(provider);
    if (!budget) {
      return {};
    }

    const now = new Date();
    const status: any = {};

    // Daily budget
    if (budget.daily) {
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);

      const dailyEntries = await this.getCostsByTimeRange(dayStart, now, provider);
      const dailySpent = dailyEntries.reduce((sum, entry) => sum + entry.cost, 0);

      status.daily = {
        spent: dailySpent,
        budget: budget.daily,
        percentage: (dailySpent / budget.daily) * 100
      };
    }

    // Weekly budget
    if (budget.weekly) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weeklyEntries = await this.getCostsByTimeRange(weekStart, now, provider);
      const weeklySpent = weeklyEntries.reduce((sum, entry) => sum + entry.cost, 0);

      status.weekly = {
        spent: weeklySpent,
        budget: budget.weekly,
        percentage: (weeklySpent / budget.weekly) * 100
      };
    }

    // Monthly budget
    if (budget.monthly) {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthlyEntries = await this.getCostsByTimeRange(monthStart, now, provider);
      const monthlySpent = monthlyEntries.reduce((sum, entry) => sum + entry.cost, 0);

      status.monthly = {
        spent: monthlySpent,
        budget: budget.monthly,
        percentage: (monthlySpent / budget.monthly) * 100
      };
    }

    return status;
  }

  async getCostProjection(
    provider: AIProviderType,
    days = 30
  ): Promise<{ daily: number; weekly: number; monthly: number }> {
    const recentEntries = await this.getCostsByTimeRange(
      new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      new Date(),
      provider
    );

    const totalCost = recentEntries.reduce((sum, entry) => sum + entry.cost, 0);
    const dailyAverage = totalCost / days;

    return {
      daily: dailyAverage,
      weekly: dailyAverage * 7,
      monthly: dailyAverage * 30
    };
  }

  private groupByProvider(): Map<AIProviderType, CostEntry[]> {
    const groups = new Map<AIProviderType, CostEntry[]>();

    for (const entry of this.costEntries) {
      if (!groups.has(entry.provider)) {
        groups.set(entry.provider, []);
      }
      groups.get(entry.provider)!.push(entry);
    }

    return groups;
  }

  private async checkBudgetAlerts(provider: AIProviderType, newCost: number): Promise<CostAlert[]> {
    const alerts: CostAlert[] = [];
    const budgetStatus = await this.getBudgetStatus(provider);

    for (const [period, status] of Object.entries(budgetStatus)) {
      if (status.percentage >= this.alertThresholds.critical * 100) {
        alerts.push({
          type: period as 'daily' | 'weekly' | 'monthly',
          threshold: status.budget * this.alertThresholds.critical,
          current: status.spent,
          percentage: status.percentage,
          provider,
          triggered: new Date()
        });
      } else if (status.percentage >= this.alertThresholds.warning * 100) {
        alerts.push({
          type: period as 'daily' | 'weekly' | 'monthly',
          threshold: status.budget * this.alertThresholds.warning,
          current: status.spent,
          percentage: status.percentage,
          provider,
          triggered: new Date()
        });
      }
    }

    // Emit alerts (in a real implementation, you'd want proper event handling)
    for (const alert of alerts) {
      console.warn(`Budget alert for ${alert.provider}: ${alert.type} usage at ${alert.percentage.toFixed(1)}%`);
    }

    return alerts;
  }

  private generateRequestId(): string {
    return `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPeriodicCleanup(): void {
    // Clean up old entries every hour
    setInterval(() => {
      this.cleanupOldEntries();
    }, 60 * 60 * 1000);
  }

  private cleanupOldEntries(): void {
    // Keep entries from last 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    const initialLength = this.costEntries.length;
    this.costEntries = this.costEntries.filter(entry => entry.timestamp > cutoffDate);

    const removed = initialLength - this.costEntries.length;
    if (removed > 0) {
      console.log(`Cleaned up ${removed} old cost entries`);
    }
  }

  // Export cost data for analysis
  exportCostData(startDate?: Date, endDate?: Date): CostEntry[] {
    if (!startDate || !endDate) {
      return [...this.costEntries];
    }

    return this.costEntries.filter(entry =>
      entry.timestamp >= startDate && entry.timestamp <= endDate
    );
  }

  // Clear all cost data
  clearCostData(): void {
    this.costEntries = [];
  }

  // Get real-time cost metrics
  getRealTimeMetrics(): {
    totalCostToday: number;
    requestsToday: number;
    averageCostPerRequest: number;
    topProviderToday: AIProviderType | null;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEntries = this.costEntries.filter(entry => entry.timestamp >= today);

    const totalCostToday = todayEntries.reduce((sum, entry) => sum + entry.cost, 0);
    const requestsToday = todayEntries.length;

    // Find top provider by cost
    const providerCosts: Record<string, number> = {};
    for (const entry of todayEntries) {
      providerCosts[entry.provider] = (providerCosts[entry.provider] || 0) + entry.cost;
    }

    const topProviderToday = Object.keys(providerCosts).length > 0
      ? Object.entries(providerCosts).reduce((a, b) => a[1] > b[1] ? a : b)[0] as AIProviderType
      : null;

    return {
      totalCostToday,
      requestsToday,
      averageCostPerRequest: requestsToday > 0 ? totalCostToday / requestsToday : 0,
      topProviderToday
    };
  }
}