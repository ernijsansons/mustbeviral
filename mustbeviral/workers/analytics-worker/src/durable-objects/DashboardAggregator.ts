// Dashboard Aggregator Durable Object
// Handles real-time dashboard data aggregation and caching

interface DashboardMetrics {
  totalEvents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  topEvents: Array<{ event: string; count: number }>;
  realtimeActivity: Array<{ timestamp: number; count: number }>;
  userGrowth: Array<{ date: string; newUsers: number; totalUsers: number }>;
  performance: {
    avgResponseTime: number;
    avgLoadTime: number;
    errorRate: number;
  };
}

interface DashboardConfig {
  refreshInterval: number;
  timeRange: string;
  metrics: string[];
  filters?: Record<string, any>;
}

export class DashboardAggregator {
  private state: DurableObjectState;
  private env: any;
  private cache: Map<string, any> = new Map();
  private lastUpdate: number = 0;
  private config: DashboardConfig = {
    refreshInterval: 60000, // 1 minute
    timeRange: '24h',
    metrics: ['events', 'users', 'performance']
  };

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;

    // Schedule periodic updates
    this.scheduleUpdates();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/dashboard':
        return this.handleDashboard(request);
      case '/config':
        return this.handleConfig(request);
      case '/refresh':
        return this.handleRefresh(request);
      case '/realtime':
        return this.handleRealtime(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleDashboard(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const timeRange = url.searchParams.get('timeRange') || this.config.timeRange;
      const forceRefresh = url.searchParams.get('refresh') === 'true';

      let dashboardData = this.cache.get(`dashboard:${timeRange}`);

      // Check if data needs refresh
      const now = Date.now();
      const needsRefresh = forceRefresh ||
        !dashboardData ||
        (now - this.lastUpdate) > this.config.refreshInterval;

      if (needsRefresh) {
        dashboardData = await this.generateDashboardData(timeRange);
        this.cache.set(`dashboard:${timeRange}`, dashboardData);
        this.lastUpdate = now;
      }

      return new Response(JSON.stringify({
        data: dashboardData,
        lastUpdated: this.lastUpdate,
        cached: !needsRefresh
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error handling dashboard request:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  private async handleConfig(request: Request): Promise<Response> {
    if (request.method === 'GET') {
      return new Response(JSON.stringify(this.config), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST') {
      try {
        const newConfig = await request.json() as Partial<DashboardConfig>;
        this.config = { ...this.config, ...newConfig };

        // Clear cache when config changes
        this.cache.clear();

        return new Response(JSON.stringify(this.config), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (error) {
        return new Response('Invalid config', { status: 400 });
      }
    }

    return new Response('Method not allowed', { status: 405 });
  }

  private async handleRefresh(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json() as { timeRange?: string };
      const timeRange = body.timeRange || this.config.timeRange;

      const dashboardData = await this.generateDashboardData(timeRange);
      this.cache.set(`dashboard:${timeRange}`, dashboardData);
      this.lastUpdate = Date.now();

      return new Response(JSON.stringify({
        success: true,
        data: dashboardData,
        refreshedAt: this.lastUpdate
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  private async handleRealtime(request: Request): Promise<Response> {
    try {
      const realtimeData = await this.getRealtimeMetrics();

      return new Response(JSON.stringify(realtimeData), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error getting realtime data:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  private async generateDashboardData(timeRange: string): Promise<DashboardMetrics> {
    const timeFilter = this.getTimeFilter(timeRange);

    // Get basic metrics
    const basicMetrics = await this.getBasicMetrics(timeFilter);

    // Get top events
    const topEvents = await this.getTopEvents(timeFilter);

    // Get realtime activity
    const realtimeActivity = await this.getRealtimeActivity(timeFilter);

    // Get user growth
    const userGrowth = await this.getUserGrowth(timeFilter);

    // Get performance metrics
    const performance = await this.getPerformanceMetrics(timeFilter);

    return {
      totalEvents: basicMetrics.totalEvents,
      uniqueUsers: basicMetrics.uniqueUsers,
      uniqueSessions: basicMetrics.uniqueSessions,
      topEvents,
      realtimeActivity,
      userGrowth,
      performance
    };
  }

  private async getBasicMetrics(timeFilter: string): Promise<{
    totalEvents: number;
    uniqueUsers: number;
    uniqueSessions: number;
  }> {
    const result = await this.env.ANALYTICS_DB.prepare(`
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM analytics_events
      WHERE created_at >= ?
    `).bind(timeFilter).first();

    return {
      totalEvents: result?.total_events || 0,
      uniqueUsers: result?.unique_users || 0,
      uniqueSessions: result?.unique_sessions || 0
    };
  }

  private async getTopEvents(timeFilter: string): Promise<Array<{ event: string; count: number }>> {
    const result = await this.env.ANALYTICS_DB.prepare(`
      SELECT
        event,
        COUNT(*) as count
      FROM analytics_events
      WHERE created_at >= ?
      GROUP BY event
      ORDER BY count DESC
      LIMIT 10
    `).bind(timeFilter).all();

    return result.results || [];
  }

  private async getRealtimeActivity(timeFilter: string): Promise<Array<{ timestamp: number; count: number }>> {
    const result = await this.env.ANALYTICS_DB.prepare(`
      SELECT
        STRFTIME('%s', DATE_TRUNC('minute', created_at)) * 1000 as timestamp,
        COUNT(*) as count
      FROM analytics_events
      WHERE created_at >= ?
      GROUP BY DATE_TRUNC('minute', created_at)
      ORDER BY timestamp DESC
      LIMIT 60
    `).bind(timeFilter).all();

    return result.results || [];
  }

  private async getUserGrowth(timeFilter: string): Promise<Array<{ date: string; newUsers: number; totalUsers: number }>> {
    const result = await this.env.ANALYTICS_DB.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(DISTINCT user_id) as new_users
      FROM analytics_events
      WHERE created_at >= ? AND user_id IS NOT NULL
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `).bind(timeFilter).all();

    // Calculate cumulative total users
    let totalUsers = 0;
    const growthData = (result.results || []).reverse().map((row: any) => {
      totalUsers += row.new_users;
      return {
        date: row.date,
        newUsers: row.new_users,
        totalUsers
      };
    });

    return growthData.reverse();
  }

  private async getPerformanceMetrics(timeFilter: string): Promise<{
    avgResponseTime: number;
    avgLoadTime: number;
    errorRate: number;
  }> {
    const result = await this.env.ANALYTICS_DB.prepare(`
      SELECT
        AVG(CAST(properties->>'response_time' AS REAL)) as avg_response_time,
        AVG(CAST(properties->>'load_time' AS REAL)) as avg_load_time,
        COUNT(CASE WHEN CAST(properties->>'status' AS INTEGER) >= 400 THEN 1 END) * 100.0 / COUNT(*) as error_rate
      FROM analytics_events
      WHERE event IN ('page_view', 'api_request') AND created_at >= ?
    `).bind(timeFilter).first();

    return {
      avgResponseTime: result?.avg_response_time || 0,
      avgLoadTime: result?.avg_load_time || 0,
      errorRate: result?.error_rate || 0
    };
  }

  private async getRealtimeMetrics(): Promise<any> {
    const metrics: Record<string, number> = {};
    const keys = await this.env.METRICS_CACHE.list({ prefix: 'metrics:' });

    for (const key of keys.keys) {
      const value = await this.env.METRICS_CACHE.get(key.name);
      if (value) {
        const metricName = key.name.replace('metrics:', '');
        metrics[metricName] = parseInt(value);
      }
    }

    return {
      timestamp: Date.now(),
      metrics,
      totalEvents: Object.values(metrics).reduce((sum, val) => sum + val, 0)
    };
  }

  private getTimeFilter(timeRange: string): string {
    const now = new Date();
    let filterDate: Date;

    switch (timeRange) {
      case '1h':
        filterDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        filterDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        filterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        filterDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return filterDate.toISOString();
  }

  private scheduleUpdates(): Promise<void> {
    // Update dashboard data every minute
    return new Promise((resolve) => {
      setInterval(async () => {
        try {
          const dashboardData = await this.generateDashboardData(this.config.timeRange);
          this.cache.set(`dashboard:${this.config.timeRange}`, dashboardData);
          this.lastUpdate = Date.now();
        } catch (error) {
          console.error('Error in scheduled update:', error);
        }
      }, this.config.refreshInterval);
      resolve();
    });
  }
}