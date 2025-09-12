import express from 'express';
import { db } from '../db.mjs';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const router = express.Router();

// Require JWT secret - fail fast if not provided
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = new TextEncoder().encode(jwtSecret);

// Raw SQL for user operations (avoiding TS schema imports)
const getUserByEmailQuery = 'SELECT * FROM users WHERE email = $1';
const createUserQuery = `
  INSERT INTO users (email, username, password_hash, role, profile_data, ai_preference_level, onboarding_completed)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING *
`;
const getUserByIdQuery = 'SELECT * FROM users WHERE id = $1';

// Register new user
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
    
    if (!email.includes('@')) {
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
    
    res.status(201).json({ 
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      },
      token 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
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
    
    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      },
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token middleware
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

// Get current user
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