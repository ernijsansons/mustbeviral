-- Must Be Viral Database Schema
-- Created: 2025-01-27
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
CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_matches_content_id ON matches(content_id);
CREATE INDEX IF NOT EXISTS idx_matches_influencer_id ON matches(influencer_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

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