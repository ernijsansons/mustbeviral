// Database connection and utilities for Cloudflare D1
// LOG: DB-INIT-1 - Initialize database connection

import { CloudflareService, CloudflareEnv } from './cloudflare';

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  role: 'creator' | 'influencer' | 'admin';
  profile_data: string; // JSON string
  ai_preference_level: number;
  onboarding_completed: number; // 0 or 1 (SQLite boolean)
  created_at: string;
  updated_at: string;
}

export interface Content {
  id: string;
  user_id: string;
  title: string;
  body: string;
  image_url?: string;
  status: 'draft' | 'published' | 'pending_review' | 'archived';
  type: 'news_article' | 'social_post' | 'blog_post';
  generated_by_ai: number; // 0 or 1
  ai_model_used?: string;
  ethics_check_status: 'passed' | 'failed' | 'pending';
  metadata: string; // JSON string
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface Match {
  id: string;
  content_id: string;
  influencer_user_id: string;
  match_score: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  match_details: string; // JSON string
  created_at: string;
  updated_at: string;
}

// Database service using Cloudflare D1
export class DatabaseService {
  private cfService: CloudflareService;

  constructor(cloudflareEnv?: CloudflareEnv) {
    if (cloudflareEnv) {
      this.cfService = new CloudflareService(cloudflareEnv);
    }
    console.log('LOG: DB-INIT-2 - Database service initialized with Cloudflare');
  }

  // Initialize with Cloudflare environment (for API routes)
  initWithEnv(cloudflareEnv: CloudflareEnv): void {
    this.cfService = new CloudflareService(cloudflareEnv);
    console.log('LOG: DB-INIT-3 - Cloudflare environment initialized');
  }

  // User operations
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    console.log('LOG: DB-USER-1 - Creating new user:', userData.email);
    
    if (!this.cfService?.db) {
      throw new Error('Cloudflare D1 database not initialized');
    }
    
    try {
      const result = await this.cfService.db.fetchOne<User>(`
        INSERT INTO users (email, username, password_hash, role, profile_data, ai_preference_level, onboarding_completed)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `, [
        userData.email,
        userData.username,
        userData.password_hash,
        userData.role,
        userData.profile_data,
        userData.ai_preference_level,
        userData.onboarding_completed
      ]);

      if (!result) {
        throw new Error('Failed to create user - no result returned');
      }

      console.log('LOG: DB-USER-2 - User created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('LOG: DB-USER-ERROR-1 - Failed to create user:', error);
      throw new Error(`Failed to create user: ${error}`);
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    console.log('LOG: DB-USER-3 - Fetching user by email:', email);
    
    if (!this.cfService?.db) {
      throw new Error('Cloudflare D1 database not initialized');
    }
    
    try {
      const result = await this.cfService.db.fetchOne<User>(`
        SELECT * FROM users WHERE email = ?
      `, [email]);

      return result;
    } catch (error) {
      console.error('LOG: DB-USER-ERROR-2 - Failed to fetch user by email:', error);
      throw new Error(`Failed to fetch user: ${error}`);
    }
  }

  async updateUserOnboarding(userId: string, completed: boolean): Promise<void> {
    console.log('LOG: DB-USER-4 - Updating user onboarding:', userId, completed);
    
    if (!this.cfService?.db) {
      throw new Error('Cloudflare D1 database not initialized');
    }
    
    try {
      await this.cfService.db.executeQuery(`
        UPDATE users SET onboarding_completed = ? WHERE id = ?
      `, [completed ? 1 : 0, userId]);

      console.log('LOG: DB-USER-5 - Onboarding status updated successfully');
    } catch (error) {
      console.error('LOG: DB-USER-ERROR-3 - Failed to update onboarding:', error);
      throw new Error(`Failed to update onboarding: ${error}`);
    }
  }

  // Session management with KV
  async cacheUserSession(userId: string, sessionData: any, ttlSeconds: number = 86400): Promise<void> {
    console.log('LOG: DB-SESSION-1 - Caching user session:', userId);
    
    if (!this.cfService?.kv) {
      console.log('LOG: DB-SESSION-WARN-1 - KV not available, skipping session cache');
      return;
    }
    
    try {
      await this.cfService.kv.putJSON(`session:${userId}`, sessionData, {
        expirationTtl: ttlSeconds
      });
      console.log('LOG: DB-SESSION-2 - User session cached successfully');
    } catch (error) {
      console.error('LOG: DB-SESSION-ERROR-1 - Failed to cache session:', error);
      // Don't throw - session caching is not critical
    }
  }

  async getUserSession(userId: string): Promise<any | null> {
    console.log('LOG: DB-SESSION-3 - Getting user session:', userId);
    
    if (!this.cfService?.kv) {
      console.log('LOG: DB-SESSION-WARN-2 - KV not available, no session data');
      return null;
    }
    
    try {
      return await this.cfService.kv.getJSON(`session:${userId}`);
    } catch (error) {
      console.error('LOG: DB-SESSION-ERROR-2 - Failed to get session:', error);
      return null;
    }
  }

  // Content operations
  async createContent(contentData: Omit<Content, 'id' | 'created_at' | 'updated_at'>): Promise<Content> {
    console.log('LOG: DB-CONTENT-1 - Creating new content:', contentData.title);
    
    if (!this.cfService?.db) {
      throw new Error('Cloudflare D1 database not initialized');
    }
    
    try {
      const result = await this.cfService.db.fetchOne<Content>(`
        INSERT INTO content (user_id, title, body, image_url, status, type, generated_by_ai, ai_model_used, ethics_check_status, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `, [
        contentData.user_id,
        contentData.title,
        contentData.body,
        contentData.image_url,
        contentData.status,
        contentData.type,
        contentData.generated_by_ai,
        contentData.ai_model_used,
        contentData.ethics_check_status,
        contentData.metadata
      ]);

      if (!result) {
        throw new Error('Failed to create content - no result returned');
      }

      console.log('LOG: DB-CONTENT-2 - Content created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('LOG: DB-CONTENT-ERROR-1 - Failed to create content:', error);
      throw new Error(`Failed to create content: ${error}`);
    }
  }

  async getContentByUserId(userId: string): Promise<Content[]> {
    console.log('LOG: DB-CONTENT-3 - Fetching content for user:', userId);
    
    if (!this.cfService?.db) {
      throw new Error('Cloudflare D1 database not initialized');
    }
    
    try {
      const results = await this.cfService.db.fetchAll<Content>(`
        SELECT * FROM content WHERE user_id = ? ORDER BY created_at DESC
      `, [userId]);

      return results;
    } catch (error) {
      console.error('LOG: DB-CONTENT-ERROR-2 - Failed to fetch user content:', error);
      throw new Error(`Failed to fetch content: ${error}`);
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    console.log('LOG: DB-HEALTH-1 - Performing database health check');
    
    if (!this.cfService?.db) {
      console.log('LOG: DB-HEALTH-WARN-1 - No Cloudflare D1 database available');
      return false;
    }
    
    try {
      await this.cfService.db.fetchOne('SELECT 1');
      console.log('LOG: DB-HEALTH-2 - Database health check passed');
      return true;
    } catch (error) {
      console.error('LOG: DB-HEALTH-ERROR-1 - Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance (will be initialized with actual D1 database in API routes)
export const dbService = new DatabaseService();