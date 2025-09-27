// Simple Authentication Controller - delegates to focused controllers
import { Env } from '../index';
import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics';
import { LoginController } from './LoginController';
import { RegisterController } from './RegisterController';
import { SessionController } from './SessionController';

export class AuthController {
  private loginController: LoginController;
  private registerController: RegisterController;
  private sessionController: SessionController;

  constructor(
    private env: Env,
    private logger: Logger,
    private metrics: MetricsCollector
  ) {
    this.loginController = new LoginController(env, logger, metrics);
    this.registerController = new RegisterController(env, logger, metrics);
    this.sessionController = new SessionController(env, logger, metrics);
  }

  // Registration - delegate to RegisterController
  async register(request: Request): Promise<Response> {
    return this.registerController.register(request);
  }

  // Login - delegate to LoginController
  async login(request: Request): Promise<Response> {
    return this.loginController.login(request);
  }

  // Logout - delegate to LoginController
  async logout(request: Request): Promise<Response> {
    return this.loginController.logout(request);
  }

  // Password reset - delegate to RegisterController
  async resetPassword(request: Request): Promise<Response> {
    return this.registerController.resetPassword(request);
  }

  // Change password - delegate to RegisterController
  async changePassword(request: Request): Promise<Response> {
    return this.registerController.changePassword(request);
  }

  // Enable MFA - delegate to SessionController
  async enableMFA(request: Request): Promise<Response> {
    return this.sessionController.enableMFA(request);
  }

  // Verify MFA - delegate to SessionController
  async verifyMFA(request: Request): Promise<Response> {
    return this.sessionController.verifyMFA(request);
  }

  // Google OAuth - delegate to SessionController
  async oauthGoogle(request: Request): Promise<Response> {
    return this.sessionController.oauthGoogle(request);
  }

  // Google OAuth callback - delegate to SessionController
  async oauthGoogleCallback(request: Request): Promise<Response> {
    return this.sessionController.oauthGoogleCallback(request);
  }

  // GitHub OAuth - delegate to SessionController
  async oauthGithub(request: Request): Promise<Response> {
    return this.sessionController.oauthGithub(request);
  }

  // GitHub OAuth callback - delegate to SessionController
  async oauthGithubCallback(request: Request): Promise<Response> {
    return this.sessionController.oauthGithubCallback(request);
  }

}