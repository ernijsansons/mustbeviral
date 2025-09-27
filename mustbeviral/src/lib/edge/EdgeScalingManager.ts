// Simple scaling manager - only handles scaling!
import { EdgeWorkload, EdgeNode } from './edgeTypes';
import { EdgeNodeManager } from './EdgeNodeManager';
import { EdgeWorkloadManager, DeploymentRecord } from './EdgeWorkloadManager';

export class EdgeScalingManager {
  constructor(
    private nodeManager: EdgeNodeManager,
    private workloadManager: EdgeWorkloadManager
  ) {}

  async scaleWorkload(
    workloadId: string,
    targetReplicas: number,
    strategy?: 'immediate' | 'gradual'
  ): Promise<void> {
    const workload = await this.workloadManager.getWorkload(workloadId);
    if (!workload) {
      throw new Error(`Workload not found: ${workloadId}`);
    }

    const currentDeployment = await this.workloadManager.getDeployment(workloadId);
    if (!currentDeployment) {
      throw new Error(`No active deployment found for workload: ${workloadId}`);
    }

    const currentReplicas = currentDeployment.replicas;
    const replicaDelta = targetReplicas - currentReplicas;

    if (replicaDelta > 0) {
      await this.scaleUp(workload, replicaDelta, strategy);
    } else if (replicaDelta < 0) {
      await this.scaleDown(workload, Math.abs(replicaDelta), strategy);
    }

    currentDeployment.replicas = targetReplicas;
  }

  async processAutoscaling(): Promise<void> {
    const allWorkloads = await this.workloadManager.getAllWorkloads();

    for (const workload of allWorkloads) {
      if (workload.scaling.enabled) {
        await this.evaluateAutoscaling(workload);
      }
    }
  }

  private async scaleUp(
    workload: EdgeWorkload,
    replicas: number,
    strategy?: 'immediate' | 'gradual'
  ): Promise<void> {
    const activeNodes = await this.nodeManager.getActiveNodes();
    const suitableNodes = activeNodes.filter(node => this.nodeCanHostWorkload(node, workload));
    const nodesToUse = suitableNodes.slice(0, replicas);

    if (strategy === 'gradual') {
      for (const node of nodesToUse) {
        await this.deployToNode(workload, node);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
      }
    } else {
      await Promise.all(nodesToUse.map(node => this.deployToNode(workload, node)));
    }
  }

  private async scaleDown(
    workload: EdgeWorkload,
    replicas: number,
    strategy?: 'immediate' | 'gradual'
  ): Promise<void> {
    const deployment = await this.workloadManager.getDeployment(workload.id);
    if (!deployment) {
      return;
    }

    const nodesToRemove = deployment.nodeIds.slice(-replicas);

    if (strategy === 'gradual') {
      for (const nodeId of nodesToRemove) {
        await this.removeFromNode(workload, nodeId);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
      }
    } else {
      await Promise.all(nodesToRemove.map(nodeId => this.removeFromNode(workload, nodeId)));
    }
  }

  private async evaluateAutoscaling(workload: EdgeWorkload): Promise<void> {
    const deployment = await this.workloadManager.getDeployment(workload.id);
    if (!deployment) {
      return;
    }

    const avgCpuUsage = await this.calculateAverageCPUUsage(deployment.nodeIds, workload);
    const avgMemoryUsage = await this.calculateAverageMemoryUsage(deployment.nodeIds, workload);

    const cpuMetric = workload.scaling.metrics.find(m => m.type === 'cpu');
    const memoryMetric = workload.scaling.metrics.find(m => m.type === 'memory');

    let shouldScaleUp = false;
    let shouldScaleDown = false;

    if (cpuMetric && avgCpuUsage > cpuMetric.threshold) {
      shouldScaleUp = true;
    }

    if (memoryMetric && avgMemoryUsage > memoryMetric.threshold) {
      shouldScaleUp = true;
    }

    if (cpuMetric && avgCpuUsage < cpuMetric.threshold * 0.5) {
      shouldScaleDown = true;
    }

    if (shouldScaleUp && deployment.replicas < workload.scaling.maxReplicas) {
      await this.scaleWorkload(workload.id, deployment.replicas + 1, 'gradual');
    } else if (shouldScaleDown && deployment.replicas > workload.scaling.minReplicas) {
      await this.scaleWorkload(workload.id, deployment.replicas - 1, 'gradual');
    }
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

  private async deployToNode(workload: EdgeWorkload, node: EdgeNode): Promise<void> {
    // Simulate deployment
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (!node.workloads.find(w => w.id === workload.id)) {
      node.workloads.push(workload);
    }
  }

  private async removeFromNode(workload: EdgeWorkload, nodeId: string): Promise<void> {
    const node = await this.nodeManager.getNode(nodeId);
    if (!node) {
      return;
    }

    node.workloads = node.workloads.filter(w => w.id !== workload.id);

    const cpuRequired = this.parseResourceValue(workload.resources.cpu);
    const memoryRequired = this.parseResourceValue(workload.resources.memory);

    node.capacity.cpu.allocated -= cpuRequired;
    node.capacity.cpu.available += cpuRequired;
    node.capacity.memory.allocated -= memoryRequired;
    node.capacity.memory.available += memoryRequired;
  }

  private async calculateAverageCPUUsage(nodeIds: string[], workload: EdgeWorkload): Promise<number> {
    const usages = await Promise.all(nodeIds.map(async nodeId => {
      const node = await this.nodeManager.getNode(nodeId);
      if (!node) {
        return 0;
      }

      const workloadCPU = this.parseResourceValue(workload.resources.cpu);
      return (workloadCPU / node.capacity.cpu.total) * 100;
    }));

    return usages.reduce((sum, usage) => sum + usage, 0) / usages.length;
  }

  private async calculateAverageMemoryUsage(nodeIds: string[], workload: EdgeWorkload): Promise<number> {
    const usages = await Promise.all(nodeIds.map(async nodeId => {
      const node = await this.nodeManager.getNode(nodeId);
      if (!node) {
        return 0;
      }

      const workloadMemory = this.parseResourceValue(workload.resources.memory);
      return (workloadMemory / node.capacity.memory.total) * 100;
    }));

    return usages.reduce((sum, usage) => sum + usage, 0) / usages.length;
  }
}