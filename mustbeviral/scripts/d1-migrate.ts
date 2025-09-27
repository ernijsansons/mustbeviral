#!/usr/bin/env tsx
// D1 Database Migration Script for Must Be Viral
// Usage: npx tsx scripts/d1-migrate.ts

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATION_DIR = 'migrations';
const DATABASE_NAME = 'must-be-viral-db';

interface MigrationFile {
  filename: string;
  timestamp: string;
  name: string;
}

class D1Migrator {
  private migrationsDir: string;

  constructor(migrationsDir: string = MIGRATION_DIR) {
    this.migrationsDir = migrationsDir;
    console.log('LOG: D1-MIGRATE-1 - Initializing D1 migrator');
    
    // Ensure migrations directory exists
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
      console.log('LOG: D1-MIGRATE-2 - Created migrations directory');
    }
  }

  // Create initial migration with schema
  createInitialMigration(): void {
    console.log('LOG: D1-MIGRATE-3 - Creating initial migration');
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    const filename = `${timestamp}_initial_schema.sql`;
    const filepath = path.join(this.migrationsDir, filename);

    const schemaSql = `-- Must Be Viral Database Schema - D1 Migration
-- Created: ${new Date().toISOString()}
-- Description: Core tables for users, content, and influencer matching

-- Users table: Store user profiles and authentication data
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'creator' CHECK (role IN ('creator', 'influencer', 'admin')),
    profile_data TEXT DEFAULT '{}', -- JSON: bio, social_links, industry_focus
    ai_preference_level INTEGER DEFAULT 50 CHECK (ai_preference_level >= 0 AND ai_preference_level <= 100),
    onboarding_completed INTEGER DEFAULT 0 CHECK (onboarding_completed IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Content table: Store all content (AI-generated and user-created)
CREATE TABLE IF NOT EXISTS content (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'pending_review', 'archived')),
    type TEXT NOT NULL DEFAULT 'news_article' CHECK (type IN ('news_article', 'social_post', 'blog_post')),
    generated_by_ai INTEGER NOT NULL DEFAULT 0 CHECK (generated_by_ai IN (0, 1)),
    ai_model_used TEXT,
    ethics_check_status TEXT DEFAULT 'pending' CHECK (ethics_check_status IN ('passed', 'failed', 'pending')),
    metadata TEXT DEFAULT '{}', -- JSON: tags, categories, performance_metrics
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    published_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Matches table: Store influencer-content matching data
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    content_id TEXT NOT NULL,
    influencer_user_id TEXT NOT NULL,
    match_score REAL DEFAULT 0.0 CHECK (match_score >= 0.0 AND match_score <= 1.0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
    match_details TEXT DEFAULT '{}', -- JSON: campaign_brief, terms, ai_rationale
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (influencer_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);
CREATE INDEX IF NOT EXISTS idx_matches_content_id ON matches(content_id);
CREATE INDEX IF NOT EXISTS idx_matches_influencer_id ON matches(influencer_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_score ON matches(match_score);

-- Triggers to update updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_content_timestamp 
    AFTER UPDATE ON content
    BEGIN
        UPDATE content SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_matches_timestamp 
    AFTER UPDATE ON matches
    BEGIN
        UPDATE matches SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Insert sample data for development
INSERT OR IGNORE INTO users (id, email, username, password_hash, role, profile_data, ai_preference_level, onboarding_completed) VALUES
('user1', 'creator@example.com', 'content_creator', '$2b$10$example_hash_1', 'creator', '{"bio": "AI content creator", "social_links": {"twitter": "@creator"}}', 75, 1),
('user2', 'influencer@example.com', 'tech_influencer', '$2b$10$example_hash_2', 'influencer', '{"bio": "Tech influencer", "social_links": {"instagram": "@techinfluencer"}}', 25, 1),
('user3', 'admin@example.com', 'admin_user', '$2b$10$example_hash_3', 'admin', '{"bio": "Platform administrator"}', 50, 1);

INSERT OR IGNORE INTO content (id, user_id, title, body, status, type, generated_by_ai, ai_model_used, ethics_check_status) VALUES
('content1', 'user1', 'AI Revolution in Content Creation', 'The landscape of content creation is rapidly evolving with AI...', 'published', 'news_article', 1, 'Llama-3.1', 'passed'),
('content2', 'user1', 'Future of Social Media Marketing', 'Social media platforms are integrating more AI features...', 'draft', 'blog_post', 1, 'Gemma', 'pending'),
('content3', 'user2', 'Tech Trends 2025', 'Here are the top technology trends to watch in 2025...', 'published', 'social_post', 0, NULL, 'passed');

INSERT OR IGNORE INTO matches (id, content_id, influencer_user_id, match_score, status, match_details) VALUES
('match1', 'content1', 'user2', 0.85, 'pending', '{"campaign_brief": "Promote AI content article", "estimated_reach": 10000}'),
('match2', 'content2', 'user2', 0.72, 'accepted', '{"campaign_brief": "Share blog post insights", "estimated_reach": 15000}');`;

    fs.writeFileSync(filepath, schemaSql);
    console.log('LOG: D1-MIGRATE-4 - Initial migration created:', filename);
  }

  // Run migrations using wrangler
  async runMigrations(environment: string = 'development'): Promise<void> {
    console.log('LOG: D1-MIGRATE-5 - Running D1 migrations for environment:', environment);
    
    try {
      // Check if wrangler is available
      execSync('npx wrangler --version', { stdio: 'ignore' });
      console.log('LOG: D1-MIGRATE-6 - Wrangler is available');
      
      // Apply migrations
      const command = `npx wrangler d1 migrations apply ${DATABASE_NAME} --env ${environment}`;
      console.log('LOG: D1-MIGRATE-7 - Executing command:', command);
      
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log('LOG: D1-MIGRATE-8 - Migrations applied successfully');
      console.log(output);
      
    } catch (error) {
      console.error('LOG: D1-MIGRATE-ERROR-1 - Migration failed:', error);
      throw new Error('Failed to apply D1 migrations');
    }
  }

  // List pending migrations
  listMigrations(): MigrationFile[] {
    console.log('LOG: D1-MIGRATE-9 - Listing migration files');
    
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .map(filename => {
        const parts = filename.replace('.sql', '').split('_');
        const timestamp = parts[0];
        const name = parts.slice(1).join('_');
        
        return { filename, timestamp, name };
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    console.log('LOG: D1-MIGRATE-10 - Found migrations:', files.length);
    return files;
  }

  // Setup D1 database
  async setupDatabase(): Promise<void> {
    console.log('LOG: D1-MIGRATE-11 - Setting up D1 database');
    
    try {
      // Create database if it doesn't exist
      const createCommand = `npx wrangler d1 create ${DATABASE_NAME}`;
      console.log('LOG: D1-MIGRATE-12 - Creating database:', createCommand);
      
      const output = execSync(createCommand, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log('LOG: D1-MIGRATE-13 - Database setup completed');
      console.log(output);
      
      // Extract database ID from output and update wrangler.toml
      const dbIdMatch = output.match(/database_id = "([^"]+)"/);
      if (dbIdMatch) {
        const databaseId = dbIdMatch[1];
        console.log('LOG: D1-MIGRATE-14 - Database ID:', databaseId);
        
        // Note: In real implementation, you'd update wrangler.toml with this ID
        console.log('LOG: D1-MIGRATE-15 - Please update wrangler.toml with database_id:', databaseId);
      }
      
    } catch (error) {
      console.error('LOG: D1-MIGRATE-ERROR-2 - Database setup failed:', error);
      // Database might already exist, continue
      console.log('LOG: D1-MIGRATE-16 - Database may already exist, continuing...');
    }
  }
}

// CLI functionality
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const migrator = new D1Migrator();

  console.log('LOG: D1-MIGRATE-CLI-1 - Starting D1 migration CLI');

  switch (command) {
    case 'init':
      console.log('LOG: D1-MIGRATE-CLI-2 - Initializing database');
      await migrator.setupDatabase();
      migrator.createInitialMigration();
      break;
      
    case 'migrate': {
      const env = args[1] || 'development';
      console.log('LOG: D1-MIGRATE-CLI-3 - Running migrations for environment:', env);
      await migrator.runMigrations(env);
      break;
    }
      
    case 'list': {
      console.log('LOG: D1-MIGRATE-CLI-4 - Listing migrations');
      const migrations = migrator.listMigrations();
      console.table(migrations);
      break;
    }
      
    case 'help':
    default:
      console.log('D1 Migration Tool for Must Be Viral\\n');
      console.log('Usage: npx tsx scripts/d1-migrate.ts <command> [options]\\n');
      console.log('Commands:');
      console.log('  init          Create database and initial migration');
      console.log('  migrate [env] Apply migrations (default: development)');
      console.log('  list          List all migration files');
      console.log('  help          Show this help message\\n');
      console.log('Examples:');
      console.log('  npx tsx scripts/d1-migrate.ts init');
      console.log('  npx tsx scripts/d1-migrate.ts migrate development');
      console.log('  npx tsx scripts/d1-migrate.ts migrate production');
      break;
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('LOG: D1-MIGRATE-CLI-ERROR-1 - CLI error:', error);
    process.exit(1);
  });
}

export { D1Migrator };