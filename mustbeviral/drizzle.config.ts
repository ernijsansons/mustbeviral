import type { Config } from "drizzle-kit";

// Validate DATABASE_URL at build time
if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL environment variable is required in production');
}

export default {
  schema: "./shared/schema.ts", 
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/dev',
  },
} satisfies Config;
