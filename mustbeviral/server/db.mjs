import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create connection
const sql = neon(databaseUrl);
export const db = drizzle(sql);

// Simple schema objects for runtime use (avoiding TS imports)
export const usersTable = 'users';
export const contentTable = 'content';
export const matchesTable = 'matches';