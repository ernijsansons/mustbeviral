// WebSocket Collaboration Controller
// Integrates operational transform with WebSocket infrastructure for real-time collaboration

import {
  Operation,
  DocumentState,
  SessionParticipant,
  CursorPosition,
  Selection,
  CollaborationEvent,
  OperationMetadata,
  createOperationId,
  createSessionId,
  generateUserColor,
  isInsertOperation,
  isDeleteOperation,
  isFormatOperation,
  OPERATION_DEFAULTS
} from '../../../../src/lib/collaboration/OperationTypes';

import {
  collaborationSessionManager,
  SessionEventHandlers
} from '../../../../src/lib/collaboration/CollaborationSession';

import { RoomMessage, Connection } from '../durable-objects/WebSocketRoom';

export interface CollaborationMessage extends RoomMessage {
  type: 'operation' | 'cursor' | 'selection' | 'presence' | 'document_request' | 'document_response' | 'undo' | 'redo' | 'conflict_notification';
  data: {
    operation?: Operation;
    cursor?: CursorPosition;
    selection?: Selection;
    presence?: { status: 'active' | 'idle' | 'away' };
    documentState?: DocumentState;
    operationHistory?: Operation[];
    conflictId?: string;
    error?: string;
  };
}

export interface CollaborationContext {
  sessionId: string;
  documentId: string;
  userId: string;
  username: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canInvite: boolean;
    canManagePermissions: boolean;
  };
}

export class CollaborationController {
  private activeContexts = new Map<string, CollaborationContext>(); // connectionId -> context
  private connectionsBySession = new Map<string, Set<string>>(); // sessionId -> connectionIds
  private lastCursorUpdate = new Map<string, number>(); // userId -> timestamp
  private operationQueue = new Map<string, Operation[]>(); // sessionId -> operations
  private processingQueues = new Set<string>(); // sessionIds currently processing

  constructor() {
    this.setupEventHandlers();
  }

  /**
   * Initialize collaboration for a WebSocket connection
   */
  async initializeCollaboration(
    connectionId: string,
    connection: Connection,
    sessionId: string,
    documentId: string
  ): Promise<CollaborationContext | null> {
    try {
      // Create participant from connection
      const participant: SessionParticipant = {
        userId: connection.userId,
        username: connection.username,
        role: this.mapRoleFromConnection(connection.role),
        color: generateUserColor(connection.userId),
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        status: 'active',
        permissions: {
          canEdit: this.canEdit(connection.role),
          canComment: true,
          canInvite: this.canInvite(connection.role),
          canManagePermissions: this.canManagePermissions(connection.role)
        }
      };

      // Try to join existing session or create new one
      let session = await collaborationSessionManager.joinSession(sessionId, participant);

      if (!session) {
        // Session doesn't exist, create it if user has permission
        if (participant.role === 'owner' || participant.role === 'admin') {
          const newSessionId = await collaborationSessionManager.createSession(
            documentId,
            '', // Initial empty content
            participant
          );
          session = collaborationSessionManager.getSession(newSessionId);
          if (session) {
            sessionId = newSessionId;
          }
        } else {
          return null; // User cannot create session
        }
      }

      if (!session) {
        return null;
      }

      // Create collaboration context
      const context: CollaborationContext = {
        sessionId,
        documentId,
        userId: connection.userId,
        username: connection.username,
        role: participant.role,
        permissions: participant.permissions
      };

      // Store context
      this.activeContexts.set(connectionId, context);

      // Track connection by session
      if (!this.connectionsBySession.has(sessionId)) {
        this.connectionsBySession.set(sessionId, new Set());
      }
      this.connectionsBySession.get(sessionId)!.add(connectionId);

      // Send initial document state
      await this.sendDocumentState(connectionId, connection, session.documentState, session.operationHistory);

      return context;

    } catch (error) {
      console.error('Failed to initialize collaboration:', error);
      return null;
    }
  }

  /**
   * Handle incoming collaboration messages
   */
  async handleCollaborationMessage(
    connectionId: string,
    connection: Connection,
    message: CollaborationMessage
  ): Promise<void> {
    const context = this.activeContexts.get(connectionId);
    if (!context) {
      this.sendError(connection, 'No collaboration context found');
      return;
    }

    try {
      switch (message.type) {
        case 'operation':
          await this.handleOperation(connectionId, connection, context, message.data.operation!);
          break;

        case 'cursor':
          await this.handleCursorUpdate(connectionId, connection, context, message.data.cursor!);
          break;

        case 'selection':
          await this.handleSelectionUpdate(connectionId, connection, context, message.data.selection!);
          break;

        case 'presence':
          await this.handlePresenceUpdate(connectionId, connection, context, message.data.presence!);
          break;

        case 'document_request':
          await this.handleDocumentRequest(connectionId, connection, context);
          break;

        case 'undo':
          await this.handleUndo(connectionId, connection, context);
          break;

        case 'redo':
          await this.handleRedo(connectionId, connection, context);
          break;

        default:
          this.sendError(connection, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling collaboration message:', error);
      this.sendError(connection, `Failed to process ${message.type}: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Handle operation from client
   */
  private async handleOperation(
    connectionId: string,
    connection: Connection,
    context: CollaborationContext,
    operation: Operation
  ): Promise<void> {
    // Validate permissions
    if (!context.permissions.canEdit) {
      this.sendError(connection, 'Insufficient permissions to edit');
      return;
    }

    // Validate operation structure
    if (!operation.metadata) {
      operation.metadata = this.createOperationMetadata(context.userId, context.sessionId);
    }

    // Queue operation for processing
    if (!this.operationQueue.has(context.sessionId)) {
      this.operationQueue.set(context.sessionId, []);
    }
    this.operationQueue.get(context.sessionId)!.push(operation);

    // Process queue
    await this.processOperationQueue(context.sessionId);
  }

  /**
   * Process queued operations for a session
   */
  private async processOperationQueue(sessionId: string): Promise<void> {
    // Prevent concurrent processing
    if (this.processingQueues.has(sessionId)) {
      return;
    }

    this.processingQueues.add(sessionId);

    try {
      const queue = this.operationQueue.get(sessionId) || [];
      if (queue.length === 0) {
        return;
      }

      // Process operations in batch
      const operations = queue.splice(0, Math.min(queue.length, OPERATION_DEFAULTS.MAX_CONCURRENT_OPERATIONS));

      for (const operation of operations) {
        try {
          const result = await collaborationSessionManager.applyOperation(sessionId, operation);

          if (result.success) {
            // Broadcast successful operation to other clients
            await this.broadcastOperation(sessionId, operation, operation.metadata.userId);
          } else {
            // Handle conflicts and rejections
            await this.handleOperationFailure(sessionId, operation, result);
          }
        } catch (error) {
          console.error('Operation failed:', error);
          await this.notifyOperationError(sessionId, operation, error as Error);
        }
      }

      // Process remaining operations if any
      if (this.operationQueue.get(sessionId)?.length || 0 > 0) {
        // Schedule next batch processing
        setTimeout(() => this.processOperationQueue(sessionId), 10);
      }

    } finally {
      this.processingQueues.delete(sessionId);
    }
  }

  /**
   * Handle cursor position updates
   */
  private async handleCursorUpdate(
    connectionId: string,
    connection: Connection,
    context: CollaborationContext,
    cursor: CursorPosition
  ): Promise<void> {
    // Throttle cursor updates
    const lastUpdate = this.lastCursorUpdate.get(context.userId) || 0;
    if (Date.now() - lastUpdate < OPERATION_DEFAULTS.CURSOR_UPDATE_THROTTLE) {
      return;
    }

    this.lastCursorUpdate.set(context.userId, Date.now());

    // Update cursor in session
    await collaborationSessionManager.updateCursor(
      context.sessionId,
      context.userId,
      cursor.position,
      cursor.selection
    );

    // Broadcast to other clients
    await this.broadcastCursor(context.sessionId, cursor, context.userId);
  }

  /**
   * Handle text selection updates
   */
  private async handleSelectionUpdate(
    connectionId: string,
    connection: Connection,
    context: CollaborationContext,
    selection: Selection
  ): Promise<void> {
    // Create cursor with selection
    const cursor: CursorPosition = {
      userId: context.userId,
      position: selection.start,
      selection,
      timestamp: Date.now(),
      color: generateUserColor(context.userId)
    };

    await this.handleCursorUpdate(connectionId, connection, context, cursor);
  }

  /**
   * Handle presence status updates
   */
  private async handlePresenceUpdate(
    connectionId: string,
    connection: Connection,
    context: CollaborationContext,
    presence: { status: 'active' | 'idle' | 'away' }
  ): Promise<void> {
    await collaborationSessionManager.updatePresence(
      context.sessionId,
      context.userId,
      presence.status
    );

    // Broadcast presence to other clients
    await this.broadcastPresence(context.sessionId, context.userId, presence.status);
  }

  /**
   * Handle document state requests
   */
  private async handleDocumentRequest(
    connectionId: string,
    connection: Connection,
    context: CollaborationContext
  ): Promise<void> {
    const session = collaborationSessionManager.getSession(context.sessionId);
    if (session) {
      await this.sendDocumentState(
        connectionId,
        connection,
        session.documentState,
        session.operationHistory
      );
    }
  }

  /**
   * Handle undo operations
   */
  private async handleUndo(
    connectionId: string,
    connection: Connection,
    context: CollaborationContext
  ): Promise<void> {
    if (!context.permissions.canEdit) {
      this.sendError(connection, 'Insufficient permissions to undo');
      return;
    }

    const undoOperation = await collaborationSessionManager.undoLastOperation(
      context.sessionId,
      context.userId
    );

    if (undoOperation) {
      // Broadcast undo operation
      await this.broadcastOperation(context.sessionId, undoOperation, context.userId);
    }
  }

  /**
   * Handle redo operations
   */
  private async handleRedo(
    connectionId: string,
    connection: Connection,
    context: CollaborationContext
  ): Promise<void> {
    if (!context.permissions.canEdit) {
      this.sendError(connection, 'Insufficient permissions to redo');
      return;
    }

    const redoOperation = await collaborationSessionManager.redoLastOperation(
      context.sessionId,
      context.userId
    );

    if (redoOperation) {
      // Broadcast redo operation
      await this.broadcastOperation(context.sessionId, redoOperation, context.userId);
    }
  }

  /**
   * Clean up collaboration context when connection closes
   */
  async handleDisconnection(connectionId: string, connection: Connection): Promise<void> {
    const context = this.activeContexts.get(connectionId);
    if (!context) {
      return;
    }

    try {
      // Leave session
      await collaborationSessionManager.leaveSession(context.sessionId, context.userId);

      // Clean up tracking
      this.activeContexts.delete(connectionId);

      const sessionConnections = this.connectionsBySession.get(context.sessionId);
      if (sessionConnections) {
        sessionConnections.delete(connectionId);
        if (sessionConnections.size === 0) {
          this.connectionsBySession.delete(context.sessionId);
        }
      }

      this.lastCursorUpdate.delete(context.userId);

    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  }

  // Private helper methods

  private setupEventHandlers(): void {
    const handlers: SessionEventHandlers = {
      onOperationApplied: (operation) => {
        // Operations are broadcast through handleOperation
      },
      onCursorUpdated: (cursor) => {
        // Cursors are broadcast through handleCursorUpdate
      },
      onConflictResolved: (conflictId) => {
        this.broadcastConflictResolution(conflictId);
      },
      onError: (error) => {
        console.error('Collaboration error:', error);
      }
    };

    collaborationSessionManager.setEventHandlers(handlers);
  }

  private async broadcastOperation(sessionId: string, operation: Operation, excludeUserId: string): Promise<void> {
    const connections = this.connectionsBySession.get(sessionId);
    if (!connections) return;

    const message: CollaborationMessage = {
      type: 'operation',
      from: operation.metadata.userId,
      data: { operation },
      timestamp: Date.now(),
      messageId: createOperationId()
    };

    for (const connectionId of connections) {
      const context = this.activeContexts.get(connectionId);
      if (context && context.userId !== excludeUserId) {
        // Would send through WebSocket - this is a placeholder
        console.log(`Broadcasting operation to ${connectionId}:`, message);
      }
    }
  }

  private async broadcastCursor(sessionId: string, cursor: CursorPosition, excludeUserId: string): Promise<void> {
    const connections = this.connectionsBySession.get(sessionId);
    if (!connections) return;

    const message: CollaborationMessage = {
      type: 'cursor',
      from: cursor.userId,
      data: { cursor },
      timestamp: Date.now(),
      messageId: createOperationId()
    };

    for (const connectionId of connections) {
      const context = this.activeContexts.get(connectionId);
      if (context && context.userId !== excludeUserId) {
        // Would send through WebSocket - this is a placeholder
        console.log(`Broadcasting cursor to ${connectionId}:`, message);
      }
    }
  }

  private async broadcastPresence(sessionId: string, userId: string, status: string): Promise<void> {
    const connections = this.connectionsBySession.get(sessionId);
    if (!connections) return;

    const message: CollaborationMessage = {
      type: 'presence',
      from: userId,
      data: { presence: { status: status as 'active' | 'idle' | 'away' } },
      timestamp: Date.now(),
      messageId: createOperationId()
    };

    for (const connectionId of connections) {
      const context = this.activeContexts.get(connectionId);
      if (context && context.userId !== userId) {
        // Would send through WebSocket - this is a placeholder
        console.log(`Broadcasting presence to ${connectionId}:`, message);
      }
    }
  }

  private async broadcastConflictResolution(conflictId: string): Promise<void> {
    // Broadcast conflict resolution notification
    console.log(`Conflict ${conflictId} resolved`);
  }

  private async sendDocumentState(
    connectionId: string,
    connection: Connection,
    documentState: DocumentState,
    operationHistory: Operation[]
  ): Promise<void> {
    const message: CollaborationMessage = {
      type: 'document_response',
      from: 'system',
      data: {
        documentState,
        operationHistory: operationHistory.slice(-100) // Send last 100 operations
      },
      timestamp: Date.now(),
      messageId: createOperationId()
    };

    // Would send through WebSocket connection
    console.log(`Sending document state to ${connectionId}:`, message);
  }

  private sendError(connection: Connection, error: string): void {
    const message: RoomMessage = {
      type: 'error',
      from: 'system',
      data: { error },
      timestamp: Date.now(),
      messageId: createOperationId()
    };

    // Would send through WebSocket connection
    console.log(`Sending error to ${connection.userId}:`, message);
  }

  private async handleOperationFailure(
    sessionId: string,
    operation: Operation,
    result: any
  ): Promise<void> {
    console.error('Operation failed:', operation, result);

    // Notify the operation author about the failure
    const connections = this.connectionsBySession.get(sessionId);
    if (connections) {
      for (const connectionId of connections) {
        const context = this.activeContexts.get(connectionId);
        if (context && context.userId === operation.metadata.userId) {
          // Send error message to the user
          console.log(`Notifying operation failure to ${connectionId}`);
        }
      }
    }
  }

  private async notifyOperationError(
    sessionId: string,
    operation: Operation,
    error: Error
  ): Promise<void> {
    console.error('Operation error:', error);
    // Similar to handleOperationFailure but for exceptions
  }

  private createOperationMetadata(userId: string, sessionId: string): OperationMetadata {
    return {
      operationId: createOperationId(),
      userId,
      sessionId,
      timestamp: Date.now(),
      vectorClock: { [userId]: Date.now() },
      documentVersion: 1
    };
  }

  private mapRoleFromConnection(role: string): 'owner' | 'admin' | 'editor' | 'viewer' {
    switch (role.toLowerCase()) {
      case 'owner': return 'owner';
      case 'admin': return 'admin';
      case 'editor': return 'editor';
      default: return 'viewer';
    }
  }

  private canEdit(role: string): boolean {
    return ['owner', 'admin', 'editor'].includes(role.toLowerCase());
  }

  private canInvite(role: string): boolean {
    return ['owner', 'admin'].includes(role.toLowerCase());
  }

  private canManagePermissions(role: string): boolean {
    return ['owner', 'admin'].includes(role.toLowerCase());
  }

  /**
   * Get collaboration statistics
   */
  getStats(): {
    activeSessions: number;
    totalConnections: number;
    operationsPerSecond: number;
  } {
    return {
      activeSessions: this.connectionsBySession.size,
      totalConnections: this.activeContexts.size,
      operationsPerSecond: 0 // Would need to track this over time
    };
  }

  /**
   * Get session information
   */
  getSessionInfo(sessionId: string): {
    participantCount: number;
    activeConnections: number;
  } | null {
    const connections = this.connectionsBySession.get(sessionId);
    if (!connections) return null;

    const participants = new Set<string>();
    for (const connectionId of connections) {
      const context = this.activeContexts.get(connectionId);
      if (context) {
        participants.add(context.userId);
      }
    }

    return {
      participantCount: participants.size,
      activeConnections: connections.size
    };
  }
}

// Export singleton instance
export const collaborationController = new CollaborationController();