import express from 'express';
import { db } from '../db.mjs';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const router = express.Router();

/**
 * JWT Secret Configuration
 * 
 * Ensures JWT_SECRET environment variable is provided at startup.
 * This fail-fast approach prevents runtime errors during authentication.
 */
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Convert secret to Uint8Array format required by jose library
const JWT_SECRET = new TextEncoder().encode(jwtSecret);

/**
 * SQL Queries for User Operations
 * 
 * Using raw SQL queries to avoid TypeScript schema imports in .mjs files.
 * These queries handle user authentication and profile operations.
 */
const getUserByEmailQuery = 'SELECT * FROM users WHERE email = $1';
const createUserQuery = `
  INSERT INTO users (email, username, password_hash, role, profile_data, ai_preference_level, onboarding_completed)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING *
`;
const getUserByIdQuery = 'SELECT * FROM users WHERE id = $1';

/**
 * User Registration Endpoint
 * 
 * Creates a new user account with secure password hashing and JWT token generation.
 * Validates all input data and enforces business rules for user creation.
 * 
 * Security measures:
 * - Email uniqueness validation
 * - Strong password requirements (min 8 chars)
 * - Bcrypt hashing with 12 salt rounds
 * - JWT token with 24-hour expiration
 * 
 * @route POST /api/auth/register
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, role } = req.body;
    
    // Validate input
    if (!email || !username || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Basic validation
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    
    // Improved email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if user already exists
    const existingUser = await db.execute({
      sql: getUserByEmailQuery,
      args: [email]
    });
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const newUser = await db.execute({
      sql: createUserQuery,
      args: [email, username, passwordHash, role, '{}', 50, 0]
    });
    
    const user = newUser.rows[0];
    
    // Generate JWT token
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);
    
    // Set JWT token as secure HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.status(201).json({ 
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * User Login Endpoint
 * 
 * Authenticates existing users and returns a JWT token for protected routes.
 * Verifies email/password combination and generates session token.
 * 
 * Security measures:
 * - Bcrypt password verification
 * - Generic error messages to prevent user enumeration
 * - JWT token with 24-hour expiration
 * 
 * @route POST /api/auth/login
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const userResult = await db.execute({
      sql: getUserByEmailQuery,
      args: [email]
    });
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);
    
    // Set JWT token as secure HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * JWT Token Verification Middleware
 * 
 * Middleware function that verifies JWT tokens for protected routes.
 * Extracts token from Authorization header, validates it, and adds user data to request.
 * 
 * Expected header format: "Authorization: Bearer <jwt_token>"
 * 
 * On success: Adds req.user object with decoded JWT payload
 * On failure: Returns 401 Unauthorized
 * 
 * Usage:
 * ```javascript
 * router.get('/protected', verifyToken, (req, res) => {
 *   console.log(req.user.id); // Access authenticated user's ID
 * });
 * ```
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next function
 */
export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Get Current User Profile Endpoint
 * 
 * Returns authenticated user's profile information.
 * Protected route that requires valid JWT token.
 * 
 * Security notes:
 * - Only returns user's own profile data (based on JWT token)
 * - Excludes sensitive fields like password_hash
 * - Handles edge case where user is deleted but token still valid
 * 
 * @route GET /api/auth/me
 * @access Private (requires JWT token)
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userResult = await db.execute({
      sql: getUserByIdQuery,
      args: [req.user.id]
    });
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      onboardingCompleted: user.onboarding_completed
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;