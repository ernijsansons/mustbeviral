// Database connection and utilities for Cloudflare D1
// LOG: DB-INIT-1 - Initialize database connection

import { CloudflareService, CloudflareEnv} from './cloudflare';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly password_hash: string;
  readonly role: 'creator' | 'influencer' | 'admin';
  readonly profile_data: string; // JSON string
  readonly ai_preference_level: number;
  readonly onboarding_completed: number; // 0 or 1 (SQLite boolean)
  readonly created_at: string;
  readonly updated_at: string;
}

// Parsed profile data interface for type safety
export interface UserProfile {
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  social_links?: {
    twitter?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    notifications?: boolean;
    public_profile?: boolean;
  };
}

export interface Content {
  readonly id: string;
  readonly user_id: string;
  readonly title: string;
  readonly body: string;
  readonly image_url?: string;
  readonly status: 'draft' | 'published' | 'pending_review' | 'archived';
  readonly type: 'news_article' | 'social_post' | 'blog_post';
  readonly generated_by_ai: number; // 0 or 1
  readonly ai_model_used?: string;
  readonly ethics_check_status: 'passed' | 'failed' | 'pending';
  readonly metadata: string; // JSON string
  readonly created_at: string;
  readonly updated_at: string;
  readonly published_at?: string;
}

// Content metadata interface for type safety
export interface ContentMetadata {
  tags?: string[];
  target_audience?: string[];
  platforms?: ('twitter' | 'instagram' | 'tiktok' | 'facebook' | 'linkedin')[];
  scheduled_time?: string;
  viral_score?: number;
  engagement_prediction?: {
    likes: number;
    shares: number;
    comments: number;
    reach: number;
  };
  seo_keywords?: string[];
  content_warnings?: string[];
}

export interface Match {
  readonly id: string;
  readonly content_id: string;
  readonly influencer_user_id: string;
  readonly match_score: number;
  readonly status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  readonly match_details: string; // JSON string
  readonly created_at: string;
  readonly updated_at: string;
}

// Match details interface for type safety
export interface MatchDetails {
  algorithm_version: string;
  matching_factors: {
    content_relevance: number;
    audience_alignment: number;
    engagement_history: number;
    availability: number;
    cost_efficiency: number;
  };
  estimated_reach: number;
  estimated_cost: number;
  delivery_timeline: {
    content_review: string;
    publish_date: string;
    campaign_duration: number;
  };
  contract_terms?: {
    payment_amount: number;
    payment_schedule: string;
    deliverables: string[];
    revision_rounds: number;
  };
}

// Database service using Cloudflare D1
export class DatabaseService {
  private cfService: CloudflareService;

  constructor(cloudflareEnv?: CloudflareEnv) {
    if (cloudflareEnv) {
      this.cfService = new CloudflareService(cloudflareEnv);
    }
    console.warn('LOG: DB-INIT-2 - Database service initialized', {
      hasCloudflareEnv: !!cloudflareEnv,
      timestamp: new Date().toISOString()
    });
  }

  // Type-safe method to check if service is properly initialized
  private assertInitialized(): asserts this is { cfService: CloudflareService } {
    if (!this.cfService?.db) {
      throw new Error('Database service not properly initialized. Cloudflare D1 database is required.');
    }
  }

  // Initialize with Cloudflare environment (for API routes)
  initWithEnv(cloudflareEnv: CloudflareEnv): void {
    this.cfService = new CloudflareService(cloudflareEnv);
    console.log('LOG: DB-INIT-3 - Cloudflare environment initialized');
  }

  // User operations with enhanced type safety
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    // Validate input data
    if (!userData.email || !userData.username || !userData.passwordhash) {
      throw new Error('Missing required user data: email, username, and password_hash are required');
    }
    
    console.warn('LOG: DB-USER-1 - Creating new user:', userData.email);
    
    this.assertInitialized();
    
    try {
      const result = await this.cfService.db.fetchOne<User>(`
        INSERT INTO users (email, username, passwordhash, role, profiledata, aipreferencelevel, onboardingcompleted)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `, [
        userData.email,
        userData.username,
        userData.passwordhash,
        userData.role,
        userData.profiledata,
        userData.aipreferencelevel,
        userData.onboardingcompleted
      ]);

      if (!result) {
        throw new Error('Failed to create user - no result returned');
      }

      console.warn('LOG: DB-USER-2 - User created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('LOG: DB-USER-ERROR-1 - Failed to create user:', error);
      throw new Error(`Failed to create user: ${error}`);
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!email || typeof email !== 'string') {
      throw new Error('Valid email string is required');
    }
    
    console.warn('LOG: DB-USER-3 - Fetching user by email:', email);
    
    this.assertInitialized();
    
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
    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId string is required');
    }
    
    console.warn('LOG: DB-USER-4 - Updating user onboarding:', userId, completed);
    
    this.assertInitialized();
    
    try {
      await this.cfService.db.executeQuery(`
        UPDATE users SET onboardingcompleted = ? WHERE id = ?
      `, [completed ? 1 : 0, userId]);

      console.log('LOG: DB-USER-5 - Onboarding status updated successfully');
    } catch (error) {
      console.error('LOG: DB-USER-ERROR-3 - Failed to update onboarding:', error);
      throw new Error(`Failed to update onboarding: ${error}`);
    }
  }

  // Session management with KV
  async cacheUserSession(userId: string, sessionData: Record<string, unknown>, ttlSeconds: number = 86400): Promise<void> {
    console.warn('LOG: DB-SESSION-1 - Caching user session:', userId);
    
    if (!this.cfService?.kv) {
      console.warn('LOG: DB-SESSION-WARN-1 - KV not available, skipping session cache');
      return;
    }
    
    try {
      await this.cfService.kv.putJSON(`session:${userId}`, sessionData, {
        expirationTtl: ttlSeconds
      });
      console.warn('LOG: DB-SESSION-2 - User session cached successfully');
    } catch (error) {
      console.error('LOG: DB-SESSION-ERROR-1 - Failed to cache session:', error);
      // Don't throw - session caching is not critical
    }
  }

  async getUserSession(userId: string): Promise<Record<string, unknown> | null> {
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

  // Content operations with validation
  async createContent(contentData: Omit<Content, 'id' | 'created_at' | 'updated_at'>): Promise<Content> {
    // Validate required content data
    if (!contentData.user_id || !contentData.title || !contentData.body) {
      throw new Error('Missing required content data: userid, title, and body are required');
    }
    
    console.warn('LOG: DB-CONTENT-1 - Creating new content:', contentData.title);
    
    this.assertInitialized();
    
    try {
      const result = await this.cfService.db.fetchOne<Content>(`
        INSERT INTO content (userid, title, body, imageurl, status, type, generatedbyai, aimodelused, ethicscheckstatus, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `, [
        contentData.userid,
        contentData.title,
        contentData.body,
        contentData.imageurl,
        contentData.status,
        contentData.type,
        contentData.generatedbyai,
        contentData.aimodelused,
        contentData.ethicscheckstatus,
        contentData.metadata
      ]);

      if (!result) {
        throw new Error('Failed to create content - no result returned');
      }

      console.warn('LOG: DB-CONTENT-2 - Content created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('LOG: DB-CONTENT-ERROR-1 - Failed to create content:', error);
      throw new Error(`Failed to create content: ${error}`);
    }
  }

  async getContentByUserId(userId: string): Promise<Content[]> {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId string is required');
    }
    
    console.warn('LOG: DB-CONTENT-3 - Fetching content for user:', userId);
    
    this.assertInitialized();
    
    try {
      const results = await this.cfService.db.fetchAll<Content>(`
        SELECT * FROM content WHERE userid = ? ORDER BY created_at DESC
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