/**
 * WebSocket Manager for Real-time Collaboration
 * Handles WebSocket connections, message routing, and presence management
 * Fortune 50-grade real-time communication infrastructure
 */

export interface WebSocketMessage {
  type: string;
  payload: any;
  userId: string;
  timestamp: number;
  messageId: string;
  roomId?: string;
}

export interface UserPresence {
  userId: string;
  username: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: number;
  currentRoom?: string;
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    os?: string;
  };
}

export interface CollaborationRoom {
  id: string;
  name: string;
  type: 'content-editing' | 'planning' | 'review' | 'general';
  participants: Map<string, UserPresence>;
  createdAt: number;
  lastActivity: number;
  metadata?: {
    contentId?: string;
    projectId?: string;
    permissions?: Record<string, string[]>;
  };
}

export interface WebSocketConfig {
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  messageTimeout: number;
  enablePresence: boolean;
  enableTyping: boolean;
  enableCursor: boolean;
}

/**
 * WebSocket Manager for real-time collaboration
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private rooms: Map<string, CollaborationRoom> = new Map();
  private userPresence: Map<string, UserPresence> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private reconnectAttempts = 0;
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private messageHandlers: Map<string, Function[]> = new Map();
  private isConnected = false;
  private currentUserId?: string;

  constructor(config?: Partial<WebSocketConfig>) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      messageTimeout: 10000,
      enablePresence: true,
      enableTyping: true,
      enableCursor: true,
      ...config,
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(url: string, userId: string, token?: string): Promise<void> {
    this.currentUserId = userId;
    
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = token ? `${url}?token=${token}&userId=${userId}` : `${url}?userId=${userId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.processMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();
          
          if (event.code !== 1000) { // Not a normal closure
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User disconnect');
      this.ws = null;
    }
    
    this.stopHeartbeat();
    this.stopReconnectTimer();
    this.isConnected = false;
  }

  /**
   * Send message through WebSocket
   */
  sendMessage(type: string, payload: any, roomId?: string): void {
    const message: WebSocketMessage = {
      type,
      payload,
      userId: this.currentUserId!,
      timestamp: Date.now(),
      messageId: this.generateMessageId(),
      roomId,
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
    }
  }

  /**
   * Join collaboration room
   */
  async joinRoom(roomId: string, userInfo?: Partial<UserPresence>): Promise<void> {
    const presence: UserPresence = {
      userId: this.currentUserId!,
      username: userInfo?.username || 'Anonymous',
      avatar: userInfo?.avatar,
      status: 'online',
      lastSeen: Date.now(),
      currentRoom: roomId,
      deviceInfo: this.getDeviceInfo(),
    };

    this.sendMessage('join-room', {
      roomId,
      userPresence: presence,
    });

    // Update local presence
    this.userPresence.set(this.currentUserId!, presence);
  }

  /**
   * Leave collaboration room
   */
  leaveRoom(roomId: string): void {
    this.sendMessage('leave-room', { roomId });

    // Update local presence
    const presence = this.userPresence.get(this.currentUserId!);
    if (presence) {
      presence.currentRoom = undefined;
      this.userPresence.set(this.currentUserId!, presence);
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(roomId: string, isTyping: boolean, context?: { contentId?: string; position?: number }): void {
    if (!this.config.enableTyping) return;

    this.sendMessage('typing', {
      roomId,
      isTyping,
      context,
    });
  }

  /**
   * Send cursor position for real-time cursor tracking
   */
  sendCursorPosition(roomId: string, position: { x: number; y: number; elementId?: string }): void {
    if (!this.config.enableCursor) return;

    this.sendMessage('cursor-position', {
      roomId,
      position,
    });
  }

  /**
   * Send content update for real-time collaboration
   */
  sendContentUpdate(roomId: string, update: {
    contentId: string;
    operation: 'insert' | 'delete' | 'replace';
    position: number;
    content?: string;
    length?: number;
  }): void {
    this.sendMessage('content-update', {
      roomId,
      update,
    });
  }

  /**
   * Update user presence status
   */
  updatePresence(status: UserPresence['status']): void {
    if (!this.config.enablePresence) return;

    const presence = this.userPresence.get(this.currentUserId!);
    if (presence) {
      presence.status = status;
      presence.lastSeen = Date.now();
      this.userPresence.set(this.currentUserId!, presence);

      this.sendMessage('presence-update', {
        userId: this.currentUserId,
        status,
        lastSeen: presence.lastSeen,
      });
    }
  }

  /**
   * Register message handler
   */
  onMessage(type: string, handler: (payload: any, message: WebSocketMessage) => void): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * Remove message handler
   */
  offMessage(type: string, handler: Function): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Get room information
   */
  getRoom(roomId: string): CollaborationRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get all rooms user is in
   */
  getUserRooms(): CollaborationRoom[] {
    return Array.from(this.rooms.values()).filter(room => 
      room.participants.has(this.currentUserId!)
    );
  }

  /**
   * Get user presence information
   */
  getUserPresence(userId: string): UserPresence | undefined {
    return this.userPresence.get(userId);
  }

  /**
   * Get all users in room
   */
  getRoomParticipants(roomId: string): UserPresence[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.participants.values()) : [];
  }

  /**
   * Check connection status
   */
  isConnectedToServer(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    connected: boolean;
    reconnectAttempts: number;
    queuedMessages: number;
    totalRooms: number;
    totalUsers: number;
  } {
    return {
      connected: this.isConnectedToServer(),
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      totalRooms: this.rooms.size,
      totalUsers: this.userPresence.size,
    };
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      
      // Handle system messages
      switch (message.type) {
        case 'room-joined':
          this.handleRoomJoined(message.payload);
          break;
        case 'room-left':
          this.handleRoomLeft(message.payload);
          break;
        case 'user-joined':
          this.handleUserJoined(message.payload);
          break;
        case 'user-left':
          this.handleUserLeft(message.payload);
          break;
        case 'presence-update':
          this.handlePresenceUpdate(message.payload);
          break;
        case 'pong':
          // Heartbeat response
          break;
      }

      // Call registered handlers
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message.payload, message);
          } catch (error) {
            console.error('Message handler error:', error);
          }
        });
      }

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle room joined event
   */
  private handleRoomJoined(payload: any): void {
    const { room, participants } = payload;
    
    const collaborationRoom: CollaborationRoom = {
      id: room.id,
      name: room.name,
      type: room.type,
      participants: new Map(),
      createdAt: room.createdAt,
      lastActivity: Date.now(),
      metadata: room.metadata,
    };

    // Add participants
    for (const participant of participants) {
      collaborationRoom.participants.set(participant.userId, participant);
      this.userPresence.set(participant.userId, participant);
    }

    this.rooms.set(room.id, collaborationRoom);
  }

  /**
   * Handle room left event
   */
  private handleRoomLeft(payload: any): void {
    const { roomId } = payload;
    this.rooms.delete(roomId);
  }

  /**
   * Handle user joined room event
   */
  private handleUserJoined(payload: any): void {
    const { roomId, userPresence } = payload;
    
    const room = this.rooms.get(roomId);
    if (room) {
      room.participants.set(userPresence.userId, userPresence);
      room.lastActivity = Date.now();
    }

    this.userPresence.set(userPresence.userId, userPresence);
  }

  /**
   * Handle user left room event
   */
  private handleUserLeft(payload: any): void {
    const { roomId, userId } = payload;
    
    const room = this.rooms.get(roomId);
    if (room) {
      room.participants.delete(userId);
      room.lastActivity = Date.now();
    }
  }

  /**
   * Handle presence update event
   */
  private handlePresenceUpdate(payload: any): void {
    const { userId, status, lastSeen } = payload;
    
    const presence = this.userPresence.get(userId);
    if (presence) {
      presence.status = status;
      presence.lastSeen = lastSeen;
      this.userPresence.set(userId, presence);
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * Attempt to reconnect to WebSocket server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      if (this.currentUserId) {
        // Try to reconnect with same parameters
        // This would need the original URL and token
        console.log('Reconnecting...');
      }
    }, this.config.reconnectInterval * this.reconnectAttempts);
  }

  /**
   * Stop reconnect timer
   */
  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  /**
   * Process queued messages when connection is restored
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): UserPresence['deviceInfo'] {
    // This would be implemented based on the environment
    // For now, return a default
    return {
      type: 'desktop',
      browser: 'unknown',
      os: 'unknown',
    };
  }
}

export default WebSocketManager;