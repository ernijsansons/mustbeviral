/**
 * Security Metrics Collector
 * Grug-approved: Simple metrics tracking for security events
 * Basic counters and timing without complex analytics
 */

export class SecurityMetricsCollector {
  private metrics = new Map<string, { count: number; totalTime: number; errors: number }>()

  updateMetrics(endpoint: string, time: number, isError: boolean): void {
    this.ensureEndpointExists(endpoint)

    const stats = this.metrics.get(endpoint)!
    stats.count++
    stats.totalTime += time

    if (isError) {
      stats.errors++
    }
  }

  getMetrics(): Record<string, any> {
    const endpointMetrics: Record<string, any> = {}

    for (const [endpoint, stats] of this.metrics) {
      endpointMetrics[endpoint] = this.buildEndpointStats(stats)
    }

    return { endpointMetrics }
  }

  clearMetrics(): void {
    this.metrics.clear()
  }

  getEndpointCount(): number {
    return this.metrics.size
  }

  private ensureEndpointExists(endpoint: string): void {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, { count: 0, totalTime: 0, errors: 0 })
    }
  }

  private buildEndpointStats(stats: { count: number; totalTime: number; errors: number }) {
    return {
      requests: stats.count,
      averageTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
      errorRate: stats.count > 0 ? stats.errors / stats.count : 0,
      totalTime: stats.totalTime
    }
  }
}