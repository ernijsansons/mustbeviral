// Simple login controller - only handles login!
import { Env } from '../index';
import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics';
import { PasswordService } from '../services/PasswordService';
import { TokenService } from '../services/TokenService';
import { UserService } from '../services/UserService';
import { SessionService } from '../services/SessionService';
import { MFAService } from '../services/MFAService';

export class LoginController {
  private passwordService: PasswordService;
  private tokenService: TokenService;
  private userService: UserService;
  private sessionService: SessionService;
  private mfaService: MFAService;

  constructor(
    private env: Env,
    private logger: Logger,
    private metrics: MetricsCollector
  ) {
    this.passwordService = new PasswordService();
    this.tokenService = new TokenService(env);
    this.userService = new UserService(env);
    this.sessionService = new SessionService(env);
    this.mfaService = new MFAService(env);
  }

  async login(request: Request): Promise<Response> {
    const timer = this.metrics.startTimer('auth.login');

    try {
      const requestBody = await request.json() as any;
      const { email, password, mfaCode } = requestBody;

      // Check input
      if (!email || !password) {
        return this.createErrorResponse('Email and password are required', 400);
      }

      // Check rate limiting
      const clientId = request.headers.get('CF-Connecting-IP') ?? email;
      const loginAttempts = await this.getLoginAttempts(clientId);

      if (loginAttempts >= parseInt(this.env.MAX_LOGIN_ATTEMPTS)) {
        return this.createErrorResponse('Account locked due to too many failed attempts', 429);
      }

      // Find user
      const user = await this.userService.findByEmail(email);
      if (!user) {
        await this.incrementLoginAttempts(clientId);
        this.logger.security('login.failed', { email, reason: 'user_not_found' });
        return this.createErrorResponse('Invalid credentials', 401);
      }

      // Verify password
      const validPassword = await this.passwordService.verify(password, user.password_hash);
      if (!validPassword) {
        await this.incrementLoginAttempts(clientId);
        this.logger.security('login.failed', {
          userId: user.id,
          email,
          reason: 'invalid_password'
        });
        return this.createErrorResponse('Invalid credentials', 401);
      }

      // Check MFA if enabled
      if (user.mfa_enabled) {
        if (!mfaCode) {
          return new Response(JSON.stringify({
            error: 'MFA code required',
            mfaRequired: true
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const validMFA = await this.mfaService.verify(user.id, mfaCode);
        if (!validMFA) {
          await this.incrementLoginAttempts(clientId);
          this.logger.security('login.failed', {
            userId: user.id,
            email,
            reason: 'invalid_mfa'
          });
          return this.createErrorResponse('Invalid MFA code', 401);
        }
      }

      // Success! Reset attempts
      await this.resetLoginAttempts(clientId);

      // Generate tokens
      const tokenPair = await this.tokenService.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Create session
      await this.sessionService.create({
        userId: user.id,
        refreshToken: tokenPair.refreshToken,
        userAgent: request.headers.get('User-Agent') ?? 'unknown',
        ip: request.headers.get('CF-Connecting-IP') ?? 'unknown'
      });

      // Update last login
      await this.userService.updateLastLogin(user.id);

      // Log success
      this.logger.audit('user.logged_in', {
        userId: user.id,
        email: user.email,
        ip: request.headers.get('CF-Connecting-IP')
      });

      timer.end();

      return new Response(JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          emailVerified: user.email_verified,
          mfaEnabled: user.mfa_enabled
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: parseInt(this.env.TOKEN_EXPIRY)
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      timer.end();
      this.logger.error('Login failed', { error });
      return this.createErrorResponse('Login failed', 500);
    }
  }

  async logout(request: Request): Promise<Response> {
    try {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        return this.createErrorResponse('No token provided', 401);
      }

      // Verify token
      const tokenPayload = await this.tokenService.verifyAccessToken(token);
      if (!tokenPayload) {
        return this.createErrorResponse('Invalid token', 401);
      }

      // Invalidate sessions
      await this.sessionService.invalidateUserSessions(tokenPayload.userId);

      // Blacklist token
      await this.tokenService.blacklistToken(token);

      // Log logout
      this.logger.audit('user.logged_out', {
        userId: tokenPayload.userId,
        email: tokenPayload.email
      });

      return new Response(JSON.stringify({
        message: 'Logged out successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('Logout failed', { error });
      return this.createErrorResponse('Logout failed', 500);
    }
  }

  private async getLoginAttempts(clientId: string): Promise<number> {
    const key = `login_attempts:${clientId}`;
    const attempts = await this.env.RATE_LIMITER.get(key);
    return attempts ? parseInt(attempts) : 0;
  }

  private async incrementLoginAttempts(clientId: string): Promise<void> {
    const key = `login_attempts:${clientId}`;
    const currentAttempts = await this.getLoginAttempts(clientId);
    await this.env.RATE_LIMITER.put(
      key,
      (currentAttempts + 1).toString(),
      { expirationTtl: parseInt(this.env.LOCKOUT_DURATION) }
    );
  }

  private async resetLoginAttempts(clientId: string): Promise<void> {
    const key = `login_attempts:${clientId}`;
    await this.env.RATE_LIMITER.delete(key);
  }

  private createErrorResponse(message: string, status: number): Response {
    return new Response(JSON.stringify({
      error: message
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}