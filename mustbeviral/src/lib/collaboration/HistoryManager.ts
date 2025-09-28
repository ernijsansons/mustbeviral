// Operation History and Undo/Redo Manager
// Manages operation history, undo/redo stacks, and collaborative editing history

import {
  Operation,
  DocumentState,
  UndoRedoState,
  OperationMetadata,
  VectorClock,
  OperationError,
  createOperationId,
  isInsertOperation,
  isDeleteOperation,
  isFormatOperation,
  OPERATION_DEFAULTS
} from './OperationTypes';

import { operationalTransform } from './OperationalTransform';

export interface HistoryNode {
  operation: Operation;
  inverseOperation: Operation;
  timestamp: number;
  userId: string;
  documentStateBefore: DocumentState;
  documentStateAfter: DocumentState;
  metadata: {
    description?: string;
    tags?: string[];
    importance?: 'low' | 'medium' | 'high';
    conflictsResolved?: number;
  };
}

export interface HistoryBranch {
  id: string;
  name: string;
  baseOperation: string; // operationId where this branch started
  operations: HistoryNode[];
  created: number;
  lastModified: number;
  mergedInto?: string; // branchId if this branch was merged
}

export interface HistorySnapshot {
  id: string;
  sessionId: string;
  documentState: DocumentState;
  operationHistory: HistoryNode[];
  undoRedoStates: Map<string, UndoRedoState>; // userId -> state
  branches: Map<string, HistoryBranch>;
  timestamp: number;
  description?: string;
  automatic: boolean;
}

export interface HistoryManagerConfig {
  maxHistorySize: number;
  maxUndoStackSize: number;
  enableBranching: boolean;
  enableSnapshots: boolean;
  snapshotInterval: number;
  compressionEnabled: boolean;
  enableOperationMerging: boolean;
  persistHistory: boolean;
}

export class HistoryManager {
  private operationHistory = new Map<string, HistoryNode[]>(); // sessionId -> history
  private undoRedoStates = new Map<string, Map<string, UndoRedoState>>(); // sessionId -> userId -> state
  private snapshots = new Map<string, HistorySnapshot[]>(); // sessionId -> snapshots
  private branches = new Map<string, Map<string, HistoryBranch>>(); // sessionId -> branchId -> branch
  private config: HistoryManagerConfig;
  private snapshotTimers = new Map<string, NodeJS.Timeout>();

  constructor(config: Partial<HistoryManagerConfig> = {}) {
    this.config = {
      maxHistorySize: config.maxHistorySize || OPERATION_DEFAULTS.MAX_HISTORY_SIZE,
      maxUndoStackSize: config.maxUndoStackSize || 50,
      enableBranching: config.enableBranching ?? false,
      enableSnapshots: config.enableSnapshots ?? true,
      snapshotInterval: config.snapshotInterval || 300000, // 5 minutes
      compressionEnabled: config.compressionEnabled ?? true,
      enableOperationMerging: config.enableOperationMerging ?? true,
      persistHistory: config.persistHistory ?? true
    };
  }

  /**
   * Initialize history for a session
   */
  initializeSession(sessionId: string, initialState: DocumentState): void {
    this.operationHistory.set(sessionId, []);
    this.undoRedoStates.set(sessionId, new Map());
    this.snapshots.set(sessionId, []);
    this.branches.set(sessionId, new Map());

    // Create initial snapshot
    if (this.config.enableSnapshots) {
      this.createSnapshot(sessionId, initialState, 'Initial state', true);
      this.startAutoSnapshot(sessionId);
    }
  }

  /**
   * Record an operation in history
   */
  recordOperation(
    sessionId: string,
    operation: Operation,
    documentStateBefore: DocumentState,
    documentStateAfter: DocumentState,
    inverseOperation?: Operation
  ): HistoryNode {
    const history = this.operationHistory.get(sessionId);
    if (!history) {
      throw new OperationError('Session not found', 'SESSION_NOT_FOUND', operation);
    }

    // Generate inverse operation if not provided
    if (!inverseOperation) {
      inverseOperation = operationalTransform.generateInverse(operation, documentStateBefore);
    }

    // Create history node
    const historyNode: HistoryNode = {
      operation,
      inverseOperation,
      timestamp: Date.now(),
      userId: operation.metadata.userId,
      documentStateBefore: { ...documentStateBefore },
      documentStateAfter: { ...documentStateAfter },
      metadata: {
        description: this.generateOperationDescription(operation),
        importance: this.calculateOperationImportance(operation),
        tags: this.generateOperationTags(operation)
      }
    };

    // Add to history
    history.push(historyNode);

    // Update user's undo/redo state
    this.updateUndoRedoState(sessionId, operation.metadata.userId, operation, inverseOperation);

    // Maintain history size limit
    if (history.length > this.config.maxHistorySize) {
      if (this.config.compressionEnabled) {
        this.compressHistory(sessionId);
      } else {
        history.shift(); // Remove oldest
      }
    }

    // Merge operations if enabled
    if (this.config.enableOperationMerging) {
      this.tryMergeRecentOperations(sessionId);
    }

    return historyNode;
  }

  /**
   * Undo the last operation by a user
   */
  undo(sessionId: string, userId: string): Operation | null {
    const userState = this.getUserUndoRedoState(sessionId, userId);
    if (!userState || userState.undoStack.length === 0) {
      return null;
    }

    const lastOperation = userState.undoStack.pop()!;

    // Generate undo operation
    const undoOperation = this.createUndoOperation(lastOperation, userId);

    // Move to redo stack
    userState.redoStack.push(lastOperation);

    // Limit redo stack size
    if (userState.redoStack.length > this.config.maxUndoStackSize) {
      userState.redoStack.shift();
    }

    return undoOperation;
  }

  /**
   * Redo the last undone operation by a user
   */
  redo(sessionId: string, userId: string): Operation | null {
    const userState = this.getUserUndoRedoState(sessionId, userId);
    if (!userState || userState.redoStack.length === 0) {
      return null;
    }

    const redoOperation = userState.redoStack.pop()!;

    // Move back to undo stack
    userState.undoStack.push(redoOperation);

    return redoOperation;
  }

  /**
   * Get operation history for a session
   */
  getHistory(sessionId: string, limit?: number, offset?: number): HistoryNode[] {
    const history = this.operationHistory.get(sessionId) || [];

    if (offset !== undefined || limit !== undefined) {
      const start = offset || 0;
      const end = limit ? start + limit : undefined;
      return history.slice(start, end);
    }

    return [...history];
  }

  /**
   * Get user's undo/redo state
   */
  getUserUndoRedoState(sessionId: string, userId: string): UndoRedoState | null {
    const sessionStates = this.undoRedoStates.get(sessionId);
    if (!sessionStates) {
      return null;
    }

    let userState = sessionStates.get(userId);
    if (!userState) {
      userState = {
        undoStack: [],
        redoStack: [],
        maxStackSize: this.config.maxUndoStackSize,
        currentVersion: 0
      };
      sessionStates.set(userId, userState);
    }

    return userState;
  }

  /**
   * Create a snapshot of the current state
   */
  createSnapshot(
    sessionId: string,
    documentState: DocumentState,
    description?: string,
    automatic = false
  ): HistorySnapshot {
    const history = this.operationHistory.get(sessionId) || [];
    const undoRedoStates = this.undoRedoStates.get(sessionId) || new Map();
    const branches = this.branches.get(sessionId) || new Map();

    const snapshot: HistorySnapshot = {
      id: createOperationId(),
      sessionId,
      documentState: { ...documentState },
      operationHistory: [...history],
      undoRedoStates: new Map([...undoRedoStates]),
      branches: new Map([...branches]),
      timestamp: Date.now(),
      description,
      automatic
    };

    const sessionSnapshots = this.snapshots.get(sessionId) || [];
    sessionSnapshots.push(snapshot);

    // Limit snapshot count
    const maxSnapshots = automatic ? 10 : 50;
    if (sessionSnapshots.length > maxSnapshots) {
      sessionSnapshots.shift();
    }

    this.snapshots.set(sessionId, sessionSnapshots);

    return snapshot;
  }

  /**
   * Restore from a snapshot
   */
  async restoreFromSnapshot(
    sessionId: string,
    snapshotId: string
  ): Promise<{
    documentState: DocumentState;
    operationsToApply: Operation[];
  } | null> {
    const sessionSnapshots = this.snapshots.get(sessionId);
    if (!sessionSnapshots) {
      return null;
    }

    const snapshot = sessionSnapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      return null;
    }

    // Restore state
    this.operationHistory.set(sessionId, [...snapshot.operationHistory]);
    this.undoRedoStates.set(sessionId, new Map([...snapshot.undoRedoStates]));
    this.branches.set(sessionId, new Map([...snapshot.branches]));

    // Calculate operations needed to reach current state from snapshot
    const currentHistory = this.operationHistory.get(sessionId) || [];
    const snapshotHistoryLength = snapshot.operationHistory.length;
    const operationsToApply = currentHistory.slice(snapshotHistoryLength)
      .map(node => node.operation);

    return {
      documentState: snapshot.documentState,
      operationsToApply
    };
  }

  /**
   * Create a new branch from current state
   */
  createBranch(
    sessionId: string,
    branchName: string,
    baseOperationId?: string
  ): HistoryBranch | null {
    if (!this.config.enableBranching) {
      return null;
    }

    const history = this.operationHistory.get(sessionId);
    if (!history) {
      return null;
    }

    // Find base operation
    const baseOperation = baseOperationId ||
      (history.length > 0 ? history[history.length - 1].operation.metadata.operationId : '');

    const branch: HistoryBranch = {
      id: createOperationId(),
      name: branchName,
      baseOperation,
      operations: [],
      created: Date.now(),
      lastModified: Date.now()
    };

    const sessionBranches = this.branches.get(sessionId) || new Map();
    sessionBranches.set(branch.id, branch);
    this.branches.set(sessionId, sessionBranches);

    return branch;
  }

  /**
   * Merge a branch back into main history
   */
  mergeBranch(
    sessionId: string,
    branchId: string,
    targetBranchId = 'main'
  ): {
    mergedOperations: Operation[];
    conflicts: Array<{ operation: Operation; reason: string }>;
  } | null {
    if (!this.config.enableBranching) {
      return null;
    }

    const sessionBranches = this.branches.get(sessionId);
    if (!sessionBranches) {
      return null;
    }

    const sourceBranch = sessionBranches.get(branchId);
    if (!sourceBranch) {
      return null;
    }

    // Get operations to merge
    const operationsToMerge = sourceBranch.operations.map(node => node.operation);

    // Mark branch as merged
    sourceBranch.mergedInto = targetBranchId;
    sourceBranch.lastModified = Date.now();

    return {
      mergedOperations: operationsToMerge,
      conflicts: [] // Would need conflict detection logic
    };
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): {
    totalOperations: number;
    totalUsers: number;
    averageOperationsPerUser: number;
    snapshotCount: number;
    branchCount: number;
    historySize: number;
    oldestOperation?: number;
    newestOperation?: number;
  } {
    const history = this.operationHistory.get(sessionId) || [];
    const undoRedoStates = this.undoRedoStates.get(sessionId) || new Map();
    const snapshots = this.snapshots.get(sessionId) || [];
    const branches = this.branches.get(sessionId) || new Map();

    const userOperationCounts = new Map<string, number>();
    history.forEach(node => {
      const count = userOperationCounts.get(node.userId) || 0;
      userOperationCounts.set(node.userId, count + 1);
    });

    const totalUsers = userOperationCounts.size;
    const averageOperationsPerUser = totalUsers > 0 ? history.length / totalUsers : 0;

    return {
      totalOperations: history.length,
      totalUsers,
      averageOperationsPerUser,
      snapshotCount: snapshots.length,
      branchCount: branches.size,
      historySize: this.calculateHistorySize(history),
      oldestOperation: history.length > 0 ? history[0].timestamp : undefined,
      newestOperation: history.length > 0 ? history[history.length - 1].timestamp : undefined
    };
  }

  /**
   * Export session history
   */
  exportHistory(sessionId: string): {
    operations: HistoryNode[];
    snapshots: HistorySnapshot[];
    branches: HistoryBranch[];
    stats: any;
  } | null {
    const history = this.operationHistory.get(sessionId);
    const snapshots = this.snapshots.get(sessionId);
    const branches = this.branches.get(sessionId);

    if (!history) {
      return null;
    }

    return {
      operations: [...history],
      snapshots: snapshots ? [...snapshots] : [],
      branches: branches ? Array.from(branches.values()) : [],
      stats: this.getSessionStats(sessionId)
    };
  }

  /**
   * Clean up session data
   */
  cleanupSession(sessionId: string): void {
    // Stop auto-snapshot timer
    const timer = this.snapshotTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.snapshotTimers.delete(sessionId);
    }

    // Remove session data
    this.operationHistory.delete(sessionId);
    this.undoRedoStates.delete(sessionId);
    this.snapshots.delete(sessionId);
    this.branches.delete(sessionId);
  }

  // Private helper methods

  private updateUndoRedoState(
    sessionId: string,
    userId: string,
    operation: Operation,
    inverseOperation: Operation
  ): void {
    const userState = this.getUserUndoRedoState(sessionId, userId);
    if (!userState) {
      return;
    }

    // Add to undo stack
    userState.undoStack.push(operation);

    // Clear redo stack (new operation invalidates redo history)
    userState.redoStack = [];

    // Maintain stack size
    if (userState.undoStack.length > userState.maxStackSize) {
      userState.undoStack.shift();
    }

    userState.currentVersion++;
  }

  private createUndoOperation(operation: Operation, userId: string): Operation {
    const undoMetadata: OperationMetadata = {
      operationId: createOperationId(),
      userId,
      sessionId: operation.metadata.sessionId,
      timestamp: Date.now(),
      vectorClock: { [userId]: Date.now() },
      documentVersion: operation.metadata.documentVersion + 1,
      parentOperationId: operation.metadata.operationId
    };

    // Create appropriate undo operation based on original operation type
    if (isInsertOperation(operation)) {
      return {
        type: 'delete',
        position: operation.position,
        length: operation.content.length,
        deletedContent: operation.content,
        metadata: undoMetadata
      };
    }

    if (isDeleteOperation(operation)) {
      return {
        type: 'insert',
        position: operation.position,
        content: operation.deletedContent || '',
        metadata: undoMetadata
      };
    }

    if (isFormatOperation(operation)) {
      return {
        type: 'format',
        position: operation.position,
        length: operation.length,
        attributes: operation.oldAttributes || {},
        oldAttributes: operation.attributes,
        metadata: undoMetadata
      };
    }

    // Default case
    return operation;
  }

  private generateOperationDescription(operation: Operation): string {
    if (isInsertOperation(operation)) {
      const contentPreview = operation.content.length > 20
        ? operation.content.substring(0, 20) + '...'
        : operation.content;
      return `Inserted "${contentPreview}" at position ${operation.position}`;
    }

    if (isDeleteOperation(operation)) {
      return `Deleted ${operation.length} characters at position ${operation.position}`;
    }

    if (isFormatOperation(operation)) {
      const attributes = Object.keys(operation.attributes).join(', ');
      return `Applied formatting (${attributes}) to ${operation.length} characters at position ${operation.position}`;
    }

    return `${operation.type} operation at position ${(operation as any).position || 0}`;
  }

  private calculateOperationImportance(operation: Operation): 'low' | 'medium' | 'high' {
    if (isInsertOperation(operation)) {
      return operation.content.length > 50 ? 'high' : 'medium';
    }

    if (isDeleteOperation(operation)) {
      return operation.length > 20 ? 'high' : 'medium';
    }

    if (isFormatOperation(operation)) {
      return operation.length > 100 ? 'medium' : 'low';
    }

    return 'low';
  }

  private generateOperationTags(operation: Operation): string[] {
    const tags: string[] = [operation.type];

    if (isInsertOperation(operation)) {
      if (operation.content.includes('\n')) tags.push('multiline');
      if (operation.content.trim().length === 0) tags.push('whitespace');
      if (operation.attributes) tags.push('formatted');
    }

    if (isDeleteOperation(operation)) {
      if (operation.length > 1) tags.push('bulk-delete');
    }

    if (isFormatOperation(operation)) {
      Object.keys(operation.attributes).forEach(attr => tags.push(`format-${attr}`));
    }

    return tags;
  }

  private compressHistory(sessionId: string): void {
    const history = this.operationHistory.get(sessionId);
    if (!history) {
      return;
    }

    // Group operations by user and try to merge consecutive operations
    const userGroups = new Map<string, HistoryNode[]>();

    history.forEach(node => {
      if (!userGroups.has(node.userId)) {
        userGroups.set(node.userId, []);
      }
      userGroups.get(node.userId)!.push(node);
    });

    // Try to merge operations within each user group
    userGroups.forEach((nodes, userId) => {
      const compressed = this.compressUserOperations(nodes);
      userGroups.set(userId, compressed);
    });

    // Rebuild history maintaining chronological order
    const compressedHistory: HistoryNode[] = [];
    history.forEach(originalNode => {
      const userNodes = userGroups.get(originalNode.userId) || [];
      const matchingNode = userNodes.find(node =>
        node.operation.metadata.operationId === originalNode.operation.metadata.operationId
      );
      if (matchingNode && !compressedHistory.includes(matchingNode)) {
        compressedHistory.push(matchingNode);
      }
    });

    this.operationHistory.set(sessionId, compressedHistory);
  }

  private compressUserOperations(nodes: HistoryNode[]): HistoryNode[] {
    // Simple compression: merge consecutive insert operations
    const compressed: HistoryNode[] = [];
    let current: HistoryNode | null = null;

    for (const node of nodes) {
      if (!current) {
        current = { ...node };
        continue;
      }

      // Try to merge with current
      if (this.canMergeOperations(current.operation, node.operation)) {
        current = this.mergeHistoryNodes(current, node);
      } else {
        compressed.push(current);
        current = { ...node };
      }
    }

    if (current) {
      compressed.push(current);
    }

    return compressed;
  }

  private canMergeOperations(op1: Operation, op2: Operation): boolean {
    // Only merge operations from same user within a short time window
    if (op1.metadata.userId !== op2.metadata.userId) {
      return false;
    }

    if (Math.abs(op2.metadata.timestamp - op1.metadata.timestamp) > 5000) {
      return false; // 5 second window
    }

    // Only merge consecutive inserts at adjacent positions
    if (isInsertOperation(op1) && isInsertOperation(op2)) {
      return op1.position + op1.content.length === op2.position;
    }

    return false;
  }

  private mergeHistoryNodes(node1: HistoryNode, node2: HistoryNode): HistoryNode {
    if (isInsertOperation(node1.operation) && isInsertOperation(node2.operation)) {
      const mergedOperation = {
        ...node1.operation,
        content: node1.operation.content + node2.operation.content,
        metadata: {
          ...node2.operation.metadata,
          parentOperationId: node1.operation.metadata.operationId
        }
      };

      return {
        ...node2,
        operation: mergedOperation,
        documentStateBefore: node1.documentStateBefore,
        metadata: {
          ...node2.metadata,
          description: `Merged: ${node1.metadata.description} + ${node2.metadata.description}`
        }
      };
    }

    return node2;
  }

  private tryMergeRecentOperations(sessionId: string): void {
    const history = this.operationHistory.get(sessionId);
    if (!history || history.length < 2) {
      return;
    }

    const lastTwo = history.slice(-2);
    if (this.canMergeOperations(lastTwo[0].operation, lastTwo[1].operation)) {
      const merged = this.mergeHistoryNodes(lastTwo[0], lastTwo[1]);
      history.splice(-2, 2, merged);
    }
  }

  private calculateHistorySize(history: HistoryNode[]): number {
    // Rough estimate of memory usage
    return history.reduce((size, node) => {
      let nodeSize = 0;
      nodeSize += JSON.stringify(node.operation).length;
      nodeSize += JSON.stringify(node.inverseOperation).length;
      nodeSize += 200; // metadata overhead
      return size + nodeSize;
    }, 0);
  }

  private startAutoSnapshot(sessionId: string): void {
    if (!this.config.enableSnapshots) {
      return;
    }

    const timer = setInterval(() => {
      const history = this.operationHistory.get(sessionId);
      if (history && history.length > 0) {
        const lastNode = history[history.length - 1];
        this.createSnapshot(
          sessionId,
          lastNode.documentStateAfter,
          'Automatic snapshot',
          true
        );
      }
    }, this.config.snapshotInterval);

    this.snapshotTimers.set(sessionId, timer);
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    // Clear all timers
    this.snapshotTimers.forEach(timer => clearInterval(timer));
    this.snapshotTimers.clear();

    // Clear all data
    this.operationHistory.clear();
    this.undoRedoStates.clear();
    this.snapshots.clear();
    this.branches.clear();
  }
}

// Export singleton instance
export const historyManager = new HistoryManager();