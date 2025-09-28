// Conflict Resolution and Merge Strategies
// Advanced conflict resolution for operational transform with multiple resolution strategies

import {
  Operation,
  InsertOperation,
  DeleteOperation,
  FormatOperation,
  RetainOperation,
  ConflictInfo,
  DocumentState,
  OperationContext,
  TransformResult,
  VectorClock,
  TextAttributes,
  OperationError,
  compareVectorClocks,
  isInsertOperation,
  isDeleteOperation,
  isFormatOperation,
  isRetainOperation,
  createOperationId
} from './OperationTypes';

export type ConflictResolutionStrategy =
  | 'client_wins'          // Client operation takes precedence
  | 'server_wins'          // Server/first operation takes precedence
  | 'merge'                // Intelligent merging of operations
  | 'interactive'          // Require user intervention
  | 'timestamp_priority'   // Earlier timestamp wins
  | 'user_priority'        // Based on user roles/permissions
  | 'content_aware';       // Smart merging based on content type

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  resolvedOperation: Operation;
  alternativeOperations: Operation[];
  metadata: {
    conflictId: string;
    resolutionReason: string;
    confidence: number; // 0-1, how confident we are in the resolution
    requiresReview?: boolean;
    userNotification?: string;
  };
}

export interface MergeContext {
  documentState: DocumentState;
  userPermissions: { [userId: string]: string[] };
  contentType: 'text' | 'code' | 'markdown' | 'rich_text';
  mergeHistory: ConflictResolution[];
  sessionSettings: {
    defaultStrategy: ConflictResolutionStrategy;
    allowInteractiveResolution: boolean;
    enableSmartMerging: boolean;
  };
}

export class ConflictResolver {
  private resolutionHistory: Map<string, ConflictResolution[]> = new Map();
  private mergeStrategies: Map<ConflictResolutionStrategy, (op1: Operation, op2: Operation, context: MergeContext) => ConflictResolution> = new Map();

  constructor() {
    this.initializeMergeStrategies();
  }

  /**
   * Main conflict resolution entry point
   */
  resolveConflict(
    conflictingOperations: Operation[],
    context: MergeContext
  ): ConflictResolution {
    if (conflictingOperations.length < 2) {
      throw new OperationError('At least two operations required for conflict resolution', 'INVALID_CONFLICT');
    }

    const [op1, op2, ...additionalOps] = conflictingOperations;

    // Handle binary conflicts first
    let resolution = this.resolveBinaryConflict(op1, op2, context);

    // If there are additional operations, resolve them iteratively
    for (const additionalOp of additionalOps) {
      const newConflict = [resolution.resolvedOperation, additionalOp];
      resolution = this.resolveBinaryConflict(resolution.resolvedOperation, additionalOp, context);
    }

    // Store resolution in history
    const sessionId = op1.metadata.sessionId;
    if (!this.resolutionHistory.has(sessionId)) {
      this.resolutionHistory.set(sessionId, []);
    }
    this.resolutionHistory.get(sessionId)!.push(resolution);

    return resolution;
  }

  /**
   * Resolve conflict between two operations
   */
  private resolveBinaryConflict(
    op1: Operation,
    op2: Operation,
    context: MergeContext
  ): ConflictResolution {
    const conflictType = this.analyzeConflictType(op1, op2);
    const strategy = this.selectResolutionStrategy(conflictType, op1, op2, context);

    const mergeFunction = this.mergeStrategies.get(strategy);
    if (!mergeFunction) {
      throw new OperationError(`No merge strategy found for: ${strategy}`, 'MISSING_STRATEGY');
    }

    return mergeFunction(op1, op2, context);
  }

  /**
   * Analyze the type of conflict between operations
   */
  private analyzeConflictType(op1: Operation, op2: Operation): 'position' | 'content' | 'format' | 'structural' | 'concurrent' {
    // Check for position conflicts
    if (this.hasPositionConflict(op1, op2)) {
      return 'position';
    }

    // Check for format conflicts
    if (isFormatOperation(op1) && isFormatOperation(op2)) {
      return 'format';
    }

    // Check for content conflicts
    if ((isInsertOperation(op1) || isDeleteOperation(op1)) &&
        (isInsertOperation(op2) || isDeleteOperation(op2))) {
      return 'content';
    }

    // Check for concurrent operations
    const clockComparison = compareVectorClocks(op1.metadata.vectorClock, op2.metadata.vectorClock);
    if (clockComparison === 'concurrent') {
      return 'concurrent';
    }

    return 'structural';
  }

  /**
   * Select appropriate resolution strategy
   */
  private selectResolutionStrategy(
    conflictType: string,
    op1: Operation,
    op2: Operation,
    context: MergeContext
  ): ConflictResolutionStrategy {
    // Use context default if available
    if (context.sessionSettings.defaultStrategy) {
      return context.sessionSettings.defaultStrategy;
    }

    // Smart strategy selection based on conflict type
    switch (conflictType) {
      case 'format':
        return 'merge'; // Format conflicts can usually be merged
      case 'position':
        return 'timestamp_priority'; // Position conflicts resolved by timing
      case 'content':
        return context.contentType === 'code' ? 'interactive' : 'merge';
      case 'concurrent':
        return 'user_priority'; // Use user permissions for concurrent operations
      default:
        return 'merge';
    }
  }

  /**
   * Initialize merge strategy implementations
   */
  private initializeMergeStrategies(): void {
    this.mergeStrategies.set('client_wins', this.clientWinsStrategy.bind(this));
    this.mergeStrategies.set('server_wins', this.serverWinsStrategy.bind(this));
    this.mergeStrategies.set('merge', this.intelligentMergeStrategy.bind(this));
    this.mergeStrategies.set('interactive', this.interactiveStrategy.bind(this));
    this.mergeStrategies.set('timestamp_priority', this.timestampPriorityStrategy.bind(this));
    this.mergeStrategies.set('user_priority', this.userPriorityStrategy.bind(this));
    this.mergeStrategies.set('content_aware', this.contentAwareStrategy.bind(this));
  }

  /**
   * Client wins strategy - second operation (usually from client) takes precedence
   */
  private clientWinsStrategy(op1: Operation, op2: Operation, context: MergeContext): ConflictResolution {
    return {
      strategy: 'client_wins',
      resolvedOperation: op2,
      alternativeOperations: [op1],
      metadata: {
        conflictId: createOperationId(),
        resolutionReason: 'Client operation prioritized',
        confidence: 0.8
      }
    };
  }

  /**
   * Server wins strategy - first operation (usually from server) takes precedence
   */
  private serverWinsStrategy(op1: Operation, op2: Operation, context: MergeContext): ConflictResolution {
    return {
      strategy: 'server_wins',
      resolvedOperation: op1,
      alternativeOperations: [op2],
      metadata: {
        conflictId: createOperationId(),
        resolutionReason: 'Server operation prioritized',
        confidence: 0.8
      }
    };
  }

  /**
   * Intelligent merge strategy - attempts to combine operations smartly
   */
  private intelligentMergeStrategy(op1: Operation, op2: Operation, context: MergeContext): ConflictResolution {
    // Format operation merging
    if (isFormatOperation(op1) && isFormatOperation(op2)) {
      return this.mergeFormatOperations(op1, op2, context);
    }

    // Insert operation merging
    if (isInsertOperation(op1) && isInsertOperation(op2)) {
      return this.mergeInsertOperations(op1, op2, context);
    }

    // Delete operation handling
    if (isDeleteOperation(op1) && isDeleteOperation(op2)) {
      return this.mergeDeleteOperations(op1, op2, context);
    }

    // Mixed operation types - use priority-based resolution
    return this.timestampPriorityStrategy(op1, op2, context);
  }

  /**
   * Interactive strategy - requires user intervention
   */
  private interactiveStrategy(op1: Operation, op2: Operation, context: MergeContext): ConflictResolution {
    return {
      strategy: 'interactive',
      resolvedOperation: op1, // Temporary placeholder
      alternativeOperations: [op2],
      metadata: {
        conflictId: createOperationId(),
        resolutionReason: 'User intervention required',
        confidence: 0.0,
        requiresReview: true,
        userNotification: `Conflict detected between operations. Please review and resolve manually.`
      }
    };
  }

  /**
   * Timestamp priority strategy - earlier operation wins
   */
  private timestampPriorityStrategy(op1: Operation, op2: Operation, context: MergeContext): ConflictResolution {
    const winner = op1.metadata.timestamp <= op2.metadata.timestamp ? op1 : op2;
    const loser = winner === op1 ? op2 : op1;

    return {
      strategy: 'timestamp_priority',
      resolvedOperation: winner,
      alternativeOperations: [loser],
      metadata: {
        conflictId: createOperationId(),
        resolutionReason: `Earlier operation (${new Date(winner.metadata.timestamp).toISOString()}) prioritized`,
        confidence: 0.9
      }
    };
  }

  /**
   * User priority strategy - based on user roles and permissions
   */
  private userPriorityStrategy(op1: Operation, op2: Operation, context: MergeContext): ConflictResolution {
    const user1Permissions = context.userPermissions[op1.metadata.userId] || [];
    const user2Permissions = context.userPermissions[op2.metadata.userId] || [];

    // Define permission hierarchy
    const permissionWeight = {
      'owner': 100,
      'admin': 80,
      'editor': 60,
      'collaborator': 40,
      'viewer': 20
    };

    const user1Weight = Math.max(...user1Permissions.map(p => permissionWeight[p as keyof typeof permissionWeight] || 0));
    const user2Weight = Math.max(...user2Permissions.map(p => permissionWeight[p as keyof typeof permissionWeight] || 0));

    const winner = user1Weight >= user2Weight ? op1 : op2;
    const loser = winner === op1 ? op2 : op1;

    return {
      strategy: 'user_priority',
      resolvedOperation: winner,
      alternativeOperations: [loser],
      metadata: {
        conflictId: createOperationId(),
        resolutionReason: `Higher privilege user operation prioritized`,
        confidence: 0.85
      }
    };
  }

  /**
   * Content-aware strategy - merges based on content type and semantics
   */
  private contentAwareStrategy(op1: Operation, op2: Operation, context: MergeContext): ConflictResolution {
    switch (context.contentType) {
      case 'code':
        return this.mergeCodeOperations(op1, op2, context);
      case 'markdown':
        return this.mergeMarkdownOperations(op1, op2, context);
      case 'rich_text':
        return this.mergeRichTextOperations(op1, op2, context);
      default:
        return this.intelligentMergeStrategy(op1, op2, context);
    }
  }

  /**
   * Merge format operations by combining attributes
   */
  private mergeFormatOperations(op1: FormatOperation, op2: FormatOperation, context: MergeContext): ConflictResolution {
    // Check for overlapping ranges
    const op1End = op1.position + op1.length;
    const op2End = op2.position + op2.length;

    if (op1.position < op2End && op1End > op2.position) {
      // Overlapping ranges - merge attributes
      const mergedAttributes: TextAttributes = {
        ...op1.attributes,
        ...op2.attributes
      };

      // Resolve conflicting attributes
      Object.keys(op1.attributes).forEach(key => {
        if (key in op2.attributes && op1.attributes[key as keyof TextAttributes] !== op2.attributes[key as keyof TextAttributes]) {
          // For boolean attributes, OR them together
          if (typeof op1.attributes[key as keyof TextAttributes] === 'boolean') {
            mergedAttributes[key as keyof TextAttributes] =
              op1.attributes[key as keyof TextAttributes] || op2.attributes[key as keyof TextAttributes];
          }
          // For other attributes, use the more recent one
          else {
            mergedAttributes[key as keyof TextAttributes] =
              op2.metadata.timestamp > op1.metadata.timestamp ?
              op2.attributes[key as keyof TextAttributes] :
              op1.attributes[key as keyof TextAttributes];
          }
        }
      });

      const mergedOperation: FormatOperation = {
        type: 'format',
        position: Math.min(op1.position, op2.position),
        length: Math.max(op1End, op2End) - Math.min(op1.position, op2.position),
        attributes: mergedAttributes,
        metadata: {
          ...op2.metadata,
          operationId: createOperationId(),
          parentOperationId: op1.metadata.operationId
        }
      };

      return {
        strategy: 'merge',
        resolvedOperation: mergedOperation,
        alternativeOperations: [op1, op2],
        metadata: {
          conflictId: createOperationId(),
          resolutionReason: 'Format attributes merged successfully',
          confidence: 0.95
        }
      };
    }

    // Non-overlapping ranges - use timestamp priority
    return this.timestampPriorityStrategy(op1, op2, context);
  }

  /**
   * Merge insert operations
   */
  private mergeInsertOperations(op1: InsertOperation, op2: InsertOperation, context: MergeContext): ConflictResolution {
    if (op1.position === op2.position) {
      // Same position - combine content
      const combinedContent = op1.metadata.timestamp <= op2.metadata.timestamp ?
        op1.content + op2.content :
        op2.content + op1.content;

      const mergedOperation: InsertOperation = {
        type: 'insert',
        position: op1.position,
        content: combinedContent,
        attributes: { ...op1.attributes, ...op2.attributes },
        metadata: {
          ...op2.metadata,
          operationId: createOperationId(),
          parentOperationId: op1.metadata.operationId
        }
      };

      return {
        strategy: 'merge',
        resolvedOperation: mergedOperation,
        alternativeOperations: [op1, op2],
        metadata: {
          conflictId: createOperationId(),
          resolutionReason: 'Insert operations combined at same position',
          confidence: 0.9
        }
      };
    }

    // Different positions - use earlier operation
    return this.timestampPriorityStrategy(op1, op2, context);
  }

  /**
   * Merge delete operations
   */
  private mergeDeleteOperations(op1: DeleteOperation, op2: DeleteOperation, context: MergeContext): ConflictResolution {
    const op1End = op1.position + op1.length;
    const op2End = op2.position + op2.length;

    // Check for overlapping ranges
    if (op1.position < op2End && op1End > op2.position) {
      // Overlapping deletes - combine into single delete
      const mergedOperation: DeleteOperation = {
        type: 'delete',
        position: Math.min(op1.position, op2.position),
        length: Math.max(op1End, op2End) - Math.min(op1.position, op2.position),
        deletedContent: (op1.deletedContent || '') + (op2.deletedContent || ''),
        metadata: {
          ...op2.metadata,
          operationId: createOperationId(),
          parentOperationId: op1.metadata.operationId
        }
      };

      return {
        strategy: 'merge',
        resolvedOperation: mergedOperation,
        alternativeOperations: [op1, op2],
        metadata: {
          conflictId: createOperationId(),
          resolutionReason: 'Overlapping delete operations merged',
          confidence: 0.95
        }
      };
    }

    // Non-overlapping deletes - use timestamp priority
    return this.timestampPriorityStrategy(op1, op2, context);
  }

  /**
   * Code-specific merging logic
   */
  private mergeCodeOperations(op1: Operation, op2: Operation, context: MergeContext): ConflictResolution {
    // For code, be more conservative and prefer interactive resolution
    if (this.isStructuralChange(op1) || this.isStructuralChange(op2)) {
      return this.interactiveStrategy(op1, op2, context);
    }

    // For minor changes, use intelligent merge
    return this.intelligentMergeStrategy(op1, op2, context);
  }

  /**
   * Markdown-specific merging logic
   */
  private mergeMarkdownOperations(op1: Operation, op2: Operation, context: MergeContext): ConflictResolution {
    // Markdown can be more flexible with merging
    return this.intelligentMergeStrategy(op1, op2, context);
  }

  /**
   * Rich text-specific merging logic
   */
  private mergeRichTextOperations(op1: Operation, op2: Operation, context: MergeContext): ConflictResolution {
    // Rich text benefits from format merging
    if (isFormatOperation(op1) || isFormatOperation(op2)) {
      return this.intelligentMergeStrategy(op1, op2, context);
    }

    return this.timestampPriorityStrategy(op1, op2, context);
  }

  /**
   * Check if operations have position conflicts
   */
  private hasPositionConflict(op1: Operation, op2: Operation): boolean {
    if (!('position' in op1) || !('position' in op2)) {
      return false;
    }

    const op1End = 'length' in op1 ? op1.position + op1.length : op1.position + 1;
    const op2End = 'length' in op2 ? op2.position + op2.length : op2.position + 1;

    return op1.position < op2End && op1End > op2.position;
  }

  /**
   * Check if operation represents a structural change (for code)
   */
  private isStructuralChange(operation: Operation): boolean {
    if (isInsertOperation(operation)) {
      // Check for structural keywords in code
      const structuralKeywords = ['function', 'class', 'interface', 'import', 'export', '{', '}', '(', ')'];
      return structuralKeywords.some(keyword => operation.content.includes(keyword));
    }

    if (isDeleteOperation(operation) && operation.deletedContent) {
      const structuralKeywords = ['function', 'class', 'interface', 'import', 'export', '{', '}', '(', ')'];
      return structuralKeywords.some(keyword => operation.deletedContent!.includes(keyword));
    }

    return false;
  }

  /**
   * Get resolution history for a session
   */
  getResolutionHistory(sessionId: string): ConflictResolution[] {
    return this.resolutionHistory.get(sessionId) || [];
  }

  /**
   * Clear resolution history for a session
   */
  clearResolutionHistory(sessionId: string): void {
    this.resolutionHistory.delete(sessionId);
  }

  /**
   * Get conflict resolution statistics
   */
  getResolutionStats(sessionId: string): {
    totalConflicts: number;
    strategyCounts: { [strategy: string]: number };
    averageConfidence: number;
    interactiveResolutionsRequired: number;
  } {
    const resolutions = this.resolutionHistory.get(sessionId) || [];

    const strategyCounts: { [strategy: string]: number } = {};
    let totalConfidence = 0;
    let interactiveResolutions = 0;

    resolutions.forEach(resolution => {
      strategyCounts[resolution.strategy] = (strategyCounts[resolution.strategy] || 0) + 1;
      totalConfidence += resolution.metadata.confidence;
      if (resolution.metadata.requiresReview) {
        interactiveResolutions++;
      }
    });

    return {
      totalConflicts: resolutions.length,
      strategyCounts,
      averageConfidence: resolutions.length > 0 ? totalConfidence / resolutions.length : 0,
      interactiveResolutionsRequired: interactiveResolutions
    };
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolver();