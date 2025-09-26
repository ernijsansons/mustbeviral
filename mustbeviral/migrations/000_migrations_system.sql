-- Migration System Setup for Must Be Viral Platform
-- This creates the migrations tracking table and sets up the database versioning system

-- ==============================================
-- Migrations Table - Track applied migrations
-- ==============================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checksum TEXT, -- For migration integrity validation
  execution_time_ms INTEGER DEFAULT 0
);

-- Insert this migration
INSERT OR IGNORE INTO schema_migrations (version, name, checksum) 
VALUES ('000', 'migrations_system', 'init');

-- Initial schema version marker
SELECT 'Migration system initialized' as status;