/**
 * Secure Database Wrapper
 * Provides SQL injection protection and query validation
 */

import { CloudflareEnv} from '../cloudflare';
import { createSafeBinding, ValidationError} from '../../middleware/validation';

// Allowed SQL operations for query validation
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE'
]);

// Allowed table names (whitelist approach)
const ALLOWED_TABLES = new Set([
  'users',
  'content',
  'matches',
  'security_audit_logs',
  'user_sessions',
  'subscriptions',
  'transactions',
  'analytics_events'
]);

// Allowed column names for common tables
const ALLOWEDCOLUMNS = {
  users: new Set([
    'id', 'email', 'username', 'password_hash', 'role', 'profile_data',
    'ai_preference_level', 'onboarding_completed', 'created_at', 'updated_at'
  ]),
  content: new Set([
    'id', 'user_id', 'title', 'body', 'image_url', 'status', 'type',
    'generated_by_ai', 'ai_model_used', 'ethics_check_status', 'metadata',
    'created_at', 'updated_at', 'published_at'
  ]),
  matches: new Set([
    'id', 'content_id', 'influencer_user_id', 'match_score', 'status',
    'match_details', 'created_at', 'updated_at'
  ])
};

export interface DatabaseResult<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    changes: number;
    duration: number;
    rows_read: number;
    rows_written: number;
  };
}

export interface PreparedQuery {
  sql: string;
  params: unknown[];
  operation: string;
  tables: string[];
}

export class SecureDatabase {
  private env: CloudflareEnv;

  constructor(env: CloudflareEnv) {
    this.env = env;
  }

  /**
   * Execute a safe, validated query
   */
  async executeSafeQuery<T = unknown>(
    sql: string,
    params: unknown[] = [],
    options: { allowUnsafe?: boolean } = {}
  ): Promise<DatabaseResult<T>> {
    try {
      // Parse and validate the query
      const preparedQuery = this.parseAndValidateQuery(sql, params);

      // Additional security checks
      if (!options.allowUnsafe) {
        this.validateQuerySafety(preparedQuery);
      }

      // Sanitize parameters
      const safeParams = params.map(param => createSafeBinding(param));

      // Execute the query
      const statement = this.env.DB.prepare(sql);
      const result = await statement.bind(...safeParams).all<T>();

      return {
        results: result.results ?? [],
        success: result.success,
        meta: {
          changes: result.meta?.changes ?? 0,
          duration: result.meta?.duration ?? 0,
          rows_read: result.meta?.rows_read ?? 0,
          rows_written: result.meta?.rows_written ?? 0
        }
      };
    } catch (error: unknown) {
      throw new ValidationError(
        [{ field: 'query', message: `Database query failed: ${error}` }],
        'Database operation failed'
      );
    }
  }

  /**
   * Execute a single row query
   */
  async fetchOne<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    const result = await this.executeSafeQuery<T>(sql, params);
    return result.results[0]  ?? null;
  }

  /**
   * Execute a multiple row query
   */
  async fetchAll<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.executeSafeQuery<T>(sql, params);
    return result.results;
  }

  /**
   * Execute an insert/update/delete query
   */
  async executeWrite(sql: string, params: unknown[] = []): Promise<DatabaseResult> {
    return this.executeSafeQuery(sql, params);
  }

  /**
   * Execute multiple queries in a transaction
   */
  async executeBatch(queries: Array<{ sql: string; params?: unknown[] }>): Promise<DatabaseResult[]> {
    try {
      // Validate all queries first
      for (const query of queries) {
        const preparedQuery = this.parseAndValidateQuery(query.sql, query.params ?? []);
        this.validateQuerySafety(preparedQuery);
      }

      // Prepare all statements
      const statements = queries.map(query => {
        const safeParams = (query.params ?? []).map(param => createSafeBinding(param));
        return this.env.DB.prepare(query.sql).bind(...safeParams);
      });

      // Execute batch
      const results = await this.env.DB.batch(statements);

      return results.map(result => ({
        results: result.results ?? [],
        success: result.success,
        meta: {
          changes: result.meta?.changes ?? 0,
          duration: result.meta?.duration ?? 0,
          rows_read: result.meta?.rows_read ?? 0,
          rows_written: result.meta?.rows_written ?? 0
        }
      }));
    } catch (error: unknown) {
      throw new ValidationError(
        [{ field: 'batch', message: `Batch operation failed: ${error}` }],
        'Batch database operation failed'
      );
    }
  }

  /**
   * Parse and validate SQL query structure
   */
  private parseAndValidateQuery(sql: string, params: unknown[]): PreparedQuery {
    // Remove comments and normalize whitespace
    const normalizedSql = sql
      .replace(/--[^\n\r]*/g, '') // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Extract operation
    const operationMatch = normalizedSql.match(/^\s*(\w+)/i);
    if (!operationMatch) {
      throw new ValidationError(
        [{ field: 'sql', message: 'Unable to determine SQL operation' }],
        'Invalid SQL query'
      );
    }

    const operation = operationMatch[1].toUpperCase();

    // Extract table names
    const tables = this.extractTableNames(normalizedSql, operation);

    // Validate parameter count
    const placeholderCount = (normalizedSql.match(/\?/g)  ?? []).length;
    if (placeholderCount !== params.length) {
      throw new ValidationError(
        [{ field: 'params', message: 'Parameter count mismatch' }],
        'Query parameter validation failed'
      );
    }

    return {
      sql: normalizedSql,
      params,
      operation,
      tables
    };
  }

  /**
   * Extract table names from SQL query
   */
  private extractTableNames(sql: string, operation: string): string[] {
    const tables: string[] = [];

    switch (operation) {
      case 'SELECT': {
        // Match FROM clause
        const fromMatch = sql.match(/\bFROM\s+(\w+)/gi);
        if (fromMatch) {
          tables.push(...fromMatch.map(match => match.replace(/\bFROM\s+/i, '')));
        }

        // Match JOIN clauses
        const joinMatches = sql.match(/\bJOIN\s+(\w+)/gi);
        if (joinMatches) {
          tables.push(...joinMatches.map(match => match.replace(/\bJOIN\s+/i, '')));
        }
        break;
      }

      case 'INSERT': {
        const insertMatch = sql.match(/\bINTO\s+(\w+)/i);
        if (insertMatch) {
          tables.push(insertMatch[1]);
        }
        break;
      }

      case 'UPDATE': {
        const updateMatch = sql.match(/\bUPDATE\s+(\w+)/i);
        if (updateMatch) {
          tables.push(updateMatch[1]);
        }
        break;
      }

      case 'DELETE': {
        const deleteMatch = sql.match(/\bFROM\s+(\w+)/i);
        if (deleteMatch) {
          tables.push(deleteMatch[1]);
        }
        break;
      }
    }

    return tables.filter(table => table.length > 0);
  }

  /**
   * Validate query safety
   */
  private validateQuerySafety(query: PreparedQuery): void {
    // Check allowed operations
    if (!ALLOWED_OPERATIONS.has(query.operation)) {
      throw new ValidationError(
        [{ field: 'operation', message: `Operation ${query.operation} not allowed` }],
        'Unauthorized database operation'
      );
    }

    // Check allowed tables
    for (const table of query.tables) {
      if (!ALLOWED_TABLES.has(table.toLowerCase())) {
        throw new ValidationError(
          [{ field: 'table', message: `Table ${table} not allowed` }],
          'Unauthorized table access'
        );
      }
    }

    // Check for dangerous patterns
    this.checkDangerousPatterns(query.sql);

    // Validate column names in SELECT/UPDATE queries
    this.validateColumnAccess(query);
  }

  /**
   * Check for dangerous SQL patterns
   */
  private checkDangerousPatterns(sql: string): void {
    const dangerousPatterns = [
      // Union-based attacks
      /\bUNION\b.*\bSELECT\b/i,

      // Stacked queries
      /;\s*\w+/,

      // Function calls that could be dangerous
      /\b(LOAD_FILE|INTO\s+OUTFILE|INTO\s+DUMPFILE)\b/i,

      // Information schema access
      /\binformation_schema\b/i,

      // System functions
      /\b(USER|VERSION|DATABASE|SCHEMA)\s*\(\)/i,

      // Conditional attacks
      /\b(AND|OR)\s+\d+\s*=\s*\d+/i,

      // Time-based attacks
      /\b(SLEEP|WAITFOR|DELAY)\s*\(/i,

      // Hex encoding
      /0x[0-9a-f]+/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        throw new ValidationError(
          [{ field: 'sql', message: 'Potentially dangerous SQL pattern detected' }],
          'Security validation failed'
        );
      }
    }
  }

  /**
   * Validate column access
   */
  private validateColumnAccess(query: PreparedQuery): void {
    // Only validate for queries that have column restrictions
    const restrictedTables = ['users', 'content', 'matches'];

    for (const table of query.tables) {
      if (restrictedTables.includes(table) && ALLOWED_COLUMNS[table as keyof typeof ALLOWEDCOLUMNS]) {
        // Extract column names from SELECT or UPDATE queries
        const columns = this.extractColumnNames(query.sql, query.operation, table);
        const allowedColumns = ALLOWED_COLUMNS[table as keyof typeof ALLOWEDCOLUMNS];

        for (const column of columns) {
          if (column !== '*' && !allowedColumns.has(column)) {
            throw new ValidationError(
              [{ field: 'column', message: `Column ${column} not allowed for table ${table}` }],
              'Unauthorized column access'
            );
          }
        }
      }
    }
  }

  /**
   * Extract column names from SQL query
   */
  private extractColumnNames(sql: string, operation: string, table: string): string[] {
    const columns: string[] = [];

    if (operation === 'SELECT') {
      // Extract SELECT columns
      const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/i);
      if (selectMatch) {
        const columnsPart = selectMatch[1];
        if (columnsPart.includes('*')) {
          columns.push('*');
        } else {
          columns.push(...columnsPart.split(',').map(col => col.trim().replace(/^.*\./, '')));
        }
      }
    } else if (operation === 'UPDATE') {
      // Extract SET columns
      const setMatch = sql.match(/SET\s+(.*?)\s+WHERE/i);
      if (setMatch) {
        const setPart = setMatch[1];
        const assignments = setPart.split(',');
        for (const assignment of assignments) {
          const columnMatch = assignment.trim().match(/^(\w+)\s*=/);
          if (columnMatch) {
            columns.push(columnMatch[1]);
          }
        }
      }
    }

    return columns;
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.fetchOne('SELECT 1 as health_check');
      return true;
    } catch (error: unknown) {
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{ tables: number; total_size: number }> {
    try {
      // This is a simplified stats query - D1 has limited introspection
      const result = await this.fetchOne(`
        SELECT COUNT(*) as table_count
        FROM sqlite_master
        WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      `);

      return {
        tables: result?.table_count ?? 0,
        total_size: 0 // D1 doesn't expose size information
      };
    } catch (error: unknown) {
      throw new ValidationError(
        [{ field: 'stats', message: 'Failed to retrieve database statistics' }],
        'Database statistics query failed'
      );
    }
  }
}