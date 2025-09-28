// Operational Transform Engine
// Core implementation of operational transformation algorithms for real-time collaboration

import {
  Operation,
  InsertOperation,
  DeleteOperation,
  RetainOperation,
  FormatOperation,
  TransformResult,
  TransformPair,
  OperationContext,
  ConflictInfo,
  DocumentState,
  VectorClock,
  PositionMapping,
  OperationError,
  TransformError,
  ValidationResult,
  ValidationError as ValidationErrorType,
  OPERATION_DEFAULTS,
  CONFLICT_PRIORITIES,
  isInsertOperation,
  isDeleteOperation,
  isRetainOperation,
  isFormatOperation,
  compareVectorClocks,
  calculateChecksum,
  createOperationId
} from './OperationTypes';

export class OperationalTransform {
  private static instance: OperationalTransform;
  private transformCache = new Map<string, TransformResult>();
  private positionMappings = new Map<string, PositionMapping[]>();

  // Singleton pattern for consistent transform behavior
  static getInstance(): OperationalTransform {
    if (!OperationalTransform.instance) {
      OperationalTransform.instance = new OperationalTransform();
    }
    return OperationalTransform.instance;
  }

  /**
   * Main transformation function implementing operational transform
   * T(op1, op2) -> (op1', op2') where op1' can be applied after op2 and op2' can be applied after op1
   */
  transform(op1: Operation, op2: Operation, context?: OperationContext): TransformPair {
    try {
      // Validate operations
      this.validateOperation(op1);
      this.validateOperation(op2);

      // Check cache first
      const cacheKey = this.getCacheKey(op1, op2);
      const cachedResult = this.transformCache.get(cacheKey);
      if (cachedResult) {
        return this.createTransformPair(op1, op2, cachedResult.transformed, cachedResult.transformed);
      }

      // Determine operation priority based on vector clocks and user IDs
      const priority = this.determinePriority(op1, op2);

      // Apply transformation based on operation types
      const result = this.performTransformation(op1, op2, priority, context);

      // Cache the result
      this.transformCache.set(cacheKey, result);

      return this.createTransformPair(op1, op2, result.transformed, result.transformed, priority);
    } catch (error) {
      throw new TransformError(
        `Transform failed: ${error instanceof Error ? error.message : error}`,
        op1,
        op2,
        context
      );
    }
  }

  /**
   * Transform an operation against a series of operations
   */
  transformAgainstOperations(
    operation: Operation,
    operations: Operation[],
    context?: OperationContext
  ): Operation {
    let transformedOp = { ...operation };

    for (const op of operations) {
      const transformResult = this.transform(transformedOp, op, context);
      transformedOp = transformResult.transformed1;
    }

    return transformedOp;
  }

  /**
   * Apply an operation to a document state
   */
  applyOperation(operation: Operation, documentState: DocumentState): DocumentState {
    const newState = { ...documentState };

    try {
      switch (operation.type) {
        case 'insert':
          newState.content = this.applyInsert(operation, newState.content);
          break;
        case 'delete':
          newState.content = this.applyDelete(operation, newState.content);
          break;
        case 'retain':
          // Retain operations don't change content, only formatting
          break;
        case 'format':
          this.applyFormatting(operation, newState);
          break;
      }

      // Update document metadata
      newState.version++;
      newState.lastModified = Date.now();
      newState.checksum = calculateChecksum(newState.content);

      return newState;
    } catch (error) {
      throw new OperationError(
        `Failed to apply operation: ${error instanceof Error ? error.message : error}`,
        'APPLY_FAILED',
        operation
      );
    }
  }

  /**
   * Generate inverse operation for undo functionality
   */
  generateInverse(operation: Operation, documentState: DocumentState): Operation {
    const baseMetadata = {
      ...operation.metadata,
      operationId: createOperationId(),
      parentOperationId: operation.metadata.operationId
    };

    switch (operation.type) {
      case 'insert':
        return {
          type: 'delete',
          position: operation.position,
          length: operation.content.length,
          deletedContent: operation.content,
          metadata: baseMetadata
        };

      case 'delete':
        const deletedContent = documentState.content.substr(operation.position, operation.length);
        return {
          type: 'insert',
          position: operation.position,
          content: deletedContent,
          attributes: operation.deletedContent ? undefined : {},
          metadata: baseMetadata
        };

      case 'format':
        return {
          type: 'format',
          position: operation.position,
          length: operation.length,
          attributes: operation.oldAttributes || {},
          oldAttributes: operation.attributes,
          metadata: baseMetadata
        };

      case 'retain':
        // Retain operations are typically not reversible
        return operation;
    }
  }

  /**
   * Validate operation structure and constraints
   */
  validateOperation(operation: Operation): ValidationResult {
    const errors: ValidationErrorType[] = [];
    const warnings: ValidationErrorType[] = [];

    // Basic structure validation
    if (!operation.type || !operation.metadata) {
      errors.push({
        code: 'INVALID_STRUCTURE',
        message: 'Operation missing required fields',
        severity: 'error'
      });
    }

    // Position validation
    if ('position' in operation && operation.position < 0) {
      errors.push({
        code: 'INVALID_POSITION',
        message: 'Position cannot be negative',
        field: 'position',
        severity: 'error'
      });
    }

    // Content length validation
    if (isInsertOperation(operation) && operation.content.length > OPERATION_DEFAULTS.MAX_CONTENT_LENGTH) {
      errors.push({
        code: 'CONTENT_TOO_LONG',
        message: `Content exceeds maximum length of ${OPERATION_DEFAULTS.MAX_CONTENT_LENGTH}`,
        field: 'content',
        severity: 'error'
      });
    }

    // Delete length validation
    if (isDeleteOperation(operation) && operation.length <= 0) {
      errors.push({
        code: 'INVALID_DELETE_LENGTH',
        message: 'Delete length must be positive',
        field: 'length',
        severity: 'error'
      });
    }

    // Metadata validation
    if (!operation.metadata.operationId || !operation.metadata.userId) {
      errors.push({
        code: 'MISSING_METADATA',
        message: 'Operation missing required metadata',
        severity: 'error'
      });
    }

    // Performance warnings
    if (isInsertOperation(operation) && operation.content.length > 1000) {
      warnings.push({
        code: 'LARGE_CONTENT',
        message: 'Large content insertions may impact performance',
        suggestion: 'Consider breaking into smaller operations'
      });
    }

    if (errors.length > 0) {
      throw new ValidationError('Operation validation failed', {
        valid: false,
        errors,
        warnings
      }, operation);
    }

    return {
      valid: true,
      errors,
      warnings
    };
  }

  // Private transformation methods

  private performTransformation(
    op1: Operation,
    op2: Operation,
    priority: 'op1' | 'op2' | 'equal',
    context?: OperationContext
  ): TransformResult {
    // Transform based on operation type combinations
    if (isInsertOperation(op1) && isInsertOperation(op2)) {
      return this.transformInsertInsert(op1, op2, priority);
    }
    if (isInsertOperation(op1) && isDeleteOperation(op2)) {
      return this.transformInsertDelete(op1, op2, priority);
    }
    if (isDeleteOperation(op1) && isInsertOperation(op2)) {
      return this.transformDeleteInsert(op1, op2, priority);
    }
    if (isDeleteOperation(op1) && isDeleteOperation(op2)) {
      return this.transformDeleteDelete(op1, op2, priority);
    }
    if (isFormatOperation(op1) || isFormatOperation(op2)) {
      return this.transformFormat(op1, op2, priority);
    }
    if (isRetainOperation(op1) || isRetainOperation(op2)) {
      return this.transformRetain(op1, op2, priority);
    }

    // Default case - no transformation needed
    return {
      transformed: op1,
      applied: true,
      conflicts: []
    };
  }

  private transformInsertInsert(
    op1: InsertOperation,
    op2: InsertOperation,
    priority: 'op1' | 'op2' | 'equal'
  ): TransformResult {
    let transformedOp = { ...op1 };
    const conflicts: ConflictInfo[] = [];

    if (op1.position === op2.position) {
      // Concurrent inserts at same position
      conflicts.push({
        type: 'concurrent_edit',
        description: 'Concurrent inserts at same position',
        originalOperation: op1,
        conflictingOperation: op2,
        resolution: 'auto_resolved'
      });

      // Use priority to determine order
      if (priority === 'op2') {
        transformedOp.position += op2.content.length;
      }
      // If priority is 'op1' or 'equal', op1 goes first (no position change)
    } else if (op1.position > op2.position) {
      // op2 inserts before op1, shift op1 position
      transformedOp.position += op2.content.length;
    }
    // If op1.position < op2.position, no transformation needed

    return {
      transformed: transformedOp,
      applied: true,
      conflicts
    };
  }

  private transformInsertDelete(
    insert: InsertOperation,
    deleteOp: DeleteOperation,
    priority: 'op1' | 'op2' | 'equal'
  ): TransformResult {
    let transformedOp = { ...insert };
    const conflicts: ConflictInfo[] = [];

    const deleteEnd = deleteOp.position + deleteOp.length;

    if (insert.position <= deleteOp.position) {
      // Insert before delete range, shift delete position
      // No change to insert operation
    } else if (insert.position >= deleteEnd) {
      // Insert after delete range, shift insert position
      transformedOp.position -= deleteOp.length;
    } else {
      // Insert within delete range - conflict
      conflicts.push({
        type: 'deletion_conflict',
        description: 'Insert position within deleted range',
        originalOperation: insert,
        conflictingOperation: deleteOp,
        resolution: 'auto_resolved'
      });

      // Resolve by placing insert at delete position
      transformedOp.position = deleteOp.position;
    }

    return {
      transformed: transformedOp,
      applied: true,
      conflicts
    };
  }

  private transformDeleteInsert(
    deleteOp: DeleteOperation,
    insert: InsertOperation,
    priority: 'op1' | 'op2' | 'equal'
  ): TransformResult {
    let transformedOp = { ...deleteOp };
    const conflicts: ConflictInfo[] = [];

    if (insert.position <= deleteOp.position) {
      // Insert before delete range, shift delete position
      transformedOp.position += insert.content.length;
    } else if (insert.position >= deleteOp.position + deleteOp.length) {
      // Insert after delete range, no change to delete
    } else {
      // Insert within delete range - split delete
      conflicts.push({
        type: 'concurrent_edit',
        description: 'Insert within delete range',
        originalOperation: deleteOp,
        conflictingOperation: insert,
        resolution: 'auto_resolved'
      });

      // Adjust delete length to account for insert
      const insertOffset = insert.position - deleteOp.position;
      transformedOp.length += insert.content.length;
    }

    return {
      transformed: transformedOp,
      applied: true,
      conflicts
    };
  }

  private transformDeleteDelete(
    op1: DeleteOperation,
    op2: DeleteOperation,
    priority: 'op1' | 'op2' | 'equal'
  ): TransformResult {
    let transformedOp = { ...op1 };
    const conflicts: ConflictInfo[] = [];

    const op1End = op1.position + op1.length;
    const op2End = op2.position + op2.length;

    // Check for overlapping delete ranges
    if (op1.position >= op2End) {
      // op1 after op2, shift position
      transformedOp.position -= op2.length;
    } else if (op1End <= op2.position) {
      // op1 before op2, no change
    } else {
      // Overlapping deletes - complex case
      conflicts.push({
        type: 'deletion_conflict',
        description: 'Overlapping delete operations',
        originalOperation: op1,
        conflictingOperation: op2,
        resolution: 'auto_resolved'
      });

      // Calculate new delete range
      const newStart = Math.min(op1.position, op2.position);
      const newEnd = Math.max(op1End, op2End) - op2.length;

      transformedOp.position = newStart;
      transformedOp.length = Math.max(0, newEnd - newStart);

      if (transformedOp.length === 0) {
        // Delete was completely consumed
        return {
          transformed: transformedOp,
          applied: false,
          conflicts
        };
      }
    }

    return {
      transformed: transformedOp,
      applied: true,
      conflicts
    };
  }

  private transformFormat(
    op1: Operation,
    op2: Operation,
    priority: 'op1' | 'op2' | 'equal'
  ): TransformResult {
    // Format operations need to handle position shifts and attribute merging
    let transformedOp = { ...op1 };
    const conflicts: ConflictInfo[] = [];

    if (isFormatOperation(op1) && isFormatOperation(op2)) {
      // Handle overlapping format operations
      const op1End = op1.position + op1.length;
      const op2End = op2.position + op2.length;

      if (op1.position < op2End && op1End > op2.position) {
        // Overlapping format operations
        conflicts.push({
          type: 'format_conflict',
          description: 'Overlapping format operations',
          originalOperation: op1,
          conflictingOperation: op2,
          resolution: 'auto_resolved'
        });

        // Merge attributes based on priority
        if (isFormatOperation(transformedOp)) {
          transformedOp.attributes = {
            ...op2.attributes,
            ...op1.attributes // op1 takes precedence
          };
        }
      }
    } else if (isFormatOperation(op1) && (isInsertOperation(op2) || isDeleteOperation(op2))) {
      // Adjust format position based on content changes
      if (isInsertOperation(op2) && op2.position <= op1.position) {
        if (isFormatOperation(transformedOp)) {
          transformedOp.position += op2.content.length;
        }
      } else if (isDeleteOperation(op2) && op2.position <= op1.position) {
        if (isFormatOperation(transformedOp)) {
          transformedOp.position = Math.max(op2.position, transformedOp.position - op2.length);
        }
      }
    }

    return {
      transformed: transformedOp,
      applied: true,
      conflicts
    };
  }

  private transformRetain(
    op1: Operation,
    op2: Operation,
    priority: 'op1' | 'op2' | 'equal'
  ): TransformResult {
    // Retain operations maintain text unchanged but may need position adjustments
    let transformedOp = { ...op1 };
    const conflicts: ConflictInfo[] = [];

    if (isRetainOperation(op1)) {
      if (isInsertOperation(op2) && op2.position <= op1.position) {
        transformedOp.position += op2.content.length;
      } else if (isDeleteOperation(op2) && op2.position <= op1.position) {
        transformedOp.position = Math.max(op2.position, transformedOp.position - op2.length);
      }
    }

    return {
      transformed: transformedOp,
      applied: true,
      conflicts
    };
  }

  private determinePriority(op1: Operation, op2: Operation): 'op1' | 'op2' | 'equal' {
    // Priority based on vector clocks
    const clockComparison = compareVectorClocks(
      op1.metadata.vectorClock,
      op2.metadata.vectorClock
    );

    if (clockComparison === 'before') return 'op1';
    if (clockComparison === 'after') return 'op2';

    // If concurrent, use timestamp
    if (op1.metadata.timestamp !== op2.metadata.timestamp) {
      return op1.metadata.timestamp < op2.metadata.timestamp ? 'op1' : 'op2';
    }

    // If same timestamp, use user ID as tiebreaker
    if (op1.metadata.userId !== op2.metadata.userId) {
      return op1.metadata.userId < op2.metadata.userId ? 'op1' : 'op2';
    }

    // If same user (shouldn't happen), use operation ID
    return op1.metadata.operationId < op2.metadata.operationId ? 'op1' : 'op2';
  }

  private applyInsert(operation: InsertOperation, content: string): string {
    if (operation.position > content.length) {
      throw new OperationError('Insert position beyond content length', 'INVALID_POSITION', operation);
    }

    return (
      content.slice(0, operation.position) +
      operation.content +
      content.slice(operation.position)
    );
  }

  private applyDelete(operation: DeleteOperation, content: string): string {
    if (operation.position + operation.length > content.length) {
      throw new OperationError('Delete range beyond content length', 'INVALID_RANGE', operation);
    }

    return (
      content.slice(0, operation.position) +
      content.slice(operation.position + operation.length)
    );
  }

  private applyFormatting(operation: FormatOperation, documentState: DocumentState): void {
    // Apply formatting to the formatting map
    for (let i = operation.position; i < operation.position + operation.length; i++) {
      if (!documentState.formatting[i]) {
        documentState.formatting[i] = {};
      }
      documentState.formatting[i] = {
        ...documentState.formatting[i],
        ...operation.attributes
      };
    }
  }

  private getCacheKey(op1: Operation, op2: Operation): string {
    return `${op1.metadata.operationId}_${op2.metadata.operationId}`;
  }

  private createTransformPair(
    op1: Operation,
    op2: Operation,
    transformed1: Operation,
    transformed2: Operation,
    priority: 'op1' | 'op2' | 'equal' = 'equal'
  ): TransformPair {
    return {
      op1,
      op2,
      transformed1,
      transformed2,
      priority
    };
  }

  // Utility methods

  /**
   * Clear transformation cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.transformCache.clear();
    this.positionMappings.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.transformCache.size,
      hits: 0, // Would need to track this in a real implementation
      misses: 0 // Would need to track this in a real implementation
    };
  }

  /**
   * Compress operation history by merging compatible operations
   */
  compressOperations(operations: Operation[]): Operation[] {
    const compressed: Operation[] = [];
    let current: Operation | null = null;

    for (const op of operations) {
      if (!current) {
        current = { ...op };
        continue;
      }

      // Try to merge operations
      const merged = this.tryMergeOperations(current, op);
      if (merged) {
        current = merged;
      } else {
        compressed.push(current);
        current = { ...op };
      }
    }

    if (current) {
      compressed.push(current);
    }

    return compressed;
  }

  private tryMergeOperations(op1: Operation, op2: Operation): Operation | null {
    // Only merge operations from same user
    if (op1.metadata.userId !== op2.metadata.userId) {
      return null;
    }

    // Merge consecutive inserts
    if (isInsertOperation(op1) && isInsertOperation(op2)) {
      if (op1.position + op1.content.length === op2.position) {
        return {
          ...op1,
          content: op1.content + op2.content,
          metadata: {
            ...op2.metadata,
            parentOperationId: op1.metadata.operationId
          }
        };
      }
    }

    // Merge consecutive deletes
    if (isDeleteOperation(op1) && isDeleteOperation(op2)) {
      if (op1.position === op2.position) {
        return {
          ...op1,
          length: op1.length + op2.length,
          deletedContent: (op1.deletedContent || '') + (op2.deletedContent || ''),
          metadata: {
            ...op2.metadata,
            parentOperationId: op1.metadata.operationId
          }
        };
      }
    }

    return null;
  }
}

// Export singleton instance
export const operationalTransform = OperationalTransform.getInstance();