// Real-time Cursor Tracking and User Presence Manager
// Manages cursor positions, selections, and user presence in collaboration sessions

import {
  CursorPosition,
  Selection,
  SessionParticipant,
  CollaborationEvent,
  CollaborationEventType,
  generateUserColor,
  OPERATION_DEFAULTS
} from './OperationTypes';

export interface UserPresence {
  userId: string;
  username: string;
  status: 'active' | 'idle' | 'away' | 'offline';
  lastSeen: number;
  cursorPosition?: CursorPosition;
  selection?: Selection;
  typing?: {
    isTyping: boolean;
    location?: string;
    startedAt?: number;
  };
  viewport?: {
    scrollTop: number;
    scrollLeft: number;
    visibleRange: { start: number; end: number };
  };
  color: string;
  metadata?: {
    device?: string;
    browser?: string;
    permissions?: string[];
  };
}

export interface PresenceUpdate {
  type: 'cursor' | 'selection' | 'status' | 'typing' | 'viewport';
  userId: string;
  timestamp: number;
  data: any;
}

export interface CursorSyncConfig {
  throttleInterval: number;
  presenceTimeout: number;
  typingTimeout: number;
  maxCursorsDisplayed: number;
  enableCursorNames: boolean;
  enableCursorFollowing: boolean;
  syncViewport: boolean;
}

export class PresenceManager {
  private presences = new Map<string, Map<string, UserPresence>>(); // sessionId -> userId -> presence
  private cursors = new Map<string, Map<string, CursorPosition>>(); // sessionId -> userId -> cursor
  private updateTimers = new Map<string, NodeJS.Timeout>();
  private presenceTimers = new Map<string, NodeJS.Timeout>();
  private typingTimers = new Map<string, NodeJS.Timeout>();
  private eventListeners = new Map<CollaborationEventType, Array<(event: CollaborationEvent) => void>>();
  private config: CursorSyncConfig;

  constructor(config: Partial<CursorSyncConfig> = {}) {
    this.config = {
      throttleInterval: config.throttleInterval || OPERATION_DEFAULTS.CURSOR_UPDATE_THROTTLE,
      presenceTimeout: config.presenceTimeout || 300000, // 5 minutes
      typingTimeout: config.typingTimeout || 3000, // 3 seconds
      maxCursorsDisplayed: config.maxCursorsDisplayed || 10,
      enableCursorNames: config.enableCursorNames ?? true,
      enableCursorFollowing: config.enableCursorFollowing ?? true,
      syncViewport: config.syncViewport ?? false
    };
  }

  /**
   * Initialize presence for a user in a session
   */
  initializeUserPresence(
    sessionId: string,
    participant: SessionParticipant
  ): UserPresence {
    if (!this.presences.has(sessionId)) {
      this.presences.set(sessionId, new Map());
    }

    if (!this.cursors.has(sessionId)) {
      this.cursors.set(sessionId, new Map());
    }

    const presence: UserPresence = {
      userId: participant.userId,
      username: participant.username,
      status: 'active',
      lastSeen: Date.now(),
      color: participant.color || generateUserColor(participant.userId),
      metadata: {
        permissions: Object.keys(participant.permissions).filter(
          key => participant.permissions[key as keyof typeof participant.permissions]
        )
      }
    };

    this.presences.get(sessionId)!.set(participant.userId, presence);

    // Start presence monitoring
    this.startPresenceMonitoring(sessionId, participant.userId);

    // Emit presence event
    this.emitPresenceEvent('participant_joined', sessionId, participant.userId, { presence });

    return presence;
  }

  /**
   * Update cursor position for a user
   */
  updateCursor(
    sessionId: string,
    userId: string,
    position: number,
    selection?: Selection
  ): void {
    const presence = this.getUserPresence(sessionId, userId);
    if (!presence) {
      return;
    }

    const cursor: CursorPosition = {
      userId,
      position,
      selection,
      timestamp: Date.now(),
      color: presence.color
    };

    // Update cursor in maps
    this.cursors.get(sessionId)?.set(userId, cursor);
    presence.cursorPosition = cursor;
    presence.selection = selection;
    presence.lastSeen = Date.now();

    // Throttle cursor updates
    const timerId = `${sessionId}_${userId}_cursor`;
    if (this.updateTimers.has(timerId)) {
      return; // Skip if within throttle interval
    }

    this.updateTimers.set(timerId, setTimeout(() => {
      this.updateTimers.delete(timerId);
    }, this.config.throttleInterval));

    // Emit cursor update event
    this.emitPresenceEvent('cursor_updated', sessionId, userId, { cursor });

    // Reset presence timer
    this.resetPresenceTimer(sessionId, userId);
  }

  /**
   * Update user typing status
   */
  updateTypingStatus(
    sessionId: string,
    userId: string,
    isTyping: boolean,
    location?: string
  ): void {
    const presence = this.getUserPresence(sessionId, userId);
    if (!presence) {
      return;
    }

    presence.typing = {
      isTyping,
      location,
      startedAt: isTyping ? Date.now() : undefined
    };

    presence.lastSeen = Date.now();

    // Clear existing typing timer
    const typingTimerId = `${sessionId}_${userId}_typing`;
    const existingTimer = this.typingTimers.get(typingTimerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    if (isTyping) {
      // Auto-clear typing status after timeout
      this.typingTimers.set(typingTimerId, setTimeout(() => {
        this.updateTypingStatus(sessionId, userId, false);
      }, this.config.typingTimeout));
    } else {
      this.typingTimers.delete(typingTimerId);
    }

    // Emit typing event
    this.emitPresenceEvent('typing_updated', sessionId, userId, {
      typing: presence.typing
    });

    // Reset presence timer
    this.resetPresenceTimer(sessionId, userId);
  }

  /**
   * Update user viewport information
   */
  updateViewport(
    sessionId: string,
    userId: string,
    scrollTop: number,
    scrollLeft: number,
    visibleRange: { start: number; end: number }
  ): void {
    const presence = this.getUserPresence(sessionId, userId);
    if (!presence || !this.config.syncViewport) {
      return;
    }

    presence.viewport = {
      scrollTop,
      scrollLeft,
      visibleRange
    };

    presence.lastSeen = Date.now();

    // Emit viewport event
    this.emitPresenceEvent('viewport_updated', sessionId, userId, {
      viewport: presence.viewport
    });

    // Reset presence timer
    this.resetPresenceTimer(sessionId, userId);
  }

  /**
   * Update user status
   */
  updateUserStatus(
    sessionId: string,
    userId: string,
    status: UserPresence['status']
  ): void {
    const presence = this.getUserPresence(sessionId, userId);
    if (!presence) {
      return;
    }

    const oldStatus = presence.status;
    presence.status = status;
    presence.lastSeen = Date.now();

    // Clear cursor if user goes offline
    if (status === 'offline') {
      this.cursors.get(sessionId)?.delete(userId);
      presence.cursorPosition = undefined;
      presence.selection = undefined;
      presence.typing = undefined;
    }

    // Emit status change event
    this.emitPresenceEvent('status_changed', sessionId, userId, {
      oldStatus,
      newStatus: status,
      presence
    });

    // Reset or clear presence timer based on status
    if (status === 'offline') {
      this.clearPresenceTimer(sessionId, userId);
    } else {
      this.resetPresenceTimer(sessionId, userId);
    }
  }

  /**
   * Remove user from session
   */
  removeUser(sessionId: string, userId: string): void {
    const presence = this.getUserPresence(sessionId, userId);
    if (!presence) {
      return;
    }

    // Remove from maps
    this.presences.get(sessionId)?.delete(userId);
    this.cursors.get(sessionId)?.delete(userId);

    // Clear timers
    this.clearPresenceTimer(sessionId, userId);
    this.clearTypingTimer(sessionId, userId);

    // Emit leave event
    this.emitPresenceEvent('participant_left', sessionId, userId, { presence });
  }

  /**
   * Get all presences for a session
   */
  getSessionPresences(sessionId: string): UserPresence[] {
    const sessionPresences = this.presences.get(sessionId);
    if (!sessionPresences) {
      return [];
    }

    return Array.from(sessionPresences.values());
  }

  /**
   * Get all cursors for a session
   */
  getSessionCursors(sessionId: string): CursorPosition[] {
    const sessionCursors = this.cursors.get(sessionId);
    if (!sessionCursors) {
      return [];
    }

    return Array.from(sessionCursors.values())
      .filter(cursor => Date.now() - cursor.timestamp < this.config.presenceTimeout)
      .slice(0, this.config.maxCursorsDisplayed);
  }

  /**
   * Get user presence
   */
  getUserPresence(sessionId: string, userId: string): UserPresence | undefined {
    return this.presences.get(sessionId)?.get(userId);
  }

  /**
   * Get user cursor
   */
  getUserCursor(sessionId: string, userId: string): CursorPosition | undefined {
    return this.cursors.get(sessionId)?.get(userId);
  }

  /**
   * Get active typists in session
   */
  getActiveTypists(sessionId: string): UserPresence[] {
    const sessionPresences = this.presences.get(sessionId);
    if (!sessionPresences) {
      return [];
    }

    return Array.from(sessionPresences.values()).filter(
      presence => presence.typing?.isTyping &&
      presence.typing.startedAt &&
      Date.now() - presence.typing.startedAt < this.config.typingTimeout
    );
  }

  /**
   * Follow another user's cursor
   */
  followUser(
    sessionId: string,
    followerId: string,
    targetUserId: string
  ): CursorPosition | null {
    if (!this.config.enableCursorFollowing) {
      return null;
    }

    const targetCursor = this.getUserCursor(sessionId, targetUserId);
    if (!targetCursor) {
      return null;
    }

    // Emit follow event
    this.emitPresenceEvent('user_follow', sessionId, followerId, {
      targetUserId,
      targetCursor
    });

    return targetCursor;
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): {
    totalUsers: number;
    activeUsers: number;
    typingUsers: number;
    cursorsVisible: number;
    averagePresenceAge: number;
  } {
    const presences = this.getSessionPresences(sessionId);
    const cursors = this.getSessionCursors(sessionId);
    const typists = this.getActiveTypists(sessionId);
    const activeUsers = presences.filter(p => p.status === 'active');

    const averagePresenceAge = presences.length > 0 ?
      presences.reduce((sum, p) => sum + (Date.now() - p.lastSeen), 0) / presences.length : 0;

    return {
      totalUsers: presences.length,
      activeUsers: activeUsers.length,
      typingUsers: typists.length,
      cursorsVisible: cursors.length,
      averagePresenceAge
    };
  }

  /**
   * Clean up session data
   */
  cleanupSession(sessionId: string): void {
    const sessionPresences = this.presences.get(sessionId);
    if (sessionPresences) {
      // Clear all timers for this session
      for (const userId of sessionPresences.keys()) {
        this.clearPresenceTimer(sessionId, userId);
        this.clearTypingTimer(sessionId, userId);
      }
    }

    // Remove session data
    this.presences.delete(sessionId);
    this.cursors.delete(sessionId);
  }

  /**
   * Add event listener
   */
  addEventListener(
    eventType: CollaborationEventType,
    listener: (event: CollaborationEvent) => void
  ): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    eventType: CollaborationEventType,
    listener: (event: CollaborationEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Private helper methods

  private startPresenceMonitoring(sessionId: string, userId: string): void {
    this.resetPresenceTimer(sessionId, userId);
  }

  private resetPresenceTimer(sessionId: string, userId: string): void {
    const timerId = `${sessionId}_${userId}_presence`;

    // Clear existing timer
    const existingTimer = this.presenceTimers.get(timerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    this.presenceTimers.set(timerId, setTimeout(() => {
      this.handlePresenceTimeout(sessionId, userId);
    }, this.config.presenceTimeout));
  }

  private clearPresenceTimer(sessionId: string, userId: string): void {
    const timerId = `${sessionId}_${userId}_presence`;
    const timer = this.presenceTimers.get(timerId);
    if (timer) {
      clearTimeout(timer);
      this.presenceTimers.delete(timerId);
    }
  }

  private clearTypingTimer(sessionId: string, userId: string): void {
    const timerId = `${sessionId}_${userId}_typing`;
    const timer = this.typingTimers.get(timerId);
    if (timer) {
      clearTimeout(timer);
      this.typingTimers.delete(timerId);
    }
  }

  private handlePresenceTimeout(sessionId: string, userId: string): void {
    const presence = this.getUserPresence(sessionId, userId);
    if (!presence) {
      return;
    }

    // Mark as away first, then offline if still inactive
    if (presence.status === 'active') {
      this.updateUserStatus(sessionId, userId, 'away');
      // Set another timer for offline status
      this.resetPresenceTimer(sessionId, userId);
    } else if (presence.status === 'away') {
      this.updateUserStatus(sessionId, userId, 'offline');
    }
  }

  private emitPresenceEvent(
    type: CollaborationEventType,
    sessionId: string,
    userId: string,
    data: any
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
          console.error('Presence event listener error:', error);
        }
      });
    }
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    // Clear all timers
    this.presenceTimers.forEach(timer => clearTimeout(timer));
    this.typingTimers.forEach(timer => clearTimeout(timer));
    this.updateTimers.forEach(timer => clearTimeout(timer));

    // Clear all data
    this.presences.clear();
    this.cursors.clear();
    this.presenceTimers.clear();
    this.typingTimers.clear();
    this.updateTimers.clear();
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const presenceManager = new PresenceManager();