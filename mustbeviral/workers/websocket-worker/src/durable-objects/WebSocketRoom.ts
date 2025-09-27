// WebSocket Room Durable Object
// Manages real-time connections for a specific room/channel

import { Logger } from '../utils/logger';

export interface RoomMessage {
  type: string;
  from: string;
  to?: string; // for private messages
  data: unknown;
  timestamp: number;
  messageId: string;
}

export interface Connection {
  websocket: WebSocket;
  userId: string;
  username: string;
  role: string;
  joinedAt: number;
  lastActivity: number;
  metadata?: Record<string, unknown>;
}

export class WebSocketRoom {
  private connections: Map<string, Connection> = new Map();
  private roomId: string;
  private roomType: string;
  private roomMetadata: Record<string, unknown> = {};
  private messageHistory: RoomMessage[] = [];
  private maxHistorySize = 100;
  private logger: Logger;

  constructor(private state: DurableObjectState, private env: unknown) {
    this.roomId = state.id.toString();
    this.logger = new Logger('WebSocketRoom', env.LOG_LEVEL  ?? 'INFO');

    // Set up cleanup alarm
    this.scheduleCleanup();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (path) {
        case '/connect':
          return this.handleConnect(request);
        case '/info':
          return this.handleRoomInfo(request);
        case '/message':
          return this.handleMessage(request);
        case '/kick':
          return this.handleKickUser(request);
        case '/cleanup':
          return this.handleCleanup(request);
        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      this.logger.error('WebSocketRoom request failed', {
        roomId: this.roomId,
        path,
        error: error instanceof Error ? error.message : error
      });

      return new Response('Internal error', { status: 500 });
    }
  }

  async handleConnect(request: Request): Promise<Response> {
    // Validate WebSocket upgrade
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 400 });
    }

    // Extract user info from query params (validated by auth service)
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const username = url.searchParams.get('username');
    const role = url.searchParams.get('role');
    const roomType = url.searchParams.get('roomType')  ?? 'general';

    if (!userId || !username) {
      return new Response('Missing user credentials', { status: 400 });
    }

    // Check connection limits
    const userConnections = Array.from(this.connections.values())
      .filter(conn => conn.userId === userId);

    if (userConnections.length >= parseInt(this.env.MAX_CONNECTIONS_PER_USER)) {
      return new Response('Too many connections for user', { status: 429 });
    }

    // Create WebSocket pair
    const [client, server] = new WebSocketPair();

    // Accept the WebSocket connection
    server.accept();

    // Generate connection ID
    const connectionId = crypto.randomUUID();

    // Store connection
    const connection: Connection = {
      websocket: server,
      userId,
      username,
      role: role  ?? 'user',
      joinedAt: Date.now(),
      lastActivity: Date.now(),
      metadata: { _roomType,
        connectionId
      }
    };

    this.connections.set(connectionId, connection);
    this.roomType = roomType;

    // Set up WebSocket event handlers
    server.addEventListener('message', (_event) => {
      this.handleWebSocketMessage(connectionId, event);
    });

    server.addEventListener('close', () => {
      this.handleWebSocketClose(connectionId);
    });

    server.addEventListener('error', (_error) => {
      this.logger.error('WebSocket error', {
        roomId: this.roomId,
        connectionId,
        userId,
        error
      });
      this.handleWebSocketClose(connectionId);
    });

    // Send welcome message
    const welcomeMessage: RoomMessage = {
      type: 'welcome',
      from: 'system',
      data: { _connectionId,
        roomId: this.roomId,
        roomType: this.roomType,
        connectedUsers: this.getConnectedUsers(),
        recentMessages: this.messageHistory.slice(-10)
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    };

    server.send(JSON.stringify(welcomeMessage));

    // Notify other users
    this.broadcastMessage({
      type: 'user_joined',
      from: 'system',
      data: { _userId,
        username,
        role,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    }, connectionId);

    this.logger.info('User connected to room', {
      roomId: this.roomId,
      userId,
      username,
      connectionId,
      totalConnections: this.connections.size
    });

    // Return WebSocket response
    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async handleWebSocketMessage(connectionId: string, event: MessageEvent): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    try {
      const message = JSON.parse(event.data as string);

      // Update last activity
      connection.lastActivity = Date.now();

      // Handle different message types
      switch (message.type) {
        case 'chat':
          await this.handleChatMessage(connectionId, message);
          break;
        case 'typing':
          await this.handleTypingIndicator(connectionId, message);
          break;
        case 'private':
          await this.handlePrivateMessage(connectionId, message);
          break;
        case 'ping':
          await this.handlePing(connectionId);
          break;
        case 'cursor':
          await this.handleCursorUpdate(connectionId, message);
          break;
        case 'selection':
          await this.handleSelectionUpdate(connectionId, message);
          break;
        case 'operation':
          await this.handleCollaborativeOperation(connectionId, message);
          break;
        default:
          this.logger.warn('Unknown message type', {
            roomId: this.roomId,
            connectionId,
            type: message.type
          });
      }
    } catch (error) {
      this.logger.error('Failed to handle WebSocket message', {
        roomId: this.roomId,
        connectionId,
        error: error instanceof Error ? error.message : error
      });

      // Send error response
      connection.websocket.send(JSON.stringify({
        type: 'error',
        from: 'system',
        data: { message: 'Invalid message format' },
        timestamp: Date.now(),
        messageId: crypto.randomUUID()
      }));
    }
  }

  async handleChatMessage(connectionId: string, message: unknown): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {return;}

    const chatMessage: RoomMessage = {
      type: 'chat',
      from: connection.userId,
      data: {
        username: connection.username,
        text: message.text,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    };

    // Add to history
    this.addToHistory(chatMessage);

    // Broadcast to all connections
    this.broadcastMessage(chatMessage);

    this.logger.info('Chat message sent', {
      roomId: this.roomId,
      from: connection.userId,
      messageLength: message.text?.length  ?? 0
    });
  }

  async handleTypingIndicator(connectionId: string, message: unknown): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {return;}

    const typingMessage: RoomMessage = {
      type: 'typing',
      from: connection.userId,
      data: {
        username: connection.username,
        isTyping: message.isTyping
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    };

    // Broadcast to others (not sender)
    this.broadcastMessage(typingMessage, connectionId);
  }

  async handlePrivateMessage(connectionId: string, message: unknown): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {return;}

    const targetUserId = message.to;
    const targetConnection = Array.from(this.connections.values())
      .find(conn => conn.userId === targetUserId);

    if (!targetConnection) {
      // Send error back to sender
      connection.websocket.send(JSON.stringify({
        type: 'error',
        from: 'system',
        data: { message: 'User not found' },
        timestamp: Date.now(),
        messageId: crypto.randomUUID()
      }));
      return;
    }

    const privateMessage: RoomMessage = {
      type: 'private',
      from: connection.userId,
      to: targetUserId,
      data: {
        username: connection.username,
        text: message.text
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    };

    // Send to target user only
    targetConnection.websocket.send(JSON.stringify(privateMessage));
  }

  async handlePing(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {return;}

    connection.websocket.send(JSON.stringify({
      type: 'pong',
      from: 'system',
      data: { timestamp: Date.now() },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    }));
  }

  async handleCursorUpdate(connectionId: string, message: unknown): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {return;}

    const cursorMessage: RoomMessage = {
      type: 'cursor',
      from: connection.userId,
      data: {
        username: connection.username,
        position: message.position,
        color: message.color  ?? this.getUserColor(connection.userId)
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    };

    // Broadcast to others
    this.broadcastMessage(cursorMessage, connectionId);
  }

  async handleSelectionUpdate(connectionId: string, message: unknown): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {return;}

    const selectionMessage: RoomMessage = {
      type: 'selection',
      from: connection.userId,
      data: {
        username: connection.username,
        selection: message.selection,
        color: this.getUserColor(connection.userId)
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    };

    // Broadcast to others
    this.broadcastMessage(selectionMessage, connectionId);
  }

  async handleCollaborativeOperation(connectionId: string, message: unknown): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {return;}

    // This would integrate with operational transform or CRDT
    const operationMessage: RoomMessage = {
      type: 'operation',
      from: connection.userId,
      data: {
        operation: message.operation,
        documentVersion: message.documentVersion,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    };

    // Broadcast to others for real-time collaboration
    this.broadcastMessage(operationMessage, connectionId);
  }

  handleWebSocketClose(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {return;}

    // Notify other users
    this.broadcastMessage({
      type: 'user_left',
      from: 'system',
      data: {
        userId: connection.userId,
        username: connection.username,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    });

    // Remove connection
    this.connections.delete(connectionId);

    this.logger.info('User disconnected from room', {
      roomId: this.roomId,
      userId: connection.userId,
      username: connection.username,
      connectionId,
      totalConnections: this.connections.size
    });

    // Schedule cleanup if room is empty
    if (this.connections.size === 0) {
      this.scheduleCleanup();
    }
  }

  async handleRoomInfo(request: Request): Promise<Response> {
    return new Response(JSON.stringify({
      roomId: this.roomId,
      roomType: this.roomType,
      connectedUsers: this.getConnectedUsers(),
      connectionCount: this.connections.size,
      metadata: this.roomMetadata
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleMessage(request: Request): Promise<Response> {
    const message = await request.json() as RoomMessage;

    // Add to history
    this.addToHistory(message);

    // Broadcast to all connections
    this.broadcastMessage(message);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleKickUser(request: Request): Promise<Response> {
    const { userId } = await request.json() as unknown;

    const connections = Array.from(this.connections.entries())
      .filter(([_, conn]) => conn.userId === userId);

    for (const [connectionId, connection] of connections) {
      connection.websocket.close(1000, 'Kicked from room');
      this.connections.delete(connectionId);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleCleanup(request: Request): Promise<Response> {
    // Clean up inactive connections
    const now = Date.now();
    const timeout = parseInt(this.env.CONNECTION_TIMEOUT  ?? '300000');

    for (const [connectionId, connection] of this.connections.entries()) {
      if (now - connection.lastActivity > timeout) {
        connection.websocket.close(1000, 'Connection timeout');
        this.connections.delete(connectionId);
      }
    }

    // Clear old message history
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }

    return new Response(JSON.stringify({
      success: true,
      activeConnections: this.connections.size,
      historySize: this.messageHistory.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private broadcastMessage(message: RoomMessage, excludeConnectionId?: string): void {
    for (const [connectionId, connection] of this.connections.entries()) {
      if (connectionId !== excludeConnectionId) {
        try {
          connection.websocket.send(JSON.stringify(message));
        } catch (error) {
          this.logger.error('Failed to send message to connection', {
            roomId: this.roomId,
            connectionId,
            error
          });
          // Remove broken connection
          this.connections.delete(connectionId);
        }
      }
    }
  }

  private addToHistory(message: RoomMessage): void {
    this.messageHistory.push(message);

    // Keep only recent messages
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }

  private getConnectedUsers(): Array<{userId: string, username: string, role: string, joinedAt: number}> {
    const users = new Map();

    for (const connection of this.connections.values()) {
      if (!users.has(connection.userId)) {
        users.set(connection.userId, {
          userId: connection.userId,
          username: connection.username,
          role: connection.role,
          joinedAt: connection.joinedAt
        });
      }
    }

    return Array.from(users.values());
  }

  private getUserColor(userId: string): string {
    // Generate consistent color for user
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
    ];

    const hash = userId.split('').reduce((a, _b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    return colors[Math.abs(hash) % colors.length];
  }

  private scheduleCleanup(): void {
    // Schedule cleanup alarm for 1 hour from now
    this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000);
  }

  async alarm(): Promise<void> {
    // Perform cleanup
    await this.handleCleanup(new Request('http://internal/cleanup'));

    // If room is still empty, it will be garbage collected
    if (this.connections.size === 0) {
      this.logger.info('Room cleaned up and ready for GC', {
        roomId: this.roomId
      });
    } else {
      // Reschedule if there are still connections
      this.scheduleCleanup();
    }
  }
}