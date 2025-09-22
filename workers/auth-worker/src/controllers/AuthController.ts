// Authentication Controller
// Handles user registration, login, and authentication flows

import { Env } from '../index';
import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics';
import { PasswordService } from '../services/PasswordService';
import { TokenService } from '../services/TokenService';
import { UserService } from '../services/UserService';
import { SessionService } from '../services/SessionService';
import { OAuthService } from '../services/OAuthService';
import { MFAService } from '../services/MFAService';
import { EmailService } from '../services/EmailService';
import { ValidationService } from '../services/ValidationService';

export class AuthController {
  private passwordService: PasswordService;
  private tokenService: TokenService;
  private userService: UserService;
  private sessionService: SessionService;
  private oauthService: OAuthService;
  private mfaService: MFAService;
  private emailService: EmailService;
  private validationService: ValidationService;

  constructor(
    private env: Env,
    private logger: Logger,
    private metrics: MetricsCollector
  ) {
    this.passwordService = new PasswordService();
    this.tokenService = new TokenService(env);
    this.userService = new UserService(env);
    this.sessionService = new SessionService(env);
    this.oauthService = new OAuthService(env);
    this.mfaService = new MFAService(env);
    this.emailService = new EmailService(env);
    this.validationService = new ValidationService();
  }

  async register(request: Request): Promise<Response> {
    const timer = this.metrics.startTimer('auth.register');

    try {
      const body = await request.json() as unknown;
      const { _email, username, password, role } = body;

      // Validate input
      const validation = this.validationService.validateRegistration({ _email,
        username,
        password,
        role
      });

      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if user exists
      const existingUser = await this.userService.findByEmail(email);
      if (existingUser) {
        return new Response(JSON.stringify({
          error: 'User already exists'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check username availability
      const usernameExists = await this.userService.findByUsername(username);
      if (usernameExists) {
        return new Response(JSON.stringify({
          error: 'Username already taken'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Hash password
      const passwordHash = await this.passwordService.hash(password);

      // Create user
      const user = await this.userService.create({ _email,
        username,
        password_hash: passwordHash,
        role,
        email_verified: false,
        mfa_enabled: false,
        created_at: new Date().toISOString()
      });

      // Generate tokens
      const { _accessToken, refreshToken } = await this.tokenService.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Create session
      await this.sessionService.create({
        userId: user.id,
        refreshToken,
        userAgent: request.headers.get('User-Agent') || 'unknown',
        ip: request.headers.get('CF-Connecting-IP') || 'unknown'
      });

      // Send verification email
      await this.emailService.sendVerificationEmail(user.email, user.id);

      // Log audit event
      this.logger.audit('user.registered', {
        userId: user.id,
        email: user.email,
        role: user.role
      });

      timer.end();

      return new Response(JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          emailVerified: user.email_verified
        },
        accessToken,
        refreshToken,
        expiresIn: parseInt(this.env.TOKEN_EXPIRY)
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      timer.end();
      this.logger.error('Registration failed', { error });

      return new Response(JSON.stringify({
        error: 'Registration failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async login(request: Request): Promise<Response> {
    const timer = this.metrics.startTimer('auth.login');

    try {
      const body = await request.json() as unknown;
      const { _email, password, mfaCode } = body;

      // Validate input
      if (!email || !password) {
        return new Response(JSON.stringify({
          error: 'Email and password are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check login attempts
      const clientId = request.headers.get('CF-Connecting-IP') || email;
      const attempts = await this.getLoginAttempts(clientId);

      if (attempts >= parseInt(this.env.MAX_LOGIN_ATTEMPTS)) {
        return new Response(JSON.stringify({
          error: 'Account locked due to too many failed attempts'
        }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Find user
      const user = await this.userService.findByEmail(email);
      if (!user) {
        await this.incrementLoginAttempts(clientId);
        this.logger.security('login.failed', { _email, reason: 'user_not_found' });

        return new Response(JSON.stringify({
          error: 'Invalid credentials'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
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

        return new Response(JSON.stringify({
          error: 'Invalid credentials'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
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

          return new Response(JSON.stringify({
            error: 'Invalid MFA code'
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Reset login attempts on successful login
      await this.resetLoginAttempts(clientId);

      // Generate tokens
      const { _accessToken, refreshToken } = await this.tokenService.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Create session
      await this.sessionService.create({
        userId: user.id,
        refreshToken,
        userAgent: request.headers.get('User-Agent') || 'unknown',
        ip: request.headers.get('CF-Connecting-IP') || 'unknown'
      });

      // Update last login
      await this.userService.updateLastLogin(user.id);

      // Log audit event
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
        accessToken,
        refreshToken,
        expiresIn: parseInt(this.env.TOKEN_EXPIRY)
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      timer.end();
      this.logger.error('Login failed', { error });

      return new Response(JSON.stringify({
        error: 'Login failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async logout(request: Request): Promise<Response> {
    try {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        return new Response(JSON.stringify({
          error: 'No token provided'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verify token and get user info
      const payload = await this.tokenService.verifyAccessToken(token);
      if (!payload) {
        return new Response(JSON.stringify({
          error: 'Invalid token'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Invalidate all sessions for this user
      await this.sessionService.invalidateUserSessions(payload.userId);

      // Add token to blacklist
      await this.tokenService.blacklistToken(token);

      // Log audit event
      this.logger.audit('user.logged_out', {
        userId: payload.userId,
        email: payload.email
      });

      return new Response(JSON.stringify({
        message: 'Logged out successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('Logout failed', { error });

      return new Response(JSON.stringify({
        error: 'Logout failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async resetPassword(request: Request): Promise<Response> {
    try {
      const body = await request.json() as unknown;
      const { email } = body;

      if (!email) {
        return new Response(JSON.stringify({
          error: 'Email is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Find user (don't reveal if user exists)
      const user = await this.userService.findByEmail(email);

      if (user) {
        // Generate reset token
        const resetToken = await this.tokenService.generateResetToken(user.id);

        // Send reset email
        await this.emailService.sendPasswordResetEmail(user.email, resetToken);

        // Log audit event
        this.logger.audit('password.reset_requested', {
          userId: user.id,
          email: user.email
        });
      }

      // Always return success to prevent user enumeration
      return new Response(JSON.stringify({
        message: 'If the email exists, a password reset link has been sent'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('Password reset failed', { error });

      return new Response(JSON.stringify({
        error: 'Password reset failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async changePassword(request: Request): Promise<Response> {
    try {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        return new Response(JSON.stringify({
          error: 'Authentication required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const payload = await this.tokenService.verifyAccessToken(token);
      if (!payload) {
        return new Response(JSON.stringify({
          error: 'Invalid token'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const body = await request.json() as unknown;
      const { _currentPassword, newPassword } = body;

      // Validate new password
      const validation = this.validationService.validatePassword(newPassword);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Invalid password',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get user
      const user = await this.userService.findById(payload.userId);
      if (!user) {
        return new Response(JSON.stringify({
          error: 'User not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verify current password
      const validPassword = await this.passwordService.verify(currentPassword, user.password_hash);
      if (!validPassword) {
        return new Response(JSON.stringify({
          error: 'Current password is incorrect'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Hash new password
      const newPasswordHash = await this.passwordService.hash(newPassword);

      // Update password
      await this.userService.updatePassword(payload.userId, newPasswordHash);

      // Invalidate all sessions except current
      await this.sessionService.invalidateUserSessions(payload.userId, token);

      // Log audit event
      this.logger.audit('password.changed', {
        userId: payload.userId,
        email: payload.email
      });

      return new Response(JSON.stringify({
        message: 'Password changed successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('Password change failed', { error });

      return new Response(JSON.stringify({
        error: 'Password change failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async enableMFA(request: Request): Promise<Response> {
    try {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        return new Response(JSON.stringify({
          error: 'Authentication required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const payload = await this.tokenService.verifyAccessToken(token);
      if (!payload) {
        return new Response(JSON.stringify({
          error: 'Invalid token'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Generate MFA secret
      const { _secret, qrCode } = await this.mfaService.generateSecret(payload.userId, payload.email);

      // Store secret temporarily (user must verify to enable)
      await this.mfaService.storeTempSecret(payload.userId, secret);

      return new Response(JSON.stringify({ _secret,
        qrCode,
        message: 'Scan the QR code with your authenticator app and verify with a code to enable MFA'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('MFA enable failed', { error });

      return new Response(JSON.stringify({
        error: 'Failed to enable MFA'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async verifyMFA(request: Request): Promise<Response> {
    try {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        return new Response(JSON.stringify({
          error: 'Authentication required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const payload = await this.tokenService.verifyAccessToken(token);
      if (!payload) {
        return new Response(JSON.stringify({
          error: 'Invalid token'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const body = await request.json() as unknown;
      const { code } = body;

      // Verify the code with temp secret
      const valid = await this.mfaService.verifyTempCode(payload.userId, code);
      if (!valid) {
        return new Response(JSON.stringify({
          error: 'Invalid verification code'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Enable MFA for user
      await this.userService.enableMFA(payload.userId);
      await this.mfaService.confirmSecret(payload.userId);

      // Generate backup codes
      const backupCodes = await this.mfaService.generateBackupCodes(payload.userId);

      // Log audit event
      this.logger.audit('mfa.enabled', {
        userId: payload.userId,
        email: payload.email
      });

      return new Response(JSON.stringify({
        message: 'MFA enabled successfully',
        backupCodes
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('MFA verify failed', { error });

      return new Response(JSON.stringify({
        error: 'Failed to verify MFA'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async oauthGoogle(request: Request): Promise<Response> {
    try {
      const redirectUrl = await this.oauthService.getGoogleAuthUrl();

      return Response.redirect(redirectUrl, 302);

    } catch (error) {
      this.logger.error('Google OAuth failed', { error });

      return new Response(JSON.stringify({
        error: 'OAuth initialization failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async oauthGoogleCallback(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const code = url.searchParams.get('code');

      if (!code) {
        return new Response(JSON.stringify({
          error: 'OAuth code missing'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Exchange code for user info
      const googleUser = await this.oauthService.handleGoogleCallback(code);

      // Find or create user
      let user = await this.userService.findByEmail(googleUser.email);

      if (!user) {
        user = await this.userService.createOAuthUser({
          email: googleUser.email,
          username: googleUser.email.split('@')[0],
          provider: 'google',
          providerId: googleUser.id,
          emailVerified: true
        });
      }

      // Generate tokens
      const { _accessToken, refreshToken } = await this.tokenService.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Create session
      await this.sessionService.create({
        userId: user.id,
        refreshToken,
        userAgent: request.headers.get('User-Agent') || 'unknown',
        ip: request.headers.get('CF-Connecting-IP') || 'unknown'
      });

      // Redirect to frontend with tokens
      const frontendUrl = new URL(this.env.ALLOWED_ORIGINS.split(',')[0]);
      frontendUrl.pathname = '/auth/callback';
      frontendUrl.searchParams.set('token', accessToken);
      frontendUrl.searchParams.set('refresh', refreshToken);

      return Response.redirect(frontendUrl.toString(), 302);

    } catch (error) {
      this.logger.error('Google OAuth callback failed', { error });

      return new Response(JSON.stringify({
        error: 'OAuth callback failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async oauthGithub(request: Request): Promise<Response> {
    try {
      const redirectUrl = await this.oauthService.getGithubAuthUrl();

      return Response.redirect(redirectUrl, 302);

    } catch (error) {
      this.logger.error('GitHub OAuth failed', { error });

      return new Response(JSON.stringify({
        error: 'OAuth initialization failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async oauthGithubCallback(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const code = url.searchParams.get('code');

      if (!code) {
        return new Response(JSON.stringify({
          error: 'OAuth code missing'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Exchange code for user info
      const githubUser = await this.oauthService.handleGithubCallback(code);

      // Find or create user
      let user = await this.userService.findByEmail(githubUser.email);

      if (!user) {
        user = await this.userService.createOAuthUser({
          email: githubUser.email,
          username: githubUser.login,
          provider: 'github',
          providerId: githubUser.id.toString(),
          emailVerified: true
        });
      }

      // Generate tokens
      const { _accessToken, refreshToken } = await this.tokenService.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Create session
      await this.sessionService.create({
        userId: user.id,
        refreshToken,
        userAgent: request.headers.get('User-Agent') || 'unknown',
        ip: request.headers.get('CF-Connecting-IP') || 'unknown'
      });

      // Redirect to frontend with tokens
      const frontendUrl = new URL(this.env.ALLOWED_ORIGINS.split(',')[0]);
      frontendUrl.pathname = '/auth/callback';
      frontendUrl.searchParams.set('token', accessToken);
      frontendUrl.searchParams.set('refresh', refreshToken);

      return Response.redirect(frontendUrl.toString(), 302);

    } catch (error) {
      this.logger.error('GitHub OAuth callback failed', { error });

      return new Response(JSON.stringify({
        error: 'OAuth callback failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async getLoginAttempts(clientId: string): Promise<number> {
    const key = `login_attempts:${clientId}`;
    const attempts = await this.env.RATE_LIMITER.get(key);
    return attempts ? parseInt(attempts) : 0;
  }

  private async incrementLoginAttempts(clientId: string): Promise<void> {
    const key = `login_attempts:${clientId}`;
    const attempts = await this.getLoginAttempts(clientId);
    await this.env.RATE_LIMITER.put(
      key,
      (attempts + 1).toString(),
      { expirationTtl: parseInt(this.env.LOCKOUT_DURATION) }
    );
  }

  private async resetLoginAttempts(clientId: string): Promise<void> {
    const key = `login_attempts:${clientId}`;
    await this.env.RATE_LIMITER.delete(key);
  }
}