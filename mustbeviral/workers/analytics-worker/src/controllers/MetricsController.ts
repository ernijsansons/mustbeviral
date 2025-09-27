// Metrics Controller - Handles metrics collection and aggregation

interface MetricData {
  metric: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface TimeSeriesData {
  timestamp: number;
  value: number;
}

export class MetricsController {
  constructor(private env: any) {}

  // Get metrics for a specific type and time range
  async getMetrics(metricType?: string, timeRange: string = '24h'): Promise<any> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      if (metricType) {
        return await this.getSpecificMetric(metricType, timeFilter);
      } else {
        return await this.getAllMetrics(timeFilter);
      }
    } catch (error) {
      console.error('Error getting metrics:', error);
      throw error;
    }
  }

  // Get specific metric data
  private async getSpecificMetric(metricType: string, timeFilter: string): Promise<any> {
    const result = await this.env.ANALYTICS_DB.prepare(`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM analytics_events 
      WHERE event = ? AND created_at >= ?
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour
    `).bind(metricType, timeFilter).all();

    return {
      metric: metricType,
      timeRange: timeFilter,
      data: result.results,
      summary: await this.getMetricSummary(metricType, timeFilter)
    };
  }

  // Get all metrics summary
  private async getAllMetrics(timeFilter: string): Promise<any> {
    const result = await this.env.ANALYTICS_DB.prepare(`
      SELECT 
        event as metric,
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions,
        MIN(created_at) as first_occurrence,
        MAX(created_at) as last_occurrence
      FROM analytics_events 
      WHERE created_at >= ?
      GROUP BY event
      ORDER BY total_events DESC
    `).bind(timeFilter).all();

    return {
      timeRange: timeFilter,
      metrics: result.results,
      totalEvents: result.results.reduce((sum: number, row: any) => sum + row.total_events, 0),
      totalUsers: new Set(result.results.map((row: any) => row.unique_users)).size
    };
  }

  // Get metric summary
  private async getMetricSummary(metricType: string, timeFilter: string): Promise<any> {
    const result = await this.env.ANALYTICS_DB.prepare(`
      SELECT 
        COUNT(*) as total_count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions,
        AVG(CAST(properties->>'duration' AS REAL)) as avg_duration,
        MIN(created_at) as first_occurrence,
        MAX(created_at) as last_occurrence
      FROM analytics_events 
      WHERE event = ? AND created_at >= ?
    `).bind(metricType, timeFilter).first();

    return result;
  }

  // Get real-time metrics from cache
  async getRealtimeMetrics(): Promise<any> {
    try {
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
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      throw error;
    }
  }

  // Get user engagement metrics
  async getUserEngagementMetrics(timeRange: string = '7d'): Promise<any> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      const result = await this.env.ANALYTICS_DB.prepare(`
        WITH user_activity AS (
          SELECT 
            user_id,
            COUNT(*) as total_events,
            COUNT(DISTINCT DATE(created_at)) as active_days,
            COUNT(DISTINCT session_id) as total_sessions,
            MIN(created_at) as first_activity,
            MAX(created_at) as last_activity
          FROM analytics_events 
          WHERE user_id IS NOT NULL AND created_at >= ?
          GROUP BY user_id
        )
        SELECT 
          COUNT(*) as total_users,
          AVG(total_events) as avg_events_per_user,
          AVG(active_days) as avg_active_days,
          AVG(total_sessions) as avg_sessions_per_user,
          COUNT(CASE WHEN active_days >= 3 THEN 1 END) as highly_engaged_users,
          COUNT(CASE WHEN last_activity >= datetime('now', '-1 day') THEN 1 END) as active_last_24h,
          COUNT(CASE WHEN last_activity >= datetime('now', '-7 day') THEN 1 END) as active_last_7d
        FROM user_activity
      `).bind(timeFilter).first();

      return result;
    } catch (error) {
      console.error('Error getting user engagement metrics:', error);
      throw error;
    }
  }

  // Get conversion metrics
  async getConversionMetrics(timeRange: string = '7d'): Promise<any> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      const result = await this.env.ANALYTICS_DB.prepare(`
        SELECT 
          event as conversion_type,
          COUNT(*) as total_conversions,
          COUNT(DISTINCT user_id) as unique_converters,
          AVG(CAST(properties->>'value' AS REAL)) as avg_conversion_value
        FROM conversions 
        WHERE created_at >= ?
        GROUP BY event
        ORDER BY total_conversions DESC
      `).bind(timeFilter).all();

      return {
        timeRange: timeFilter,
        conversions: result.results,
        totalConversions: result.results.reduce((sum: number, row: any) => sum + row.total_conversions, 0)
      };
    } catch (error) {
      console.error('Error getting conversion metrics:', error);
      throw error;
    }
  }

  // Get performance metrics
  async getPerformanceMetrics(timeRange: string = '24h'): Promise<any> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      const result = await this.env.ANALYTICS_DB.prepare(`
        SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*) as requests,
          AVG(CAST(properties->>'response_time' AS REAL)) as avg_response_time,
          AVG(CAST(properties->>'load_time' AS REAL)) as avg_load_time,
          COUNT(CASE WHEN CAST(properties->>'response_time' AS REAL) > 1000 THEN 1 END) as slow_requests
        FROM analytics_events 
        WHERE event IN ('page_view', 'api_request') AND created_at >= ?
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY hour
      `).bind(timeFilter).all();

      return {
        timeRange: timeFilter,
        performance: result.results,
        summary: await this.getPerformanceSummary(timeFilter)
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  // Get performance summary
  private async getPerformanceSummary(timeFilter: string): Promise<any> {
    const result = await this.env.ANALYTICS_DB.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        AVG(CAST(properties->>'response_time' AS REAL)) as avg_response_time,
        AVG(CAST(properties->>'load_time' AS REAL)) as avg_load_time,
        COUNT(CASE WHEN CAST(properties->>'response_time' AS REAL) > 1000 THEN 1 END) as slow_requests,
        COUNT(CASE WHEN CAST(properties->>'response_time' AS REAL) > 3000 THEN 1 END) as very_slow_requests
      FROM analytics_events 
      WHERE event IN ('page_view', 'api_request') AND created_at >= ?
    `).bind(timeFilter).first();

    return result;
  }

  // Get geographic metrics
  async getGeographicMetrics(timeRange: string = '7d'): Promise<any> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      const result = await this.env.ANALYTICS_DB.prepare(`
        SELECT 
          context->>'country' as country,
          context->>'region' as region,
          context->>'city' as city,
          COUNT(*) as events,
          COUNT(DISTINCT user_id) as unique_users
        FROM analytics_events 
        WHERE created_at >= ? AND context->>'country' IS NOT NULL
        GROUP BY context->>'country', context->>'region', context->>'city'
        ORDER BY events DESC
        LIMIT 50
      `).bind(timeFilter).all();

      return {
        timeRange: timeFilter,
        geographic: result.results
      };
    } catch (error) {
      console.error('Error getting geographic metrics:', error);
      throw error;
    }
  }

  // Get device/browser metrics
  async getDeviceMetrics(timeRange: string = '7d'): Promise<any> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      const result = await this.env.ANALYTICS_DB.prepare(`
        SELECT 
          context->>'device_type' as device_type,
          context->>'browser' as browser,
          context->>'os' as os,
          COUNT(*) as events,
          COUNT(DISTINCT user_id) as unique_users
        FROM analytics_events 
        WHERE created_at >= ? AND context->>'device_type' IS NOT NULL
        GROUP BY context->>'device_type', context->>'browser', context->>'os'
        ORDER BY events DESC
      `).bind(timeFilter).all();

      return {
        timeRange: timeFilter,
        devices: result.results
      };
    } catch (error) {
      console.error('Error getting device metrics:', error);
      throw error;
    }
  }

  // Private helper methods
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
}








