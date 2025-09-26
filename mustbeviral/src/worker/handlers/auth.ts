// Authentication Request Handlers
// Extracted from worker.ts for modularity

import { DatabaseService } from '../../lib/db';
import { AuthService } from '../../lib/auth';
import { JWTManager } from '../../lib/auth/jwtManager';
import { log } from '../../lib/monitoring/logger';

export class AuthHandlers {
  constructor(private dbService: DatabaseService) {}

  async handleRegister(request: Request): Promise<Response> {
    const timer = log.startTimer('user_registration');

    try {
      const body = await request.json() as unknown;
      const { email, username, password, role } = body;

      // Validate input
      if (!email || !username || !password || !role) {
        return new Response(JSON.stringify({ error: 'All fields are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Validate email format
      if (!AuthService.validateEmail(email)) {
        return new Response(JSON.stringify({ error: 'Invalid email format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Validate username
      const usernameValidation = AuthService.validateUsername(username);
      if (!usernameValidation.isValid) {
        return new Response(JSON.stringify({ error: usernameValidation.errors[0] }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Validate password
      const passwordValidation = AuthService.validatePassword(password);
      if (!passwordValidation.isValid) {
        return new Response(JSON.stringify({ error: passwordValidation.errors[0] }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Validate role
      if (!['creator', 'influencer'].includes(role)) {
        return new Response(JSON.stringify({ error: 'Invalid role' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if user already exists
      const existingUser = await this.dbService.getUserByEmail(email);
      if (existingUser) {
        return new Response(JSON.stringify({ error: 'User already exists' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Hash password
      const passwordHash = await AuthService.hashPassword(password);

      // Create user
      const userData = { email,
        username,
        password_hash: passwordHash,
        role: role as 'creator' | 'influencer',
        profile_data: JSON.stringify({}),
        ai_preference_level: 50,
        onboarding_completed: 0
      };

      const newUser = await this.dbService.createUser(userData);
      log.audit('user_created', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role
      });

      // Generate JWT token pair
      const tokenPair = await JWTManager.generateTokenPair({
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role
      });

      // Cache user session
      const sessionData = {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        lastLogin: new Date().toISOString()
      };

      await this.dbService.cacheUserSession(newUser.id, sessionData, 86400);

      timer(); // Log registration duration
      return new Response(JSON.stringify({
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          role: newUser.role,
          onboarding_completed: newUser.onboarding_completed
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        tokenType: tokenPair.tokenType
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      log.error('Registration failed', error as Error, {
        component: 'auth',
        action: 'register'
      });
      return new Response(JSON.stringify({ error: 'Registration failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async handleLogin(request: Request): Promise<Response> {
    const timer = log.startTimer('user_login');

    try {
      const body = await request.json() as unknown;
      const { email, password } = body;

      // Validate input
      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email and password are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Find user by email
      const user = await this.dbService.getUserByEmail(email);
      if (!user) {
        log.security('login_failed', {
          reason: 'user_not_found',
          email
        });
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verify password
      const isValidPassword = await AuthService.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        log.security('login_failed', {
          reason: 'invalid_password',
          userId: user.id,
          email
        });
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Generate JWT token pair
      const tokenPair = await JWTManager.generateTokenPair({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      });

      // Cache user session
      const sessionData = {
        userId: user.id,
        email: user.email,
        role: user.role,
        lastLogin: new Date().toISOString()
      };

      await this.dbService.cacheUserSession(user.id, sessionData, 86400);

      log.audit('user_login', {
        userId: user.id,
        email: user.email,
        role: user.role
      });
      timer(); // Log login duration
      return new Response(JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          onboarding_completed: user.onboarding_completed
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        tokenType: tokenPair.tokenType
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      log.error('Login failed', error as Error, {
        component: 'auth',
        action: 'login'
      });
      return new Response(JSON.stringify({ error: 'Login failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async handleGetMe(request: Request): Promise<Response> {
    log.debug('Getting current user', { action: 'get_me' });

    try {
      // Extract JWT token from Authorization header
      const authHeader = request.headers.get('authorization');
      const token = JWTManager.extractTokenFromHeader(authHeader);

      if (!token) {
        return new Response(JSON.stringify({ error: 'No token provided' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const tokenValidation = await JWTManager.verifyAccessToken(token);

      if (!tokenValidation.valid || !tokenValidation.claims) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get user from database
      const user = await this.dbService.getUserByEmail(tokenValidation.claims.email);
      if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        onboarding_completed: user.onboarding_completed,
        ai_preference_level: user.ai_preference_level,
        profile_data: JSON.parse(user.profile_data || '{}')
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      log.error('Get user failed', error as Error, {
        component: 'auth',
        action: 'get_me'
      });
      return new Response(JSON.stringify({ error: 'Failed to get user' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async handleRefreshToken(request: Request): Promise<Response> {
    log.debug('Processing token refresh', { action: 'refresh_token' });

    try {
      const body = await request.json() as unknown;
      const { refreshToken } = body;

      if (!refreshToken) {
        return new Response(JSON.stringify({ error: 'Refresh token is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Generate new token pair using refresh token
      const tokenPair = await JWTManager.refreshAccessToken(refreshToken);

      return new Response(JSON.stringify({
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        tokenType: tokenPair.tokenType
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      log.error('Token refresh failed', error as Error, {
        component: 'auth',
        action: 'refresh_token'
      });
      return new Response(JSON.stringify({ error: 'Token refresh failed' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}