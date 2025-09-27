/**
 * Cloudflare D1 User Repository Implementation
 * Implements Repository Pattern for Cloudflare Workers environment
 * Provides data persistence layer with query optimization and caching
 */

import { IUserRepository, UserStatistics, UserEngagementMetrics, LoginHistoryEntry} from '../../domain/repositories/IUserRepository';
import { UserProps, UserRole, UserStatus} from '../../domain/entities/User';
import { QueryOptions, SearchCriteria, SearchResult, ITransaction} from '../../interfaces/IRepository';

export interface CloudflareEnv {
  DB: D1Database;
  USER_CACHE: KVNamespace;
  ANALYTICS: AnalyticsEngineDataset;
}

/**
 * Cloudflare D1 Database User Repository
 */
export class CloudflareUserRepository implements IUserRepository {
  private readonly tableName = 'users';
  private readonly loginHistoryTable = 'user_login_history';
  private readonly cachePrefix = 'user:';
  private readonly cacheTTL = 300; // 5 minutes

  constructor(private env: CloudflareEnv) {}

  // Base Repository Methods
  async findById(id: string): Promise<UserProps | null> {
    // Try cache first
    const cacheKey = `${this.cachePrefix}id:${id}`;
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const result = await this.env.DB
      .prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`)
      .bind(id)
      .first();

    if (!result) {
      return null;
    }

    const user = this.mapDbRowToUserProps(result);
    
    // Cache the result
    await this.setCache(cacheKey, user);
    
    return user;
  }

  async findAll(options?: QueryOptions): Promise<UserProps[]> {
    let query = `SELECT * FROM ${this.tableName}`;
    const bindings: any[] = [];

    // Apply filters
    if (options?.filters) {
      const conditions = this.buildWhereConditions(options.filters, bindings);
      if (conditions) {
        query += ` WHERE ${conditions}`;
      }
    }

    // Apply ordering
    if (options?.orderBy) {
      const direction = options.sortDirection ?? 'asc';
      query += ` ORDER BY ${options.orderBy} ${direction.toUpperCase()}`;
    }

    // Apply pagination
    if (options?.limit) {
      query += ` LIMIT ?`;
      bindings.push(options.limit);

      if (options.offset) {
        query += ` OFFSET ?`;
        bindings.push(options.offset);
      }
    }

    const { results} = await this.env.DB
      .prepare(query)
      .bind(...bindings)
      .all();

    return (results ?? []).map(row => this.mapDbRowToUserProps(row));
  }

  async create(user: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProps> {
    const now = new Date();
    const id = crypto.randomUUID();
    
    const userWithMeta: UserProps = {
      ...user,
      id,
      createdAt: now,
      updatedAt: now
    };

    const insertQuery = `
      INSERT INTO ${this.tableName} (
        id, email, firstName, lastName, passwordHash, role, status,
        emailVerified, emailVerificationToken, passwordResetToken, 
        passwordResetExpires, lastLoginAt, loginAttempts, lockedUntil,
        preferences, subscription, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.env.DB
      .prepare(insertQuery)
      .bind(
        userWithMeta.id,
        userWithMeta.email,
        userWithMeta.firstName,
        userWithMeta.lastName,
        userWithMeta.passwordHash,
        userWithMeta.role,
        userWithMeta.status,
        userWithMeta.emailVerified ? 1 : 0,
        userWithMeta.emailVerificationToken,
        userWithMeta.passwordResetToken,
        userWithMeta.passwordResetExpires?.toISOString(),
        userWithMeta.lastLoginAt?.toISOString(),
        userWithMeta.loginAttempts,
        userWithMeta.lockedUntil?.toISOString(),
        JSON.stringify(userWithMeta.preferences),
        userWithMeta.subscription ? JSON.stringify(userWithMeta.subscription) : null,
        userWithMeta.createdAt.toISOString(),
        userWithMeta.updatedAt.toISOString()
      )
      .run();

    // Invalidate relevant caches
    await this.invalidateUserCaches(userWithMeta.id, userWithMeta.email);

    return userWithMeta;
  }

  async update(id: string, updates: Partial<UserProps>): Promise<UserProps> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`User with id ${id} not found`);
    }

    const updatedUser: UserProps = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };

    const updateQuery = `
      UPDATE ${this.tableName} SET
        email = ?, firstName = ?, lastName = ?, passwordHash = ?, role = ?,
        status = ?, emailVerified = ?, emailVerificationToken = ?,
        passwordResetToken = ?, passwordResetExpires = ?, lastLoginAt = ?,
        loginAttempts = ?, lockedUntil = ?, preferences = ?, subscription = ?,
        updatedAt = ?
      WHERE id = ?
    `;

    await this.env.DB
      .prepare(updateQuery)
      .bind(
        updatedUser.email,
        updatedUser.firstName,
        updatedUser.lastName,
        updatedUser.passwordHash,
        updatedUser.role,
        updatedUser.status,
        updatedUser.emailVerified ? 1 : 0,
        updatedUser.emailVerificationToken,
        updatedUser.passwordResetToken,
        updatedUser.passwordResetExpires?.toISOString(),
        updatedUser.lastLoginAt?.toISOString(),
        updatedUser.loginAttempts,
        updatedUser.lockedUntil?.toISOString(),
        JSON.stringify(updatedUser.preferences),
        updatedUser.subscription ? JSON.stringify(updatedUser.subscription) : null,
        updatedUser.updatedAt.toISOString(),
        id
      )
      .run();

    // Invalidate caches
    await this.invalidateUserCaches(id, updatedUser.email);

    return updatedUser;
  }

  async delete(id: string): Promise<boolean> {
    const user = await this.findById(id);
    if (!user) {
      return false;
    }

    await this.env.DB
      .prepare(`DELETE FROM ${this.tableName} WHERE id = ?`)
      .bind(id)
      .run();

    // Invalidate caches
    await this.invalidateUserCaches(id, user.email);

    return true;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.env.DB
      .prepare(`SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`)
      .bind(id)
      .first();

    return !!result;
  }

  // User-specific Methods
  async findByEmail(email: string): Promise<UserProps | null> {
    const cacheKey = `${this.cachePrefix}email:${email}`;
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.env.DB
      .prepare(`SELECT * FROM ${this.tableName} WHERE email = ?`)
      .bind(email)
      .first();

    if (!result) {
      return null;
    }

    const user = this.mapDbRowToUserProps(result);
    await this.setCache(cacheKey, user);
    
    return user;
  }

  async findByEmailVerificationToken(token: string): Promise<UserProps | null> {
    const result = await this.env.DB
      .prepare(`SELECT * FROM ${this.tableName} WHERE emailVerificationToken = ?`)
      .bind(token)
      .first();

    return result ? this.mapDbRowToUserProps(result) : null;
  }

  async findByPasswordResetToken(token: string): Promise<UserProps | null> {
    const result = await this.env.DB
      .prepare(`SELECT * FROM ${this.tableName} WHERE passwordResetToken = ? AND passwordResetExpires > ?`)
      .bind(token, new Date().toISOString())
      .first();

    return result ? this.mapDbRowToUserProps(result) : null;
  }

  async findByRole(role: UserRole): Promise<UserProps[]> {
    const { results} = await this.env.DB
      .prepare(`SELECT * FROM ${this.tableName} WHERE role = ? ORDER BY createdAt DESC`)
      .bind(role)
      .all();

    return (results ?? []).map(row => this.mapDbRowToUserProps(row));
  }

  async findByStatus(status: UserStatus): Promise<UserProps[]> {
    const { results} = await this.env.DB
      .prepare(`SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY createdAt DESC`)
      .bind(status)
      .all();

    return (results ?? []).map(row => this.mapDbRowToUserProps(row));
  }

  // Complex Queries
  async findActiveUsersWithSubscriptions(): Promise<UserProps[]> {
    const { results} = await this.env.DB
      .prepare(`
        SELECT * FROM ${this.tableName} 
        WHERE status = 'active' 
        AND subscription IS NOT NULL
        AND JSONEXTRACT(subscription, '$.status') = 'active'
        ORDER BY lastLoginAt DESC
      `)
      .all();

    return (results ?? []).map(row => this.mapDbRowToUserProps(row));
  }

  async findUsersWithExpiredTokens(): Promise<UserProps[]> {
    const { results} = await this.env.DB
      .prepare(`
        SELECT * FROM ${this.tableName} 
        WHERE (passwordResetExpires IS NOT NULL AND passwordResetExpires < ?)
        OR (emailVerificationToken IS NOT NULL AND createdAt < ?)
      `)
      .bind(
        new Date().toISOString(),
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24 hours ago
      )
      .all();

    return (results ?? []).map(row => this.mapDbRowToUserProps(row));
  }

  async findLockedUsers(): Promise<UserProps[]> {
    const { results} = await this.env.DB
      .prepare(`
        SELECT * FROM ${this.tableName} 
        WHERE lockedUntil IS NOT NULL AND lockedUntil > ?
        ORDER BY lockedUntil DESC
      `)
      .bind(new Date().toISOString())
      .all();

    return (results ?? []).map(row => this.mapDbRowToUserProps(row));
  }

  async findUsersRequiringVerification(days: number): Promise<UserProps[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const { results} = await this.env.DB
      .prepare(`
        SELECT * FROM ${this.tableName} 
        WHERE emailVerified = 0 
        AND createdAt < ?
        ORDER BY createdAt ASC
      `)
      .bind(cutoffDate.toISOString())
      .all();

    return (results ?? []).map(row => this.mapDbRowToUserProps(row));
  }

  // Batch Operations
  async updateMultipleUsers(userIds: string[], updates: Partial<UserProps>): Promise<void> {
    if (userIds.length === 0) {return;}

    const placeholders = userIds.map(() => '?').join(',');
    const setClauses = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'createdAt')
      .map(key => `${key} = ?`)
      .join(', ');

    if (!setClauses) {return;}

    const values = [
      ...Object.values(updates).map(value => 
        typeof value === 'object' ? JSON.stringify(value) : value
      ),
      new Date().toISOString(), // updatedAt
      ...userIds
    ];

    await this.env.DB
      .prepare(`
        UPDATE ${this.tableName} 
        SET ${setClauses}, updatedAt = ?
        WHERE id IN (${placeholders})
      `)
      .bind(...values)
      .run();

    // Invalidate caches for affected users
    await Promise.all(userIds.map(id => this.invalidateUserCaches(id)));
  }

  async deleteInactiveUsers(inactiveDays: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

    const result = await this.env.DB
      .prepare(`
        DELETE FROM ${this.tableName} 
        WHERE status = 'inactive' 
        AND (lastLoginAt IS NULL OR lastLoginAt < ?)
        AND emailVerified = 0
      `)
      .bind(cutoffDate.toISOString())
      .run();

    return result.changes ?? 0;
  }

  // Statistics and Reporting
  async getStatistics(): Promise<UserStatistics> {
    // Execute multiple queries in parallel
    const [
      totalUsersResult,
      activeUsersResult,
      verifiedUsersResult,
      suspendedUsersResult,
      roleStatsResults,
      recentRegistrationsResults
    ] = await Promise.all([
      this.env.DB.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`).first(),
      this.env.DB.prepare(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = 'active'`).first(),
      this.env.DB.prepare(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE emailVerified = 1`).first(),
      this.env.DB.prepare(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = 'suspended'`).first(),
      this.env.DB.prepare(`SELECT role, COUNT(*) as count FROM ${this.tableName} GROUP BY role`).all(),
      Promise.all([
        this.env.DB.prepare(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE DATE(createdAt) = DATE('now')`).first(),
        this.env.DB.prepare(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE createdAt >= DATE('now', '-7 days')`).first(),
        this.env.DB.prepare(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE createdAt >= DATE('now', '-30 days')`).first()
      ])
    ]);

    // Process role statistics
    const usersByRole: Record<UserRole, number> = {
      [UserRole.USER]: 0,
      [UserRole.CREATOR]: 0,
      [UserRole.BRANDMANAGER]: 0,
      [UserRole.AGENCY]: 0,
      [UserRole.ADMIN]: 0,
      [UserRole.SUPERADMIN]: 0
    };

    if (roleStatsResults.results) {
      for (const row of roleStatsResults.results) {
        usersByRole[row.role as UserRole] = row.count as number;
      }
    }

    // Get top active users
    const topUsersResult = await this.env.DB
      .prepare(`
        SELECT id, email, lastLoginAt, 
               (SELECT COUNT(*) FROM ${this.loginHistoryTable} WHERE userId = u.id) as loginCount
        FROM ${this.tableName} u
        WHERE lastLoginAt IS NOT NULL
        ORDER BY lastLoginAt DESC, loginCount DESC
        LIMIT 10
      `)
      .all();

    const topUsersByActivity = (topUsersResult.results ?? []).map((row: any) => ({
      userId: row.id,
      email: row.email,
      lastLoginAt: new Date(row.lastLoginAt),
      loginCount: row.loginCount ?? 0
    }));

    return {
      totalUsers: (totalUsersResult?.count as number)  ?? 0,
      activeUsers: (activeUsersResult?.count as number)  ?? 0,
      verifiedUsers: (verifiedUsersResult?.count as number)  ?? 0,
      suspendedUsers: (suspendedUsersResult?.count as number) || 0,
      usersByRole,
      usersByStatus: {
        [UserStatus.ACTIVE]: (activeUsersResult?.count as number) || 0,
        [UserStatus.INACTIVE]: 0, // Would need separate query
        [UserStatus.SUSPENDED]: (suspendedUsersResult?.count as number) || 0,
        [UserStatus.BANNED]: 0, // Would need separate query
        [UserStatus.PENDINGVERIFICATION]: 0 // Would need separate query
      },
      recentRegistrations: {
        today: (recentRegistrationsResults[0]?.count as number) || 0,
        thisWeek: (recentRegistrationsResults[1]?.count as number) || 0,
        thisMonth: (recentRegistrationsResults[2]?.count as number) || 0
      },
      averageLoginFrequency: 0, // Would need complex calculation
      topUsersByActivity
    };
  }

  async getUserEngagementMetrics(userId: string): Promise<UserEngagementMetrics> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get login statistics
    const loginStatsResult = await this.env.DB
      .prepare(`
        SELECT 
          COUNT(*) as loginCount,
          MAX(loginAt) as lastLogin,
          AVG(sessionDuration) as avgSessionDuration
        FROM ${this.loginHistoryTable} 
        WHERE userId = ? AND success = 1
      `)
      .bind(userId)
      .first();

    const daysSinceRegistration = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      userId,
      loginCount: (loginStatsResult?.loginCount as number)  ?? 0,
      lastLoginAt: loginStatsResult?.lastLogin ? new Date(loginStatsResult.lastLogin as string) : null,
      averageSessionDuration: (loginStatsResult?.avgSessionDuration as number)  ?? 0,
      contentCreated: 0, // Would need to query content table
      campaignsCreated: 0, // Would need to query campaigns table
      totalEngagement: 0, // Would need complex calculation
      registrationDate: user.createdAt,
      daysSinceRegistration,
      activityScore: this.calculateActivityScore(
        (loginStatsResult?.loginCount as number)  ?? 0,
        daysSinceRegistration
      )
    };
  }

  async getUserLoginHistory(userId: string, limit: number = 10): Promise<LoginHistoryEntry[]> {
    const { results} = await this.env.DB
      .prepare(`
        SELECT * FROM ${this.loginHistoryTable} 
        WHERE userId = ? 
        ORDER BY loginAt DESC 
        LIMIT ?
      `)
      .bind(userId, limit)
      .all();

    return (results ?? []).map(row => ({
      id: row.id as string,
      userId: row.userId as string,
      loginAt: new Date(row.loginAt as string),
      ipAddress: row.ipAddress as string,
      userAgent: row.userAgent as string,
      success: !!row.success,
      failureReason: row.failureReason as string,
      sessionDuration: row.sessionDuration as number
    }));
  }

  // Security Methods
  async recordLoginAttempt(
    userId: string, 
    success: boolean, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    await this.env.DB
      .prepare(`
        INSERT INTO ${this.loginHistoryTable} 
        (id, userId, loginAt, ipAddress, userAgent, success, failureReason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        userId,
        new Date().toISOString(),
        ipAddress,
        userAgent,
        success ? 1 : 0,
        success ? null : 'Invalid credentials'
      )
      .run();
  }

  async getFailedLoginAttempts(userId: string, timeWindow: number): Promise<number> {
    const since = new Date(Date.now() - timeWindow);
    
    const result = await this.env.DB
      .prepare(`
        SELECT COUNT(*) as count 
        FROM ${this.loginHistoryTable} 
        WHERE userId = ? AND success = 0 AND loginAt > ?
      `)
      .bind(userId, since.toISOString())
      .first();

    return (result?.count as number)  ?? 0;
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.env.DB
      .prepare(`
        UPDATE ${this.tableName} 
        SET passwordResetToken = NULL, passwordResetExpires = NULL
        WHERE passwordResetExpires < ?
      `)
      .bind(new Date().toISOString())
      .run();

    return result.changes ?? 0;
  }

  // Searchable Repository Methods
  async search(criteria: SearchCriteria<UserProps>): Promise<SearchResult<UserProps>> {
    let query = `SELECT * FROM ${this.tableName}`;
    let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    const bindings: any[] = [];

    // Build WHERE conditions
    const conditions = this.buildSearchConditions(criteria, bindings);
    if (conditions) {
      query += ` WHERE ${conditions}`;
      countQuery += ` WHERE ${conditions}`;
    }

    // Apply sorting
    if (criteria.sorting && criteria.sorting.length > 0) {
      const orderClauses = criteria.sorting.map(sort => 
        `${sort.field} ${sort.direction.toUpperCase()}`
      ).join(', ');
      query += ` ORDER BY ${orderClauses}`;
    }

    // Apply pagination
    const page = criteria.pagination?.page ?? 1;
    const limit = criteria.pagination?.limit ?? 20;
    const offset = (page - 1) * limit;

    query += ` LIMIT ? OFFSET ?`;
    bindings.push(limit, offset);

    // Execute queries
    const [itemsResult, countResult] = await Promise.all([
      this.env.DB.prepare(query).bind(...bindings).all(),
      this.env.DB.prepare(countQuery).bind(...bindings.slice(0, -2)).first()
    ]);

    const items = (itemsResult.results ?? []).map(row => this.mapDbRowToUserProps(row));
    const totalCount = (countResult?.total as number)  ?? 0;

    return {
      items,
      totalCount,
      page,
      limit,
      hasNext: offset + limit < totalCount,
      hasPrevious: page > 1
    };
  }

  async findByField<K extends keyof UserProps>(
    field: K, 
    value: UserProps[K]
  ): Promise<UserProps[]> {
    const { results} = await this.env.DB
      .prepare(`SELECT * FROM ${this.tableName} WHERE ${String(field)} = ?`)
      .bind(value)
      .all();

    return (results ?? []).map(row => this.mapDbRowToUserProps(row));
  }

  // Transaction Methods
  async beginTransaction(): Promise<ITransaction> {
    // D1 doesn't support explicit transactions, so we'll simulate
    return {
      id: crypto.randomUUID(),
      commit: async () => {},
      rollback: async () => {},
      isActive: () => true
    };
  }

  async executeInTransaction<T>(operation: (tx: ITransaction) => Promise<T>): Promise<T> {
    const transaction = await this.beginTransaction();
    try {
      const result = await operation(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Private Helper Methods
  private mapDbRowToUserProps(row: any): UserProps {
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      passwordHash: row.passwordHash,
      role: row.role as UserRole,
      status: row.status as UserStatus,
      emailVerified: !!row.emailVerified,
      emailVerificationToken: row.emailVerificationToken,
      passwordResetToken: row.passwordResetToken,
      passwordResetExpires: row.passwordResetExpires ? new Date(row.passwordResetExpires) : undefined,
      lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt) : undefined,
      loginAttempts: row.loginAttempts ?? 0,
      lockedUntil: row.lockedUntil ? new Date(row.lockedUntil) : undefined,
      preferences: row.preferences ? JSON.parse(row.preferences) : {},
      subscription: row.subscription ? JSON.parse(row.subscription) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  private buildWhereConditions(filters: Record<string, any>, bindings: any[]): string {
    const conditions: string[] = [];

    for (const [key, value] of Object.entries(filters)) {
      if (value === value === undefined) {
    continue;
  }

      conditions.push(`${key} = ?`);
      bindings.push(value);
    }

    return conditions.join(' AND ');
  }

  private buildSearchConditions(criteria: SearchCriteria<UserProps>, bindings: any[]): string {
    const conditions: string[] = [];

    if (criteria.query) {
      conditions.push(`(email LIKE ? OR firstName LIKE ? OR lastName LIKE ?)`);
      const searchTerm = `%${criteria.query}%`;
      bindings.push(searchTerm, searchTerm, searchTerm);
    }

    if (criteria.filters) {
      for (const [key, value] of Object.entries(criteria.filters)) {
        if (value === value === undefined) {
    continue;
  }

        conditions.push(`${key} = ?`);
        bindings.push(value);
      }
    }

    return conditions.join(' AND ');
  }

  private async getFromCache(key: string): Promise<UserProps | null> {
    try {
      const cached = await this.env.USER_CACHE.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  private async setCache(key: string, value: UserProps): Promise<void> {
    try {
      await this.env.USER_CACHE.put(key, JSON.stringify(value), {
        expirationTtl: this.cacheTTL
      });
    } catch {
      // Cache failures shouldn't break the operation
    }
  }

  private async invalidateUserCaches(userId: string, email?: string): Promise<void> {
    try {
      const cacheKeys = [`${this.cachePrefix}id:${userId}`];
      
      if (email) {
        cacheKeys.push(`${this.cachePrefix}email:${email}`);
      }

      await Promise.all(cacheKeys.map(key => this.env.USER_CACHE.delete(key)));
    } catch {
      // Cache failures shouldn't break the operation
    }
  }

  private calculateActivityScore(loginCount: number, daysSinceRegistration: number): number {
    if (daysSinceRegistration === 0) {
    return 0;
  }
    
    const loginsPerDay = loginCount / daysSinceRegistration;
    return Math.min(100, Math.round(loginsPerDay * 100));
  }
}