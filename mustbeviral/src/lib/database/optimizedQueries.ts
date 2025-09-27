/**
 * Optimized Database Queries Service
 * Eliminates N+1 queries and implements efficient batch operations
 */

import { EnterpriseConnectionPool } from './enterpriseConnectionPool';

interface BatchOperationResult<T> {
  results: T[];
  errors: Error[];
  duration: number;
  totalQueries: number;
}

interface QueryPlan {
  query: string;
  params: any[];
  estimatedCost: number;
  useIndex?: string;
}

/**
 * Query optimization service with intelligent batching
 */
export class OptimizedQueryService {
  private pool: EnterpriseConnectionPool;
  private queryCache: Map<string, { result: any; timestamp: number; ttl: number }> = new Map();
  private batchQueue: Map<string, { queries: Array<{ query: string; params: any[]; resolve: Function; reject: Function }>; timeout: NodeJS.Timeout }> = new Map();
  private readonly BATCH_DELAY = 10; // 10ms batching window
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor(pool: EnterpriseConnectionPool) {
    this.pool = pool;
  }

  /**
   * Optimized user content retrieval with eager loading
   * Eliminates N+1 queries by fetching related data in batch
   */
  async getUserContentWithMetrics(userId: string): Promise<{
    content: any[];
    totalViews: number;
    avgEngagement: number;
    topPerforming: any[];
  }> {
    const cacheKey = `user_content_metrics:${userId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    // Single optimized query using JOINs and CTEs
    const query = `
      WITH content_with_metrics AS (
        SELECT
          c.*,
          COALESCE(SUM(a.views), 0) as total_views,
          COALESCE(AVG(a.engagement_rate), 0) as avg_engagement,
          ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(a.views), 0) DESC) as performance_rank
        FROM content c
        LEFT JOIN analytics a ON c.id = a.content_id
        WHERE c.user_id = ?
        GROUP BY c.id
      ),
      user_totals AS (
        SELECT
          SUM(total_views) as total_user_views,
          AVG(avg_engagement) as overall_avg_engagement
        FROM content_with_metrics
      )
      SELECT
        cwm.*,
        ut.total_user_views,
        ut.overall_avg_engagement,
        CASE WHEN cwm.performance_rank <= 5 THEN 1 ELSE 0 END as is_top_performing
      FROM content_with_metrics cwm
      CROSS JOIN user_totals ut
      ORDER BY cwm.total_views DESC
    `;

    try {
      const result = await this.pool.query(query, [userId]);

      const content = result.rows;
      const totalViews = content[0]?.total_user_views || 0;
      const avgEngagement = content[0]?.overall_avg_engagement || 0;
      const topPerforming = content.filter(c => c.is_top_performing).slice(0, 5);

      const response = {
        content: content.map(c => ({
          id: c.id,
          title: c.title,
          body: c.body,
          status: c.status,
          views: c.total_views,
          engagement: c.avg_engagement,
          created_at: c.created_at
        })),
        totalViews,
        avgEngagement,
        topPerforming: topPerforming.map(c => ({
          id: c.id,
          title: c.title,
          views: c.total_views,
          engagement: c.avg_engagement
        }))
      };

      this.setCache(cacheKey, response, this.CACHE_TTL);

      console.log(`Optimized user content query completed in ${Date.now() - startTime}ms`);
      return response;

    } catch (error) {
      console.error('Optimized user content query failed:', error);
      throw error;
    }
  }

  /**
   * Batch content creation with transaction rollback
   */
  async batchCreateContent(contentItems: Array<{
    user_id: string;
    title: string;
    body: string;
    metadata: any;
  }>): Promise<BatchOperationResult<any>> {
    const startTime = Date.now();
    const results: any[] = [];
    const errors: Error[] = [];

    try {
      await this.pool.transaction(async (client) => {
        // Prepare batch insert with VALUES clause for efficiency
        const values = contentItems.map((_, index) => {
          const baseIndex = index * 4;
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
        }).join(', ');

        const params = contentItems.flatMap(item => [
          item.user_id,
          item.title,
          item.body,
          JSON.stringify(item.metadata)
        ]);

        const batchQuery = `
          INSERT INTO content (user_id, title, body, metadata, status, created_at)
          VALUES ${values}
          RETURNING *
        `;

        const result = await client.query(batchQuery, params);
        results.push(...result.rows);

        // Batch update user content count
        const userIds = [...new Set(contentItems.map(item => item.user_id))];
        const updateCountQuery = `
          UPDATE users
          SET content_count = content_count + (
            SELECT COUNT(*) FROM unnest($1::text[]) AS user_id_list(id)
            WHERE users.id = user_id_list.id
          )
          WHERE id = ANY($1)
        `;

        await client.query(updateCountQuery, [userIds]);
      });

      return {
        results,
        errors,
        duration: Date.now() - startTime,
        totalQueries: 2 // INSERT + UPDATE
      };

    } catch (error) {
      errors.push(error as Error);
      return {
        results,
        errors,
        duration: Date.now() - startTime,
        totalQueries: 0
      };
    }
  }

  /**
   * Optimized analytics aggregation with materialized view pattern
   */
  async getAnalyticsDashboard(userId: string, timeRange: '24h' | '7d' | '30d' = '7d'): Promise<{
    overview: any;
    trends: any[];
    topContent: any[];
    realTimeMetrics: any;
  }> {
    const cacheKey = `analytics_dashboard:${userId}:${timeRange}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const timeRangeHours = { '24h': 24, '7d': 168, '30d': 720 }[timeRange];

    // Use parallel queries for different data sets
    const queries = await Promise.all([
      // Overview metrics
      this.pool.query(`
        SELECT
          COUNT(DISTINCT c.id) as total_content,
          COALESCE(SUM(a.views), 0) as total_views,
          COALESCE(SUM(a.likes + a.shares + a.comments), 0) as total_engagement,
          COALESCE(AVG(a.engagement_rate), 0) as avg_engagement_rate
        FROM content c
        LEFT JOIN analytics a ON c.id = a.content_id
        WHERE c.user_id = ? AND c.created_at > datetime('now', '-${timeRangeHours} hours')
      `, [userId]),

      // Trending data with time buckets
      this.pool.query(`
        SELECT
          date(a.created_at) as date,
          SUM(a.views) as views,
          SUM(a.likes + a.shares + a.comments) as engagements
        FROM analytics a
        JOIN content c ON a.content_id = c.id
        WHERE c.user_id = ? AND a.created_at > datetime('now', '-${timeRangeHours} hours')
        GROUP BY date(a.created_at)
        ORDER BY date DESC
        LIMIT 30
      `, [userId]),

      // Top performing content
      this.pool.query(`
        SELECT
          c.id, c.title,
          SUM(a.views) as views,
          AVG(a.engagement_rate) as engagement_rate
        FROM content c
        JOIN analytics a ON c.id = a.content_id
        WHERE c.user_id = ? AND a.created_at > datetime('now', '-${timeRangeHours} hours')
        GROUP BY c.id, c.title
        ORDER BY views DESC
        LIMIT 10
      `, [userId])
    ]);

    const response = {
      overview: queries[0].rows[0],
      trends: queries[1].rows,
      topContent: queries[2].rows,
      realTimeMetrics: {
        active_users: Math.floor(Math.random() * 100), // Placeholder for real-time data
        current_views: Math.floor(Math.random() * 1000),
        last_updated: new Date().toISOString()
      }
    };

    this.setCache(cacheKey, response, 60000); // 1 minute cache for analytics
    return response;
  }

  /**
   * Smart query batching to reduce database round trips
   */
  private async batchQuery<T>(batchKey: string, query: string, params: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, {
          queries: [],
          timeout: setTimeout(() => this.executeBatch(batchKey), this.BATCH_DELAY)
        });
      }

      const batch = this.batchQueue.get(batchKey)!;
      batch.queries.push({ query, params, resolve, reject });
    });
  }

  /**
   * Execute batched queries efficiently
   */
  private async executeBatch(batchKey: string) {
    const batch = this.batchQueue.get(batchKey);
    if (!batch) return;

    this.batchQueue.delete(batchKey);
    clearTimeout(batch.timeout);

    try {
      // Execute all queries in a single transaction for consistency
      await this.pool.transaction(async (client) => {
        for (const queryItem of batch.queries) {
          try {
            const result = await client.query(queryItem.query, queryItem.params);
            queryItem.resolve(result);
          } catch (error) {
            queryItem.reject(error);
          }
        }
      });
    } catch (error) {
      batch.queries.forEach(queryItem => queryItem.reject(error));
    }
  }

  /**
   * Intelligent query caching
   */
  private getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.result;
  }

  private setCache(key: string, result: any, ttl: number) {
    this.queryCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl
    });

    // Clean up cache periodically
    if (this.queryCache.size > 1000) {
      const oldestEntries = Array.from(this.queryCache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)
        .slice(0, 200);

      oldestEntries.forEach(([key]) => this.queryCache.delete(key));
    }
  }

  /**
   * Query performance analysis
   */
  async explainQuery(query: string, params: any[]): Promise<QueryPlan> {
    const explainQuery = `EXPLAIN QUERY PLAN ${query}`;
    const result = await this.pool.query(explainQuery, params);

    const hasIndex = result.rows.some(row =>
      row.detail?.includes('USING INDEX') || row.detail?.includes('PRIMARY KEY')
    );

    return {
      query,
      params,
      estimatedCost: this.estimateQueryCost(query),
      useIndex: hasIndex ? 'detected' : 'missing'
    };
  }

  private estimateQueryCost(query: string): number {
    // Simple heuristic for query cost estimation
    let cost = 1;

    if (query.includes('JOIN')) cost *= 2;
    if (query.includes('LEFT JOIN')) cost *= 1.5;
    if (query.includes('ORDER BY')) cost *= 1.3;
    if (query.includes('GROUP BY')) cost *= 1.4;
    if (query.includes('DISTINCT')) cost *= 1.2;

    const tableCount = (query.match(/FROM\s+\w+/gi) || []).length;
    cost *= Math.max(1, tableCount);

    return Math.round(cost * 10) / 10;
  }

  /**
   * Database health monitoring
   */
  async getPerformanceMetrics(): Promise<{
    cacheHitRate: number;
    avgQueryTime: number;
    batchEfficiency: number;
    connectionUtilization: number;
  }> {
    const poolMetrics = this.pool.getMetrics();

    return {
      cacheHitRate: this.calculateCacheHitRate(),
      avgQueryTime: poolMetrics.queries.avgExecutionTime,
      batchEfficiency: this.calculateBatchEfficiency(),
      connectionUtilization: this.calculateConnectionUtilization(poolMetrics)
    };
  }

  private calculateCacheHitRate(): number {
    // Implementation would track cache hits vs misses
    return 0.85; // Placeholder
  }

  private calculateBatchEfficiency(): number {
    // Implementation would track batched vs individual queries
    return 0.78; // Placeholder
  }

  private calculateConnectionUtilization(metrics: any): number {
    const totalConnections = Object.values(metrics.pools).reduce((sum: number, pool: any) =>
      sum + pool.totalConnections, 0);
    const activeConnections = Object.values(metrics.pools).reduce((sum: number, pool: any) =>
      sum + pool.activeConnections, 0);

    return totalConnections > 0 ? activeConnections / totalConnections : 0;
  }
}

export default OptimizedQueryService;