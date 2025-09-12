// OAuth authentication handlers for Google and Twitter
// LOG: OAUTH-INIT-1 - Initialize OAuth routes

import express from 'express';
import { db } from '../db.js';
import { users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';

const router = express.Router();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

// OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Google OAuth initiation
router.get('/google', (req, res) => {
  console.log('LOG: OAUTH-GOOGLE-1 - Initiating Google OAuth');
  
  if (!GOOGLE_CLIENT_ID) {
    console.error('LOG: OAUTH-GOOGLE-ERROR-1 - Google client ID not configured');
    return res.status(500).json({ error: 'Google OAuth not configured' });
  }
  
  const state = Math.random().toString(36).substring(2);
  const redirectUri = `${BASE_URL}/api/oauth/google/callback`;
  
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  
  // Store state in temporary storage (simplified for demo)
  // In production, use proper session storage or database
  const sessionData = { state, timestamp: Date.now() };
  
  console.log('LOG: OAUTH-GOOGLE-2 - Redirecting to Google OAuth');
  res.redirect(googleAuthUrl.toString());
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  console.log('LOG: OAUTH-GOOGLE-CALLBACK-1 - Processing Google OAuth callback');
  
  try {
    const { code, state } = req.query;
    
    if (!code) {
      console.error('LOG: OAUTH-GOOGLE-CALLBACK-ERROR-1 - No authorization code received');
      return res.redirect('/onboard?error=oauth_failed');
    }
    
    // Exchange code for access token
    console.log('LOG: OAUTH-GOOGLE-CALLBACK-2 - Exchanging code for token');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: `${BASE_URL}/api/oauth/google/callback`
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('LOG: OAUTH-GOOGLE-CALLBACK-ERROR-2 - Failed to get access token');
      return res.redirect('/onboard?error=oauth_failed');
    }
    
    // Get user profile
    console.log('LOG: OAUTH-GOOGLE-CALLBACK-3 - Fetching user profile');
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    
    const profile = await profileResponse.json();
    
    if (!profile.email) {
      console.error('LOG: OAUTH-GOOGLE-CALLBACK-ERROR-3 - No email in profile');
      return res.redirect('/onboard?error=oauth_failed');
    }
    
    console.log('LOG: OAUTH-GOOGLE-CALLBACK-4 - Processing user:', profile.email);
    
    // Check if user exists
    let user = await db.select().from(users).where(eq(users.email, profile.email));
    
    if (user.length === 0) {
      // Create new user
      console.log('LOG: OAUTH-GOOGLE-CALLBACK-5 - Creating new user');
      const profileData = {
        provider: 'google',
        providerId: profile.id,
        avatar: profile.picture,
        locale: profile.locale,
        onboardingCompletedAt: new Date().toISOString()
      };
      
      const newUser = await db.insert(users).values({
        email: profile.email,
        username: profile.name || profile.email.split('@')[0],
        passwordHash: '', // No password for OAuth users
        role: 'creator', // Default role, user can change later
        profileData: JSON.stringify(profileData),
        aiPreferenceLevel: 50,
        onboardingCompleted: 0 // Will need to complete onboarding
      }).returning();
      
      user = newUser;
      console.log('LOG: OAUTH-GOOGLE-CALLBACK-6 - New user created:', user[0].id);
    } else {
      console.log('LOG: OAUTH-GOOGLE-CALLBACK-7 - Existing user found:', user[0].id);
    }
    
    // Generate JWT token
    console.log('LOG: OAUTH-GOOGLE-CALLBACK-8 - Generating JWT token');
    const token = await new SignJWT({
      id: user[0].id,
      email: user[0].email,
      username: user[0].username,
      role: user[0].role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);
    
    // Redirect to dashboard with token
    const redirectUrl = user[0].onboardingCompleted 
      ? `/dashboard?token=${token}` 
      : `/onboard?token=${token}&step=profile`;
    
    console.log('LOG: OAUTH-GOOGLE-CALLBACK-9 - Redirecting user');
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('LOG: OAUTH-GOOGLE-CALLBACK-ERROR-4 - OAuth callback failed:', error);
    res.redirect('/onboard?error=oauth_failed');
  }
});

// Twitter OAuth initiation
router.get('/twitter', (req, res) => {
  console.log('LOG: OAUTH-TWITTER-1 - Initiating Twitter OAuth');
  
  if (!TWITTER_CLIENT_ID) {
    console.error('LOG: OAUTH-TWITTER-ERROR-1 - Twitter client ID not configured');
    return res.status(500).json({ error: 'Twitter OAuth not configured' });
  }
  
  const state = Math.random().toString(36).substring(2);
  const codeChallenge = Math.random().toString(36).substring(2);
  const redirectUri = `${BASE_URL}/api/oauth/twitter/callback`;
  
  const twitterAuthUrl = new URL('https://twitter.com/i/oauth2/authorize');
  twitterAuthUrl.searchParams.set('response_type', 'code');
  twitterAuthUrl.searchParams.set('client_id', TWITTER_CLIENT_ID);
  twitterAuthUrl.searchParams.set('redirect_uri', redirectUri);
  twitterAuthUrl.searchParams.set('scope', 'tweet.read users.read');
  twitterAuthUrl.searchParams.set('state', state);
  twitterAuthUrl.searchParams.set('code_challenge', codeChallenge);
  twitterAuthUrl.searchParams.set('code_challenge_method', 'plain');
  
  // Store state and code challenge in temporary storage (simplified for demo)
  // In production, use proper session storage or database
  const sessionData = { state, codeChallenge, timestamp: Date.now() };
  
  console.log('LOG: OAUTH-TWITTER-2 - Redirecting to Twitter OAuth');
  res.redirect(twitterAuthUrl.toString());
});

// Twitter OAuth callback
router.get('/twitter/callback', async (req, res) => {
  console.log('LOG: OAUTH-TWITTER-CALLBACK-1 - Processing Twitter OAuth callback');
  
  try {
    const { code, state } = req.query;
    
    if (!code) {
      console.error('LOG: OAUTH-TWITTER-CALLBACK-ERROR-1 - No authorization code received');
      return res.redirect('/onboard?error=oauth_failed');
    }
    
    // Exchange code for access token
    console.log('LOG: OAUTH-TWITTER-CALLBACK-2 - Exchanging code for token');
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: `${BASE_URL}/api/oauth/twitter/callback`,
        code_verifier: codeChallenge || ''
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('LOG: OAUTH-TWITTER-CALLBACK-ERROR-2 - Failed to get access token');
      return res.redirect('/onboard?error=oauth_failed');
    }
    
    // Get user profile
    console.log('LOG: OAUTH-TWITTER-CALLBACK-3 - Fetching user profile');
    const profileResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    
    const profileData = await profileResponse.json();
    const profile = profileData.data;
    
    if (!profile || !profile.username) {
      console.error('LOG: OAUTH-TWITTER-CALLBACK-ERROR-3 - No profile data');
      return res.redirect('/onboard?error=oauth_failed');
    }
    
    console.log('LOG: OAUTH-TWITTER-CALLBACK-4 - Processing user:', profile.username);
    
    // For Twitter, we'll use username@twitter.local as email since Twitter doesn't provide email
    const email = `${profile.username}@twitter.local`;
    
    // Check if user exists
    let user = await db.select().from(users).where(eq(users.email, email));
    
    if (user.length === 0) {
      // Create new user
      console.log('LOG: OAUTH-TWITTER-CALLBACK-5 - Creating new user');
      const userProfileData = {
        provider: 'twitter',
        providerId: profile.id,
        avatar: profile.profile_image_url,
        twitterUsername: profile.username,
        onboardingCompletedAt: new Date().toISOString()
      };
      
      const newUser = await db.insert(users).values({
        email: email,
        username: profile.username,
        passwordHash: '', // No password for OAuth users
        role: 'creator', // Default role, user can change later
        profileData: JSON.stringify(userProfileData),
        aiPreferenceLevel: 50,
        onboardingCompleted: 0 // Will need to complete onboarding
      }).returning();
      
      user = newUser;
      console.log('LOG: OAUTH-TWITTER-CALLBACK-6 - New user created:', user[0].id);
    } else {
      console.log('LOG: OAUTH-TWITTER-CALLBACK-7 - Existing user found:', user[0].id);
    }
    
    // Generate JWT token
    console.log('LOG: OAUTH-TWITTER-CALLBACK-8 - Generating JWT token');
    const token = await new SignJWT({
      id: user[0].id,
      email: user[0].email,
      username: user[0].username,
      role: user[0].role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);
    
    // Redirect to dashboard with token
    const redirectUrl = user[0].onboardingCompleted 
      ? `/dashboard?token=${token}` 
      : `/onboard?token=${token}&step=profile`;
    
    console.log('LOG: OAUTH-TWITTER-CALLBACK-9 - Redirecting user');
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('LOG: OAUTH-TWITTER-CALLBACK-ERROR-4 - OAuth callback failed:', error);
    res.redirect('/onboard?error=oauth_failed');
  }
});

export default router;