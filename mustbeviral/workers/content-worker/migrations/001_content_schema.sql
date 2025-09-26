-- Content Worker Database Schema
-- Dedicated schema for content management

-- Content table
CREATE TABLE IF NOT EXISTS content (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    body TEXT NOT NULL,
    excerpt TEXT,
    content_type TEXT NOT NULL CHECK (content_type IN ('article', 'post', 'video', 'podcast', 'infographic')),
    format TEXT DEFAULT 'markdown' CHECK (format IN ('markdown', 'html', 'json')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived', 'deleted')),
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted', 'members_only')),
    language TEXT DEFAULT 'en',
    word_count INTEGER DEFAULT 0,
    reading_time INTEGER DEFAULT 0,
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT, -- JSON array
    featured_image_id TEXT,
    gallery_images TEXT, -- JSON array of image IDs
    tags TEXT, -- JSON array
    categories TEXT, -- JSON array
    custom_fields TEXT, -- JSON object
    ai_generated INTEGER DEFAULT 0 CHECK (ai_generated IN (0, 1)),
    ai_model_used TEXT,
    ai_prompt TEXT,
    ai_confidence REAL DEFAULT 0.0,
    plagiarism_checked INTEGER DEFAULT 0 CHECK (plagiarism_checked IN (0, 1)),
    plagiarism_score REAL DEFAULT 0.0,
    sentiment_score REAL DEFAULT 0.0,
    readability_score REAL DEFAULT 0.0,
    published_at TEXT,
    scheduled_for TEXT,
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    engagement_rate REAL DEFAULT 0.0,
    viral_score REAL DEFAULT 0.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    version INTEGER DEFAULT 1
);

-- Content revisions for version control
CREATE TABLE IF NOT EXISTS content_revisions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    content_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    changes_summary TEXT,
    changed_by TEXT NOT NULL,
    change_type TEXT CHECK (change_type IN ('manual', 'ai_enhancement', 'auto_save')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    UNIQUE(content_id, version)
);

-- Media files
CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    duration REAL, -- for videos/audio
    alt_text TEXT,
    caption TEXT,
    storage_key TEXT UNIQUE NOT NULL,
    storage_url TEXT,
    thumbnail_url TEXT,
    optimized_variants TEXT, -- JSON object with different sizes/formats
    metadata TEXT, -- JSON object (EXIF, etc.)
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    processed INTEGER DEFAULT 0 CHECK (processed IN (0, 1)),
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    virus_scanned INTEGER DEFAULT 0 CHECK (virus_scanned IN (0, 1)),
    virus_scan_result TEXT
);

-- Content collaborations
CREATE TABLE IF NOT EXISTS content_collaborations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    content_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    permission TEXT NOT NULL CHECK (permission IN ('view', 'comment', 'edit', 'admin')),
    invited_by TEXT NOT NULL,
    accepted INTEGER DEFAULT 0 CHECK (accepted IN (0, 1)),
    last_activity_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    UNIQUE(content_id, user_id)
);

-- Content templates
CREATE TABLE IF NOT EXISTS content_templates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    template_data TEXT NOT NULL, -- JSON structure
    content_type TEXT NOT NULL,
    category TEXT,
    is_public INTEGER DEFAULT 0 CHECK (is_public IN (0, 1)),
    usage_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- AI processing jobs
CREATE TABLE IF NOT EXISTS ai_jobs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    content_id TEXT,
    user_id TEXT NOT NULL,
    job_type TEXT NOT NULL CHECK (job_type IN ('enhance', 'generate', 'analyze', 'optimize', 'translate')),
    input_data TEXT NOT NULL, -- JSON
    output_data TEXT, -- JSON
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress REAL DEFAULT 0.0,
    ai_model TEXT,
    tokens_used INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Content analytics
CREATE TABLE IF NOT EXISTS content_analytics (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    content_id TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metadata TEXT, -- JSON
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);

-- Publishing platforms
CREATE TABLE IF NOT EXISTS publishing_platforms (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('wordpress', 'medium', 'linkedin', 'twitter', 'facebook', 'instagram')),
    platform_user_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TEXT,
    platform_settings TEXT, -- JSON
    is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
    last_sync_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform)
);

-- Published content tracking
CREATE TABLE IF NOT EXISTS published_content (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    content_id TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    platform_content_id TEXT,
    platform_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'updated', 'deleted')),
    published_at TEXT,
    last_sync_at TEXT,
    sync_data TEXT, -- JSON with platform-specific data
    error_message TEXT,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (platform_id) REFERENCES publishing_platforms(id) ON DELETE CASCADE,
    UNIQUE(content_id, platform_id)
);

-- Content scheduling
CREATE TABLE IF NOT EXISTS content_schedule (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    content_id TEXT NOT NULL,
    scheduled_for TEXT NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    platforms TEXT, -- JSON array of platform IDs
    recurring_pattern TEXT, -- JSON for recurring schedules
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed', 'cancelled')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    executed_at TEXT,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);

-- Trending topics cache
CREATE TABLE IF NOT EXISTS trending_topics (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    topic TEXT NOT NULL,
    category TEXT,
    trend_score REAL NOT NULL,
    volume INTEGER DEFAULT 0,
    growth_rate REAL DEFAULT 0.0,
    source TEXT, -- where the trend data came from
    region TEXT DEFAULT 'global',
    language TEXT DEFAULT 'en',
    metadata TEXT, -- JSON
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(topic, region, language)
);

-- Performance indexes
CREATE INDEX idx_content_user_id ON content(user_id);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_type ON content(content_type);
CREATE INDEX idx_content_published_at ON content(published_at DESC);
CREATE INDEX idx_content_scheduled_for ON content(scheduled_for);
CREATE INDEX idx_content_slug ON content(slug);
CREATE INDEX idx_content_ai_generated ON content(ai_generated);
CREATE INDEX idx_content_viral_score ON content(viral_score DESC);

CREATE INDEX idx_content_revisions_content_id ON content_revisions(content_id);
CREATE INDEX idx_content_revisions_version ON content_revisions(content_id, version);

CREATE INDEX idx_media_user_id ON media(user_id);
CREATE INDEX idx_media_storage_key ON media(storage_key);
CREATE INDEX idx_media_mime_type ON media(mime_type);
CREATE INDEX idx_media_uploaded_at ON media(uploaded_at DESC);

CREATE INDEX idx_content_collaborations_content_id ON content_collaborations(content_id);
CREATE INDEX idx_content_collaborations_user_id ON content_collaborations(user_id);

CREATE INDEX idx_content_templates_user_id ON content_templates(user_id);
CREATE INDEX idx_content_templates_type ON content_templates(content_type);
CREATE INDEX idx_content_templates_public ON content_templates(is_public);

CREATE INDEX idx_ai_jobs_content_id ON ai_jobs(content_id);
CREATE INDEX idx_ai_jobs_user_id ON ai_jobs(user_id);
CREATE INDEX idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX idx_ai_jobs_type ON ai_jobs(job_type);

CREATE INDEX idx_content_analytics_content_id ON content_analytics(content_id);
CREATE INDEX idx_content_analytics_type ON content_analytics(metric_type);
CREATE INDEX idx_content_analytics_recorded_at ON content_analytics(recorded_at DESC);

CREATE INDEX idx_publishing_platforms_user_id ON publishing_platforms(user_id);
CREATE INDEX idx_publishing_platforms_platform ON publishing_platforms(platform);

CREATE INDEX idx_published_content_content_id ON published_content(content_id);
CREATE INDEX idx_published_content_platform_id ON published_content(platform_id);

CREATE INDEX idx_content_schedule_scheduled_for ON content_schedule(scheduled_for);
CREATE INDEX idx_content_schedule_status ON content_schedule(status);

CREATE INDEX idx_trending_topics_score ON trending_topics(trend_score DESC);
CREATE INDEX idx_trending_topics_expires_at ON trending_topics(expires_at);

-- Triggers for updated_at
CREATE TRIGGER update_content_timestamp
AFTER UPDATE ON content
BEGIN
    UPDATE content SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_content_templates_timestamp
AFTER UPDATE ON content_templates
BEGIN
    UPDATE content_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_publishing_platforms_timestamp
AFTER UPDATE ON publishing_platforms
BEGIN
    UPDATE publishing_platforms SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update word count and reading time
CREATE TRIGGER update_content_stats
AFTER UPDATE OF body ON content
BEGIN
    UPDATE content SET
        word_count = (LENGTH(NEW.body) - LENGTH(REPLACE(NEW.body, ' ', '')) + 1),
        reading_time = ROUND((LENGTH(NEW.body) - LENGTH(REPLACE(NEW.body, ' ', '')) + 1) / 200.0)
    WHERE id = NEW.id;
END;