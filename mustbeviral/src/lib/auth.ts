// Authentication utilities for Must Be Viral
// LOG: AUTH-INIT-1 - Initialize authentication service

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

// Security Constants
const BCRYPT_SALT_ROUNDS = 12;
const JWT_EXPIRATION = '24h';
const MIN_PASSWORD_LENGTH = 8;
const MAX_USERNAME_LENGTH = 30;
const MIN_USERNAME_LENGTH = 3;

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly role: 'creator' | 'influencer' | 'admin';
  readonly onboarding_completed?: boolean;
  readonly ai_preference_level?: number;
}

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export interface SignupData {
  readonly email: string;
  readonly username: string;
  readonly password: string;
  readonly role: 'creator' | 'influencer';
  readonly termsAccepted?: boolean;
  readonly marketingConsent?: boolean;
}

export class AuthService {
  private static jwtSecret?: Uint8Array;
  private static isInitializing = false;
  private static initPromise?: Promise<void>;

  // Initialize JWT secret with thread-safe initialization
  static async initJwtSecret(secret: string): Promise<void> {
    // Check if already initialized
    if (this.jwtSecret) {
      return;
    }

    // Check if initialization is in progress
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.isInitializing = true;
    this.initPromise = new Promise((resolve) => {
      this.jwtSecret = new TextEncoder().encode(secret);
      console.log('LOG: AUTH-SECRET-1 - JWT secret initialized');
      this.isInitializing = false;
      resolve();
    });

    return this.initPromise;
  }

  // Get JWT secret with validation and type safety
  private static getJwtSecret(): Uint8Array {
    if (!this.jwtSecret) {
      throw new Error('JWT secret not initialized. Call AuthService.initJwtSecret() first.');
    }
    return this.jwtSecret;
  }

  // Type guard for AuthUser validation
  private static isValidAuthUser(user: unknown): user is AuthUser {
    return (
      typeof user === 'object' &&
      user !== null &&
      typeof (user as AuthUser).id === 'string' &&
      typeof (user as AuthUser).email === 'string' &&
      typeof (user as AuthUser).username === 'string' &&
      ['creator', 'influencer', 'admin'].includes((user as AuthUser).role)
    );
  }
  // Hash password for storage
  static async hashPassword(password: string): Promise<string> {
    console.log('LOG: AUTH-HASH-1 - Hashing password');
    
    try {
      const saltRounds = BCRYPT_SALT_ROUNDS;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      console.log('LOG: AUTH-HASH-2 - Password hashed successfully');
      return hashedPassword;
    } catch (error) {
      console.error('LOG: AUTH-HASH-ERROR-1 - Failed to hash password:', error);
      throw new Error('Failed to hash password');
    }
  }

  // Verify password against hash
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    console.log('LOG: AUTH-VERIFY-1 - Verifying password');
    
    try {
      const isValid = await bcrypt.compare(password, hashedPassword);
      console.log('LOG: AUTH-VERIFY-2 - Password verification result:', isValid);
      return isValid;
    } catch (error) {
      console.error('LOG: AUTH-VERIFY-ERROR-1 - Failed to verify password:', error);
      throw new Error('Failed to verify password');
    }
  }

  // Generate JWT token
  static async generateToken(user: AuthUser): Promise<string> {
    console.log('LOG: AUTH-TOKEN-1 - Generating JWT token for user:', user.id);
    
    try {
      const secret = this.getJwtSecret();
      const token = await new SignJWT({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRATION)
        .sign(secret);

      console.log('LOG: AUTH-TOKEN-2 - JWT token generated successfully');
      return token;
    } catch (error) {
      console.error('LOG: AUTH-TOKEN-ERROR-1 - Failed to generate token:', error);
      throw new Error('Failed to generate token');
    }
  }

  // Verify JWT token with enhanced type safety
  static async verifyToken(token: string): Promise<AuthUser | null> {
    if (!token || typeof token !== 'string') {
      console.log('LOG: AUTH-VERIFY-TOKEN-ERROR - Invalid token provided');
      return null;
    }

    console.log('LOG: AUTH-VERIFY-TOKEN-1 - Verifying JWT token');
    
    try {
      const secret = this.getJwtSecret();
      const { payload } = await jwtVerify(token, secret);
      
      // Validate payload structure with type safety
      if (!this.isValidAuthUser(payload)) {
        console.error('LOG: AUTH-VERIFY-TOKEN-ERROR-2 - Invalid payload structure:', payload);
        return null;
      }
      
      const user: AuthUser = {
        id: payload.id,
        email: payload.email,
        username: payload.username,
        role: payload.role,
        onboarding_completed: payload.onboarding_completed,
        ai_preference_level: payload.ai_preference_level
      };

      console.log('LOG: AUTH-VERIFY-TOKEN-2 - Token verified successfully for user:', user.id);
      return user;
    } catch (error: unknown) {
      console.error('LOG: AUTH-VERIFY-TOKEN-ERROR-1 - Failed to verify token:', error);
      return null;
    }
  }

  // Validate email format
  static validateEmail(email: string): boolean {
    console.log('LOG: AUTH-VALIDATE-1 - Validating email format');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    console.log('LOG: AUTH-VALIDATE-2 - Email validation result:', isValid);
    return isValid;
  }

  // Validate password strength with enhanced security checks
  static validatePassword(password: string): { isValid: boolean; errors: string[]; strength: 'weak' | 'medium' | 'strong' } {
    if (typeof password !== 'string') {
      return { isValid: false, errors: ['Password must be a string'], strength: 'weak' };
    }

    console.log('LOG: AUTH-VALIDATE-3 - Validating password strength');
    
    const errors: string[] = [];
    let strengthScore = 0;
    
    // Basic length check
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
    } else {
      strengthScore += 1;
    }
    
    // Character variety checks
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      strengthScore += 1;
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      strengthScore += 1;
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      strengthScore += 1;
    }

    // Special characters (optional but recommended)
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      if (password.length >= 12) {
        // Allow longer passwords without special chars
        strengthScore += 0.5;
      }
    } else {
      strengthScore += 1;
    }

    // Common patterns check
    if (password.toLowerCase().includes('password') || 
        password.toLowerCase().includes('123456') ||
        /([a-zA-Z])\1{2,}/.test(password)) {
      errors.push('Password should not contain common patterns or repeated characters');
      strengthScore -= 1;
    }

    const isValid = errors.length === 0;
    let strength: 'weak' | 'medium' | 'strong';
    
    if (strengthScore >= 4) {
      strength = 'strong';
    } else if (strengthScore >= 2) {
      strength = 'medium';
    } else {
      strength = 'weak';
    }

    console.log('LOG: AUTH-VALIDATE-4 - Password validation result:', isValid, 'Errors:', errors.length, 'Strength:', strength);
    
    return { isValid, errors, strength };
  }

  // Validate username
  static validateUsername(username: string): { isValid: boolean; errors: string[] } {
    console.log('LOG: AUTH-VALIDATE-5 - Validating username');
    
    const errors: string[] = [];
    
    if (username.length < MIN_USERNAME_LENGTH) {
      errors.push(`Username must be at least ${MIN_USERNAME_LENGTH} characters long`);
    }
    
    if (username.length > MAX_USERNAME_LENGTH) {
      errors.push(`Username must be less than ${MAX_USERNAME_LENGTH} characters`);
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    const isValid = errors.length === 0;
    console.log('LOG: AUTH-VALIDATE-6 - Username validation result:', isValid, 'Errors:', errors.length);
    
    return { isValid, errors };
  }
}