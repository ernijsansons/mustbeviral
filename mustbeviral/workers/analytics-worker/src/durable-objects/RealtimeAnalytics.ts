// Realtime Analytics Durable Object
// Handles real-time analytics processing and WebSocket connections

export class RealtimeAnalytics {
  private state: DurableObjectState;
  private env: any;
  private sessions: Map<WebSocket, any> = new Map();

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/websocket':
        return this.handleWebSocket(request);
      case '/broadcast':
        return this.handleBroadcast(request);
      case '/metrics':
        return this.handleMetrics(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected websocket', { status: 400 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept the WebSocket connection
    server.accept();

    // Store session
    const sessionId = this.generateSessionId();
    this.sessions.set(server, {
      id: sessionId,
      connectedAt: Date.now(),
      lastActivity: Date.now()
    });

    // Handle messages
    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        await this.handleMessage(server, data);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        server.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    // Handle close
    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });

    // Send welcome message
    server.send(JSON.stringify({
      type: 'connected',
      sessionId,
      timestamp: Date.now()
    }));

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  private async handleMessage(ws: WebSocket, data: any): Promise<void> {
    switch (data.type) {
      case 'subscribe':
        await this.handleSubscribe(ws, data);
        break;
      case 'unsubscribe':
        await this.handleUnsubscribe(ws, data);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  }

  private async handleSubscribe(ws: WebSocket, data: any): Promise<void> {
    const session = this.sessions.get(ws);
    if (!session) {return;}

    session.subscriptions = session.subscriptions || new Set();

    if (data.channel) {
      session.subscriptions.add(data.channel);
      ws.send(JSON.stringify({
        type: 'subscribed',
        channel: data.channel,
        timestamp: Date.now()
      }));
    }
  }

  private async handleUnsubscribe(ws: WebSocket, data: any): Promise<void> {
    const session = this.sessions.get(ws);
    if (!session?.subscriptions) {return;}

    if (data.channel) {
      session.subscriptions.delete(data.channel);
      ws.send(JSON.stringify({
        type: 'unsubscribed',
        channel: data.channel,
        timestamp: Date.now()
      }));
    }
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const data = await request.json() as { channel: string; message: any };
      const { channel, message } = data;

      if (!channel || !message) {
        return new Response('Channel and message are required', { status: 400 });
      }

      let broadcastCount = 0;

      // Broadcast to all subscribed sessions
      for (const [ws, session] of this.sessions) {
        if (session.subscriptions?.has(channel)) {
          try {
            ws.send(JSON.stringify({
              type: 'broadcast',
              channel,
              message,
              timestamp: Date.now()
            }));
            broadcastCount++;
          } catch (error) {
            console.error('Error broadcasting to session:', error);
            this.sessions.delete(ws);
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        broadcastCount,
        timestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error handling broadcast:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  private async handleMetrics(request: Request): Promise<Response> {
    const metrics = {
      activeSessions: this.sessions.size,
      timestamp: Date.now(),
      sessions: Array.from(this.sessions.values()).map(session => ({
        id: session.id,
        connectedAt: session.connectedAt,
        lastActivity: session.lastActivity,
        subscriptions: session.subscriptions ? Array.from(session.subscriptions) : []
      }))
    };

    return new Response(JSON.stringify(metrics), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}