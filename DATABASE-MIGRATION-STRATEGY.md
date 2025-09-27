# Database Migration Strategy - Must Be Viral V2

## Current State Analysis

### Existing Setup
- **Development**: Cloudflare D1 (SQLite-based)
- **Schema**: Drizzle ORM with TypeScript
- **Data Volume**: ~100K users projected
- **Performance Issues**: Noted at 50+ concurrent writes

### Migration Decision Matrix

| Database Option | Pros | Cons | Best For |
|-----------------|------|------|----------|
| **Cloudflare D1** | - Zero cold starts<br>- Built-in edge computing<br>- Low cost at small scale<br>- Automatic backups | - SQLite limitations<br>- 50 concurrent write limit<br>- Limited aggregation capabilities<br>- 500MB size limit | MVP to 100K users |
| **PostgreSQL** | - Battle-tested<br>- Complex queries<br>- Better concurrency<br>- Extensions available | - Requires management<br>- Higher latency from edge<br>- Higher costs<br>- Connection pooling needed | 100K+ users |
| **PlanetScale** | - Serverless MySQL<br>- Automatic sharding<br>- Branch workflows<br>- Great developer experience | - MySQL limitations<br>- Costs at scale<br>- Vendor lock-in | 100K-1M users |
| **Supabase** | - PostgreSQL + extras<br>- Real-time subscriptions<br>- Built-in auth<br>- Good free tier | - Additional complexity<br>- Potential vendor lock-in<br>- Rate limits on free tier | Small to medium scale |

## Migration Strategy

### Phase 1: Prepare for Migration (Week 1)

#### 1. Database Abstraction Layer
```typescript
// src/lib/database/abstract.ts
export interface DatabaseAdapter {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>;
  batch(operations: Operation[]): Promise<void>;
  migrate(migrations: Migration[]): Promise<void>;
}

// src/lib/database/adapters/d1.ts
export class D1Adapter implements DatabaseAdapter {
  constructor(private db: D1Database) {}

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    if (params) stmt.bind(...params);
    return await stmt.all<T>();
  }
}

// src/lib/database/adapters/postgresql.ts
export class PostgreSQLAdapter implements DatabaseAdapter {
  constructor(private pool: Pool) {}

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows as T[];
  }
}

// Usage
const db = process.env.DATABASE_TYPE === 'postgresql'
  ? new PostgreSQLAdapter(pgPool)
  : new D1Adapter(env.DB);
```

#### 2. Migration Scripts
```typescript
// scripts/migrations/index.ts
export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  timestamp: number;
}

export class MigrationRunner {
  constructor(private adapter: DatabaseAdapter) {}

  async run(direction: 'up' | 'down' = 'up'): Promise<void> {
    const migrations = await this.getPendingMigrations();

    for (const migration of migrations) {
      console.log(`Running migration: ${migration.name}`);

      await this.adapter.transaction(async (tx) => {
        // Run migration
        await tx.execute(migration[direction]);

        // Record migration
        if (direction === 'up') {
          await tx.execute(
            'INSERT INTO migrations (id, name, timestamp) VALUES (?, ?, ?)',
            [migration.id, migration.name, Date.now()]
          );
        } else {
          await tx.execute(
            'DELETE FROM migrations WHERE id = ?',
            [migration.id]
          );
        }
      });
    }
  }
}
```

### Phase 2: Data Export & Transform (Week 2)

#### 1. Export Script for D1
```bash
#!/bin/bash
# scripts/export-d1-data.sh

# Export schema
wrangler d1 execute mustbeviral-prod --command "
  SELECT sql FROM sqlite_master
  WHERE type='table'
  AND name NOT LIKE 'sqlite_%'
" > schema.sql

# Export data for each table
tables=("users" "content" "matches" "analytics" "subscriptions")

for table in "${tables[@]}"
do
  echo "Exporting $table..."
  wrangler d1 execute mustbeviral-prod \
    --command "SELECT * FROM $table" \
    --json > "data/${table}.json"
done

# Create PostgreSQL-compatible dump
node scripts/transform-to-postgresql.js
```

#### 2. Data Transformation Script
```typescript
// scripts/transform-to-postgresql.js
import fs from 'fs';
import { format } from 'pg-format';

class DataTransformer {
  constructor(private sourceDir: string, private targetFile: string) {}

  async transform(): Promise<void> {
    const output = fs.createWriteStream(this.targetFile);

    // Write PostgreSQL headers
    output.write('BEGIN;\n\n');

    // Transform schema
    const schema = await this.transformSchema();
    output.write(schema + '\n\n');

    // Transform data for each table
    const tables = ['users', 'content', 'matches', 'analytics', 'subscriptions'];

    for (const table of tables) {
      const data = JSON.parse(
        fs.readFileSync(`${this.sourceDir}/${table}.json`, 'utf8')
      );

      if (data.length > 0) {
        const inserts = this.generateInserts(table, data);
        output.write(inserts + '\n\n');
      }
    }

    // Write footer
    output.write('COMMIT;\n');
    output.end();
  }

  private transformSchema(): string {
    // Convert SQLite schema to PostgreSQL
    const sqliteSchema = fs.readFileSync('schema.sql', 'utf8');

    return sqliteSchema
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
      .replace(/DATETIME/g, 'TIMESTAMP')
      .replace(/AUTOINCREMENT/g, '')
      .replace(/`/g, '"');
  }

  private generateInserts(table: string, data: any[]): string {
    const columns = Object.keys(data[0]);
    const values = data.map(row => Object.values(row));

    return format(
      'INSERT INTO %I (%s) VALUES %L',
      table,
      columns.map(c => format('%I', c)).join(', '),
      values
    );
  }
}

// Run transformation
const transformer = new DataTransformer('./data', './postgresql_dump.sql');
transformer.transform();
```

### Phase 3: Migration Execution (Week 3)

#### 1. Zero-Downtime Migration Strategy
```typescript
// scripts/zero-downtime-migration.ts
export class ZeroDowntimeMigration {
  private oldDb: DatabaseAdapter;
  private newDb: DatabaseAdapter;
  private migrationState: 'preparing' | 'syncing' | 'switching' | 'complete' = 'preparing';

  constructor(oldDb: DatabaseAdapter, newDb: DatabaseAdapter) {
    this.oldDb = oldDb;
    this.newDb = newDb;
  }

  async execute(): Promise<void> {
    try {
      // Step 1: Set up dual writes
      await this.enableDualWrites();

      // Step 2: Copy historical data
      await this.copyHistoricalData();

      // Step 3: Verify data consistency
      await this.verifyDataConsistency();

      // Step 4: Switch read traffic
      await this.switchReadTraffic();

      // Step 5: Monitor and verify
      await this.monitorNewDatabase();

      // Step 6: Disable dual writes
      await this.disableDualWrites();

      this.migrationState = 'complete';
      console.log('Migration completed successfully!');

    } catch (error) {
      console.error('Migration failed:', error);
      await this.rollback();
      throw error;
    }
  }

  private async enableDualWrites(): Promise<void> {
    console.log('Enabling dual writes...');

    // Update application to write to both databases
    process.env.ENABLE_DUAL_WRITES = 'true';
    process.env.PRIMARY_DB = 'old';
    process.env.SECONDARY_DB = 'new';

    this.migrationState = 'syncing';
  }

  private async copyHistoricalData(): Promise<void> {
    console.log('Copying historical data...');

    const tables = ['users', 'content', 'matches', 'analytics', 'subscriptions'];

    for (const table of tables) {
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const rows = await this.oldDb.query(
          `SELECT * FROM ${table} LIMIT ${batchSize} OFFSET ${offset}`
        );

        if (rows.length === 0) {
          hasMore = false;
        } else {
          await this.batchInsert(table, rows);
          offset += batchSize;

          // Progress update
          console.log(`Copied ${offset} rows from ${table}`);
        }

        // Rate limiting to avoid overwhelming the system
        await this.sleep(100);
      }
    }
  }

  private async verifyDataConsistency(): Promise<void> {
    console.log('Verifying data consistency...');

    const tables = ['users', 'content', 'matches'];

    for (const table of tables) {
      const oldCount = await this.oldDb.query(`SELECT COUNT(*) FROM ${table}`);
      const newCount = await this.newDb.query(`SELECT COUNT(*) FROM ${table}`);

      if (oldCount[0].count !== newCount[0].count) {
        throw new Error(`Data inconsistency in ${table}: ${oldCount[0].count} vs ${newCount[0].count}`);
      }

      // Sample data comparison
      const sampleSize = 100;
      const oldSample = await this.oldDb.query(
        `SELECT * FROM ${table} ORDER BY RANDOM() LIMIT ${sampleSize}`
      );

      for (const row of oldSample) {
        const newRow = await this.newDb.query(
          `SELECT * FROM ${table} WHERE id = ?`,
          [row.id]
        );

        if (!this.compareRows(row, newRow[0])) {
          throw new Error(`Data mismatch in ${table} for id ${row.id}`);
        }
      }
    }
  }

  private async switchReadTraffic(): Promise<void> {
    console.log('Switching read traffic to new database...');

    // Gradually shift traffic
    const stages = [10, 25, 50, 75, 100];

    for (const percentage of stages) {
      process.env.NEW_DB_READ_PERCENTAGE = String(percentage);

      console.log(`Routing ${percentage}% of reads to new database`);

      // Monitor for 5 minutes at each stage
      await this.monitorPerformance(5 * 60 * 1000);

      // Check error rates
      const errorRate = await this.getErrorRate();
      if (errorRate > 0.01) { // 1% error threshold
        throw new Error(`High error rate detected: ${errorRate}`);
      }
    }

    this.migrationState = 'switching';
  }

  private async rollback(): Promise<void> {
    console.log('Rolling back migration...');

    // Disable dual writes
    process.env.ENABLE_DUAL_WRITES = 'false';

    // Route all traffic back to old database
    process.env.NEW_DB_READ_PERCENTAGE = '0';

    // Clean up new database
    // Note: In production, you might want to keep the data for analysis

    this.migrationState = 'preparing';
  }
}
```

#### 2. Application Code Updates
```typescript
// src/lib/database/connection.ts
export class DatabaseConnection {
  private primaryDb: DatabaseAdapter;
  private secondaryDb?: DatabaseAdapter;
  private dualWritesEnabled: boolean;
  private newDbReadPercentage: number;

  constructor() {
    this.primaryDb = this.createAdapter(process.env.PRIMARY_DB || 'd1');

    if (process.env.ENABLE_DUAL_WRITES === 'true') {
      this.secondaryDb = this.createAdapter(process.env.SECONDARY_DB || 'postgresql');
      this.dualWritesEnabled = true;
    }

    this.newDbReadPercentage = parseInt(process.env.NEW_DB_READ_PERCENTAGE || '0');
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    // Determine which database to read from
    const useNewDb = Math.random() * 100 < this.newDbReadPercentage;
    const db = useNewDb && this.secondaryDb ? this.secondaryDb : this.primaryDb;

    try {
      return await db.query<T>(sql, params);
    } catch (error) {
      // Fallback to primary on error
      if (useNewDb && this.secondaryDb) {
        console.error('New database query failed, falling back to primary:', error);
        return await this.primaryDb.query<T>(sql, params);
      }
      throw error;
    }
  }

  async write(sql: string, params?: any[]): Promise<void> {
    // Write to primary
    await this.primaryDb.query(sql, params);

    // Dual write if enabled
    if (this.dualWritesEnabled && this.secondaryDb) {
      try {
        await this.secondaryDb.query(sql, params);
      } catch (error) {
        // Log but don't fail the write
        console.error('Dual write to secondary database failed:', error);
        // Send alert to monitoring
        this.sendAlert('dual_write_failure', { sql, error });
      }
    }
  }
}
```

### Phase 4: Post-Migration (Week 4)

#### 1. Performance Monitoring
```typescript
// src/lib/monitoring/database-monitor.ts
export class DatabaseMonitor {
  private metrics: Map<string, number[]> = new Map();

  async monitorPerformance(): Promise<void> {
    setInterval(async () => {
      // Query performance
      const queryMetrics = await this.measureQueryPerformance();
      this.recordMetric('query_time_ms', queryMetrics.avgTime);

      // Connection pool stats
      const poolStats = await this.getConnectionPoolStats();
      this.recordMetric('active_connections', poolStats.active);
      this.recordMetric('idle_connections', poolStats.idle);

      // Database size
      const dbSize = await this.getDatabaseSize();
      this.recordMetric('database_size_mb', dbSize);

      // Slow queries
      const slowQueries = await this.getSlowQueries();
      this.recordMetric('slow_queries_count', slowQueries.length);

      // Send to monitoring service
      await this.sendToPrometheus();

    }, 60000); // Every minute
  }

  private async measureQueryPerformance(): Promise<any> {
    const testQueries = [
      'SELECT COUNT(*) FROM users',
      'SELECT * FROM content ORDER BY created_at DESC LIMIT 10',
      'SELECT AVG(engagement_rate) FROM analytics WHERE date > NOW() - INTERVAL 7 DAY'
    ];

    const times: number[] = [];

    for (const query of testQueries) {
      const start = Date.now();
      await db.query(query);
      times.push(Date.now() - start);
    }

    return {
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      maxTime: Math.max(...times),
      minTime: Math.min(...times)
    };
  }
}
```

#### 2. Rollback Plan
```bash
#!/bin/bash
# scripts/database-rollback.sh

echo "Starting database rollback..."

# 1. Stop application traffic
kubectl scale deployment mustbeviral-app --replicas=0

# 2. Restore from backup
if [ "$1" == "postgresql" ]; then
  echo "Rolling back PostgreSQL..."
  psql $DATABASE_URL < backups/pre_migration_backup.sql
elif [ "$1" == "d1" ]; then
  echo "Rolling back Cloudflare D1..."
  wrangler d1 restore mustbeviral-prod --backup-id=$BACKUP_ID
fi

# 3. Update environment variables
export DATABASE_TYPE="d1"
export ENABLE_DUAL_WRITES="false"

# 4. Restart application
kubectl scale deployment mustbeviral-app --replicas=3

# 5. Verify
curl https://api.mustbeviral.com/health

echo "Rollback complete!"
```

## Migration Checklist

### Pre-Migration
- [ ] Create database abstraction layer
- [ ] Set up migration scripts
- [ ] Implement dual-write capability
- [ ] Create comprehensive backups
- [ ] Set up monitoring
- [ ] Load test new database
- [ ] Create rollback plan

### During Migration
- [ ] Enable maintenance mode (if needed)
- [ ] Start dual writes
- [ ] Copy historical data
- [ ] Verify data consistency
- [ ] Gradually shift read traffic
- [ ] Monitor performance metrics
- [ ] Check error rates

### Post-Migration
- [ ] Disable dual writes
- [ ] Decommission old database
- [ ] Update documentation
- [ ] Performance optimization
- [ ] Cost analysis
- [ ] Team retrospective

## Performance Optimization for PostgreSQL

### 1. Connection Pooling
```typescript
// src/lib/database/pool.ts
import { Pool } from 'pg';

export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Health check
pgPool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});
```

### 2. Query Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_content_user_id ON content(user_id);
CREATE INDEX idx_content_status_created ON content(status, created_at DESC);
CREATE INDEX idx_analytics_user_date ON analytics(user_id, date DESC);

-- Partial indexes for specific conditions
CREATE INDEX idx_active_users ON users(id) WHERE status = 'active';
CREATE INDEX idx_published_content ON content(id) WHERE status = 'published';

-- Composite indexes for complex queries
CREATE INDEX idx_user_content_analytics ON analytics(user_id, content_id, date DESC);
```

### 3. Caching Strategy
```typescript
// src/lib/cache/database-cache.ts
export class DatabaseCache {
  private redis: Redis;
  private ttl: number = 300; // 5 minutes default

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.redis.setex(
      key,
      ttl || this.ttl,
      JSON.stringify(value)
    );
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

## Cost Analysis

### Monthly Cost Comparison (at scale)

| Users | D1 | PostgreSQL | PlanetScale | Supabase |
|-------|-----|------------|-------------|----------|
| 10K | $5 | $20 | $29 | $0 |
| 100K | $50 | $100 | $99 | $25 |
| 500K | N/A | $400 | $299 | $399 |
| 1M | N/A | $800 | $599 | $599 |

### Factors to Consider
1. **Compute costs** - Edge vs. centralized
2. **Storage costs** - Growing with data
3. **Backup costs** - Retention policies
4. **Transfer costs** - Egress charges
5. **Operational costs** - Management overhead

## Decision Framework

### Stay with D1 if:
- User base < 100K
- Simple queries sufficient
- Edge performance critical
- Cost is primary concern
- Team lacks database expertise

### Migrate to PostgreSQL if:
- User base > 100K
- Complex analytics needed
- High concurrent writes
- Need advanced features
- Team has PostgreSQL experience

### Consider PlanetScale/Supabase if:
- Need managed solution
- Want built-in scaling
- Require additional features
- Budget allows for it

## Monitoring & Alerts

### Key Metrics to Track
```yaml
# monitoring/database-alerts.yml
alerts:
  - name: HighQueryLatency
    condition: avg(query_time_ms) > 500
    for: 5m
    severity: warning

  - name: ConnectionPoolExhaustion
    condition: active_connections / max_connections > 0.9
    for: 2m
    severity: critical

  - name: DatabaseSizeGrowth
    condition: rate(database_size_mb[1h]) > 1000
    for: 30m
    severity: warning

  - name: ReplicationLag
    condition: replication_lag_seconds > 10
    for: 5m
    severity: critical
```

## Timeline

### Week 1: Preparation
- Set up abstraction layer
- Create migration scripts
- Test in development

### Week 2: Testing
- Load test new database
- Run migration in staging
- Performance benchmarking

### Week 3: Migration
- Enable dual writes
- Copy data
- Gradual traffic shift

### Week 4: Stabilization
- Monitor performance
- Optimize queries
- Documentation update

## Success Criteria

- ✅ Zero data loss
- ✅ < 5 minutes downtime (or zero with dual writes)
- ✅ Query performance within 10% of baseline
- ✅ Error rate < 0.1%
- ✅ Successful rollback tested
- ✅ Team trained on new system

---

**Important**: Always test migration in staging environment first. Have rollback plan ready. Monitor closely during and after migration.