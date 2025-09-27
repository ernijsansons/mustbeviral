// Notification Hub Durable Object
// Manages real-time notifications for a specific user

import { Logger } from '../utils/logger';

export interface NotificationConnection {
  websocket: WebSocket;
  connectionId: string;
  deviceType: string;
  userAgent: string;
  connectedAt: number;
  lastActivity: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  channels: string[];
  read: boolean;
  delivered: boolean;
  createdAt: number;
  expiresAt?: number;
  actionUrl?: string;
  imageUrl?: string;
}

export interface NotificationMessage {
  type: string;
  notification?: Notification;
  data?: unknown;
  timestamp: number;
  messageId: string;
}

export class NotificationHub {
  private connections: Map<string, NotificationConnection> = new Map();
  private userId: string;
  private notifications: Map<string, Notification> = new Map();
  private logger: Logger;
  private cleanupTimeout: unknown;

  constructor(private state: DurableObjectState, private env: unknown) {
    this.userId = state.id.toString();
    this.logger = new Logger('NotificationHub', env.LOG_LEVEL  ?? 'INFO');

    // Load persisted notifications
    this.loadPersistedNotifications();

    // Schedule cleanup
    this.scheduleCleanup();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (path) {
        case '/connect':
          return this.handleConnect(request);
        case '/send':
          return this.handleSendNotification(request);
        case '/mark-read':
          return this.handleMarkRead(request);
        case '/mark-delivered':
          return this.handleMarkDelivered(request);
        case '/list':
          return this.handleListNotifications(request);
        case '/clear':
          return this.handleClearNotifications(request);
        case '/status':
          return this.handleStatus(request);
        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      this.logger.error('NotificationHub request failed', {
        userId: this.userId,
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

    // Extract connection info
    const url = new URL(request.url);
    const deviceType = url.searchParams.get('deviceType')  ?? 'web';
    const userAgent = request.headers.get('User-Agent')  ?? 'unknown';

    // Create WebSocket pair
    const [client, server] = new WebSocketPair();
    server.accept();

    // Generate connection ID
    const connectionId = crypto.randomUUID();

    // Store connection
    const connection: NotificationConnection = {
      websocket: server,
      connectionId,
      deviceType,
      userAgent,
      connectedAt: Date.now(),
      lastActivity: Date.now()
    };

    this.connections.set(connectionId, connection);

    // Set up WebSocket event handlers
    server.addEventListener('message', (_event) => {
      this.handleWebSocketMessage(connectionId, event);
    });

    server.addEventListener('close', () => {
      this.handleWebSocketClose(connectionId);
    });

    server.addEventListener('error', (_error) => {
      this.logger.error('WebSocket error in notification hub', {
        userId: this.userId,
        connectionId,
        error
      });
      this.handleWebSocketClose(connectionId);
    });

    // Send welcome message with pending notifications
    const welcomeMessage: NotificationMessage = {
      type: 'welcome',
      data: { _connectionId,
        userId: this.userId,
        pendingNotifications: this.getUnreadNotifications(),
        connectionCount: this.connections.size
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    };

    server.send(JSON.stringify(welcomeMessage));

    this.logger.info('Notification connection established', {
      userId: this.userId,
      connectionId,
      deviceType,
      totalConnections: this.connections.size
    });

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async handleWebSocketMessage(connectionId: string, event: MessageEvent): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {return;}

    try {
      const message = JSON.parse(event.data as string);
      connection.lastActivity = Date.now();

      switch (message.type) {
        case 'ping':
          await this.handlePing(connectionId);
          break;
        case 'mark_read':
          await this.handleMarkReadMessage(connectionId, message.data);
          break;
        case 'mark_delivered':
          await this.handleMarkDeliveredMessage(connectionId, message.data);
          break;
        case 'subscribe':
          await this.handleSubscribe(connectionId, message.data);
          break;
        case 'unsubscribe':
          await this.handleUnsubscribe(connectionId, message.data);
          break;
        default:
          this.logger.warn('Unknown notification message type', {
            userId: this.userId,
            connectionId,
            type: message.type
          });
      }
    } catch (error) {
      this.logger.error('Failed to handle notification message', {
        userId: this.userId,
        connectionId,
        error: error instanceof Error ? error.message : error
      });

      connection.websocket.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid message format' },
        timestamp: Date.now(),
        messageId: crypto.randomUUID()
      }));
    }
  }

  async handlePing(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {return;}

    connection.websocket.send(JSON.stringify({
      type: 'pong',
      data: { timestamp: Date.now() },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    }));
  }

  async handleMarkReadMessage(connectionId: string, data: unknown): Promise<void> {
    const { notificationIds } = data;

    for (const notificationId of notificationIds) {
      const notification = this.notifications.get(notificationId);
      if (notification) {
        notification.read = true;
      }
    }

    await this.persistNotifications();

    // Notify all connections
    this.broadcastToConnections({
      type: 'notifications_read',
      data: { notificationIds },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    });
  }

  async handleMarkDeliveredMessage(connectionId: string, data: unknown): Promise<void> {
    const { notificationIds } = data;

    for (const notificationId of notificationIds) {
      const notification = this.notifications.get(notificationId);
      if (notification) {
        notification.delivered = true;
      }
    }

    await this.persistNotifications();
  }

  async handleSubscribe(connectionId: string, data: unknown): Promise<void> {
    // Handle subscription to specific notification channels
    const { channels } = data;
    this.logger.info('User subscribed to channels', {
      userId: this.userId,
      connectionId,
      channels
    });
  }

  async handleUnsubscribe(connectionId: string, data: unknown): Promise<void> {
    // Handle unsubscription from notification channels
    const { channels } = data;
    this.logger.info('User unsubscribed from channels', {
      userId: this.userId,
      connectionId,
      channels
    });
  }

  handleWebSocketClose(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {return;}

    this.connections.delete(connectionId);

    this.logger.info('Notification connection closed', {
      userId: this.userId,
      connectionId,
      totalConnections: this.connections.size
    });

    // Schedule cleanup if no connections
    if (this.connections.size === 0) {
      this.scheduleCleanup();
    }
  }

  async handleSendNotification(request: Request): Promise<Response> {
    const notificationData = await request.json() as Partial<Notification>;

    const notification: Notification = {
      id: crypto.randomUUID(),
      type: notificationData.type  ?? 'info',
      title: notificationData.title  ?? '',
      message: notificationData.message  ?? '',
      data: notificationData.data,
      priority: notificationData.priority ?? 'normal',
      channels: notificationData.channels ?? ['web'],
      read: false,
      delivered: false,
      createdAt: Date.now(),
      expiresAt: notificationData.expiresAt,
      actionUrl: notificationData.actionUrl,
      imageUrl: notificationData.imageUrl
    };

    // Store notification
    this.notifications.set(notification.id, notification);
    await this.persistNotifications();

    // Send to all active connections
    this.broadcastToConnections({
      type: 'notification',
      notification,
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    });

    this.logger.info('Notification sent', {
      userId: this.userId,
      notificationId: notification.id,
      type: notification.type,
      priority: notification.priority,
      activeConnections: this.connections.size
    });

    return new Response(JSON.stringify({
      success: true,
      notificationId: notification.id
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleMarkRead(request: Request): Promise<Response> {
    const { notificationIds } = await request.json() as unknown;

    for (const notificationId of notificationIds) {
      const notification = this.notifications.get(notificationId);
      if (notification) {
        notification.read = true;
      }
    }

    await this.persistNotifications();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleMarkDelivered(request: Request): Promise<Response> {
    const { notificationIds } = await request.json() as unknown;

    for (const notificationId of notificationIds) {
      const notification = this.notifications.get(notificationId);
      if (notification) {
        notification.delivered = true;
      }
    }

    await this.persistNotifications();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleListNotifications(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')  ?? '50');
    const unreadOnly = url.searchParams.get('unread') === 'true';

    let notifications = Array.from(this.notifications.values());

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }

    // Sort by creation date (newest first)
    notifications.sort((a, _b) => b.createdAt - a.createdAt);

    // Apply limit
    notifications = notifications.slice(0, limit);

    // Remove expired notifications
    const now = Date.now();
    notifications = notifications.filter(n => !n.expiresAt  ?? n.expiresAt > now);

    return new Response(JSON.stringify({ _notifications,
      total: this.notifications.size,
      unread: this.getUnreadNotifications().length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleClearNotifications(request: Request): Promise<Response> {
    const { _notificationIds, clearAll } = await request.json() as unknown;

    if (clearAll) {
      this.notifications.clear();
    } else if (notificationIds) {
      for (const id of notificationIds) {
        this.notifications.delete(id);
      }
    }

    await this.persistNotifications();

    // Notify all connections
    this.broadcastToConnections({
      type: 'notifications_cleared',
      data: { _clearAll, notificationIds },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleStatus(request: Request): Promise<Response> {
    return new Response(JSON.stringify({
      userId: this.userId,
      activeConnections: this.connections.size,
      totalNotifications: this.notifications.size,
      unreadNotifications: this.getUnreadNotifications().length,
      connections: Array.from(this.connections.values()).map(conn => ({
        connectionId: conn.connectionId,
        deviceType: conn.deviceType,
        connectedAt: conn.connectedAt,
        lastActivity: conn.lastActivity
      }))
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private broadcastToConnections(message: NotificationMessage): void {
    for (const [connectionId, connection] of this.connections.entries()) {
      try {
        connection.websocket.send(JSON.stringify(message));
      } catch (error) {
        this.logger.error('Failed to send notification to connection', {
          userId: this.userId,
          connectionId,
          error
        });
        this.connections.delete(connectionId);
      }
    }
  }

  private getUnreadNotifications(): Notification[] {
    const now = Date.now();
    return Array.from(this.notifications.values())
      .filter(n => !n.read && (!n.expiresAt  ?? n.expiresAt > now))
      .sort((a, _b) => b.createdAt - a.createdAt);
  }

  private async persistNotifications(): Promise<void> {
    try {
      // Keep only recent notifications (last 1000)
      const notifications = Array.from(this.notifications.values())
        .sort((a, _b) => b.createdAt - a.createdAt)
        .slice(0, 1000);

      const notificationMap = new Map();
      notifications.forEach(n => notificationMap.set(n.id, n));

      this.notifications = notificationMap;

      await this.state.storage.put('notifications', Array.from(this.notifications.entries()));
    } catch (error) {
      this.logger.error('Failed to persist notifications', {
        userId: this.userId,
        error: error instanceof Error ? error.message : error
      });
    }
  }

  private async loadPersistedNotifications(): Promise<void> {
    try {
      const persistedNotifications = await this.state.storage.get('notifications') as Array<[string, Notification]>;

      if (persistedNotifications) {
        this.notifications = new Map(persistedNotifications);

        // Clean up expired notifications
        const now = Date.now();
        for (const [id, notification] of this.notifications.entries()) {
          if (notification.expiresAt && notification.expiresAt <= now) {
            this.notifications.delete(id);
          }
        }
      }

      this.logger.info('Notifications loaded', {
        userId: this.userId,
        notificationCount: this.notifications.size
      });
    } catch (error) {
      this.logger.error('Failed to load persisted notifications', {
        userId: this.userId,
        error: error instanceof Error ? error.message : error
      });
    }
  }

  private scheduleCleanup(): void {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
    }

    // Schedule cleanup for 1 hour from now
    this.cleanupTimeout = setTimeout(async () => {
      await this.cleanup();
    }, 60 * 60 * 1000);
  }

  private async cleanup(): Promise<void> {
    const now = Date.now();

    // Remove expired notifications
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.expiresAt && notification.expiresAt <= now) {
        this.notifications.delete(id);
      }
    }

    // Remove old read notifications (older than 30 days)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.read && notification.createdAt < thirtyDaysAgo) {
        this.notifications.delete(id);
      }
    }

    await this.persistNotifications();

    this.logger.info('Notification cleanup completed', {
      userId: this.userId,
      remainingNotifications: this.notifications.size
    });

    // Reschedule if there are still notifications or connections
    if (this.notifications.size > 0  ?? this.connections.size > 0) {
      this.scheduleCleanup();
    }
  }

  async alarm(): Promise<void> {
    await this.cleanup();
  }
}