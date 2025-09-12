// Authentication utilities for Must Be Viral
// LOG: AUTH-INIT-1 - Initialize authentication service

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  username: string;
  password: string;
  role: 'creator' | 'influencer';
}

export class AuthService {
  private static jwtSecret?: Uint8Array;

  // Initialize JWT secret (call this from Worker or Node.js environment)
  static initJwtSecret(secret: string): void {
    this.jwtSecret = new TextEncoder().encode(secret);
    console.log('LOG: AUTH-SECRET-1 - JWT secret initialized');
  }

  // Get JWT secret with validation
  private static getJwtSecret(): Uint8Array {
    if (!this.jwtSecret) {
      throw new Error('JWT secret not initialized. Call AuthService.initJwtSecret() first.');
    }
    return this.jwtSecret;
  }
  // Hash password for storage
  static async hashPassword(password: string): Promise<string> {
    console.log('LOG: AUTH-HASH-1 - Hashing password');
    
    try {
      const saltRounds = 12;
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
        .setExpirationTime('24h')
        .sign(secret);

      console.log('LOG: AUTH-TOKEN-2 - JWT token generated successfully');
      return token;
    } catch (error) {
      console.error('LOG: AUTH-TOKEN-ERROR-1 - Failed to generate token:', error);
      throw new Error('Failed to generate token');
    }
  }

  // Verify JWT token
  static async verifyToken(token: string): Promise<AuthUser | null> {
    console.log('LOG: AUTH-VERIFY-TOKEN-1 - Verifying JWT token');
    
    try {
      const secret = this.getJwtSecret();
      const { payload } = await jwtVerify(token, secret);
      
      const user: AuthUser = {
        id: payload.id as string,
        email: payload.email as string,
        username: payload.username as string,
        role: payload.role as string,
      };

      console.log('LOG: AUTH-VERIFY-TOKEN-2 - Token verified successfully for user:', user.id);
      return user;
    } catch (error) {
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

  // Validate password strength
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    console.log('LOG: AUTH-VALIDATE-3 - Validating password strength');
    
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    const isValid = errors.length === 0;
    console.log('LOG: AUTH-VALIDATE-4 - Password validation result:', isValid, 'Errors:', errors.length);
    
    return { isValid, errors };
  }

  // Validate username
  static validateUsername(username: string): { isValid: boolean; errors: string[] } {
    console.log('LOG: AUTH-VALIDATE-5 - Validating username');
    
    const errors: string[] = [];
    
    if (username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    
    if (username.length > 30) {
      errors.push('Username must be less than 30 characters');
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    const isValid = errors.length === 0;
    console.log('LOG: AUTH-VALIDATE-6 - Username validation result:', isValid, 'Errors:', errors.length);
    
    return { isValid, errors };
  }
}