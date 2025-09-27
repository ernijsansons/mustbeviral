-- Database Schema Validation Script for Must Be Viral V2
-- Run this after migrations to ensure schema integrity

-- Check if required tables exist
DO $$
BEGIN
    -- Users table validation
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Table "users" does not exist';
    END IF;

    -- Content table validation
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content') THEN
        RAISE EXCEPTION 'Table "content" does not exist';
    END IF;

    -- Analytics events table validation
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        RAISE EXCEPTION 'Table "analytics_events" does not exist';
    END IF;

    RAISE NOTICE 'All required tables exist';
END $$;

-- Check required indexes
DO $$
BEGIN
    -- Check users email index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email') THEN
        RAISE EXCEPTION 'Index "idx_users_email" does not exist';
    END IF;

    -- Check content user_id index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_user_id') THEN
        RAISE EXCEPTION 'Index "idx_content_user_id" does not exist';
    END IF;

    -- Check analytics user_id index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_analytics_events_user_id') THEN
        RAISE EXCEPTION 'Index "idx_analytics_events_user_id" does not exist';
    END IF;

    -- Check analytics timestamp index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_analytics_events_timestamp') THEN
        RAISE EXCEPTION 'Index "idx_analytics_events_timestamp" does not exist';
    END IF;

    RAISE NOTICE 'All required indexes exist';
END $$;

-- Check foreign key constraints
DO $$
BEGIN
    -- Check content -> users foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'content'
        AND kcu.column_name = 'user_id'
        AND kcu.referenced_table_name = 'users'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint from content.user_id to users.id does not exist';
    END IF;

    -- Check analytics_events -> users foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'analytics_events'
        AND kcu.column_name = 'user_id'
        AND kcu.referenced_table_name = 'users'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint from analytics_events.user_id to users.id does not exist';
    END IF;

    RAISE NOTICE 'All required foreign key constraints exist';
END $$;

-- Check column data types
DO $$
BEGIN
    -- Verify users.id is UUID
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'id'
        AND data_type = 'uuid'
    ) THEN
        RAISE EXCEPTION 'users.id is not UUID type';
    END IF;

    -- Verify users.email is unique
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_type = 'UNIQUE'
        AND table_name = 'users'
        AND constraint_name LIKE '%email%'
    ) THEN
        RAISE EXCEPTION 'users.email does not have unique constraint';
    END IF;

    RAISE NOTICE 'Column data types are correct';
END $$;

-- Performance checks
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    -- Check if tables are accessible (basic connectivity)
    SELECT COUNT(*) INTO table_count FROM users LIMIT 1;
    SELECT COUNT(*) INTO table_count FROM content LIMIT 1;
    SELECT COUNT(*) INTO table_count FROM analytics_events LIMIT 1;

    RAISE NOTICE 'All tables are accessible';
END $$;

-- Check for common performance issues
SELECT
    schemaname,
    tablename,
    attname as column_name,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
AND tablename IN ('users', 'content', 'analytics_events')
AND n_distinct < -0.1; -- Tables with high cardinality that might need indexing

-- Check for unused indexes (potential performance issue)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_tup_read = 0 AND idx_tup_fetch = 0;

-- Final validation message
SELECT 'Database schema validation completed successfully' as validation_status;