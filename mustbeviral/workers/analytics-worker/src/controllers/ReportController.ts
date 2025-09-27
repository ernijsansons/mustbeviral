// Report Controller - Handles report generation and data export

interface ReportData {
  id: string;
  title: string;
  description?: string;
  type: 'analytics' | 'metrics' | 'performance' | 'custom';
  parameters: Record<string, any>;
  generatedAt: string;
  data: any;
}

interface ReportRequest {
  type: string;
  title: string;
  description?: string;
  timeRange: string;
  metrics?: string[];
  filters?: Record<string, any>;
  format?: 'json' | 'csv' | 'pdf';
}

export class ReportController {
  constructor(private env: any) {}

  // Generate a new report
  async generateReport(reportRequest: ReportRequest): Promise<{ success: boolean; reportId: string }> {
    try {
      const reportId = this.generateReportId();
      const timestamp = new Date().toISOString();

      // Validate report request
      if (!reportRequest.type || !reportRequest.title) {
        throw new Error('Report type and title are required');
      }

      // Generate report data based on type
      let reportData: any;
      switch (reportRequest.type) {
        case 'analytics':
          reportData = await this.generateAnalyticsReport(reportRequest);
          break;
        case 'metrics':
          reportData = await this.generateMetricsReport(reportRequest);
          break;
        case 'performance':
          reportData = await this.generatePerformanceReport(reportRequest);
          break;
        default:
          reportData = await this.generateCustomReport(reportRequest);
      }

      // Store report in database
      await this.env.ANALYTICS_DB.prepare(`
        INSERT INTO reports (id, title, description, type, parameters, data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        reportId,
        reportRequest.title,
        reportRequest.description ?? '',
        reportRequest.type,
        JSON.stringify(reportRequest),
        JSON.stringify(reportData),
        timestamp
      ).run();

      return { success: true, reportId };
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  // Get a specific report
  async getReport(reportId: string): Promise<ReportData | null> {
    try {
      const result = await this.env.ANALYTICS_DB.prepare(`
        SELECT * FROM reports WHERE id = ?
      `).bind(reportId).first();

      if (!result) {
        return null;
      }

      return {
        id: result.id,
        title: result.title,
        description: result.description,
        type: result.type,
        parameters: JSON.parse(result.parameters),
        generatedAt: result.created_at,
        data: JSON.parse(result.data)
      };
    } catch (error) {
      console.error('Error getting report:', error);
      throw error;
    }
  }

  // List all reports
  async listReports(limit: number = 50, offset: number = 0): Promise<{ reports: ReportData[]; total: number }> {
    try {
      const results = await this.env.ANALYTICS_DB.prepare(`
        SELECT * FROM reports
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();

      const countResult = await this.env.ANALYTICS_DB.prepare(`
        SELECT COUNT(*) as count FROM reports
      `).first();

      const reports = results.results.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.type,
        parameters: JSON.parse(row.parameters),
        generatedAt: row.created_at,
        data: JSON.parse(row.data)
      }));

      return {
        reports,
        total: countResult?.count ?? 0
      };
    } catch (error) {
      console.error('Error listing reports:', error);
      throw error;
    }
  }

  // Export data in various formats
  async exportData(format: string = 'json', dateRange: string = '7d'): Promise<string> {
    try {
      const timeFilter = this.getTimeFilter(dateRange);

      // Get analytics data
      const analyticsResult = await this.env.ANALYTICS_DB.prepare(`
        SELECT * FROM analytics_events
        WHERE created_at >= ?
        ORDER BY created_at DESC
      `).bind(timeFilter).all();

      const data = analyticsResult.results;

      switch (format.toLowerCase()) {
        case 'csv':
          return this.convertToCSV(data);
        case 'json':
        default:
          return JSON.stringify(data, null, 2);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  // Private helper methods
  private generateReportId(): string {
    return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateAnalyticsReport(request: ReportRequest): Promise<any> {
    const timeFilter = this.getTimeFilter(request.timeRange);

    const result = await this.env.ANALYTICS_DB.prepare(`
      SELECT
        event,
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
      timeRange: request.timeRange,
      generatedAt: new Date().toISOString(),
      summary: {
        totalEvents: result.results.reduce((sum: number, row: any) => sum + row.total_events, 0),
        uniqueUsers: new Set(result.results.map((row: any) => row.unique_users)).size
      },
      events: result.results
    };
  }

  private async generateMetricsReport(request: ReportRequest): Promise<any> {
    const timeFilter = this.getTimeFilter(request.timeRange);

    const result = await this.env.ANALYTICS_DB.prepare(`
      SELECT
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as events_count,
        COUNT(DISTINCT user_id) as unique_users_count
      FROM analytics_events
      WHERE created_at >= ?
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour
    `).bind(timeFilter).all();

    return {
      timeRange: request.timeRange,
      generatedAt: new Date().toISOString(),
      metrics: result.results
    };
  }

  private async generatePerformanceReport(request: ReportRequest): Promise<any> {
    const timeFilter = this.getTimeFilter(request.timeRange);

    const result = await this.env.ANALYTICS_DB.prepare(`
      SELECT
        AVG(CAST(properties->>'response_time' AS REAL)) as avg_response_time,
        AVG(CAST(properties->>'load_time' AS REAL)) as avg_load_time,
        COUNT(CASE WHEN CAST(properties->>'response_time' AS REAL) > 1000 THEN 1 END) as slow_requests,
        COUNT(*) as total_requests
      FROM analytics_events
      WHERE event IN ('page_view', 'api_request') AND created_at >= ?
    `).bind(timeFilter).first();

    return {
      timeRange: request.timeRange,
      generatedAt: new Date().toISOString(),
      performance: result
    };
  }

  private async generateCustomReport(request: ReportRequest): Promise<any> {
    // Handle custom report types based on parameters
    return {
      timeRange: request.timeRange,
      generatedAt: new Date().toISOString(),
      message: 'Custom report generated',
      parameters: request.filters || {}
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
        filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return filterDate.toISOString();
  }

  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value.toString();
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}