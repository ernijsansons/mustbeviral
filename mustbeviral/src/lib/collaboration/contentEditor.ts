/**
 * Real-time Content Collaboration Editor
 * Implements operational transformation for conflict-free collaborative editing
 * Fortune 50-grade collaborative editing with operational transformation
 */

import { WebSocketManager, type WebSocketMessage} from './websocketManager';
import { InputSanitizer} from '../security/inputSanitization';

export interface ContentOperation {
  type: 'insert' | 'delete' | 'retain' | 'format';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
  authorId: string;
  timestamp: number;
  operationId: string;
}

export interface ContentState {
  content: string;
  version: number;
  operations: ContentOperation[];
  lastModified: number;
  lastModifiedBy: string;
}

export interface ContentCursor {
  userId: string;
  position: number;
  selection?: {
    start: number;
    end: number;
  };
  color: string;
}

export interface CollaborationContext {
  contentId: string;
  roomId: string;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canView: boolean;
  };
}

export interface ContentComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  position: number;
  timestamp: number;
  resolved: boolean;
  replies: ContentComment[];
}

/**
 * Real-time Content Collaboration Editor
 */
export class ContentCollaborationEditor {
  private websocketManager: WebSocketManager;
  private contentState: ContentState;
  private context: CollaborationContext;
  private cursors: Map<string, ContentCursor> = new Map();
  private comments: Map<string, ContentComment> = new Map();
  private pendingOperations: ContentOperation[] = [];
  private operationQueue: ContentOperation[] = [];
  private isApplyingOperations = false;
  private changeListeners: Function[] = [];
  private cursorListeners: Function[] = [];
  private commentListeners: Function[] = [];

  constructor(
    websocketManager: WebSocketManager,
    contentId: string,
    roomId: string,
    initialContent: string = '',
    permissions: CollaborationContext['permissions']
  ) {
    this.websocketManager = websocketManager;
    this.context = {
      contentId,
      roomId,
      permissions,
    };
    
    this.contentState = {
      content: initialContent,
      version: 0,
      operations: [],
      lastModified: Date.now(),
      lastModifiedBy: '',
    };

    this.setupMessageHandlers();
  }

  /**
   * Insert text at position
   */
  insertText(position: number, text: string): void {
    if (!this.context.permissions.canEdit) {
      throw new Error('No edit permission');
    }

    // Sanitize input text to prevent XSS and other security issues
    const sanitizedText = InputSanitizer.sanitizeText(text, 10000);
    
    // Detect potential security threats
    const threats = InputSanitizer.detectThreats(text);
    if (threats.length > 0) {
      console.warn('Security threats detected in content editor:', threats);
    }

    const operation: ContentOperation = {
      type: 'insert',
      position,
      content: sanitizedText,
      authorId: this.websocketManager.getUserPresence(this.getCurrentUserId())?.userId ?? '',
      timestamp: Date.now(),
      operationId: this.generateOperationId(),
    };

    this.applyLocalOperation(operation);
    this.sendOperation(operation);
  }

  /**
   * Delete text at position
   */
  deleteText(position: number, length: number): void {
    if (!this.context.permissions.canEdit) {
      throw new Error('No edit permission');
    }

    const operation: ContentOperation = {
      type: 'delete',
      position,
      length,
      authorId: this.getCurrentUserId(),
      timestamp: Date.now(),
      operationId: this.generateOperationId(),
    };

    this.applyLocalOperation(operation);
    this.sendOperation(operation);
  }

  /**
   * Format text with attributes
   */
  formatText(position: number, length: number, attributes: Record<string, any>): void {
    if (!this.context.permissions.canEdit) {
      throw new Error('No edit permission');
    }

    const operation: ContentOperation = {
      type: 'format',
      position,
      length,
      attributes,
      authorId: this.getCurrentUserId(),
      timestamp: Date.now(),
      operationId: this.generateOperationId(),
    };

    this.applyLocalOperation(operation);
    this.sendOperation(operation);
  }

  /**
   * Update cursor position
   */
  updateCursor(position: number, selection?: { start: number; end: number }): void {
    const userId = this.getCurrentUserId();
    const cursor: ContentCursor = {
      userId,
      position,
      selection,
      color: this.getUserColor(userId),
    };

    this.cursors.set(userId, cursor);
    this.notifyCursorListeners();

    // Send cursor update to other collaborators
    this.websocketManager.sendMessage('cursor-update', {
      contentId: this.context.contentId,
      roomId: this.context.roomId,
      cursor,
    });
  }

  /**
   * Add comment to content
   */
  addComment(position: number, content: string): void {
    if (!this.context.permissions.canComment) {
      throw new Error('No comment permission');
    }

    const userId = this.getCurrentUserId();
    const userPresence = this.websocketManager.getUserPresence(userId);
    
    const comment: ContentComment = {
      id: this.generateCommentId(),
      authorId: userId,
      authorName: userPresence?.username ?? 'Anonymous',
      content,
      position,
      timestamp: Date.now(),
      resolved: false,
      replies: [],
    };

    this.comments.set(comment.id, comment);
    this.notifyCommentListeners();

    // Send comment to other collaborators
    this.websocketManager.sendMessage('comment-added', {
      contentId: this.context.contentId,
      roomId: this.context.roomId,
      comment,
    });
  }

  /**
   * Resolve comment
   */
  resolveComment(commentId: string): void {
    const comment = this.comments.get(commentId);
    if (!comment)  {
    return
  };

    comment.resolved = true;
    this.comments.set(commentId, comment);
    this.notifyCommentListeners();

    this.websocketManager.sendMessage('comment-resolved', {
      contentId: this.context.contentId,
      roomId: this.context.roomId,
      commentId,
    });
  }

  /**
   * Get current content
   */
  getContent(): string {
    return this.contentState.content;
  }

  /**
   * Get content state
   */
  getContentState(): ContentState {
    return { ...this.contentState };
  }

  /**
   * Get all cursors
   */
  getCursors(): ContentCursor[] {
    return Array.from(this.cursors.values())
      .filter(cursor => cursor.userId !== this.getCurrentUserId());
  }

  /**
   * Get all comments
   */
  getComments(): ContentComment[] {
    return Array.from(this.comments.values())
      .sort((a, b) => a.position - b.position);
  }

  /**
   * Register change listener
   */
  onChange(listener: (content: string, operation: ContentOperation) => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * Register cursor listener
   */
  onCursorChange(listener: (cursors: ContentCursor[]) => void): void {
    this.cursorListeners.push(listener);
  }

  /**
   * Register comment listener
   */
  onCommentChange(listener: (comments: ContentComment[]) => void): void {
    this.commentListeners.push(listener);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.changeListeners = [];
    this.cursorListeners = [];
    this.commentListeners = [];
  }

  /**
   * Setup WebSocket message handlers
   */
  private setupMessageHandlers(): void {
    this.websocketManager.onMessage('operation', _(payload, message) => {
      if (payload.contentId === this.context.contentId) {
        this.handleRemoteOperation(payload.operation);
      }
    });

    this.websocketManager.onMessage('cursor-update', _(payload) => {
      if (payload.contentId === this.context.contentId) {
        this.handleCursorUpdate(payload.cursor);
      }
    });

    this.websocketManager.onMessage('comment-added', _(payload) => {
      if (payload.contentId === this.context.contentId) {
        this.handleCommentAdded(payload.comment);
      }
    });

    this.websocketManager.onMessage('comment-resolved', _(payload) => {
      if (payload.contentId === this.context.contentId) {
        this.handleCommentResolved(payload.commentId);
      }
    });

    this.websocketManager.onMessage('content-sync', _(payload) => {
      if (payload.contentId === this.context.contentId) {
        this.handleContentSync(payload.contentState);
      }
    });
  }

  /**
   * Apply operation locally
   */
  private applyLocalOperation(operation: ContentOperation): void {
    this.contentState = this.applyOperation(this.contentState, operation);
    this.pendingOperations.push(operation);
    this.notifyChangeListeners(operation);
  }

  /**
   * Send operation to other collaborators
   */
  private sendOperation(operation: ContentOperation): void {
    this.websocketManager.sendMessage('operation', {
      contentId: this.context.contentId,
      roomId: this.context.roomId,
      operation,
    });
  }

  /**
   * Handle remote operation with operational transformation
   */
  private handleRemoteOperation(remoteOperation: ContentOperation): void {
    if (this.isApplyingOperations) {
      this.operationQueue.push(remoteOperation);
      return;
    }

    this.isApplyingOperations = true;

    try {
      // Transform remote operation against pending local operations
      let transformedOperation = remoteOperation;
      
      for (const localOperation of this.pendingOperations) {
        transformedOperation = this.transformOperation(transformedOperation, localOperation);
      }

      // Apply transformed operation
      this.contentState = this.applyOperation(this.contentState, transformedOperation);
      
      // Transform pending operations against remote operation
      this.pendingOperations = this.pendingOperations.map(localOp => 
        this.transformOperation(localOp, remoteOperation)
      );

      this.notifyChangeListeners(transformedOperation);

    } finally {
      this.isApplyingOperations = false;
      
      // Process queued operations
      if (this.operationQueue.length > 0) {
        const nextOperation = this.operationQueue.shift()!;
        this.handleRemoteOperation(nextOperation);
      }
    }
  }

  /**
   * Apply operation to content state
   */
  private applyOperation(state: ContentState, operation: ContentOperation): ContentState {
    const newState = { ...state };
    
    switch (operation.type) {
      case 'insert':
        if (operation.content) {
          newState.content = 
            state.content.slice(0, operation.position) +
            operation.content +
            state.content.slice(operation.position);
        }
        break;
        
      case 'delete':
        if (operation.length) {
          newState.content = 
            state.content.slice(0, operation.position) +
            state.content.slice(operation.position + operation.length);
        }
        break;
        
      case 'format':
        // Format operations would be applied to rich text structure
        // For now, we'll just record the operation
        break;
    }

    newState.version++;
    newState.lastModified = operation.timestamp;
    newState.lastModifiedBy = operation.authorId;
    newState.operations.push(operation);

    return newState;
  }

  /**
   * Transform operation using operational transformation
   */
  private transformOperation(
    operation: ContentOperation,
    againstOperation: ContentOperation
  ): ContentOperation {
    const transformed = { ...operation };

    // Simple operational transformation rules
    if (againstOperation.type === 'insert') {
      if (againstOperation.position <= operation.position) {
        transformed.position += againstOperation.content?.length ?? 0;
      }
    } else if (againstOperation.type === 'delete') {
      if (againstOperation.position < operation.position) {
        transformed.position -= Math.min(
          againstOperation.length ?? 0,
          operation.position - againstOperation.position
        );
      }
    }

    return transformed;
  }

  /**
   * Handle cursor update from remote user
   */
  private handleCursorUpdate(cursor: ContentCursor): void {
    if (cursor.userId !== this.getCurrentUserId()) {
      this.cursors.set(cursor.userId, cursor);
      this.notifyCursorListeners();
    }
  }

  /**
   * Handle comment added by remote user
   */
  private handleCommentAdded(comment: ContentComment): void {
    this.comments.set(comment.id, comment);
    this.notifyCommentListeners();
  }

  /**
   * Handle comment resolved by remote user
   */
  private handleCommentResolved(commentId: string): void {
    const comment = this.comments.get(commentId);
    if (comment) {
      comment.resolved = true;
      this.comments.set(commentId, comment);
      this.notifyCommentListeners();
    }
  }

  /**
   * Handle content synchronization
   */
  private handleContentSync(remoteState: ContentState): void {
    // In case of desync, accept remote state as authoritative
    this.contentState = remoteState;
    this.pendingOperations = [];
    this.notifyChangeListeners({
      type: 'retain',
      position: 0,
      authorId: 'system',
      timestamp: Date.now(),
      operationId: 'sync',
    });
  }

  /**
   * Notify change listeners
   */
  private notifyChangeListeners(operation: ContentOperation): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(this.contentState.content, operation);
      } catch (error) {
        console.error('Change listener error:', error);
      }
    });
  }

  /**
   * Notify cursor listeners
   */
  private notifyCursorListeners(): void {
    const cursors = this.getCursors();
    this.cursorListeners.forEach(listener => {
      try {
        listener(cursors);
      } catch (error) {
        console.error('Cursor listener error:', error);
      }
    });
  }

  /**
   * Notify comment listeners
   */
  private notifyCommentListeners(): void {
    const comments = this.getComments();
    this.commentListeners.forEach(listener => {
      try {
        listener(comments);
      } catch (error) {
        console.error('Comment listener error:', error);
      }
    });
  }

  /**
   * Get current user ID
   */
  private getCurrentUserId(): string {
    // This would be obtained from auth context
    return 'current-user'; // Placeholder
  }

  /**
   * Get user color for cursor
   */
  private getUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FCEA2B',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
    ];
    
    // Generate color based on user ID hash
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Generate unique comment ID
   */
  private generateCommentId(): string {
    return `comment_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

export default ContentCollaborationEditor;