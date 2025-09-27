// Simple workload manager - only manages workloads!
import { EdgeWorkload, EdgeNode } from './edgeTypes';
import { EdgeNodeManager } from './EdgeNodeManager';

export interface PlacementRequirements {
  zone?: string;
  latency?: number;
  labels?: Record<string, string>;
  antiAffinity?: string[];
  nodeSelector?: Record<string, string>;
}

export interface DeploymentRecord {
  id: string;
  workloadId: string;
  nodeIds: string[];
  status: 'deploying' | 'active' | 'updating' | 'failed';
  startedAt: number;
  completedAt?: number;
  strategy: string;
  replicas: number;
}

export class EdgeWorkloadManager {
  private workloads: Map<string, EdgeWorkload> = new Map();
  private deployments: Map<string, DeploymentRecord> = new Map();

  constructor(private nodeManager: EdgeNodeManager) {}

  async deployWorkload(
    workload: Omit<EdgeWorkload, 'id' | 'status'>,
    placement?: {
      nodeIds?: string[];
      clusterId?: string;
      requirements?: PlacementRequirements;
    }
  ): Promise<string> {
    const workloadId = this.generateWorkloadId();
    const fullWorkload: EdgeWorkload = {
      ...workload,
      id: workloadId,
      status: 'pending'
    };

    const selectedNodes = await this.selectDeploymentNodes(fullWorkload, placement);

    if (selectedNodes.length === 0) {
      throw new Error('No suitable nodes found for deployment');
    }

    this.workloads.set(workloadId, fullWorkload);

    const deploymentRecord: DeploymentRecord = {
      id: this.generateDeploymentId(),
      workloadId,
      nodeIds: selectedNodes.map(n => n.id),
      status: 'deploying',
      startedAt: Date.now(),
      strategy: workload.deployment.strategy,
      replicas: selectedNodes.length
    };

    this.deployments.set(deploymentRecord.id, deploymentRecord);
    await this.executeDeployment(fullWorkload, selectedNodes);

    return workloadId;
  }

  async getWorkload(workloadId: string): Promise<EdgeWorkload | undefined> {
    return this.workloads.get(workloadId);
  }

  async getAllWorkloads(): Promise<EdgeWorkload[]> {
    return Array.from(this.workloads.values());
  }

  async getDeployment(workloadId: string): Promise<DeploymentRecord | undefined> {
    return Array.from(this.deployments.values())
      .find(d => d.workloadId === workloadId && d.status === 'active');
  }

  async updateWorkloadConfig(
    workloadId: string,
    updates: Partial<EdgeWorkload>
  ): Promise<void> {
    const workload = this.workloads.get(workloadId);
    if (!workload) {
      throw new Error(`Workload not found: ${workloadId}`);
    }

    const updatedWorkload = { ...workload, ...updates };
    await this.validateWorkloadConfig(updatedWorkload);

    this.workloads.set(workloadId, updatedWorkload);
    await this.applyWorkloadUpdates(updatedWorkload);
  }

  private async selectDeploymentNodes(
    workload: EdgeWorkload,
    placement?: {
      nodeIds?: string[];
      clusterId?: string;
      requirements?: PlacementRequirements;
    }
  ): Promise<EdgeNode[]> {
    let candidateNodes = await this.nodeManager.getActiveNodes();

    if (placement?.nodeIds) {
      candidateNodes = candidateNodes.filter(node =>
        placement.nodeIds!.includes(node.id)
      );
    }

    candidateNodes = candidateNodes.filter(node =>
      this.nodeCanHostWorkload(node, workload)
    );

    if (placement?.requirements) {
      candidateNodes = this.filterNodesByRequirements(candidateNodes, placement.requirements);
    }

    return this.selectOptimalNodes(candidateNodes, workload);
  }

  private nodeCanHostWorkload(node: EdgeNode, workload: EdgeWorkload): boolean {
    const cpuRequired = this.parseResourceValue(workload.resources.cpu);
    const memoryRequired = this.parseResourceValue(workload.resources.memory);

    return node.capacity.cpu.available >= cpuRequired &&
           node.capacity.memory.available >= memoryRequired;
  }

  private parseResourceValue(resource: string): number {
    if (resource.endsWith('m')) {
      return parseInt(resource.slice(0, -1)) / 1000;
    }
    if (resource.endsWith('Mi')) {
      return parseInt(resource.slice(0, -2));
    }
    if (resource.endsWith('Gi')) {
      return parseInt(resource.slice(0, -2)) * 1024;
    }
    return parseFloat(resource);
  }

  private filterNodesByRequirements(
    nodes: EdgeNode[],
    requirements: PlacementRequirements
  ): EdgeNode[] {
    return nodes.filter(node => {
      if (requirements.zone && node.location.region !== requirements.zone) {
        return false;
      }

      if (requirements.latency && node.network.latency.target > requirements.latency) {
        return false;
      }

      if (requirements.labels) {
        for (const [key, value] of Object.entries(requirements.labels)) {
          if (node.metadata.labels[key] !== value) {
            return false;
          }
        }
      }

      return true;
    });
  }

  private selectOptimalNodes(nodes: EdgeNode[], workload: EdgeWorkload): EdgeNode[] {
    return nodes
      .sort((a, b) => this.calculateNodeScore(b, workload) - this.calculateNodeScore(a, workload))
      .slice(0, Math.min(workload.scaling.maxReplicas, nodes.length));
  }

  private calculateNodeScore(node: EdgeNode, workload: EdgeWorkload): number {
    let nodeScore = 0;

    // Resource availability score
    nodeScore += (node.capacity.cpu.available / node.capacity.cpu.total) * 30;
    nodeScore += (node.capacity.memory.available / node.capacity.memory.total) * 30;

    // Network performance score
    nodeScore += Math.max(0, 100 - node.network.latency.target) / 100 * 20;

    // Load distribution score
    const currentLoad = node.workloads.length;
    nodeScore += Math.max(0, 10 - currentLoad) * 2;

    // Geographic preference
    nodeScore += Math.random() * 10;

    return nodeScore;
  }

  private async executeDeployment(workload: EdgeWorkload, nodes: EdgeNode[]): Promise<void> {
    workload.status = 'running';

    for (const node of nodes) {
      await this.deployToNode(workload, node);
      node.workloads.push(workload);
      this.updateNodeCapacity(node, workload);
    }

    this.workloads.set(workload.id, workload);
  }

  private async deployToNode(workload: EdgeWorkload, node: EdgeNode): Promise<void> {
    // Simulate deployment process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update node workloads
    if (!node.workloads.find(w => w.id === workload.id)) {
      node.workloads.push(workload);
    }
  }

  private updateNodeCapacity(node: EdgeNode, workload: EdgeWorkload): void {
    const cpuRequired = this.parseResourceValue(workload.resources.cpu);
    const memoryRequired = this.parseResourceValue(workload.resources.memory);

    node.capacity.cpu.allocated += cpuRequired;
    node.capacity.cpu.available -= cpuRequired;
    node.capacity.memory.allocated += memoryRequired;
    node.capacity.memory.available -= memoryRequired;
  }

  private async validateWorkloadConfig(workload: EdgeWorkload): Promise<void> {
    if (!workload.name) {
      throw new Error('Workload name is required');
    }

    if (!workload.runtime.type) {
      throw new Error('Runtime type is required');
    }

    if (!workload.resources.cpu || !workload.resources.memory) {
      throw new Error('CPU and memory resources are required');
    }
  }

  private async applyWorkloadUpdates(workload: EdgeWorkload): Promise<void> {
    const deployment = this.getDeployment(workload.id);
    if (await deployment) {
      const dep = await deployment;
      if (dep) {
        for (const nodeId of dep.nodeIds) {
          await this.updateWorkloadOnNode(workload, nodeId);
        }
      }
    }
  }

  private async updateWorkloadOnNode(workload: EdgeWorkload, nodeId: string): Promise<void> {
    // Simulate workload update
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private generateWorkloadId(): string {
    return `workload_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateDeploymentId(): string {
    return `deployment_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}