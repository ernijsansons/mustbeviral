// Authentication middleware for WebSocket Worker
// Handles user authentication and authorization

export interface AuthResult {
  valid: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    permissions: string[];
  };
  error?: string;
}

export class AuthMiddleware {
  private authService: Fetcher;

  constructor(authService: Fetcher) {
    this.authService = authService;
  }

  async authenticate(request: Request): Promise<AuthResult> {
    try {
      // Extract token from Authorization header or query parameter
      const token = this.extractToken(request);

      if (!token) {
        return { valid: false, error: 'No authentication token provided' };
      }

      // Validate token with auth service
      const response = await this.authService.fetch('http://internal/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const errorData = await response.json() as unknown;
        return { valid: false, error: errorData.error || 'Authentication failed' };
      }

      const authData = await response.json() as unknown;

      return {
        valid: true,
        user: {
          id: authData.user.id,
          username: authData.user.username,
          email: authData.user.email,
          role: authData.user.role,
          permissions: authData.user.permissions || []
        }
      };

    } catch (error) {
      return {
        valid: false,
        error: `Authentication service error: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  async authenticateWebSocket(request: Request): Promise<AuthResult> {
    // For WebSocket connections, we might need to handle auth differently
    // Check query parameters for token since WebSocket headers are limited
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      // Try to get from Authorization header
      return this.authenticate(request);
    }

    try {
      const response = await this.authService.fetch('http://internal/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const errorData = await response.json() as unknown;
        return { valid: false, error: errorData.error || 'Authentication failed' };
      }

      const authData = await response.json() as unknown;

      return {
        valid: true,
        user: {
          id: authData.user.id,
          username: authData.user.username,
          email: authData.user.email,
          role: authData.user.role,
          permissions: authData.user.permissions || []
        }
      };

    } catch (error) {
      return {
        valid: false,
        error: `Authentication service error: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  authorize(user: AuthResult['user'], requiredPermission: string): boolean {
    if (!user || !user.permissions) {
      return false;
    }

    // Admin users have all permissions
    if (user.role === 'admin') {
      return true;
    }

    // Check if user has the specific permission
    return user.permissions.includes(requiredPermission);
  }

  authorizeRoomAccess(user: AuthResult['user'], roomId: string, action: 'read' | 'write' | 'admin'): boolean {
    if (!user) {
      return false;
    }

    // Admin users can access all rooms
    if (user.role === 'admin') {
      return true;
    }

    // Check room-specific permissions
    const permissionMap = {
      'read': `room:${roomId}:read`,
      'write': `room:${roomId}:write`,
      'admin': `room:${roomId}:admin`
    };

    const requiredPermission = permissionMap[action];

    // Check if user has the specific room permission
    if (user.permissions.includes(requiredPermission)) {
      return true;
    }

    // Check for wildcard permissions
    const wildcardPermissions = {
      'read': 'room:*:read',
      'write': 'room:*:write',
      'admin': 'room:*:admin'
    };

    return user.permissions.includes(wildcardPermissions[action]);
  }

  authorizeContentAccess(user: AuthResult['user'], contentId: string, action: 'read' | 'write' | 'collaborate'): boolean {
    if (!user) {
      return false;
    }

    // Admin users can access all content
    if (user.role === 'admin') {
      return true;
    }

    // Check content-specific permissions
    const permissionMap = {
      'read': `content:${contentId}:read`,
      'write': `content:${contentId}:write`,
      'collaborate': `content:${contentId}:collaborate`
    };

    const requiredPermission = permissionMap[action];

    // Check if user has the specific content permission
    if (user.permissions.includes(requiredPermission)) {
      return true;
    }

    // Check for wildcard permissions
    const wildcardPermissions = {
      'read': 'content:*:read',
      'write': 'content:*:write',
      'collaborate': 'content:*:collaborate'
    };

    return user.permissions.includes(wildcardPermissions[action]);
  }

  private extractToken(request: Request): string | null {
    // Try Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try query parameter
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (token) {
      return token;
    }

    // Try cookie (for browser WebSocket connections)
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      const cookies = this.parseCookies(cookieHeader);
      const authToken = cookies.auth_token || cookies.access_token;
      if (authToken) {
        return authToken;
      }
    }

    return null;
  }

  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};

    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.split('=');
      const value = rest.join('=');

      if (name && value) {
        cookies[name.trim()] = decodeURIComponent(value.trim());
      }
    });

    return cookies;
  }

  createAuthError(message: string): Response {
    return new Response(JSON.stringify({
      error: 'Authentication Error',
      message,
      timestamp: new Date().toISOString()
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="WebSocket API"'
      }
    });
  }

  createAuthorizationError(message: string): Response {
    return new Response(JSON.stringify({
      error: 'Authorization Error',
      message,
      timestamp: new Date().toISOString()
    }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}