-- Must Be Viral Platform - Initial Database Schema
-- Version: 1.0.0
-- Database: Cloudflare D1 (SQLite)

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS analytics;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS content_collaborators;
DROP TABLE IF EXISTS content_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS content;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- ==============================================
-- Users Table - Core user authentication and profile
-- ==============================================
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('creator', 'influencer', 'admin')) DEFAULT 'creator',

  -- Profile information
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  website TEXT,

  -- Platform preferences
  onboarding_completed BOOLEAN DEFAULT FALSE,
  ai_preference_level INTEGER DEFAULT 50 CHECK (ai_preference_level >= 0 AND ai_preference_level <= 100),
  industry TEXT,
  primary_goal TEXT,

  -- Account status
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,

  -- OAuth integration
  google_id TEXT UNIQUE,
  github_id TEXT UNIQUE,
  twitter_id TEXT UNIQUE,

  -- Metadata
  profile_data TEXT DEFAULT '{}', -- JSON string for flexible data
  settings TEXT DEFAULT '{}', -- JSON string for user settings

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- ==============================================
-- Sessions Table - JWT refresh tokens and session management
-- ==============================================
CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,

  -- Session metadata
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,

  -- Expiration
  expires_at TIMESTAMP NOT NULL,
  refresh_expires_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP
);

-- ==============================================
-- Content Table - AI-generated and user content
-- ==============================================
CREATE TABLE content (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Content details
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  body TEXT NOT NULL,
  excerpt TEXT,

  -- Content metadata
  type TEXT CHECK (type IN ('blog_post', 'social_post', 'news_article', 'video_script', 'email', 'ad_copy')) DEFAULT 'blog_post',
  status TEXT CHECK (status IN ('draft', 'published', 'scheduled', 'archived', 'pending_review')) DEFAULT 'draft',
  visibility TEXT CHECK (visibility IN ('public', 'private', 'unlisted')) DEFAULT 'public',

  -- Media
  featured_image_url TEXT,
  images TEXT DEFAULT '[]', -- JSON array of image URLs
  video_url TEXT,

  -- AI generation metadata
  generated_by_ai BOOLEAN DEFAULT FALSE,
  ai_model_used TEXT,
  ai_prompt TEXT,
  ai_parameters TEXT DEFAULT '{}', -- JSON string

  -- Ethics and compliance
  ethics_check_status TEXT CHECK (ethics_check_status IN ('pending', 'passed', 'failed', 'manual_review')) DEFAULT 'pending',
  ethics_check_details TEXT DEFAULT '{}', -- JSON string

  -- SEO and metadata
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT DEFAULT '[]', -- JSON array
  canonical_url TEXT,

  -- Publishing
  published_at TIMESTAMP,
  scheduled_for TIMESTAMP,

  -- Engagement metrics (denormalized for performance)
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  engagement_rate REAL DEFAULT 0.0,

  -- Additional metadata
  metadata TEXT DEFAULT '{}', -- JSON string for flexible data

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- ==============================================
-- Tags Table - Content categorization
-- ==============================================
CREATE TABLE tags (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- Content Tags Junction Table
-- ==============================================
CREATE TABLE content_tags (
  content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (content_id, tag_id)
);

-- ==============================================
-- Analytics Table - Event tracking
-- ==============================================
CREATE TABLE analytics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  content_id TEXT REFERENCES content(id) ON DELETE SET NULL,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'share', 'like', 'comment', 'conversion', 'signup', 'purchase')),
  event_value TEXT DEFAULT '{}', -- JSON string for event-specific data

  -- Attribution
  source TEXT,
  medium TEXT,
  campaign TEXT,
  referrer TEXT,

  -- User context
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  region TEXT,
  city TEXT,

  -- Session info
  session_id TEXT,

  -- Timestamp
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- Subscriptions Table - Stripe integration
-- ==============================================
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Stripe IDs
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,

  -- Subscription details
  status TEXT CHECK (status IN ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid')) DEFAULT 'incomplete',
  tier TEXT CHECK (tier IN ('free', 'starter', 'professional', 'enterprise')) DEFAULT 'free',

  -- Billing
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,

  -- Usage limits
  monthly_text_tokens INTEGER DEFAULT 10000,
  monthly_image_generations INTEGER DEFAULT 10,
  monthly_video_seconds INTEGER DEFAULT 30,

  -- Usage tracking
  used_text_tokens INTEGER DEFAULT 0,
  used_image_generations INTEGER DEFAULT 0,
  used_video_seconds INTEGER DEFAULT 0,
  usage_reset_at TIMESTAMP,

  -- Payment
  last_payment_amount INTEGER, -- In cents
  last_payment_date TIMESTAMP,
  next_payment_date TIMESTAMP,

  -- Metadata
  metadata TEXT DEFAULT '{}', -- JSON string

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- ==============================================
-- Audit Logs Table - Compliance and security
-- ==============================================
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

  -- Action details
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,

  -- Change tracking
  old_values TEXT DEFAULT '{}', -- JSON string
  new_values TEXT DEFAULT '{}', -- JSON string

  -- Context
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,

  -- Result
  status TEXT CHECK (status IN ('success', 'failure', 'error')) DEFAULT 'success',
  error_message TEXT,

  -- Timestamp
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- Create Indexes for Performance
-- ==============================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_twitter_id ON users(twitter_id);

-- Session indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Content indexes
CREATE INDEX idx_content_user_id ON content(user_id);
CREATE INDEX idx_content_slug ON content(slug);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_type ON content(type);
CREATE INDEX idx_content_published_at ON content(published_at DESC);
CREATE INDEX idx_content_created_at ON content(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_content_user_status ON content(user_id, status);
CREATE INDEX idx_content_status_published ON content(status, published_at DESC);

-- Analytics indexes
CREATE INDEX idx_analytics_user_id ON analytics(user_id);
CREATE INDEX idx_analytics_content_id ON analytics(content_id);
CREATE INDEX idx_analytics_event_type ON analytics(event_type);
CREATE INDEX idx_analytics_timestamp ON analytics(timestamp DESC);
CREATE INDEX idx_analytics_session_id ON analytics(session_id);

-- Subscription indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Audit log indexes
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ==============================================
-- Insert default data
-- ==============================================

-- Insert default tags
INSERT INTO tags (name, slug, description) VALUES
  ('AI', 'ai', 'Artificial Intelligence content'),
  ('Marketing', 'marketing', 'Marketing and advertising content'),
  ('Technology', 'technology', 'Tech news and tutorials'),
  ('Business', 'business', 'Business and entrepreneurship'),
  ('Social Media', 'social-media', 'Social media strategies'),
  ('SEO', 'seo', 'Search engine optimization'),
  ('Content Creation', 'content-creation', 'Content creation tips'),
  ('Viral', 'viral', 'Viral content strategies');

-- ==============================================
-- Create triggers for updated_at timestamp
-- ==============================================

CREATE TRIGGER update_users_updated_at
  AFTER UPDATE ON users
  FOR EACH ROW
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER update_content_updated_at
  AFTER UPDATE ON content
  FOR EACH ROW
  BEGIN
    UPDATE content SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER update_subscriptions_updated_at
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  BEGIN
    UPDATE subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- ==============================================
-- Grant permissions (if needed for Cloudflare Workers)
-- ==============================================
-- Note: D1 handles permissions at the binding level in wrangler.toml

-- Migration complete
SELECT 'Initial schema migration completed successfully' as status;