-- Add Critical Indexes for Query Optimization
-- Must Be Viral Platform

-- User table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed);

-- Composite index for login queries
CREATE INDEX IF NOT EXISTS idx_users_email_password ON users(email, password_hash);

-- Content table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_published_at ON content(published_at DESC);

-- Composite index for content queries
CREATE INDEX IF NOT EXISTS idx_content_user_status ON content(user_id, status);
CREATE INDEX IF NOT EXISTS idx_content_type_status ON content(type, status);

-- Sessions table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Analytics table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_analytics_content_id ON analytics(content_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp DESC);

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_content_timestamp ON analytics(content_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_timestamp ON analytics(user_id, timestamp DESC);

-- Trends cache indexes - skipped (table does not exist yet)

-- API logs table indexes - skipped (table does not exist yet)

-- Subscriptions table indexes (for Stripe integration)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);

-- Audit log indexes (for compliance)
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity_id ON audit_logs(entity_id);

-- Full-text search indexes for content (if supported by D1)
-- Note: D1 may not support FTS5 yet, uncomment when available
-- CREATE VIRTUAL TABLE IF NOT EXISTS content_fts USING fts5(
--   title, body, metadata,
--   content=content,
--   content_rowid=id
-- );

-- Performance optimization settings (not available in D1)
-- PRAGMA optimize;
-- PRAGMA analysis_limit=1000;
-- ANALYZE;

-- Add indexes statistics
SELECT
  name as index_name,
  tbl_name as table_name,
  sql as index_definition
FROM sqlite_master
WHERE type = 'index'
  AND name NOT LIKE 'sqlite_%'
ORDER BY tbl_name, name;