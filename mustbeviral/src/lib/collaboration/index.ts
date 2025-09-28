// Operational Transform Collaboration System
// Main entry point for the comprehensive OT system with Google Docs-level functionality

export * from './OperationTypes';
export * from './OperationalTransform';
export * from './StateManager';
export * from './ConflictResolver';
export * from './CollaborationSession';
export * from './PresenceManager';
export * from './HistoryManager';

// Re-export main instances for easy access
export { operationalTransform } from './OperationalTransform';
export { stateManager } from './StateManager';
export { conflictResolver } from './ConflictResolver';
export { collaborationSessionManager } from './CollaborationSession';
export { presenceManager } from './PresenceManager';
export { historyManager } from './HistoryManager';

import {
  Operation,
  DocumentState,
  SessionParticipant,
  createOperationId,
  generateUserColor
} from './OperationTypes';

import { collaborationSessionManager } from './CollaborationSession';
import { presenceManager } from './PresenceManager';
import { historyManager } from './HistoryManager';

/**
 * High-level API for creating and managing collaborative editing sessions
 */
export class CollaborativeEditor {
  private sessionId: string | null = null;
  private currentUserId: string | null = null;

  /**
   * Initialize a new collaborative editing session
   */
  async initialize(
    documentId: string,
    initialContent: string,
    user: {
      userId: string;
      username: string;
      role?: 'owner' | 'admin' | 'editor' | 'viewer';
    }
  ): Promise<string> {
    const participant: SessionParticipant = {
      userId: user.userId,
      username: user.username,
      role: user.role || 'owner',
      color: generateUserColor(user.userId),
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      status: 'active',
      permissions: {
        canEdit: (user.role || 'owner') !== 'viewer',
        canComment: true,
        canInvite: ['owner', 'admin'].includes(user.role || 'owner'),
        canManagePermissions: ['owner', 'admin'].includes(user.role || 'owner')
      }
    };

    this.sessionId = await collaborationSessionManager.createSession(
      documentId,
      initialContent,
      participant
    );

    this.currentUserId = user.userId;

    // Initialize presence tracking
    presenceManager.initializeUserPresence(this.sessionId, participant);

    return this.sessionId;
  }

  /**
   * Insert text at a specific position
   */
  async insertText(position: number, content: string, attributes?: any): Promise<boolean> {
    if (!this.sessionId || !this.currentUserId) {
      throw new Error('Session not initialized');
    }

    const operation: Operation = {
      type: 'insert',
      position,
      content,
      attributes,
      metadata: {
        operationId: createOperationId(),
        userId: this.currentUserId,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        vectorClock: { [this.currentUserId]: Date.now() },
        documentVersion: this.getCurrentVersion()
      }
    };

    const result = await collaborationSessionManager.applyOperation(this.sessionId, operation);
    return result.success;
  }

  /**
   * Get current document content
   */
  getDocument(): DocumentState | null {
    if (!this.sessionId) {
      return null;
    }

    const session = collaborationSessionManager.getSession(this.sessionId);
    return session?.documentState || null;
  }

  private getCurrentVersion(): number {
    const document = this.getDocument();
    return document?.version || 1;
  }
}

/**
 * Factory function to create a new collaborative editor instance
 */
export function createCollaborativeEditor(): CollaborativeEditor {
  return new CollaborativeEditor();
}

// Default export for convenience
export default {
  createCollaborativeEditor,
  operationalTransform,
  stateManager,
  conflictResolver,
  collaborationSessionManager,
  presenceManager,
  historyManager
};