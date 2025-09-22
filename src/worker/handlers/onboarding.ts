// Onboarding Request Handler
// Extracted from worker.ts for modularity

import { DatabaseService } from '../../lib/db';
import { JWTManager } from '../../lib/auth/jwtManager';
import { log } from '../../lib/monitoring/logger';

export class OnboardingHandler {
  constructor(private dbService: DatabaseService) {}

  async handleOnboard(request: Request): Promise<Response> {
    const timer = log.startTimer('user_onboarding');

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

      // Update user onboarding status
      await this.dbService.updateUserOnboarding(tokenValidation.claims.sub, true);

      log.audit('onboarding_completed', {
        userId: tokenValidation.claims.sub
      });
      timer(); // Log onboarding duration
      return new Response(JSON.stringify({
        message: 'Onboarding completed successfully',
        user: {
          id: tokenValidation.claims.sub,
          onboarding_completed: true
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      log.error('Onboarding failed', error as Error, {
        component: 'onboarding',
        action: 'complete'
      });
      return new Response(JSON.stringify({ error: 'Onboarding failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}