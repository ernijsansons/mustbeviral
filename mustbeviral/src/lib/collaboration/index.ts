/**
 * Real-time Collaboration Service
 * Enterprise-grade real-time collaboration with WebSocket and operational transformation
 * Fortune 50-grade collaborative editing infrastructure
 */

import { WebSocketManager, type UserPresence, type CollaborationRoom} from './websocketManager';
import { ContentCollaborationEditor, type ContentOperation, type ContentCursor, type ContentComment} from './contentEditor';

export { WebSocketManager, ContentCollaborationEditor };
export type {
  UserPresence,
  CollaborationRoom,
  ContentOperation,
  ContentCursor,
  ContentComment,
};

export interface CollaborationConfig {
  websocketUrl: string;
  enablePresence: boolean;
  enableTyping: boolean;
  enableCursor: boolean;
  autoReconnect: boolean;
  heartbeatInterval: number;
}

export interface CollaborationSession {
  sessionId: string;
  userId: string;
  contentId: string;
  roomId: string;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canView: boolean;
  };
  createdAt: number;
  lastActivity: number;
}

export interface CollaborationMetrics {
  activeUsers: number;
  totalSessions: number;
  operationsPerMinute: number;
  averageLatency: number;
  conflictResolutions: number;
  uptime: number;
}

/**
 * Real-time Collaboration Service
 */
export class CollaborationService {
  private websocketManager: WebSocketManager;
  private contentEditors: Map<string, ContentCollaborationEditor> = new Map();
  private activeSessions: Map<string, CollaborationSession> = new Map();
  private config: CollaborationConfig;
  private metrics: CollaborationMetrics;
  private startTime: number;
  private operationCount = 0;
  private conflictCount = 0;
  private latencyHistory: number[] = [];

  constructor(config: CollaborationConfig) {
    this.config = config;
    this.startTime = Date.now();
    
    this.metrics = {
      activeUsers: 0,
      totalSessions: 0,
      operationsPerMinute: 0,
      averageLatency: 0,
      conflictResolutions: 0,
      uptime: 0,
    };

    this.websocketManager = new WebSocketManager({
      enablePresence: config.enablePresence,
      enableTyping: config.enableTyping,
      enableCursor: config.enableCursor,
      heartbeatInterval: config.heartbeatInterval,
      maxReconnectAttempts: config.autoReconnect ? 5 : 0,
    });

    this.setupEventHandlers();
  }

  /**
   * Initialize collaboration service
   */
  async initialize(userId: string, token?: string): Promise<void> {
    await this.websocketManager.connect(this.config.websocketUrl, userId, token);
    console.log('Collaboration service initialized');
  }

  /**
   * Start collaborative editing session
   */
  async startContentSession(
    contentId: string,
    roomId: string,
    initialContent: string = '',
    permissions: CollaborationSession['permissions']
  ): Promise<ContentCollaborationEditor> {
    // Join the collaboration room
    await this.websocketManager.joinRoom(roomId);

    // Create content editor
    const editor = new ContentCollaborationEditor(
      this.websocketManager,
      contentId,
      roomId,
      initialContent,
      permissions
    );

    this.contentEditors.set(contentId, editor);

    // Create session record
    const session: CollaborationSession = {
      sessionId: this.generateSessionId(),
      userId: this.getCurrentUserId(),
      contentId,
      roomId,
      permissions,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.activeSessions.set(session.sessionId, session);
    this.metrics.totalSessions++;

    // Setup operation tracking for metrics
    editor.onChange_(() => {
      this.operationCount++;
      session.lastActivity = Date.now();
    });

    return editor;
  }

  /**
   * End collaborative editing session
   */
  endContentSession(contentId: string): void {
    const editor = this.contentEditors.get(contentId);
    if (editor) {
      // Find and remove session
      const session = Array.from(this.activeSessions.values())
        .find(s => s.contentId === contentId);
      
      if (session) {
        this.websocketManager.leaveRoom(session.roomId);
        this.activeSessions.delete(session.sessionId);
      }

      // Clean up editor
      editor.removeAllListeners();
      this.contentEditors.delete(contentId);
    }
  }

  /**
   * Join a collaboration room for general communication
   */
  async joinRoom(
    roomId: string,
    roomType: 'content-editing' | 'planning' | 'review' | 'general' = 'general'
  ): Promise<void> {
    await this.websocketManager.joinRoom(roomId, {
      username: this.getCurrentUsername(),
      status: 'online',
    });
  }

  /**
   * Leave a collaboration room
   */
  leaveRoom(roomId: string): void {
    this.websocketManager.leaveRoom(roomId);
  }

  /**
   * Send a message to a room
   */
  sendMessage(roomId: string, message: string, messageType: string = 'chat'): void {
    this.websocketManager.sendMessage('room-message', {
      roomId,
      message,
      messageType,
    });
  }

  /**
   * Update user presence status
   */
  updatePresence(status: UserPresence['status']): void {
    this.websocketManager.updatePresence(status);
  }

  /**
   * Get content editor for specific content
   */
  getContentEditor(contentId: string): ContentCollaborationEditor | undefined {
    return this.contentEditors.get(contentId);
  }

  /**
   * Get all active sessions for current user
   */
  getActiveSessions(): CollaborationSession[] {
    const userId = this.getCurrentUserId();
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId);
  }

  /**
   * Get room participants
   */
  getRoomParticipants(roomId: string): UserPresence[] {
    return this.websocketManager.getRoomParticipants(roomId);
  }

  /**
   * Get collaboration metrics
   */
  getMetrics(): CollaborationMetrics {
    const now = Date.now();
    const uptimeMinutes = (now - this.startTime) / 60000;
    
    // Update real-time metrics
    this.metrics.activeUsers = this.activeSessions.size;
    this.metrics.operationsPerMinute = uptimeMinutes > 0 ? this.operationCount / uptimeMinutes : 0;
    this.metrics.conflictResolutions = this.conflictCount;
    this.metrics.uptime = now - this.startTime;
    
    if (this.latencyHistory.length > 0) {
      this.metrics.averageLatency = 
        this.latencyHistory.reduce((sum, latency) => sum + latency, 0) / this.latencyHistory.length;
    }

    return { ...this.metrics };
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    websocket: any;
    sessions: number;
    editors: number;
  } {
    return {
      connected: this.websocketManager.isConnectedToServer(),
      websocket: this.websocketManager.getConnectionStats(),
      sessions: this.activeSessions.size,
      editors: this.contentEditors.size,
    };
  }

  /**
   * Send typing indicator
   */
  sendTyping(roomId: string, isTyping: boolean, contentId?: string): void {
    this.websocketManager.sendTyping(roomId, isTyping, { contentId });
  }

  /**
   * Register for room messages
   */
  onRoomMessage(callback: (message: any) => void): void {
    this.websocketManager.onMessage('room-message', callback);
  }

  /**
   * Register for typing indicators
   */
  onTyping(callback: (data: { userId: string; isTyping: boolean; roomId: string }) => void): void {
    this.websocketManager.onMessage('typing', callback);
  }

  /**
   * Register for user presence updates
   */
  onPresenceUpdate(callback: (presence: UserPresence) => void): void {
    this.websocketManager.onMessage('presence-update', callback);
  }

  /**
   * Register for user join/leave events
   */
  onUserJoinLeave(callback: (data: { type: 'join' | 'leave'; user: UserPresence; roomId: string }) => void): void {
    this.websocketManager.onMessage('user-joined', _(payload) => {
      callback({ type: 'join', user: payload.userPresence, roomId: payload.roomId });
    });
    
    this.websocketManager.onMessage('user-left', _(payload) => {
      callback({ type: 'leave', user: payload.userPresence, roomId: payload.roomId });
    });
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    // End all active sessions
    for (const session of this.activeSessions.values()) {
      this.endContentSession(session.contentId);
    }

    // Disconnect WebSocket
    this.websocketManager.disconnect();
    
    console.log('Collaboration service disconnected');
  }

  /**
   * Setup event handlers for metrics and monitoring
   */
  private setupEventHandlers(): void {
    // Track operation performance
    this.websocketManager.onMessage('operation', _(payload, message) => {
      const latency = Date.now() - message.timestamp;
      this.latencyHistory.push(latency);
      
      // Keep only recent latency data
      if (this.latencyHistory.length > 100) {
        this.latencyHistory.shift();
      }
    });

    // Track conflicts (would be implemented in operational transformation)
    this.websocketManager.onMessage('conflict-resolved', _() => {
      this.conflictCount++;
    });

    // Handle connection events
    this.websocketManager.onMessage('connected', _() => {
      console.log('Collaboration WebSocket connected');
    });

    this.websocketManager.onMessage('disconnected', _() => {
      console.log('Collaboration WebSocket disconnected');
    });
  }

  /**
   * Get current user ID (from auth context)
   */
  private getCurrentUserId(): string {
    // This would be obtained from authentication context
    return 'current-user-id'; // Placeholder
  }

  /**
   * Get current username (from auth context)
   */
  private getCurrentUsername(): string {
    // This would be obtained from authentication context
    return 'Current User'; // Placeholder
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

/**
 * Singleton collaboration service instance
 */
let collaborationService: CollaborationService | null = null;

/**
 * Initialize collaboration service
 */
export function initializeCollaboration(config: CollaborationConfig): CollaborationService {
  if (!collaborationService) {
    collaborationService = new CollaborationService(config);
  }
  return collaborationService;
}

/**
 * Get collaboration service instance
 */
export function getCollaborationService(): CollaborationService {
  if (!collaborationService) {
    throw new Error('Collaboration service not initialized. Call initializeCollaboration() first.');
  }
  return collaborationService;
}

/**
 * Convenience function to start content collaboration
 */
export async function startContentCollaboration(
  contentId: string,
  roomId: string,
  initialContent: string = '',
  permissions: CollaborationSession['permissions'] = {
    canEdit: true,
    canComment: true,
    canView: true,
  }
): Promise<ContentCollaborationEditor> {
  const service = getCollaborationService();
  return service.startContentSession(contentId, roomId, initialContent, permissions);
}

/**
 * Convenience function to end content collaboration
 */
export function endContentCollaboration(contentId: string): void {
  const service = getCollaborationService();
  service.endContentSession(contentId);
}

export default CollaborationService;