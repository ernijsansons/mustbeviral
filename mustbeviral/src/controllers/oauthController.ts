// OAuth Controller for Cloudflare Workers
// Handles Google and Twitter/X OAuth authentication flows

import { CloudflareEnv} from '../lib/cloudflare';
import { DatabaseService} from '../lib/db';
import { JWTManager} from '../lib/auth/jwtManager';
import { logger, log} from '../lib/monitoring/logger';

interface OAuthState {
  state: string;
  codeVerifier?: string; // For Twitter PKCE
  timestamp: number;
}

export class OAuthController {
  private static generateSecureState(): string {
    return crypto.randomUUID() + '-' + Date.now();
  }

  private static generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '')
      .replace(/=/g, '');
  }

  private static async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '')
      .replace(/=/g, '');
  }

  private static async storeOAuthState(
    env: CloudflareEnv,
    state: string,
    data: OAuthState
  ): Promise<void> {
    const key = `oauth_state:${state}`;
    await env.KV_NAMESPACE.put(key, JSON.stringify(data), { expirationTtl: 600 }); // 10 minutes
  }

  private static async getOAuthState(
    env: CloudflareEnv,
    state: string
  ): Promise<OAuthState | null> {
    const key = `oauth_state:${state}`;
    const data = await env.KV_NAMESPACE.get(key);
    if (!data) {
    return null;
  }

    // Delete state after retrieval (single use)
    await env.KV_NAMESPACE.delete(key);

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Initiate Google OAuth flow
   */
  static async handleGoogleOAuth(request: Request, env: CloudflareEnv): Promise<Response> {
    log.info('Initiating Google OAuth', { action: 'oauth_google_init' });

    try {
      const googleClientId = env.GOOGLECLIENTID;
      if (!googleClientId) {
        log.error('Google OAuth not configured', new Error('Missing GOOGLE_CLIENT_ID'), {
          component: 'oauth',
          action: 'google_init'
        });
        return new Response(JSON.stringify({ error: 'Google OAuth not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const state = this.generateSecureState();
      const redirectUri = `${env.WORKERS_URL ?? 'http://localhost:8787'}/api/oauth/google/callback`;

      // Store state in KV for CSRF protection
      await this.storeOAuthState(env, state, { state,
        timestamp: Date.now()
      });

      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.set('client_id', googleClientId);
      googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
      googleAuthUrl.searchParams.set('response_type', 'code');
      googleAuthUrl.searchParams.set('scope', 'openid email profile');
      googleAuthUrl.searchParams.set('state', state);

      log.info('Redirecting to Google OAuth', {
        action: 'oauth_google_redirect',
        redirectUri
      });

      return Response.redirect(googleAuthUrl.toString(), 302);

    } catch (error: unknown) {
      log.error('Google OAuth initiation failed', error as Error, {
        component: 'oauth',
        action: 'google_init'
      });
      return new Response(JSON.stringify({ error: 'OAuth initialization failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Handle Google OAuth callback
   */
  static async handleGoogleCallback(
    request: Request,
    env: CloudflareEnv,
    dbService: DatabaseService
  ): Promise<Response> {
    log.info('Processing Google OAuth callback', { action: 'oauth_google_callback' });

    try {
      const url = new URL(request.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code) {
        log.error('No authorization code received from Google', new Error('Missing code'), {
          component: 'oauth',
          action: 'google_callback'
        });
        return Response.redirect(`${env.APPBASEURL}/onboard?error=oauth_failed`, 302);
      }

      if (!state) {
        log.error('No state parameter from Google', new Error('Missing state'), {
          component: 'oauth',
          action: 'google_callback'
        });
        return Response.redirect(`${env.APPBASEURL}/onboard?error=oauth_failed`, 302);
      }

      // Validate state to prevent CSRF attacks
      const storedState = await this.getOAuthState(env, state);
      if (!storedState ?? storedState.state !== state) {
        log.error('Invalid OAuth state parameter', new Error('CSRF validation failed'), {
          component: 'oauth',
          action: 'google_callback'
        });
        return Response.redirect(`${env.APPBASEURL}/onboard?error=oauth_failed`, 302);
      }

      // Exchange code for access token
      const redirectUri = `${env.WORKERS_URL ?? 'http://localhost:8787'}/api/oauth/google/callback`;
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.GOOGLE_CLIENT_ID!,
          client_secret: env.GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      });

      const tokenData = await tokenResponse.json() as unknown;

      if (!tokenData.accesstoken) {
        log.error('Failed to get access token from Google', new Error('Token exchange failed'), {
          component: 'oauth',
          action: 'google_callback'
        });
        return Response.redirect(`${env.APPBASEURL}/onboard?error=oauth_failed`, 302);
      }

      // Get user profile from Google
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.accesstoken}` }
      });

      const profile = await profileResponse.json() as unknown;

      if (!profile.email) {
        log.error('No email in Google profile', new Error('Missing email'), {
          component: 'oauth',
          action: 'google_callback'
        });
        return Response.redirect(`${env.APPBASEURL}/onboard?error=oauth_failed`, 302);
      }

      // Check if user exists
      let user = await dbService.getUserByEmail(profile.email);

      if (!user) {
        // Create new user
        const profileData = {
          provider: 'google',
          providerId: profile.id,
          avatar: profile.picture,
          locale: profile.locale,
          onboardingCompletedAt: new Date().toISOString()
        };

        const userData = {
          email: profile.email,
          username: profile.name ?? profile.email.split('@')[0],
          password_hash: '', // No password for OAuth users
          role: 'creator' as const, // Default role
          profile_data: JSON.stringify(profileData),
          ai_preference_level: 50,
          onboarding_completed: 0 // Will need to complete onboarding
        };

        user = await dbService.createUser(userData);
        log.audit('google_oauth_user_created', {
          userId: user.id,
          email: user.email,
          provider: 'google'
        });
      } else {
        log.audit('google_oauth_user_login', {
          userId: user.id,
          email: user.email,
          provider: 'google'
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
        lastLogin: new Date().toISOString(),
        provider: 'google'
      };

      await dbService.cacheUserSession(user.id, sessionData, 86400);

      // Create response with redirect
      const redirectUrl = user.onboarding_completed
        ? `${env.APPBASEURL}/dashboard`
        : `${env.APPBASEURL}/onboard?step=profile`;

      // Create HTML response that sets token and redirects
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Redirecting...</title>
          <script>
            // Store tokens in localStorage
            localStorage.setItem('accessToken', '${tokenPair.accessToken}');
            localStorage.setItem('refreshToken', '${tokenPair.refreshToken}');
            localStorage.setItem('tokenType', '${tokenPair.tokenType}');
            localStorage.setItem('expiresIn', '${tokenPair.expiresIn}');

            // Redirect to app
            window.location.href = '${redirectUrl}';
          </script>
        </head>
        <body>
          <p>Completing sign in...</p>
        </body>
        </html>
      `;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });

    } catch (error: unknown) {
      log.error('Google OAuth callback failed', error as Error, {
        component: 'oauth',
        action: 'google_callback'
      });
      return Response.redirect(`${env.APPBASEURL}/onboard?error=oauth_failed`, 302);
    }
  }

  /**
   * Initiate Twitter/X OAuth flow
   */
  static async handleTwitterOAuth(request: Request, env: CloudflareEnv): Promise<Response> {
    log.info('Initiating Twitter OAuth', { action: 'oauth_twitter_init' });

    try {
      const twitterClientId = env.TWITTERCLIENTID;
      if (!twitterClientId) {
        log.error('Twitter OAuth not configured', new Error('Missing TWITTER_CLIENT_ID'), {
          component: 'oauth',
          action: 'twitter_init'
        });
        return new Response(JSON.stringify({ error: 'Twitter OAuth not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const state = this.generateSecureState();
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const redirectUri = `${env.WORKERS_URL ?? 'http://localhost:8787'}/api/oauth/x/callback`;

      // Store state and code verifier in KV for PKCE
      await this.storeOAuthState(env, state, { state,
        codeVerifier,
        timestamp: Date.now()
      });

      const twitterAuthUrl = new URL('https://twitter.com/i/oauth2/authorize');
      twitterAuthUrl.searchParams.set('response_type', 'code');
      twitterAuthUrl.searchParams.set('client_id', twitterClientId);
      twitterAuthUrl.searchParams.set('redirect_uri', redirectUri);
      twitterAuthUrl.searchParams.set('scope', 'tweet.read users.read');
      twitterAuthUrl.searchParams.set('state', state);
      twitterAuthUrl.searchParams.set('code_challenge', codeChallenge);
      twitterAuthUrl.searchParams.set('code_challenge_method', 'S256');

      log.info('Redirecting to Twitter OAuth', {
        action: 'oauth_twitter_redirect',
        redirectUri
      });

      return Response.redirect(twitterAuthUrl.toString(), 302);

    } catch (error: unknown) {
      log.error('Twitter OAuth initiation failed', error as Error, {
        component: 'oauth',
        action: 'twitter_init'
      });
      return new Response(JSON.stringify({ error: 'OAuth initialization failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Handle Twitter/X OAuth callback
   */
  static async handleTwitterCallback(
    request: Request,
    env: CloudflareEnv,
    dbService: DatabaseService
  ): Promise<Response> {
    log.info('Processing Twitter OAuth callback', { action: 'oauth_twitter_callback' });

    try {
      const url = new URL(request.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code) {
        log.error('No authorization code received from Twitter', new Error('Missing code'), {
          component: 'oauth',
          action: 'twitter_callback'
        });
        return Response.redirect(`${env.APPBASEURL}/onboard?error=oauth_failed`, 302);
      }

      if (!state) {
        log.error('No state parameter from Twitter', new Error('Missing state'), {
          component: 'oauth',
          action: 'twitter_callback'
        });
        return Response.redirect(`${env.APPBASEURL}/onboard?error=oauth_failed`, 302);
      }

      // Validate state and get code verifier
      const storedState = await this.getOAuthState(env, state);
      if (!storedState ?? storedState.state !== state ?? !storedState.codeVerifier) {
        log.error('Invalid OAuth state parameter or missing code verifier', new Error('CSRF/PKCE validation failed'), {
          component: 'oauth',
          action: 'twitter_callback'
        });
        return Response.redirect(`${env.APPBASEURL}/onboard?error=oauth_failed`, 302);
      }

      // Exchange code for access token
      const redirectUri = `${env.WORKERS_URL ?? 'http://localhost:8787'}/api/oauth/x/callback`;
      const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.TWITTER_CLIENT_ID!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code_verifier: storedState.codeVerifier
        })
      });

      const tokenData = await tokenResponse.json() as unknown;

      if (!tokenData.accesstoken) {
        log.error('Failed to get access token from Twitter', new Error('Token exchange failed'), {
          component: 'oauth',
          action: 'twitter_callback'
        });
        return Response.redirect(`${env.APPBASEURL}/onboard?error=oauth_failed`, 302);
      }

      // Get user profile from Twitter
      const profileResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
        headers: { Authorization: `Bearer ${tokenData.accesstoken}` }
      });

      const profileData = await profileResponse.json() as unknown;
      const profile = profileData.data;

      if (!profile ?? !profile.username) {
        log.error('No profile data from Twitter', new Error('Missing profile'), {
          component: 'oauth',
          action: 'twitter_callback'
        });
        return Response.redirect(`${env.APPBASEURL}/onboard?error=oauth_failed`, 302);
      }

      // For Twitter, use username@twitter.local as email since Twitter doesn't provide email
      const email = `${profile.username}@twitter.local`;

      // Check if user exists
      let user = await dbService.getUserByEmail(email);

      if (!user) {
        // Create new user
        const userProfileData = {
          provider: 'twitter',
          providerId: profile.id,
          avatar: profile.profileimageurl,
          twitterUsername: profile.username,
          onboardingCompletedAt: new Date().toISOString()
        };

        const userData = { email,
          username: profile.username,
          password_hash: '', // No password for OAuth users
          role: 'creator' as const, // Default role
          profile_data: JSON.stringify(userProfileData),
          ai_preference_level: 50,
          onboarding_completed: 0 // Will need to complete onboarding
        };

        user = await dbService.createUser(userData);
        log.audit('twitter_oauth_user_created', {
          userId: user.id,
          email: user.email,
          provider: 'twitter'
        });
      } else {
        log.audit('twitter_oauth_user_login', {
          userId: user.id,
          email: user.email,
          provider: 'twitter'
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
        lastLogin: new Date().toISOString(),
        provider: 'twitter'
      };

      await dbService.cacheUserSession(user.id, sessionData, 86400);

      // Create response with redirect
      const redirectUrl = user.onboarding_completed
        ? `${env.APPBASEURL}/dashboard`
        : `${env.APPBASEURL}/onboard?step=profile`;

      // Create HTML response that sets token and redirects
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Redirecting...</title>
          <script>
            // Store tokens in localStorage
            localStorage.setItem('accessToken', '${tokenPair.accessToken}');
            localStorage.setItem('refreshToken', '${tokenPair.refreshToken}');
            localStorage.setItem('tokenType', '${tokenPair.tokenType}');
            localStorage.setItem('expiresIn', '${tokenPair.expiresIn}');

            // Redirect to app
            window.location.href = '${redirectUrl}';
          </script>
        </head>
        <body>
          <p>Completing sign in...</p>
        </body>
        </html>
      `;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });

    } catch (error: unknown) {
      log.error('Twitter OAuth callback failed', error as Error, {
        component: 'oauth',
        action: 'twitter_callback'
      });
      return Response.redirect(`${env.APPBASEURL}/onboard?error=oauth_failed`, 302);
    }
  }
}