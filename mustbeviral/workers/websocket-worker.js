/**
 * WebSocket Worker - Real-time Collaboration for Must Be Viral
 * Handles real-time content editing, notifications, and presence
 */

export class WebSocketRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.rooms = new Map();
    this.presence = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Handle HTTP requests
    switch (url.pathname) {
      case '/rooms':
        return this.getRooms();
      case '/presence':
        return this.getPresence();
      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  async handleWebSocket(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection
    this.state.acceptWebSocketConnection(server);

    // Parse query parameters
    const url = new URL(request.url);
    const sessionId = crypto.randomUUID();
    const userId = url.searchParams.get('userId');
    const roomId = url.searchParams.get('roomId');
    const userName = url.searchParams.get('userName') || 'Anonymous';

    // Store session
    const session = {
      id: sessionId,
      userId,
      roomId,
      userName,
      webSocket: server,
      joinedAt: new Date().toISOString()
    };

    this.sessions.set(sessionId, session);

    // Add to room
    if (roomId) {
      this.joinRoom(sessionId, roomId);
    }

    // Set up WebSocket handlers
    server.addEventListener('message', event => {
      this.handleMessage(sessionId, event.data);
    });

    server.addEventListener('close', () => {
      this.handleDisconnect(sessionId);
    });

    server.addEventListener('error', error => {
      console.error('WebSocket error:', error);
      this.handleDisconnect(sessionId);
    });

    // Send welcome message
    server.send(JSON.stringify({
      type: 'welcome',
      sessionId,
      roomId,
      timestamp: new Date().toISOString()
    }));

    // Notify room of new user
    if (roomId) {
      this.broadcast(roomId, {
        type: 'user_joined',
        userId,
        userName,
        timestamp: new Date().toISOString()
      }, sessionId);

      // Send current presence
      this.sendPresence(sessionId, roomId);
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async handleMessage(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'join_room':
          await this.handleJoinRoom(sessionId, message);
          break;

        case 'leave_room':
          await this.handleLeaveRoom(sessionId, message);
          break;

        case 'content_update':
          await this.handleContentUpdate(sessionId, message);
          break;

        case 'cursor_position':
          await this.handleCursorPosition(sessionId, message);
          break;

        case 'selection_change':
          await this.handleSelectionChange(sessionId, message);
          break;

        case 'notification':
          await this.handleNotification(sessionId, message);
          break;

        case 'typing':
          await this.handleTyping(sessionId, message);
          break;

        case 'ping':
          session.webSocket.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          // Echo unknown messages to room
          if (session.roomId) {
            this.broadcast(session.roomId, {
              ...message,
              userId: session.userId,
              userName: session.userName,
              timestamp: new Date().toISOString()
            }, sessionId);
          }
      }
    } catch (error) {
      console.error('Message handling error:', error);
      session.webSocket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  }

  async handleJoinRoom(sessionId, message) {
    const { roomId } = message;
    this.joinRoom(sessionId, roomId);

    const session = this.sessions.get(sessionId);

    // Notify room
    this.broadcast(roomId, {
      type: 'user_joined',
      userId: session.userId,
      userName: session.userName,
      timestamp: new Date().toISOString()
    }, sessionId);

    // Send room state
    await this.sendRoomState(sessionId, roomId);
  }

  async handleLeaveRoom(sessionId, message) {
    const { roomId } = message;
    this.leaveRoom(sessionId, roomId);

    const session = this.sessions.get(sessionId);

    // Notify room
    this.broadcast(roomId, {
      type: 'user_left',
      userId: session.userId,
      userName: session.userName,
      timestamp: new Date().toISOString()
    }, sessionId);
  }

  async handleContentUpdate(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.roomId) return;

    // Store content update in D1
    await this.env.DB.prepare(`
      INSERT INTO content_updates (
        room_id,
        user_id,
        content,
        operation,
        position,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      session.roomId,
      session.userId,
      message.content,
      message.operation || 'update',
      message.position || 0,
      new Date().toISOString()
    ).run();

    // Broadcast to room
    this.broadcast(session.roomId, {
      type: 'content_update',
      userId: session.userId,
      userName: session.userName,
      content: message.content,
      operation: message.operation,
      position: message.position,
      timestamp: new Date().toISOString()
    }, sessionId);
  }

  async handleCursorPosition(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.roomId) return;

    // Update presence
    const presence = this.presence.get(session.roomId) || new Map();
    const userPresence = presence.get(session.userId) || {};
    userPresence.cursor = message.position;
    presence.set(session.userId, userPresence);
    this.presence.set(session.roomId, presence);

    // Broadcast cursor position
    this.broadcast(session.roomId, {
      type: 'cursor_position',
      userId: session.userId,
      userName: session.userName,
      position: message.position,
      timestamp: new Date().toISOString()
    }, sessionId);
  }

  async handleSelectionChange(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.roomId) return;

    // Broadcast selection
    this.broadcast(session.roomId, {
      type: 'selection_change',
      userId: session.userId,
      userName: session.userName,
      start: message.start,
      end: message.end,
      timestamp: new Date().toISOString()
    }, sessionId);
  }

  async handleNotification(sessionId, message) {
    const session = this.sessions.get(sessionId);

    if (message.targetUserId) {
      // Send to specific user
      for (const [sid, sess] of this.sessions) {
        if (sess.userId === message.targetUserId) {
          sess.webSocket.send(JSON.stringify({
            type: 'notification',
            from: session.userName,
            message: message.message,
            priority: message.priority || 'normal',
            timestamp: new Date().toISOString()
          }));
        }
      }
    } else if (session.roomId) {
      // Broadcast to room
      this.broadcast(session.roomId, {
        type: 'notification',
        from: session.userName,
        message: message.message,
        priority: message.priority || 'normal',
        timestamp: new Date().toISOString()
      }, sessionId);
    }
  }

  async handleTyping(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.roomId) return;

    // Broadcast typing indicator
    this.broadcast(session.roomId, {
      type: 'typing',
      userId: session.userId,
      userName: session.userName,
      isTyping: message.isTyping,
      timestamp: new Date().toISOString()
    }, sessionId);
  }

  handleDisconnect(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Leave all rooms
    if (session.roomId) {
      this.leaveRoom(sessionId, session.roomId);

      // Notify room
      this.broadcast(session.roomId, {
        type: 'user_disconnected',
        userId: session.userId,
        userName: session.userName,
        timestamp: new Date().toISOString()
      });
    }

    // Remove session
    this.sessions.delete(sessionId);
  }

  joinRoom(sessionId, roomId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Update session
    session.roomId = roomId;

    // Add to room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(sessionId);

    // Update presence
    if (!this.presence.has(roomId)) {
      this.presence.set(roomId, new Map());
    }
    this.presence.get(roomId).set(session.userId, {
      userName: session.userName,
      joinedAt: new Date().toISOString(),
      status: 'online'
    });
  }

  leaveRoom(sessionId, roomId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Remove from room
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(sessionId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    // Remove from presence
    const presence = this.presence.get(roomId);
    if (presence) {
      presence.delete(session.userId);
      if (presence.size === 0) {
        this.presence.delete(roomId);
      }
    }

    // Update session
    session.roomId = null;
  }

  broadcast(roomId, message, excludeSessionId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const data = JSON.stringify(message);

    for (const sessionId of room) {
      if (sessionId === excludeSessionId) continue;

      const session = this.sessions.get(sessionId);
      if (session && session.webSocket.readyState === WebSocket.OPEN) {
        session.webSocket.send(data);
      }
    }
  }

  async sendRoomState(sessionId, roomId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Get latest content from D1
    const content = await this.env.DB.prepare(`
      SELECT * FROM content_updates
      WHERE room_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(roomId).first();

    session.webSocket.send(JSON.stringify({
      type: 'room_state',
      roomId,
      content: content ? content.content : '',
      timestamp: new Date().toISOString()
    }));
  }

  sendPresence(sessionId, roomId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const presence = this.presence.get(roomId);
    if (!presence) return;

    const users = Array.from(presence.entries()).map(([userId, data]) => ({
      userId,
      ...data
    }));

    session.webSocket.send(JSON.stringify({
      type: 'presence_update',
      users,
      timestamp: new Date().toISOString()
    }));
  }

  async getRooms() {
    const roomList = Array.from(this.rooms.entries()).map(([roomId, sessions]) => ({
      roomId,
      userCount: sessions.size,
      users: Array.from(sessions).map(sid => {
        const session = this.sessions.get(sid);
        return session ? {
          userId: session.userId,
          userName: session.userName
        } : null;
      }).filter(Boolean)
    }));

    return new Response(JSON.stringify(roomList), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getPresence() {
    const presenceData = {};

    for (const [roomId, users] of this.presence) {
      presenceData[roomId] = Array.from(users.entries()).map(([userId, data]) => ({
        userId,
        ...data
      }));
    }

    return new Response(JSON.stringify(presenceData), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Export Durable Object
export default {
  async fetch(request, env) {
    // Parse URL to determine routing
    const url = new URL(request.url);

    if (url.pathname.startsWith('/ws')) {
      // Get or create room
      const roomId = url.searchParams.get('roomId') || 'default';
      const id = env.WEBSOCKET_ROOM.idFromName(roomId);
      const room = env.WEBSOCKET_ROOM.get(id);

      // Forward request to Durable Object
      return room.fetch(request);
    }

    return new Response('WebSocket Worker Ready', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};