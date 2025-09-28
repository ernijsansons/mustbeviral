// Collaboration Session Management
// High-level session management with WebSocket integration and real-time coordination

import {
  Operation,
  DocumentState,
  CollaborationSession,
  SessionParticipant,
  CursorPosition,
  Selection,
  CollaborationEvent,
  CollaborationEventType,
  OperationMetadata,
  UndoRedoState,
  createOperationId,
  createSessionId,
  generateUserColor,
  OPERATION_DEFAULTS
} from './OperationTypes';

import { stateManager, StateManagerConfig, SynchronizationResult } from './StateManager';
import { conflictResolver, ConflictResolutionStrategy, MergeContext } from './ConflictResolver';

export interface SessionManagerConfig extends StateManagerConfig {
  enablePresenceTracking: boolean;
  cursorSyncInterval: number;
  presenceTimeout: number;
  maxSessionDuration: number;
  enableSessionRecording: boolean;
  autoCleanupInactiveSessions: boolean;
}

export interface SessionEventHandlers {
  onParticipantJoined?: (participant: SessionParticipant) => void;
  onParticipantLeft?: (userId: string) => void;
  onOperationApplied?: (operation: Operation) => void;
  onConflictResolved?: (conflictId: string) => void;
  onCursorUpdated?: (cursor: CursorPosition) => void;
  onDocumentSaved?: (documentState: DocumentState) => void;
  onError?: (error: Error) => void;
}

export interface CollaborationSessionManager {
  // Session lifecycle
  createSession(documentId: string, initialContent: string, owner: SessionParticipant): Promise<string>;
  joinSession(sessionId: string, participant: SessionParticipant): Promise<CollaborationSession | null>;
  leaveSession(sessionId: string, userId: string): Promise<void>;
  getSession(sessionId: string): CollaborationSession | null;

  // Operations
  applyOperation(sessionId: string, operation: Operation): Promise<SynchronizationResult>;
  undoLastOperation(sessionId: string, userId: string): Promise<Operation | null>;
  redoLastOperation(sessionId: string, userId: string): Promise<Operation | null>;

  // Real-time features
  updateCursor(sessionId: string, userId: string, position: number, selection?: Selection): Promise<void>;
  updatePresence(sessionId: string, userId: string, status: 'active' | 'idle' | 'away'): Promise<void>;

  // Utilities
  exportSession(sessionId: string): Promise<SessionExport>;
  getSessionMetrics(sessionId: string): SessionMetrics;
}

export interface SessionExport {
  sessionId: string;
  documentId: string;
  finalContent: string;
  operationHistory: Operation[];
  participants: SessionParticipant[];
  metrics: SessionMetrics;
  exportedAt: number;
}

export interface SessionMetrics {
  duration: number;
  operationCount: number;
  participantCount: number;
  conflictCount: number;
  averageResolutionTime: number;
  collaborationEfficiency: number; // 0-1 score
}

export class CollaborationSessionManagerImpl implements CollaborationSessionManager {
  private config: SessionManagerConfig;
  private eventHandlers: SessionEventHandlers = {};
  private cursorSyncTimers = new Map<string, NodeJS.Timeout>();
  private presenceTimers = new Map<string, NodeJS.Timeout>();
  private sessionMetrics = new Map<string, SessionMetrics>();

  constructor(config: Partial<SessionManagerConfig> = {}) {
    this.config = {
      // StateManager config
      maxConcurrentOperations: config.maxConcurrentOperations || OPERATION_DEFAULTS.MAX_CONCURRENT_OPERATIONS,
      operationTimeout: config.operationTimeout || OPERATION_DEFAULTS.OPERATION_TIMEOUT,
      syncInterval: config.syncInterval || OPERATION_DEFAULTS.SYNC_INTERVAL,
      maxHistorySize: config.maxHistorySize || OPERATION_DEFAULTS.MAX_HISTORY_SIZE,
      autoSaveInterval: config.autoSaveInterval || OPERATION_DEFAULTS.AUTO_SAVE_INTERVAL,
      enableCompression: config.enableCompression ?? true,
      conflictResolutionStrategy: config.conflictResolutionStrategy || 'merge',

      // Session-specific config
      enablePresenceTracking: config.enablePresenceTracking ?? true,
      cursorSyncInterval: config.cursorSyncInterval || OPERATION_DEFAULTS.CURSOR_UPDATE_THROTTLE,
      presenceTimeout: config.presenceTimeout || 300000, // 5 minutes
      maxSessionDuration: config.maxSessionDuration || 86400000, // 24 hours
      enableSessionRecording: config.enableSessionRecording ?? true,
      autoCleanupInactiveSessions: config.autoCleanupInactiveSessions ?? true
    };

    this.setupEventListeners();
  }

  /**
   * Create a new collaboration session
   */
  async createSession(
    documentId: string,
    initialContent: string,
    owner: SessionParticipant
  ): Promise<string> {
    try {
      // Create initial document state
      const initialState: DocumentState = {
        id: documentId,
        content: initialContent,
        version: 1,
        checksum: this.calculateContentHash(initialContent),
        lastModified: Date.now(),
        formatting: {},
        metadata: {
          title: `Document ${documentId}`,
          collaborators: [owner.userId],
          permissions: {
            read: [owner.userId],
            write: [owner.userId],
            admin: [owner.userId],
            owner: owner.userId
          }
        }
      };

      // Assign user color if not provided
      if (!owner.color) {
        owner.color = generateUserColor(owner.userId);
      }

      // Create session through state manager
      const session = await stateManager.createSession(documentId, initialState, owner);

      // Initialize session metrics
      this.sessionMetrics.set(session.sessionId, {
        duration: 0,
        operationCount: 0,
        participantCount: 1,
        conflictCount: 0,
        averageResolutionTime: 0,
        collaborationEfficiency: 1.0
      });

      // Start presence tracking if enabled
      if (this.config.enablePresenceTracking) {
        this.startPresenceTracking(session.sessionId);
      }

      // Schedule session cleanup
      if (this.config.autoCleanupInactiveSessions) {
        setTimeout(() => {
          this.cleanupInactiveSession(session.sessionId);
        }, this.config.maxSessionDuration);
      }

      return session.sessionId;

    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Join an existing collaboration session
   */
  async joinSession(
    sessionId: string,
    participant: SessionParticipant
  ): Promise<CollaborationSession | null> {
    try {
      // Assign user color if not provided
      if (!participant.color) {
        participant.color = generateUserColor(participant.userId);
      }

      const session = await stateManager.joinSession(sessionId, participant);
      if (!session) {
        return null;
      }

      // Update metrics
      const metrics = this.sessionMetrics.get(sessionId);
      if (metrics) {
        metrics.participantCount = session.participants.length;
      }

      // Start cursor sync for new participant
      this.startCursorSync(sessionId, participant.userId);

      // Trigger event handler
      if (this.eventHandlers.onParticipantJoined) {
        this.eventHandlers.onParticipantJoined(participant);
      }

      return session;

    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  /**
   * Leave a collaboration session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    try {
      await stateManager.leaveSession(sessionId, userId);

      // Cleanup user-specific timers
      this.stopCursorSync(sessionId, userId);

      // Update metrics
      const session = stateManager.getStateSnapshot(sessionId);
      if (session) {
        const metrics = this.sessionMetrics.get(sessionId);
        if (metrics) {
          metrics.participantCount = session.participants.size;
        }
      }

      // Trigger event handler
      if (this.eventHandlers.onParticipantLeft) {
        this.eventHandlers.onParticipantLeft(userId);
      }

    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): CollaborationSession | null {
    const snapshot = stateManager.getStateSnapshot(sessionId);
    if (!snapshot) {
      return null;
    }

    // Convert snapshot to CollaborationSession format
    return {
      sessionId,
      documentId: snapshot.documentState.id,
      participants: Array.from(snapshot.participants.values()),
      documentState: snapshot.documentState,
      operationHistory: snapshot.operationHistory,
      activeOperations: new Map(), // Would need to track this separately
      cursors: snapshot.cursors,
      created: 0, // Would need to track this
      lastActivity: snapshot.timestamp,
      maxParticipants: 100,
      settings: {
        maxConcurrentOperations: this.config.maxConcurrentOperations,
        operationTimeout: this.config.operationTimeout,
        autoSaveInterval: this.config.autoSaveInterval,
        conflictResolutionStrategy: this.config.conflictResolutionStrategy,
        enableRealTimeCursors: this.config.enablePresenceTracking,
        enableOperationHistory: this.config.enableSessionRecording,
        maxHistorySize: this.config.maxHistorySize,
        compressionEnabled: this.config.enableCompression
      }
    };
  }

  /**
   * Apply an operation to the session
   */
  async applyOperation(sessionId: string, operation: Operation): Promise<SynchronizationResult> {
    try {
      const result = await stateManager.applyOperation(sessionId, operation, operation.metadata.userId);

      // Update metrics
      const metrics = this.sessionMetrics.get(sessionId);
      if (metrics) {
        metrics.operationCount++;
        if (result.conflicts.length > 0) {
          metrics.conflictCount++;
        }
      }

      // Trigger event handler
      if (this.eventHandlers.onOperationApplied && result.success) {
        this.eventHandlers.onOperationApplied(operation);
      }

      return result;

    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Undo the last operation by a user
   */
  async undoLastOperation(sessionId: string, userId: string): Promise<Operation | null> {
    try {
      return await stateManager.undo(sessionId, userId);
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  /**
   * Redo the last undone operation by a user
   */
  async redoLastOperation(sessionId: string, userId: string): Promise<Operation | null> {
    try {
      return await stateManager.redo(sessionId, userId);
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  /**
   * Update cursor position for a user
   */
  async updateCursor(
    sessionId: string,
    userId: string,
    position: number,
    selection?: Selection
  ): Promise<void> {
    try {
      const snapshot = stateManager.getStateSnapshot(sessionId);
      if (!snapshot) {
        return;
      }

      const participant = snapshot.participants.get(userId);
      if (!participant) {
        return;
      }

      const cursor: CursorPosition = {
        userId,
        position,
        selection,
        timestamp: Date.now(),
        color: participant.color
      };

      await stateManager.updateCursor(sessionId, userId, cursor);

      // Trigger event handler
      if (this.eventHandlers.onCursorUpdated) {
        this.eventHandlers.onCursorUpdated(cursor);
      }

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Update user presence status
   */
  async updatePresence(
    sessionId: string,
    userId: string,
    status: 'active' | 'idle' | 'away'
  ): Promise<void> {
    try {
      const session = this.getSession(sessionId);
      if (!session) {
        return;
      }

      const participant = session.participants.find(p => p.userId === userId);
      if (participant) {
        participant.status = status;
        participant.lastSeen = Date.now();
      }

      // Reset presence timer
      this.resetPresenceTimer(sessionId, userId);

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Export session data
   */
  async exportSession(sessionId: string): Promise<SessionExport> {
    const snapshot = stateManager.getStateSnapshot(sessionId);
    const metrics = this.sessionMetrics.get(sessionId);

    if (!snapshot) {
      throw new Error('Session not found');
    }

    return {
      sessionId,
      documentId: snapshot.documentState.id,
      finalContent: snapshot.documentState.content,
      operationHistory: snapshot.operationHistory,
      participants: Array.from(snapshot.participants.values()),
      metrics: metrics || {
        duration: 0,
        operationCount: 0,
        participantCount: 0,
        conflictCount: 0,
        averageResolutionTime: 0,
        collaborationEfficiency: 0
      },
      exportedAt: Date.now()
    };
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId: string): SessionMetrics {
    return this.sessionMetrics.get(sessionId) || {
      duration: 0,
      operationCount: 0,
      participantCount: 0,
      conflictCount: 0,
      averageResolutionTime: 0,
      collaborationEfficiency: 0
    };
  }

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: SessionEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  // Private helper methods

  private setupEventListeners(): void {
    // Listen to state manager events
    stateManager.addEventListener('operation_applied', (event) => {
      if (this.eventHandlers.onOperationApplied) {
        this.eventHandlers.onOperationApplied(event.data.operation);
      }
    });

    stateManager.addEventListener('conflict_resolved', (event) => {
      if (this.eventHandlers.onConflictResolved) {
        this.eventHandlers.onConflictResolved(event.metadata?.conflictId || '');
      }
    });

    stateManager.addEventListener('document_saved', (event) => {
      if (this.eventHandlers.onDocumentSaved) {
        this.eventHandlers.onDocumentSaved(event.data.documentState);
      }
    });

    stateManager.addEventListener('cursor_updated', (event) => {
      if (this.eventHandlers.onCursorUpdated) {
        this.eventHandlers.onCursorUpdated(event.data.cursor);
      }
    });
  }

  private startPresenceTracking(sessionId: string): void {
    // Track overall session presence
    const timer = setInterval(() => {
      this.updateSessionActivity(sessionId);
    }, this.config.presenceTimeout / 2);

    this.presenceTimers.set(`session_${sessionId}`, timer);
  }

  private startCursorSync(sessionId: string, userId: string): void {
    // Individual cursor sync would be handled by the WebSocket layer
    // This is a placeholder for any session-level cursor management
  }

  private stopCursorSync(sessionId: string, userId: string): void {
    const timerId = `${sessionId}_${userId}`;
    const timer = this.cursorSyncTimers.get(timerId);
    if (timer) {
      clearInterval(timer);
      this.cursorSyncTimers.delete(timerId);
    }
  }

  private resetPresenceTimer(sessionId: string, userId: string): void {
    const timerId = `${sessionId}_${userId}`;
    const existingTimer = this.presenceTimers.get(timerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set user as away after timeout
    const timer = setTimeout(() => {
      this.updatePresence(sessionId, userId, 'away').catch(console.error);
    }, this.config.presenceTimeout);

    this.presenceTimers.set(timerId, timer);
  }

  private updateSessionActivity(sessionId: string): void {
    const metrics = this.sessionMetrics.get(sessionId);
    if (metrics) {
      metrics.duration = Date.now() - (metrics.duration || Date.now());
    }
  }

  private async cleanupInactiveSession(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    if (!session) {
      return;
    }

    // Check if session is truly inactive
    const timeSinceLastActivity = Date.now() - session.lastActivity;
    if (timeSinceLastActivity > this.config.maxSessionDuration) {
      // Export session before cleanup
      try {
        const exportData = await this.exportSession(sessionId);
        console.log(`Session ${sessionId} exported before cleanup:`, exportData);
      } catch (error) {
        console.error('Failed to export session before cleanup:', error);
      }

      // Remove all participants (triggers cleanup)
      for (const participant of session.participants) {
        await this.leaveSession(sessionId, participant.userId);
      }

      // Clean up timers
      this.presenceTimers.forEach((timer, key) => {
        if (key.startsWith(sessionId)) {
          clearTimeout(timer);
          this.presenceTimers.delete(key);
        }
      });

      this.cursorSyncTimers.forEach((timer, key) => {
        if (key.startsWith(sessionId)) {
          clearInterval(timer);
          this.cursorSyncTimers.delete(key);
        }
      });

      // Remove metrics
      this.sessionMetrics.delete(sessionId);
    }
  }

  private calculateContentHash(content: string): string {
    // Simple hash function for content integrity
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private handleError(error: Error): void {
    console.error('Collaboration Session Error:', error);
    if (this.eventHandlers.onError) {
      this.eventHandlers.onError(error);
    }
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    // Clear all timers
    this.presenceTimers.forEach(timer => clearTimeout(timer));
    this.cursorSyncTimers.forEach(timer => clearInterval(timer));

    this.presenceTimers.clear();
    this.cursorSyncTimers.clear();
    this.sessionMetrics.clear();
  }
}

// Factory function for creating session managers
export function createCollaborationSessionManager(
  config?: Partial<SessionManagerConfig>
): CollaborationSessionManager {
  return new CollaborationSessionManagerImpl(config);
}

// Export default singleton instance
export const collaborationSessionManager = createCollaborationSessionManager();