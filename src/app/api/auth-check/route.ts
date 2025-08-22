// Authentication and authorization check API with security features
// LOG: API-AUTH-CHECK-1 - Initialize auth check API

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { securityManager } from '@/lib/security';
import { DatabaseService } from '@/lib/db';

export async function POST(request: NextRequest) {
  console.log('LOG: API-AUTH-CHECK-2 - Auth check API called');

  try {
    const body = await request.json();
    const { action, token, user_id, operation, sso_provider, sso_code, redirect_uri } = body;

    console.log('LOG: API-AUTH-CHECK-3 - Request params:', { action, user_id, operation, sso_provider });

    if (!action) {
      console.log('LOG: API-AUTH-CHECK-ERROR-1 - Missing action parameter');
      return NextResponse.json(
        { error: 'Missing required parameter: action' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'verify_token':
        console.log('LOG: API-AUTH-CHECK-4 - Verifying JWT token');
        result = await handleTokenVerification(token);
        break;

      case 'check_permissions':
        console.log('LOG: API-AUTH-CHECK-5 - Checking user permissions');
        if (!user_id || !operation) {
          return NextResponse.json(
            { error: 'user_id and operation required for permission check' },
            { status: 400 }
          );
        }
        result = await handlePermissionCheck(user_id, operation);
        break;

      case 'sso_auth_url':
        console.log('LOG: API-AUTH-CHECK-6 - Generating SSO auth URL');
        if (!sso_provider || !redirect_uri) {
          return NextResponse.json(
            { error: 'sso_provider and redirect_uri required for SSO auth URL' },
            { status: 400 }
          );
        }
        result = await handleSSOAuthUrl(sso_provider, redirect_uri, user_id);
        break;

      case 'sso_callback':
        console.log('LOG: API-AUTH-CHECK-7 - Processing SSO callback');
        if (!sso_provider || !sso_code || !redirect_uri) {
          return NextResponse.json(
            { error: 'sso_provider, sso_code, and redirect_uri required for SSO callback' },
            { status: 400 }
          );
        }
        result = await handleSSOCallback(sso_provider, sso_code, redirect_uri);
        break;

      case 'rate_limit_check':
        console.log('LOG: API-AUTH-CHECK-8 - Checking rate limits');
        if (!user_id) {
          return NextResponse.json(
            { error: 'user_id required for rate limit check' },
            { status: 400 }
          );
        }
        result = await handleRateLimitCheck(user_id);
        break;

      default:
        console.log('LOG: API-AUTH-CHECK-ERROR-2 - Invalid action:', action);
        return NextResponse.json(
          { error: 'Invalid action. Use: verify_token, check_permissions, sso_auth_url, sso_callback, rate_limit_check' },
          { status: 400 }
        );
    }

    console.log('LOG: API-AUTH-CHECK-9 - Operation completed successfully');

    return NextResponse.json({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-AUTH-CHECK-ERROR-3 - API operation failed:', error);
    
    // Log security event for failures
    await securityManager.logSecurityEvent({
      event_type: 'AUTH_CHECK_FAILED',
      details: { error: error instanceof Error ? error.message : 'Unknown error', action },
      status: 'failure',
      source: 'API_AUTH_CHECK'
    });

    return NextResponse.json(
      { 
        error: 'Authentication check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('LOG: API-AUTH-CHECK-10 - Getting auth status');

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const checkType = searchParams.get('check_type') || 'status';

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id parameter required' },
        { status: 400 }
      );
    }

    let data;

    switch (checkType) {
      case 'status':
        data = await getUserAuthStatus(userId);
        break;
      case 'security_features':
        data = await getUserSecurityFeatures(userId);
        break;
      case 'sso_providers':
        data = await getAvailableSSOProviders(userId);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid check_type. Use: status, security_features, sso_providers' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      check_type: checkType,
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-AUTH-CHECK-ERROR-4 - GET operation failed:', error);
    return NextResponse.json(
      { error: 'Failed to get auth status' },
      { status: 500 }
    );
  }
}

// Handler functions
async function handleTokenVerification(token?: string) {
  console.log('LOG: API-AUTH-CHECK-HANDLER-1 - Handling token verification');
  
  if (!token) {
    throw new Error('Token required for verification');
  }

  const user = await AuthService.verifyToken(token);
  
  if (!user) {
    await securityManager.logSecurityEvent({
      event_type: 'TOKEN_VERIFICATION_FAILED',
      details: { token_provided: !!token },
      status: 'failure',
      source: 'API_AUTH_CHECK'
    });
    throw new Error('Invalid or expired token');
  }

  await securityManager.logSecurityEvent({
    user_id: user.id,
    event_type: 'TOKEN_VERIFIED',
    details: { user_email: user.email },
    status: 'success',
    source: 'API_AUTH_CHECK'
  });

  return {
    valid: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    }
  };
}

async function handlePermissionCheck(userId: string, operation: string) {
  console.log('LOG: API-AUTH-CHECK-HANDLER-2 - Handling permission check');
  
  // Get user's tier (mock implementation)
  const userTier = await getUserTier(userId);
  
  const compliance = securityManager.validateSecurityCompliance(userTier, operation);
  
  await securityManager.logSecurityEvent({
    user_id: userId,
    event_type: 'PERMISSION_CHECK',
    details: { operation, tier: userTier, allowed: compliance.allowed, reason: compliance.reason },
    status: compliance.allowed ? 'success' : 'failure',
    source: 'API_AUTH_CHECK'
  });

  return {
    allowed: compliance.allowed,
    reason: compliance.reason,
    user_tier: userTier,
    operation
  };
}

async function handleSSOAuthUrl(provider: string, redirectUri: string, userId?: string) {
  console.log('LOG: API-AUTH-CHECK-HANDLER-3 - Handling SSO auth URL generation');
  
  const userTier = userId ? await getUserTier(userId) : 'free';
  
  if (!securityManager.canUserAccessFeature(userTier, 'sso_enabled')) {
    throw new Error('SSO not available for current tier');
  }

  const state = generateSecureState(userId);
  const authUrl = securityManager.generateSSOAuthUrl(provider, redirectUri, state);

  await securityManager.logSecurityEvent({
    user_id: userId,
    event_type: 'SSO_AUTH_INITIATED',
    details: { provider, redirect_uri: redirectUri, state },
    status: 'success',
    source: 'API_AUTH_CHECK'
  });

  return {
    auth_url: authUrl,
    state,
    provider,
    expires_in: 600 // 10 minutes
  };
}

async function handleSSOCallback(provider: string, code: string, redirectUri: string) {
  console.log('LOG: API-AUTH-CHECK-HANDLER-4 - Handling SSO callback');
  
  try {
    const tokenData = await securityManager.exchangeCodeForToken(provider, code, redirectUri);
    
    // Get user info from SSO provider
    const userInfo = await fetchSSOUserInfo(provider, tokenData.access_token);
    
    // Create or update user in database
    const user = await createOrUpdateSSOUser(userInfo, provider);
    
    // Generate JWT token for the user
    const jwtToken = await AuthService.generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    });

    await securityManager.logSecurityEvent({
      user_id: user.id,
      event_type: 'SSO_LOGIN_SUCCESS',
      details: { provider, email: user.email },
      status: 'success',
      source: 'API_AUTH_CHECK'
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      },
      token: jwtToken,
      provider
    };
  } catch (error) {
    await securityManager.logSecurityEvent({
      event_type: 'SSO_LOGIN_FAILED',
      details: { provider, error: error instanceof Error ? error.message : 'Unknown error' },
      status: 'failure',
      source: 'API_AUTH_CHECK'
    });
    throw error;
  }
}

async function handleRateLimitCheck(userId: string) {
  console.log('LOG: API-AUTH-CHECK-HANDLER-5 - Handling rate limit check');
  
  const userTier = await getUserTier(userId);
  const currentRequests = await getCurrentRequestCount(userId);
  
  const withinLimit = securityManager.checkRateLimit(userTier, currentRequests);
  const features = securityManager.getUserSecurityFeatures(userTier);

  return {
    within_limit: withinLimit,
    current_requests: currentRequests,
    limit: features?.api_rate_limit || 0,
    reset_time: getNextResetTime(),
    tier: userTier
  };
}

// Helper functions
async function getUserTier(userId: string): Promise<string> {
  // Mock implementation - in production, query user's subscription
  return 'standard';
}

async function getCurrentRequestCount(userId: string): Promise<number> {
  // Mock implementation - in production, query rate limit store
  return Math.floor(Math.random() * 50);
}

function getNextResetTime(): string {
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return nextHour.toISOString();
}

function generateSecureState(userId?: string): string {
  const randomData = randomBytes(16).toString('hex');
  const timestamp = Date.now().toString();
  const userPart = userId ? createHash('sha256').update(userId).digest('hex').substring(0, 8) : 'anon';
  return `${userPart}_${timestamp}_${randomData}`;
}

async function fetchSSOUserInfo(provider: string, accessToken: string): Promise<any> {
  console.log('LOG: API-AUTH-CHECK-SSO-1 - Fetching user info from SSO provider');
  
  const ssoProvider = securityManager.getSSOProvider(provider);
  if (!ssoProvider) {
    throw new Error('SSO provider not found');
  }

  try {
    const response = await fetch(ssoProvider.user_info_url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`SSO user info request failed: ${response.status}`);
    }

    const userInfo = await response.json();
    console.log('LOG: API-AUTH-CHECK-SSO-2 - User info fetched successfully');
    return userInfo;
  } catch (error) {
    console.error('LOG: API-AUTH-CHECK-SSO-ERROR-1 - Failed to fetch user info:', error);
    throw error;
  }
}

async function createOrUpdateSSOUser(userInfo: any, provider: string): Promise<any> {
  console.log('LOG: API-AUTH-CHECK-SSO-3 - Creating or updating SSO user');
  
  const dbService = new DatabaseService();
  
  try {
    // Check if user exists
    let user = await dbService.getUserByEmail(userInfo.email);
    
    if (!user) {
      // Create new user
      const hashedPassword = await AuthService.hashPassword(randomBytes(32).toString('hex'));
      
      user = await dbService.createUser({
        email: userInfo.email,
        username: userInfo.login || userInfo.email.split('@')[0],
        password_hash: hashedPassword,
        role: 'creator',
        profile_data: JSON.stringify({
          sso_provider: provider,
          sso_id: userInfo.id,
          avatar_url: userInfo.avatar_url,
          bio: userInfo.bio || ''
        }),
        ai_preference_level: 50,
        onboarding_completed: 1
      });

      console.log('LOG: API-AUTH-CHECK-SSO-4 - New SSO user created:', user.id);
    } else {
      console.log('LOG: API-AUTH-CHECK-SSO-5 - Existing user found for SSO login');
    }

    return user;
  } catch (error) {
    console.error('LOG: API-AUTH-CHECK-SSO-ERROR-2 - Failed to create/update SSO user:', error);
    throw error;
  }
}

async function getUserAuthStatus(userId: string) {
  console.log('LOG: API-AUTH-CHECK-STATUS-1 - Getting user auth status');
  
  const userTier = await getUserTier(userId);
  const features = securityManager.getUserSecurityFeatures(userTier);
  
  return {
    user_id: userId,
    tier: userTier,
    security_features: features,
    last_login: new Date().toISOString(), // Mock
    mfa_enabled: features?.mfa_required || false,
    sso_linked: false // Mock
  };
}

async function getUserSecurityFeatures(userId: string) {
  console.log('LOG: API-AUTH-CHECK-STATUS-2 - Getting user security features');
  
  const userTier = await getUserTier(userId);
  const features = securityManager.getUserSecurityFeatures(userTier);
  
  return {
    tier: userTier,
    features,
    available_sso_providers: securityManager.getAvailableSSOProviders(userTier)
  };
}

async function getAvailableSSOProviders(userId: string) {
  console.log('LOG: API-AUTH-CHECK-STATUS-3 - Getting available SSO providers');
  
  const userTier = await getUserTier(userId);
  const providers = securityManager.getAvailableSSOProviders(userTier);
  
  return {
    tier: userTier,
    sso_enabled: securityManager.canUserAccessFeature(userTier, 'sso_enabled'),
    providers: providers.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type
    }))
  };
}