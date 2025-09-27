// Simple session controller - handles MFA and OAuth!
import { Env } from '../index';
import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics';
import { TokenService } from '../services/TokenService';
import { UserService } from '../services/UserService';
import { SessionService } from '../services/SessionService';
import { OAuthService } from '../services/OAuthService';
import { MFAService } from '../services/MFAService';

export class SessionController {
  private tokenService: TokenService;
  private userService: UserService;
  private sessionService: SessionService;
  private oauthService: OAuthService;
  private mfaService: MFAService;

  constructor(
    private env: Env,
    private logger: Logger,
    private metrics: MetricsCollector
  ) {
    this.tokenService = new TokenService(env);
    this.userService = new UserService(env);
    this.sessionService = new SessionService(env);
    this.oauthService = new OAuthService(env);
    this.mfaService = new MFAService(env);
  }

  async enableMFA(request: Request): Promise<Response> {
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

      // Generate MFA secret
      const mfaSetup = await this.mfaService.generateSecret(tokenPayload.userId, tokenPayload.email);

      // Store secret temporarily (user must verify to enable)
      await this.mfaService.storeTempSecret(tokenPayload.userId, mfaSetup.secret);

      return new Response(JSON.stringify({
        secret: mfaSetup.secret,
        qrCode: mfaSetup.qrCode,
        message: 'Scan the QR code with your authenticator app and verify with a code to enable MFA'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('MFA enable failed', { error });
      return this.createErrorResponse('Failed to enable MFA', 500);
    }
  }

  async verifyMFA(request: Request): Promise<Response> {
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

      const requestBody = await request.json() as unknown;
      const { code } = requestBody;

      // Verify the code with temp secret
      const validCode = await this.mfaService.verifyTempCode(tokenPayload.userId, code);
      if (!validCode) {
        return this.createErrorResponse('Invalid verification code', 400);
      }

      // Enable MFA for user
      await this.userService.enableMFA(tokenPayload.userId);
      await this.mfaService.confirmSecret(tokenPayload.userId);

      // Generate backup codes
      const backupCodes = await this.mfaService.generateBackupCodes(tokenPayload.userId);

      // Log MFA enabled
      this.logger.audit('mfa.enabled', {
        userId: tokenPayload.userId,
        email: tokenPayload.email
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
      return this.createErrorResponse('Failed to verify MFA', 500);
    }
  }

  async oauthGoogle(request: Request): Promise<Response> {
    try {
      const redirectUrl = await this.oauthService.getGoogleAuthUrl();
      return Response.redirect(redirectUrl, 302);

    } catch (error) {
      this.logger.error('Google OAuth failed', { error });
      return this.createErrorResponse('OAuth initialization failed', 500);
    }
  }

  async oauthGoogleCallback(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const code = url.searchParams.get('code');

      if (!code) {
        return this.createErrorResponse('OAuth code missing', 400);
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

      // Redirect to frontend with tokens
      const frontendUrl = new URL(this.env.ALLOWED_ORIGINS.split(',')[0]);
      frontendUrl.pathname = '/auth/callback';
      frontendUrl.searchParams.set('token', tokenPair.accessToken);
      frontendUrl.searchParams.set('refresh', tokenPair.refreshToken);

      return Response.redirect(frontendUrl.toString(), 302);

    } catch (error) {
      this.logger.error('Google OAuth callback failed', { error });
      return this.createErrorResponse('OAuth callback failed', 500);
    }
  }

  async oauthGithub(request: Request): Promise<Response> {
    try {
      const redirectUrl = await this.oauthService.getGithubAuthUrl();
      return Response.redirect(redirectUrl, 302);

    } catch (error) {
      this.logger.error('GitHub OAuth failed', { error });
      return this.createErrorResponse('OAuth initialization failed', 500);
    }
  }

  async oauthGithubCallback(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const code = url.searchParams.get('code');

      if (!code) {
        return this.createErrorResponse('OAuth code missing', 400);
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

      // Redirect to frontend with tokens
      const frontendUrl = new URL(this.env.ALLOWED_ORIGINS.split(',')[0]);
      frontendUrl.pathname = '/auth/callback';
      frontendUrl.searchParams.set('token', tokenPair.accessToken);
      frontendUrl.searchParams.set('refresh', tokenPair.refreshToken);

      return Response.redirect(frontendUrl.toString(), 302);

    } catch (error) {
      this.logger.error('GitHub OAuth callback failed', { error });
      return this.createErrorResponse('OAuth callback failed', 500);
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