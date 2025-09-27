// Simple analytics manager - only handles analytics!
import { EdgeNode, EdgeCapacity } from './edgeTypes';
import { EdgeNodeManager } from './EdgeNodeManager';

export interface EdgeAnalytics {
  summary: {
    totalNodes: number;
    activeNodes: number;
    totalWorkloads: number;
    avgCpuUtilization: number;
    avgMemoryUtilization: number;
    avgLatency: number;
  };
  performance: {
    throughput: number;
    errorRate: number;
    availability: number;
    responseTime: number;
  };
  resources: {
    cpu: unknown;
    memory: unknown;
    storage: unknown;
    network: unknown;
  };
  geographic: Record<string, number>;
  trends: unknown;
}

export class EdgeAnalyticsManager {
  constructor(private nodeManager: EdgeNodeManager) {}

  async getAnalytics(
    scope?: {
      nodeIds?: string[];
      timeRange?: { start: number; end: number };
    }
  ): Promise<EdgeAnalytics> {
    const nodes = scope?.nodeIds
      ? await this.getNodesByIds(scope.nodeIds)
      : await this.nodeManager.getAllNodes();

    return this.generateAnalytics(nodes, scope?.timeRange);
  }

  private async getNodesByIds(nodeIds: string[]): Promise<EdgeNode[]> {
    const nodePromises = nodeIds.map(id => this.nodeManager.getNode(id));
    const nodes = await Promise.all(nodePromises);
    return nodes.filter((node): node is EdgeNode => node !== undefined);
  }

  private generateAnalytics(nodes: EdgeNode[], timeRange?: { start: number; end: number }): EdgeAnalytics {
    const totalNodes = nodes.length;
    const activeNodes = nodes.filter(n => n.status === 'active').length;
    const totalWorkloads = nodes.reduce((sum, node) => sum + node.workloads.length, 0);

    const avgCpuUtilization = this.calculateAverageCpuUtilization(nodes);
    const avgMemoryUtilization = this.calculateAverageMemoryUtilization(nodes);
    const avgLatency = this.calculateAverageLatency(nodes);

    return {
      summary: {
        totalNodes,
        activeNodes,
        totalWorkloads,
        avgCpuUtilization,
        avgMemoryUtilization,
        avgLatency
      },
      performance: {
        throughput: totalWorkloads * 1000, // Simulated
        errorRate: Math.random() * 5,
        availability: 99.9,
        responseTime: avgLatency
      },
      resources: {
        cpu: this.aggregateResourceMetrics(nodes, 'cpu'),
        memory: this.aggregateResourceMetrics(nodes, 'memory'),
        storage: this.aggregateResourceMetrics(nodes, 'storage'),
        network: this.aggregateNetworkMetrics(nodes)
      },
      geographic: this.generateGeographicDistribution(nodes),
      trends: this.generateTrendData(timeRange)
    };
  }

  private calculateAverageCpuUtilization(nodes: EdgeNode[]): number {
    if (nodes.length === 0) {
      return 0;
    }

    const totalUtilization = nodes.reduce((sum, node) =>
      sum + ((node.capacity.cpu.allocated / node.capacity.cpu.total) * 100), 0);

    return totalUtilization / nodes.length;
  }

  private calculateAverageMemoryUtilization(nodes: EdgeNode[]): number {
    if (nodes.length === 0) {
      return 0;
    }

    const totalUtilization = nodes.reduce((sum, node) =>
      sum + ((node.capacity.memory.allocated / node.capacity.memory.total) * 100), 0);

    return totalUtilization / nodes.length;
  }

  private calculateAverageLatency(nodes: EdgeNode[]): number {
    if (nodes.length === 0) {
      return 0;
    }

    const totalLatency = nodes.reduce((sum, node) => sum + node.network.latency.target, 0);
    return totalLatency / nodes.length;
  }

  private aggregateResourceMetrics(nodes: EdgeNode[], resource: keyof EdgeCapacity): unknown {
    const total = nodes.reduce((sum, node) => sum + node.capacity[resource].total, 0);
    const used = nodes.reduce((sum, node) => sum + node.capacity[resource].allocated, 0);

    return {
      total,
      used,
      available: total - used,
      utilization: total > 0 ? (used / total) * 100 : 0
    };
  }

  private aggregateNetworkMetrics(nodes: EdgeNode[]): unknown {
    const totalBandwidth = nodes.reduce((sum, node) => sum + node.network.bandwidth.inbound, 0);
    const avgLatency = this.calculateAverageLatency(nodes);

    return {
      totalBandwidth,
      avgLatency,
      connections: nodes.reduce((sum, node) => sum + (node.network.bandwidth.connections || 0), 0)
    };
  }

  private generateGeographicDistribution(nodes: EdgeNode[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    nodes.forEach(node => {
      const region = `${node.location.continent}-${node.location.country}`;
      distribution[region] = (distribution[region] ?? 0) + 1;
    });

    return distribution;
  }

  private generateTrendData(timeRange?: { start: number; end: number }): unknown {
    // Generate mock trend data
    const points = 24; // 24 hours
    const timestamps = Array.from({ length: points }, (_, i) =>
      Date.now() - (points - i) * 3600000
    );

    return {
      cpu: timestamps.map(ts => ({ timestamp: ts, value: Math.random() * 100 })),
      memory: timestamps.map(ts => ({ timestamp: ts, value: Math.random() * 100 })),
      requests: timestamps.map(ts => ({ timestamp: ts, value: Math.random() * 10000 }))
    };
  }
}