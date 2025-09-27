// API Monitor Durable Object
// Handles real-time API monitoring and metrics collection

interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  errorsByStatus: Record<number, number>;
  endpointMetrics: Record<string, EndpointMetrics>;
}

interface EndpointMetrics {
  path: string;
  totalRequests: number;
  averageResponseTime: number;
  successRate: number;
  lastAccessed: number;
}

interface RequestData {
  timestamp: number;
  method: string;
  path: string;
  status: number;
  responseTime: number;
  userAgent?: string;
  ip?: string;
}

export class APIMonitor {
  private state: DurableObjectState;
  private env: any;
  private requests: RequestData[] = [];
  private metrics: APIMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    requestsPerSecond: 0,
    errorsByStatus: {},
    endpointMetrics: {}
  };
  private readonly MAX_REQUESTS = 10000; // Keep last 10k requests

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;

    // Schedule periodic cleanup and aggregation
    this.scheduleCleanup();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/record':
        return this.handleRecord(request);
      case '/metrics':
        return this.handleMetrics(request);
      case '/health':
        return this.handleHealth(request);
      case '/reset':
        return this.handleReset(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleRecord(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const requestData: RequestData = await request.json();

      if (!requestData.timestamp || !requestData.method || !requestData.path || !requestData.status) {
        return new Response('Missing required fields', { status: 400 });
      }

      this.recordRequest(requestData);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error recording request:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  private async handleMetrics(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('timeRange') || '1h';

    const metrics = this.calculateMetrics(timeRange);

    return new Response(JSON.stringify(metrics), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleHealth(request: Request): Promise<Response> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentRequests = this.requests.filter(r => r.timestamp >= oneMinuteAgo);
    const recentErrors = recentRequests.filter(r => r.status >= 400);

    const health = {
      status: recentErrors.length / recentRequests.length < 0.1 ? 'healthy' : 'degraded',
      timestamp: now,
      requestsLastMinute: recentRequests.length,
      errorsLastMinute: recentErrors.length,
      errorRate: recentRequests.length > 0 ? recentErrors.length / recentRequests.length : 0,
      averageResponseTime: recentRequests.length > 0
        ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length
        : 0
    };

    return new Response(JSON.stringify(health), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleReset(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    this.requests = [];
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      errorsByStatus: {},
      endpointMetrics: {}
    };

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private recordRequest(requestData: RequestData): void {
    // Add to requests array
    this.requests.push(requestData);

    // Keep only recent requests
    if (this.requests.length > this.MAX_REQUESTS) {
      this.requests = this.requests.slice(-this.MAX_REQUESTS);
    }

    // Update metrics
    this.updateMetrics(requestData);
  }

  private updateMetrics(requestData: RequestData): void {
    // Update total counters
    this.metrics.totalRequests++;

    if (requestData.status < 400) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;

      // Update error counts by status
      this.metrics.errorsByStatus[requestData.status] =
        (this.metrics.errorsByStatus[requestData.status] || 0) + 1;
    }

    // Update average response time
    const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + requestData.responseTime;
    this.metrics.averageResponseTime = totalResponseTime / this.metrics.totalRequests;

    // Update endpoint metrics
    const endpointKey = `${requestData.method} ${requestData.path}`;
    let endpointMetrics = this.metrics.endpointMetrics[endpointKey];

    if (!endpointMetrics) {
      endpointMetrics = {
        path: endpointKey,
        totalRequests: 0,
        averageResponseTime: 0,
        successRate: 0,
        lastAccessed: requestData.timestamp
      };
      this.metrics.endpointMetrics[endpointKey] = endpointMetrics;
    }

    endpointMetrics.totalRequests++;
    endpointMetrics.lastAccessed = requestData.timestamp;

    // Update endpoint average response time
    const endpointTotalTime = endpointMetrics.averageResponseTime * (endpointMetrics.totalRequests - 1) + requestData.responseTime;
    endpointMetrics.averageResponseTime = endpointTotalTime / endpointMetrics.totalRequests;

    // Update success rate for endpoint
    const endpointRequests = this.requests.filter(r =>
      `${r.method} ${r.path}` === endpointKey
    );
    const endpointSuccesses = endpointRequests.filter(r => r.status < 400);
    endpointMetrics.successRate = endpointSuccesses.length / endpointRequests.length;
  }

  private calculateMetrics(timeRange: string): APIMetrics {
    const now = Date.now();
    let timeRangeMs: number;

    switch (timeRange) {
      case '5m':
        timeRangeMs = 5 * 60 * 1000;
        break;
      case '1h':
        timeRangeMs = 60 * 60 * 1000;
        break;
      case '24h':
        timeRangeMs = 24 * 60 * 60 * 1000;
        break;
      default:
        timeRangeMs = 60 * 60 * 1000; // 1 hour default
    }

    const cutoffTime = now - timeRangeMs;
    const filteredRequests = this.requests.filter(r => r.timestamp >= cutoffTime);

    if (filteredRequests.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        requestsPerSecond: 0,
        errorsByStatus: {},
        endpointMetrics: {}
      };
    }

    const successfulRequests = filteredRequests.filter(r => r.status < 400).length;
    const failedRequests = filteredRequests.length - successfulRequests;
    const averageResponseTime = filteredRequests.reduce((sum, r) => sum + r.responseTime, 0) / filteredRequests.length;
    const requestsPerSecond = filteredRequests.length / (timeRangeMs / 1000);

    // Calculate errors by status
    const errorsByStatus: Record<number, number> = {};
    filteredRequests.filter(r => r.status >= 400).forEach(r => {
      errorsByStatus[r.status] = (errorsByStatus[r.status] || 0) + 1;
    });

    // Calculate endpoint metrics for time range
    const endpointMetrics: Record<string, EndpointMetrics> = {};
    const endpointGroups = new Map<string, RequestData[]>();

    filteredRequests.forEach(r => {
      const key = `${r.method} ${r.path}`;
      if (!endpointGroups.has(key)) {
        endpointGroups.set(key, []);
      }
      endpointGroups.get(key)!.push(r);
    });

    endpointGroups.forEach((requests, path) => {
      const successfulEndpointRequests = requests.filter(r => r.status < 400).length;
      const avgResponseTime = requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length;
      const successRate = successfulEndpointRequests / requests.length;
      const lastAccessed = Math.max(...requests.map(r => r.timestamp));

      endpointMetrics[path] = {
        path,
        totalRequests: requests.length,
        averageResponseTime: avgResponseTime,
        successRate,
        lastAccessed
      };
    });

    return {
      totalRequests: filteredRequests.length,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      requestsPerSecond,
      errorsByStatus,
      endpointMetrics
    };
  }

  private scheduleCleanup(): Promise<void> {
    // Clean up old requests every 10 minutes
    return new Promise((resolve) => {
      setInterval(() => {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        this.requests = this.requests.filter(r => r.timestamp >= oneHourAgo);
      }, 600000); // 10 minutes
      resolve();
    });
  }
}