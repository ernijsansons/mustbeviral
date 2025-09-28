// Distributed State Synchronization Manager
// Manages document state across multiple clients with operational transform

import {
  Operation,
  DocumentState,
  CollaborationSession,
  SessionParticipant,
  CursorPosition,
  VectorClock,
  OperationMetadata,
  CollaborationEvent,
  CollaborationEventType,
  UndoRedoState,
  OperationError,
  ValidationResult,
  createOperationId,
  createSessionId,
  calculateChecksum,
  compareVectorClocks,
  OPERATION_DEFAULTS
} from './OperationTypes';

import { operationalTransform } from './OperationalTransform';

export interface StateManagerConfig {
  maxConcurrentOperations: number;
  operationTimeout: number;
  syncInterval: number;
  maxHistorySize: number;
  autoSaveInterval: number;
  enableCompression: boolean;
  conflictResolutionStrategy: 'client_wins' | 'server_wins' | 'merge';
}

export interface SynchronizationResult {
  success: boolean;
  appliedOperations: Operation[];
  rejectedOperations: Operation[];
  conflicts: Array<{ operation: Operation; reason: string }>;
  newDocumentState: DocumentState;
  synchronizationId: string;
}

export interface StateSnapshot {
  documentState: DocumentState;
  operationHistory: Operation[];
  vectorClock: VectorClock;
  participants: Map<string, SessionParticipant>;
  cursors: Map<string, CursorPosition>;
  timestamp: number;
  checksum: string;
}

export class StateManager {
  private sessions = new Map<string, CollaborationSession>();
  private pendingOperations = new Map<string, Operation[]>();
  private vectorClocks = new Map<string, VectorClock>();
  private undoRedoStates = new Map<string, UndoRedoState>();
  private eventListeners = new Map<CollaborationEventType, Array<(event: CollaborationEvent) => void>>();
  private syncTimers = new Map<string, NodeJS.Timeout>();
  private config: StateManagerConfig;

  constructor(config: Partial<StateManagerConfig> = {}) {
    this.config = {
      maxConcurrentOperations: config.maxConcurrentOperations || OPERATION_DEFAULTS.MAX_CONCURRENT_OPERATIONS,
      operationTimeout: config.operationTimeout || OPERATION_DEFAULTS.OPERATION_TIMEOUT,
      syncInterval: config.syncInterval || OPERATION_DEFAULTS.SYNC_INTERVAL,
      maxHistorySize: config.maxHistorySize || OPERATION_DEFAULTS.MAX_HISTORY_SIZE,
      autoSaveInterval: config.autoSaveInterval || OPERATION_DEFAULTS.AUTO_SAVE_INTERVAL,
      enableCompression: config.enableCompression ?? true,
      conflictResolutionStrategy: config.conflictResolutionStrategy || 'merge'
    };
  }

  /**
   * Create a new collaboration session
   */
  async createSession(
    documentId: string,
    initialState: DocumentState,
    owner: SessionParticipant
  ): Promise<CollaborationSession> {
    const sessionId = createSessionId();

    const session: CollaborationSession = {
      sessionId,
      documentId,
      participants: [owner],
      documentState: { ...initialState },
      operationHistory: [],
      activeOperations: new Map(),
      cursors: new Map(),
      created: Date.now(),
      lastActivity: Date.now(),
      maxParticipants: 100,
      settings: {
        maxConcurrentOperations: this.config.maxConcurrentOperations,
        operationTimeout: this.config.operationTimeout,
        autoSaveInterval: this.config.autoSaveInterval,
        conflictResolutionStrategy: this.config.conflictResolutionStrategy,
        enableRealTimeCursors: true,
        enableOperationHistory: true,
        maxHistorySize: this.config.maxHistorySize,
        compressionEnabled: this.config.enableCompression
      }
    };

    this.sessions.set(sessionId, session);
    this.vectorClocks.set(sessionId, { [owner.userId]: 0 });
    this.undoRedoStates.set(sessionId, {
      undoStack: [],
      redoStack: [],
      maxStackSize: 50,
      currentVersion: initialState.version
    });

    // Start auto-sync timer
    this.startAutoSync(sessionId);

    this.emitEvent('participant_joined', sessionId, owner.userId, { participant: owner });

    return session;
  }

  /**
   * Join an existing collaboration session
   */
  async joinSession(sessionId: string, participant: SessionParticipant): Promise<CollaborationSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check participant limits
    if (session.participants.length >= session.maxParticipants) {
      throw new OperationError('Session at capacity', 'SESSION_FULL');
    }

    // Check if user already in session
    const existingParticipant = session.participants.find(p => p.userId === participant.userId);
    if (existingParticipant) {
      // Update existing participant status
      existingParticipant.status = 'active';
      existingParticipant.lastSeen = Date.now();
    } else {
      // Add new participant
      session.participants.push(participant);

      // Initialize vector clock for new participant
      const vectorClock = this.vectorClocks.get(sessionId) || {};
      vectorClock[participant.userId] = 0;
      this.vectorClocks.set(sessionId, vectorClock);
    }

    session.lastActivity = Date.now();

    this.emitEvent('participant_joined', sessionId, participant.userId, { participant });

    return session;
  }

  /**
   * Leave a collaboration session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Remove participant
    session.participants = session.participants.filter(p => p.userId !== userId);

    // Remove cursor
    session.cursors.delete(userId);

    // Remove from vector clock
    const vectorClock = this.vectorClocks.get(sessionId);
    if (vectorClock) {
      delete vectorClock[userId];
    }

    session.lastActivity = Date.now();

    this.emitEvent('participant_left', sessionId, userId, { userId });

    // Clean up session if empty
    if (session.participants.length === 0) {
      await this.cleanupSession(sessionId);
    }
  }

  /**
   * Apply an operation to a session
   */
  async applyOperation(
    sessionId: string,
    operation: Operation,
    userId: string
  ): Promise<SynchronizationResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new OperationError('Session not found', 'SESSION_NOT_FOUND', operation);
    }

    // Validate user permissions
    const participant = session.participants.find(p => p.userId === userId);
    if (!participant || !participant.permissions.canEdit) {
      throw new OperationError('Insufficient permissions', 'PERMISSION_DENIED', operation);
    }

    // Validate operation
    const validationResult = operationalTransform.validateOperation(operation);
    if (!validationResult.valid) {
      throw new OperationError('Invalid operation', 'VALIDATION_FAILED', operation);
    }

    try {
      // Update vector clock
      const vectorClock = this.vectorClocks.get(sessionId) || {};
      vectorClock[userId] = (vectorClock[userId] || 0) + 1;
      operation.metadata.vectorClock = { ...vectorClock };
      this.vectorClocks.set(sessionId, vectorClock);

      // Get pending operations that need to be transformed against
      const pendingOps = this.getPendingOperations(sessionId, operation);

      // Transform operation against pending operations
      const transformedOperation = operationalTransform.transformAgainstOperations(
        operation,
        pendingOps,
        {
          documentState: session.documentState,
          precedingOperations: session.operationHistory,
          concurrentOperations: pendingOps,
          userContext: {
            userId,
            permissions: participant.permissions
          }
        }
      );

      // Apply the transformed operation
      const newDocumentState = operationalTransform.applyOperation(transformedOperation, session.documentState);

      // Update session state
      session.documentState = newDocumentState;
      session.operationHistory.push(transformedOperation);
      session.lastActivity = Date.now();

      // Update undo/redo state
      this.updateUndoRedoState(sessionId, transformedOperation);

      // Compress history if needed
      if (this.config.enableCompression && session.operationHistory.length > this.config.maxHistorySize) {
        session.operationHistory = operationalTransform.compressOperations(session.operationHistory);
      }

      // Remove from pending operations
      this.removePendingOperation(sessionId, operation.metadata.operationId);

      const result: SynchronizationResult = {
        success: true,
        appliedOperations: [transformedOperation],
        rejectedOperations: [],
        conflicts: [],
        newDocumentState,
        synchronizationId: createOperationId()
      };

      // Emit events
      this.emitEvent('operation_applied', sessionId, userId, {
        operation: transformedOperation,
        documentState: newDocumentState
      });

      return result;

    } catch (error) {
      const result: SynchronizationResult = {
        success: false,
        appliedOperations: [],
        rejectedOperations: [operation],
        conflicts: [{ operation, reason: error instanceof Error ? error.message : 'Unknown error' }],
        newDocumentState: session.documentState,
        synchronizationId: createOperationId()
      };

      this.emitEvent('operation_rejected', sessionId, userId, {
        operation,
        error: error instanceof Error ? error.message : error
      });

      return result;
    }
  }

  /**
   * Synchronize multiple operations from different clients
   */
  async synchronizeOperations(
    sessionId: string,
    operations: Operation[]
  ): Promise<SynchronizationResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new OperationError('Session not found', 'SESSION_NOT_FOUND');
    }

    const appliedOperations: Operation[] = [];
    const rejectedOperations: Operation[] = [];
    const conflicts: Array<{ operation: Operation; reason: string }> = [];

    // Sort operations by vector clock and timestamp
    const sortedOperations = this.sortOperationsByPrecedence(operations);

    for (const operation of sortedOperations) {
      try {
        const result = await this.applyOperation(sessionId, operation, operation.metadata.userId);
        appliedOperations.push(...result.appliedOperations);
        rejectedOperations.push(...result.rejectedOperations);
        conflicts.push(...result.conflicts);
      } catch (error) {
        rejectedOperations.push(operation);
        conflicts.push({
          operation,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const result: SynchronizationResult = {
      success: rejectedOperations.length === 0,
      appliedOperations,
      rejectedOperations,
      conflicts,
      newDocumentState: session.documentState,
      synchronizationId: createOperationId()
    };

    this.emitEvent('synchronization_complete', sessionId, undefined, result);

    return result;
  }

  /**
   * Update cursor position for a user
   */
  async updateCursor(sessionId: string, userId: string, cursor: CursorPosition): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    cursor.userId = userId;
    cursor.timestamp = Date.now();
    session.cursors.set(userId, cursor);
    session.lastActivity = Date.now();

    this.emitEvent('cursor_updated', sessionId, userId, { cursor });
  }

  /**
   * Get current state snapshot
   */
  getStateSnapshot(sessionId: string): StateSnapshot | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const vectorClock = this.vectorClocks.get(sessionId) || {};

    return {
      documentState: { ...session.documentState },
      operationHistory: [...session.operationHistory],
      vectorClock: { ...vectorClock },
      participants: new Map(session.participants.map(p => [p.userId, { ...p }])),
      cursors: new Map([...session.cursors]),
      timestamp: Date.now(),
      checksum: calculateChecksum(JSON.stringify({
        content: session.documentState.content,
        version: session.documentState.version,
        vectorClock
      }))
    };
  }

  /**
   * Restore state from snapshot
   */
  async restoreFromSnapshot(sessionId: string, snapshot: StateSnapshot): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new OperationError('Session not found', 'SESSION_NOT_FOUND');
    }

    // Validate snapshot integrity
    const expectedChecksum = calculateChecksum(JSON.stringify({
      content: snapshot.documentState.content,
      version: snapshot.documentState.version,
      vectorClock: snapshot.vectorClock
    }));

    if (expectedChecksum !== snapshot.checksum) {
      throw new OperationError('Snapshot checksum mismatch', 'INVALID_SNAPSHOT');
    }

    // Restore state
    session.documentState = { ...snapshot.documentState };
    session.operationHistory = [...snapshot.operationHistory];
    session.cursors = new Map([...snapshot.cursors]);
    this.vectorClocks.set(sessionId, { ...snapshot.vectorClock });

    this.emitEvent('synchronization_complete', sessionId, undefined, {
      success: true,
      appliedOperations: [],
      rejectedOperations: [],
      conflicts: [],
      newDocumentState: session.documentState,
      synchronizationId: createOperationId()
    });
  }

  /**
   * Perform undo operation
   */
  async undo(sessionId: string, userId: string): Promise<Operation | null> {
    const undoRedoState = this.undoRedoStates.get(sessionId);
    if (!undoRedoState || undoRedoState.undoStack.length === 0) {
      return null;
    }

    const lastOperation = undoRedoState.undoStack.pop()!;
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Generate inverse operation
    const inverseOperation = operationalTransform.generateInverse(lastOperation, session.documentState);

    // Apply inverse operation
    await this.applyOperation(sessionId, inverseOperation, userId);

    // Move to redo stack
    undoRedoState.redoStack.push(lastOperation);

    return inverseOperation;
  }

  /**
   * Perform redo operation
   */
  async redo(sessionId: string, userId: string): Promise<Operation | null> {
    const undoRedoState = this.undoRedoStates.get(sessionId);
    if (!undoRedoState || undoRedoState.redoStack.length === 0) {
      return null;
    }

    const redoOperation = undoRedoState.redoStack.pop()!;

    // Apply redo operation
    await this.applyOperation(sessionId, redoOperation, userId);

    return redoOperation;
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: CollaborationEventType, listener: (event: CollaborationEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: CollaborationEventType, listener: (event: CollaborationEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): {
    participantCount: number;
    operationCount: number;
    documentSize: number;
    lastActivity: number;
    syncStatus: 'synced' | 'syncing' | 'conflict';
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      participantCount: session.participants.length,
      operationCount: session.operationHistory.length,
      documentSize: session.documentState.content.length,
      lastActivity: session.lastActivity,
      syncStatus: this.pendingOperations.has(sessionId) && this.pendingOperations.get(sessionId)!.length > 0
        ? 'syncing'
        : 'synced'
    };
  }

  // Private helper methods

  private getPendingOperations(sessionId: string, excludeOperation?: Operation): Operation[] {
    const pending = this.pendingOperations.get(sessionId) || [];
    if (excludeOperation) {
      return pending.filter(op => op.metadata.operationId !== excludeOperation.metadata.operationId);
    }
    return pending;
  }

  private addPendingOperation(sessionId: string, operation: Operation): void {
    if (!this.pendingOperations.has(sessionId)) {
      this.pendingOperations.set(sessionId, []);
    }
    this.pendingOperations.get(sessionId)!.push(operation);

    // Set timeout for operation
    setTimeout(() => {
      this.removePendingOperation(sessionId, operation.metadata.operationId);
    }, this.config.operationTimeout);
  }

  private removePendingOperation(sessionId: string, operationId: string): void {
    const pending = this.pendingOperations.get(sessionId);
    if (pending) {
      const index = pending.findIndex(op => op.metadata.operationId === operationId);
      if (index > -1) {
        pending.splice(index, 1);
      }
    }
  }

  private sortOperationsByPrecedence(operations: Operation[]): Operation[] {
    return operations.sort((a, b) => {
      const clockComparison = compareVectorClocks(a.metadata.vectorClock, b.metadata.vectorClock);

      if (clockComparison === 'before') return -1;
      if (clockComparison === 'after') return 1;

      // If concurrent, sort by timestamp
      if (a.metadata.timestamp !== b.metadata.timestamp) {
        return a.metadata.timestamp - b.metadata.timestamp;
      }

      // If same timestamp, sort by user ID for consistency
      return a.metadata.userId.localeCompare(b.metadata.userId);
    });
  }

  private updateUndoRedoState(sessionId: string, operation: Operation): void {
    const undoRedoState = this.undoRedoStates.get(sessionId);
    if (!undoRedoState) {
      return;
    }

    // Add to undo stack
    undoRedoState.undoStack.push(operation);

    // Clear redo stack on new operation
    undoRedoState.redoStack = [];

    // Limit stack size
    if (undoRedoState.undoStack.length > undoRedoState.maxStackSize) {
      undoRedoState.undoStack.shift();
    }
  }

  private startAutoSync(sessionId: string): void {
    const timer = setInterval(async () => {
      const session = this.sessions.get(sessionId);
      if (!session) {
        clearInterval(timer);
        this.syncTimers.delete(sessionId);
        return;
      }

      // Auto-save if needed
      const timeSinceLastActivity = Date.now() - session.lastActivity;
      if (timeSinceLastActivity > this.config.autoSaveInterval) {
        this.emitEvent('document_saved', sessionId, undefined, {
          documentState: session.documentState,
          timestamp: Date.now()
        });
      }
    }, this.config.syncInterval);

    this.syncTimers.set(sessionId, timer);
  }

  private async cleanupSession(sessionId: string): Promise<void> {
    // Stop auto-sync timer
    const timer = this.syncTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.syncTimers.delete(sessionId);
    }

    // Clean up state
    this.sessions.delete(sessionId);
    this.pendingOperations.delete(sessionId);
    this.vectorClocks.delete(sessionId);
    this.undoRedoStates.delete(sessionId);
  }

  private emitEvent(
    type: CollaborationEventType,
    sessionId: string,
    userId?: string,
    data?: any
  ): void {
    const event: CollaborationEvent = {
      type,
      sessionId,
      userId,
      timestamp: Date.now(),
      data
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const stateManager = new StateManager();