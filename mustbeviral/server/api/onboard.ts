// Onboarding API endpoint with D1 integration
// LOG: ONBOARD-STEP-1 - Initialize onboarding API endpoint

import express from 'express';
import { db } from '../db.js';
import { users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const router = express.Router();

// Validate JWT_SECRET exists in production
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Complete onboarding process
router.post('/', async (req, res) => {
  console.log('LOG: ONBOARD-STEP-2 - Processing onboarding request');
  
  try {
    const { 
      email, 
      username, 
      password, 
      role, 
      aiPreferenceLevel = 50,
      industry,
      primaryGoal,
      firstPrompt
    } = req.body;
    
    console.log('LOG: ONBOARD-STEP-3 - Validating onboarding data for:', email);
    
    // Validate required fields
    if (!email || !username || !password || !role) {
      console.log('LOG: ONBOARD-STEP-ERROR-1 - Missing required fields');
      return res.status(400).json({ 
        success: false, 
        error: 'Email, username, password, and role are required' 
      });
    }
    
    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) {
      console.log('LOG: ONBOARD-STEP-ERROR-2 - Invalid email format');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    
    // Validate role
    if (!['creator', 'influencer'].includes(role)) {
      console.log('LOG: ONBOARD-STEP-ERROR-3 - Invalid role');
      return res.status(400).json({ 
        success: false, 
        error: 'Role must be either creator or influencer' 
      });
    }
    
    // Check if user already exists
    console.log('LOG: ONBOARD-STEP-4 - Checking for existing user');
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      console.log('LOG: ONBOARD-STEP-ERROR-4 - User already exists');
      return res.status(400).json({ 
        success: false, 
        error: 'An account with this email already exists' 
      });
    }
    
    // Hash password
    console.log('LOG: ONBOARD-STEP-5 - Hashing password');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Prepare profile data
    const profileData = {
      industry: industry || '',
      primaryGoal: primaryGoal || '',
      firstPrompt: firstPrompt || '',
      onboardingCompletedAt: new Date().toISOString(),
      preferences: {
        aiControlLevel: aiPreferenceLevel
      }
    };
    
    // Create user
    console.log('LOG: ONBOARD-STEP-6 - Creating new user');
    const newUser = await db.insert(users).values({
      email,
      username,
      passwordHash,
      role: role as 'creator' | 'influencer',
      profileData: JSON.stringify(profileData),
      aiPreferenceLevel: aiPreferenceLevel,
      onboardingCompleted: 1
    }).returning();
    
    console.log('LOG: ONBOARD-STEP-7 - User created successfully:', newUser[0].id);
    
    // Generate JWT token
    console.log('LOG: ONBOARD-STEP-8 - Generating JWT token');
    const token = await new SignJWT({
      id: newUser[0].id,
      email: newUser[0].email,
      username: newUser[0].username,
      role: newUser[0].role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);
    
    console.log('LOG: ONBOARD-STEP-9 - Onboarding completed successfully');
    
    // Set JWT token as secure HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.status(201).json({ 
      success: true,
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        username: newUser[0].username,
        role: newUser[0].role,
        onboardingCompleted: true,
        aiPreferenceLevel: newUser[0].aiPreferenceLevel
      },
      message: 'Account created successfully'
    });
    
  } catch (error) {
    console.error('LOG: ONBOARD-STEP-ERROR-5 - Database error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create account. Please try again.' 
    });
  }
});

export default router;