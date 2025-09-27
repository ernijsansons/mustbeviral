# Database Migration Strategy for Must Be Viral V2

## Overview
This document outlines the consolidated database migration strategy for production deployment.

## Migration Systems Consolidation

### Current State Analysis
The project currently has multiple migration systems:
1. **Supabase migrations** (`mustbeviral/supabase/migrations/`)
2. **Drizzle ORM migrations** (`mustbeviral/migrations/`)
3. **Manual SQL files** (`database/migrations/`)
4. **Cloudflare D1 migrations** (`mustbeviral/workers/*/migrations/`)

### Recommended Approach: Hybrid Strategy

#### Primary Database (PostgreSQL/Supabase)
- **Use Drizzle ORM** as the primary migration system
- **Location**: `mustbeviral/migrations/`
- **Tool**: `drizzle-kit`
- **Environment**: Production PostgreSQL or Supabase

#### Cloudflare Workers (D1 Database)
- **Use Wrangler D1 migrations**
- **Location**: `mustbeviral/workers/[worker-name]/migrations/`
- **Tool**: `wrangler d1 migrations`
- **Environment**: Cloudflare D1

## Migration Execution Order

### 1. Pre-deployment Setup
```bash
# Ensure all migration tools are available
npm install drizzle-kit wrangler
```

### 2. Primary Database Migration
```bash
# Navigate to main app directory
cd mustbeviral

# Generate migration (if schema changes exist)
npx drizzle-kit generate:pg

# Apply migrations to database
npx drizzle-kit push:pg
```

### 3. Cloudflare D1 Migration
```bash
# For each worker with D1 database
cd mustbeviral/workers/[worker-name]

# Apply D1 migrations
wrangler d1 migrations apply [database-name] --env production
```

## Consolidated Schema Structure

### Core Tables (PostgreSQL/Supabase)
```sql
-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Content and Analytics
CREATE TABLE content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance tracking
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_content_user_id ON content(user_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp);
```

### D1 Tables (Cloudflare Workers)
```sql
-- Session storage (Auth Worker)
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    data TEXT
);

-- Cache storage (API Gateway)
CREATE TABLE api_cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);

-- Analytics aggregation (Analytics Worker)
CREATE TABLE analytics_summary (
    date TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    value REAL NOT NULL,
    PRIMARY KEY (date, metric_type)
);
```

## Migration Files Organization

### Directory Structure
```
database/
├── migrations/
│   ├── README.md (this file)
│   ├── master-migration.sql (consolidated schema)
│   └── production-setup.sql (production-specific setup)
├── seeds/
│   ├── development.sql
│   └── production.sql
└── scripts/
    ├── migrate.sh (migration runner)
    ├── rollback.sh (rollback script)
    └── validate.sh (validation script)

mustbeviral/
├── migrations/ (Drizzle migrations)
├── drizzle.config.ts
└── workers/
    ├── auth-worker/migrations/
    ├── content-worker/migrations/
    └── analytics-worker/migrations/
```

## Migration Scripts

### Production Migration Runner
Location: `database/scripts/migrate.sh`

### Rollback Strategy
Location: `database/scripts/rollback.sh`

### Validation Script
Location: `database/scripts/validate.sh`

## Environment-Specific Considerations

### Development
- Use local PostgreSQL or Supabase development instance
- Use Wrangler local D1 development databases
- Apply all migrations in sequence

### Staging
- Mirror production setup
- Test migration scripts before production deployment
- Validate data integrity after migrations

### Production
- **CRITICAL**: Always backup before migrations
- Run migrations during maintenance window
- Monitor database performance during migration
- Have rollback plan ready

## Backup Strategy

### Before Migration
```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# D1 backup (export data)
wrangler d1 export [database-name] --output backup_d1_$(date +%Y%m%d_%H%M%S).sql
```

### Rollback Plan
1. Stop application traffic
2. Restore from backup
3. Verify data integrity
4. Resume application traffic

## Monitoring and Validation

### Post-Migration Checks
1. **Schema Validation**: Verify all tables and indexes exist
2. **Data Integrity**: Check foreign key constraints
3. **Performance**: Monitor query performance
4. **Application Health**: Run end-to-end tests

### Monitoring Queries
```sql
-- Check table counts
SELECT
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables;

-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes;
```

## Troubleshooting

### Common Issues
1. **Migration Conflicts**: Check for duplicate migration files
2. **Connection Issues**: Verify database credentials
3. **Permission Issues**: Ensure proper database permissions
4. **D1 Limits**: Check Cloudflare D1 usage limits

### Emergency Procedures
1. **Failed Migration**: Stop immediately, restore from backup
2. **Data Corruption**: Restore from backup, investigate cause
3. **Performance Issues**: Monitor queries, consider rollback