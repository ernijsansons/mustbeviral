// Simple cluster manager - only manages clusters!
import { EdgeCluster } from './edgeTypes';
import { EdgeNodeManager } from './EdgeNodeManager';

export class EdgeClusterManager {
  private clusters: Map<string, EdgeCluster> = new Map();

  constructor(private nodeManager: EdgeNodeManager) {}

  async createCluster(cluster: Omit<EdgeCluster, 'id'>): Promise<string> {
    const clusterId = this.generateClusterId();
    const fullCluster: EdgeCluster = {
      ...cluster,
      id: clusterId
    };

    await this.validateClusterConfig(fullCluster);
    this.clusters.set(clusterId, fullCluster);
    await this.initializeClusterNetworking(fullCluster);

    return clusterId;
  }

  async getCluster(clusterId: string): Promise<EdgeCluster | undefined> {
    return this.clusters.get(clusterId);
  }

  async getAllClusters(): Promise<EdgeCluster[]> {
    return Array.from(this.clusters.values());
  }

  async addNodeToCluster(clusterId: string, nodeId: string): Promise<void> {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) {
      throw new Error(`Cluster not found: ${clusterId}`);
    }

    const node = await this.nodeManager.getNode(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    if (!cluster.nodes.includes(nodeId)) {
      cluster.nodes.push(nodeId);
      this.clusters.set(clusterId, cluster);
    }
  }

  async removeNodeFromCluster(clusterId: string, nodeId: string): Promise<void> {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) {
      throw new Error(`Cluster not found: ${clusterId}`);
    }

    cluster.nodes = cluster.nodes.filter(id => id !== nodeId);
    this.clusters.set(clusterId, cluster);
  }

  async getClusterNodes(clusterId: string): Promise<string[]> {
    const cluster = this.clusters.get(clusterId);
    return cluster ? cluster.nodes : [];
  }

  async deleteCluster(clusterId: string): Promise<void> {
    this.clusters.delete(clusterId);
  }

  private async validateClusterConfig(cluster: EdgeCluster): Promise<void> {
    if (cluster.nodes.length === 0) {
      throw new Error('Cluster must have at least one node');
    }

    for (const nodeId of cluster.nodes) {
      const node = await this.nodeManager.getNode(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }
    }
  }

  private async initializeClusterNetworking(cluster: EdgeCluster): Promise<void> {
    // Initialize cluster networking
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private generateClusterId(): string {
    return `cluster_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}