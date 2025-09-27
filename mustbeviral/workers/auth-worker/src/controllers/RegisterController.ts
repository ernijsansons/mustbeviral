// Simple register controller - only handles registration!
import { Env } from '../index';
import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics';
import { PasswordService } from '../services/PasswordService';
import { TokenService } from '../services/TokenService';
import { UserService } from '../services/UserService';
import { SessionService } from '../services/SessionService';
import { EmailService } from '../services/EmailService';
import { ValidationService } from '../services/ValidationService';

export class RegisterController {
  private passwordService: PasswordService;
  private tokenService: TokenService;
  private userService: UserService;
  private sessionService: SessionService;
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
    this.emailService = new EmailService(env);
    this.validationService = new ValidationService();
  }

  async register(request: Request): Promise<Response> {
    const timer = this.metrics.startTimer('auth.register');

    try {
      const requestBody = await request.json() as any;
      const { email, username, password, role } = requestBody;

      // Validate input
      const validationResult = this.validationService.validateRegistration({
        email,
        username,
        password,
        role
      });

      if (!validationResult.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validationResult.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if user exists
      const existingUser = await this.userService.findByEmail(email);
      if (existingUser) {
        return this.createErrorResponse('User already exists', 409);
      }

      // Check username availability
      const usernameExists = await this.userService.findByUsername(username);
      if (usernameExists) {
        return this.createErrorResponse('Username already taken', 409);
      }

      // Hash password
      const passwordHash = await this.passwordService.hash(password);

      // Create user
      const newUser = await this.userService.create({
        email,
        username,
        password_hash: passwordHash,
        role,
        email_verified: false,
        mfa_enabled: false,
        created_at: new Date().toISOString()
      });

      // Generate tokens
      const tokenPair = await this.tokenService.generateTokenPair({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role
      });

      // Create session
      await this.sessionService.create({
        userId: newUser.id,
        refreshToken: tokenPair.refreshToken,
        userAgent: request.headers.get('User-Agent') ?? 'unknown',
        ip: request.headers.get('CF-Connecting-IP') ?? 'unknown'
      });

      // Send verification email
      await this.emailService.sendVerificationEmail(newUser.email, newUser.id);

      // Log registration
      this.logger.audit('user.registered', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role
      });

      timer.end();

      return new Response(JSON.stringify({
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          role: newUser.role,
          emailVerified: newUser.email_verified
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: parseInt(this.env.TOKEN_EXPIRY)
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      timer.end();
      this.logger.error('Registration failed', { error });
      return this.createErrorResponse('Registration failed', 500);
    }
  }

  async resetPassword(request: Request): Promise<Response> {
    try {
      const requestBody = await request.json() as unknown;
      const { email } = requestBody;

      if (!email) {
        return this.createErrorResponse('Email is required', 400);
      }

      // Find user (don't reveal if user exists)
      const user = await this.userService.findByEmail(email);

      if (user) {
        // Generate reset token
        const resetToken = await this.tokenService.generateResetToken(user.id);

        // Send reset email
        await this.emailService.sendPasswordResetEmail(user.email, resetToken);

        // Log password reset request
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
      return this.createErrorResponse('Password reset failed', 500);
    }
  }

  async changePassword(request: Request): Promise<Response> {
    try {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        return this.createErrorResponse('Authentication required', 401);
      }

      const tokenPayload = await this.tokenService.verifyAccessToken(token);
      if (!tokenPayload) {
        return this.createErrorResponse('Invalid token', 401);
      }

      const requestBody = await request.json() as any;
      const { currentPassword, newPassword } = requestBody;

      // Validate new password
      const passwordValidation = this.validationService.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return new Response(JSON.stringify({
          error: 'Invalid password',
          details: passwordValidation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get user
      const user = await this.userService.findById(tokenPayload.userId);
      if (!user) {
        return this.createErrorResponse('User not found', 404);
      }

      // Verify current password
      const validPassword = await this.passwordService.verify(currentPassword, user.password_hash);
      if (!validPassword) {
        return this.createErrorResponse('Current password is incorrect', 401);
      }

      // Hash new password
      const newPasswordHash = await this.passwordService.hash(newPassword);

      // Update password
      await this.userService.updatePassword(tokenPayload.userId, newPasswordHash);

      // Invalidate all sessions except current
      await this.sessionService.invalidateUserSessions(tokenPayload.userId, token);

      // Log password change
      this.logger.audit('password.changed', {
        userId: tokenPayload.userId,
        email: tokenPayload.email
      });

      return new Response(JSON.stringify({
        message: 'Password changed successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('Password change failed', { error });
      return this.createErrorResponse('Password change failed', 500);
    }
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