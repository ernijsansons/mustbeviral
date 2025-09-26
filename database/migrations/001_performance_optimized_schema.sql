-- Performance-Optimized Database Schema for Must Be Viral V2
-- Includes strategic indexes, partitioning, and performance enhancements

BEGIN;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table with performance optimizations
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    -- Performance: Add GIN index for full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            COALESCE(first_name, '') || ' ' || 
            COALESCE(last_name, '') || ' ' || 
            COALESCE(username, '') || ' ' || 
            COALESCE(email, '')
        )
    ) STORED
);

-- Performance indexes for users table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
    ON users (email) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_active 
    ON users (username) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at_desc 
    ON users (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search_vector 
    ON users USING GIN (search_vector);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login 
    ON users (last_login_at DESC) WHERE last_login_at IS NOT NULL;

-- Viral content table with partitioning for performance
CREATE TABLE IF NOT EXISTS viral_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL,
    content_url VARCHAR(1000),
    thumbnail_url VARCHAR(1000),
    view_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    viral_score DECIMAL(10,4) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    -- Performance: Add GIN index for full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', title || ' ' || COALESCE(description, ''))
    ) STORED
) PARTITION BY RANGE (created_at);

-- Create partitions for viral_content (monthly partitions for last year + future)
CREATE TABLE IF NOT EXISTS viral_content_2023_q4 PARTITION OF viral_content
    FOR VALUES FROM ('2023-10-01') TO ('2024-01-01');
CREATE TABLE IF NOT EXISTS viral_content_2024_q1 PARTITION OF viral_content
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE IF NOT EXISTS viral_content_2024_q2 PARTITION OF viral_content
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE IF NOT EXISTS viral_content_2024_q3 PARTITION OF viral_content
    FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');
CREATE TABLE IF NOT EXISTS viral_content_2024_q4 PARTITION OF viral_content
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS viral_content_2025_q1 PARTITION OF viral_content
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

-- Performance indexes for viral_content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_content_user_id 
    ON viral_content (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_content_viral_score 
    ON viral_content (viral_score DESC) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_content_view_count 
    ON viral_content (view_count DESC) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_content_created_at 
    ON viral_content (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_content_search_vector 
    ON viral_content USING GIN (search_vector);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_content_type_status 
    ON viral_content (content_type, status);

-- Analytics table with time-series optimization
CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGSERIAL,
    content_id UUID REFERENCES viral_content(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    referrer VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Composite primary key for better performance
    PRIMARY KEY (created_at, id)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for analytics
CREATE TABLE IF NOT EXISTS analytics_events_2024_10 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE IF NOT EXISTS analytics_events_2024_11 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE IF NOT EXISTS analytics_events_2024_12 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS analytics_events_2025_01 PARTITION OF analytics_events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Performance indexes for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_content_event 
    ON analytics_events (content_id, event_type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_user_event 
    ON analytics_events (user_id, event_type, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_event_type 
    ON analytics_events (event_type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_event_data 
    ON analytics_events USING GIN (event_data);

-- Cache performance table for materialized views
CREATE TABLE IF NOT EXISTS content_stats_cache (
    content_id UUID PRIMARY KEY REFERENCES viral_content(id) ON DELETE CASCADE,
    view_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    viral_score DECIMAL(10,4) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance index for cache table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_stats_viral_score 
    ON content_stats_cache (viral_score DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_stats_updated 
    ON content_stats_cache (last_updated DESC);

-- Performance-optimized functions
CREATE OR REPLACE FUNCTION update_viral_score(content_uuid UUID)
RETURNS DECIMAL(10,4) AS $$
DECLARE
    new_score DECIMAL(10,4);
BEGIN
    -- Calculate viral score using weighted algorithm
    SELECT 
        (view_count * 0.1 + 
         share_count * 0.4 + 
         like_count * 0.3 + 
         EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 * 0.2)
    INTO new_score
    FROM viral_content 
    WHERE id = content_uuid;
    
    -- Update the score
    UPDATE viral_content 
    SET viral_score = new_score, updated_at = NOW()
    WHERE id = content_uuid;
    
    RETURN new_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
CREATE TRIGGER users_update_timestamp 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER viral_content_update_timestamp 
    BEFORE UPDATE ON viral_content 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Performance-optimized materialized view for trending content
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_content AS
SELECT 
    vc.id,
    vc.title,
    vc.content_type,
    vc.thumbnail_url,
    vc.viral_score,
    vc.view_count,
    vc.share_count,
    vc.like_count,
    vc.created_at,
    u.username,
    u.avatar_url
FROM viral_content vc
JOIN users u ON vc.user_id = u.id
WHERE vc.status = 'active'
  AND vc.created_at > NOW() - INTERVAL '7 days'
ORDER BY vc.viral_score DESC, vc.created_at DESC
LIMIT 100;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_content_id ON trending_content (id);
CREATE INDEX IF NOT EXISTS idx_trending_content_score ON trending_content (viral_score DESC);

-- Performance monitoring views
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    min_time,
    max_time,
    stddev_time
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries taking more than 100ms on average
ORDER BY mean_time DESC;

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_trending_content()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY trending_content;
END;
$$ LANGUAGE plpgsql;

-- Setup automatic refresh of materialized views (requires pg_cron extension)
-- SELECT cron.schedule('refresh-trending', '*/5 * * * *', 'SELECT refresh_trending_content();');

COMMIT;