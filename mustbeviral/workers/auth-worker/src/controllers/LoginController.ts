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
      const loginData = await this.extractLoginData(request);
      if (!loginData.valid) {
        return loginData.response;
      }

      const { email, password, mfaCode } = loginData;
      const clientId = this.getClientId(request, email);

      const rateLimitCheck = await this.checkRateLimit(clientId);
      if (!rateLimitCheck.allowed) {
        return this.createErrorResponse('Account locked due to too many failed attempts', 429);
      }

      const userCheck = await this.validateUser(email, password, clientId);
      if (!userCheck.valid) {
        return userCheck.response;
      }

      const mfaCheck = await this.validateMFA(userCheck.user, mfaCode, clientId);
      if (!mfaCheck.valid) {
        return mfaCheck.response;
      }

      const loginResponse = await this.completeLogin(userCheck.user, request, clientId);
      timer.end();
      return loginResponse;

    } catch (error) {
      timer.end();
      this.logger.error('Login failed', { error });
      return this.createErrorResponse('Login failed', 500);
    }
  }

  private async extractLoginData(request: Request) {
    const requestBody = await request.json() as any;
    const { email, password, mfaCode } = requestBody;

    if (!email || !password) {
      return {
        valid: false,
        response: this.createErrorResponse('Email and password are required', 400)
      };
    }

    return { valid: true, email, password, mfaCode };
  }

  private getClientId(request: Request, email: string): string {
    return request.headers.get('CF-Connecting-IP') ?? email;
  }

  private async checkRateLimit(clientId: string) {
    const loginAttempts = await this.getLoginAttempts(clientId);
    const maxAttempts = parseInt(this.env.MAX_LOGIN_ATTEMPTS);
    return {
      allowed: loginAttempts < maxAttempts,
      attempts: loginAttempts
    };
  }

  private async validateUser(email: string, password: string, clientId: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      await this.incrementLoginAttempts(clientId);
      this.logger.security('login.failed', { email, reason: 'user_not_found' });
      return {
        valid: false,
        response: this.createErrorResponse('Invalid credentials', 401)
      };
    }

    const validPassword = await this.passwordService.verify(password, user.password_hash);
    if (!validPassword) {
      await this.incrementLoginAttempts(clientId);
      this.logger.security('login.failed', {
        userId: user.id,
        email,
        reason: 'invalid_password'
      });
      return {
        valid: false,
        response: this.createErrorResponse('Invalid credentials', 401)
      };
    }

    return { valid: true, user };
  }

  private async validateMFA(user: any, mfaCode: string, clientId: string) {
    if (!user.mfa_enabled) {
      return { valid: true };
    }

    if (!mfaCode) {
      return {
        valid: false,
        response: new Response(JSON.stringify({
          error: 'MFA code required',
          mfaRequired: true
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      };
    }

    const validMFA = await this.mfaService.verify(user.id, mfaCode);
    if (!validMFA) {
      await this.incrementLoginAttempts(clientId);
      this.logger.security('login.failed', {
        userId: user.id,
        email: user.email,
        reason: 'invalid_mfa'
      });
      return {
        valid: false,
        response: this.createErrorResponse('Invalid MFA code', 401)
      };
    }

    return { valid: true };
  }

  private async completeLogin(user: any, request: Request, clientId: string) {
    await this.resetLoginAttempts(clientId);

    const tokenPair = await this.generateTokens(user);
    await this.createUserSession(user, tokenPair, request);
    await this.userService.updateLastLogin(user.id);

    this.logSuccessfulLogin(user, request);

    return this.createSuccessResponse(user, tokenPair);
  }

  private async generateTokens(user: any) {
    return await this.tokenService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role
    });
  }

  private async createUserSession(user: any, tokenPair: any, request: Request) {
    await this.sessionService.create({
      userId: user.id,
      refreshToken: tokenPair.refreshToken,
      userAgent: request.headers.get('User-Agent') ?? 'unknown',
      ip: request.headers.get('CF-Connecting-IP') ?? 'unknown'
    });
  }

  private logSuccessfulLogin(user: any, request: Request) {
    this.logger.audit('user.logged_in', {
      userId: user.id,
      email: user.email,
      ip: request.headers.get('CF-Connecting-IP')
    });
  }

  private createSuccessResponse(user: any, tokenPair: any) {
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
  }

  async logout(request: Request): Promise<Response> {
    try {
      const token = this.extractToken(request);
      if (!token) {
        return this.createErrorResponse('No token provided', 401);
      }

      const tokenPayload = await this.verifyLogoutToken(token);
      if (!tokenPayload) {
        return this.createErrorResponse('Invalid token', 401);
      }

      await this.performLogout(token, tokenPayload);

      return this.createLogoutResponse();

    } catch (error) {
      this.logger.error('Logout failed', { error });
      return this.createErrorResponse('Logout failed', 500);
    }
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.get('Authorization');
    return authHeader?.replace('Bearer ', '') || null;
  }

  private async verifyLogoutToken(token: string) {
    return await this.tokenService.verifyAccessToken(token);
  }

  private async performLogout(token: string, tokenPayload: any) {
    await this.sessionService.invalidateUserSessions(tokenPayload.userId);
    await this.tokenService.blacklistToken(token);

    this.logger.audit('user.logged_out', {
      userId: tokenPayload.userId,
      email: tokenPayload.email
    });
  }

  private createLogoutResponse() {
    return new Response(JSON.stringify({
      message: 'Logged out successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
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