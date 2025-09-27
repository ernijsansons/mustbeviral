/**
 * Content Service
 * Handles all content-related API operations
 */

import { BaseApiClient, type ApiResponse} from '../base/BaseApiClient';
import type { RetryConfig } from '../../retryClient';

// Content type definitions
export type ContentStatus = 'draft' | 'published' | 'pending_review' | 'archived';
export type ContentType = 'news_article' | 'social_post' | 'blog_post';
export type EthicsCheckStatus = 'passed' | 'failed' | 'pending';

export interface Content {
  readonly id: string;
  readonly user_id: string;
  readonly title: string;
  readonly body: string;
  readonly image_url?: string;
  readonly status: ContentStatus;
  readonly type: ContentType;
  readonly generated_by_ai: boolean;
  readonly ai_model_used?: string;
  readonly ethics_check_status: EthicsCheckStatus;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly created_at: string;
  readonly updated_at: string;
  readonly published_at?: string;
}

export interface CreateContentRequest {
  readonly title: string;
  readonly body: string;
  readonly type: ContentType;
  readonly image_url?: string;
  readonly status?: ContentStatus;
  readonly metadata?: Record<string, unknown>;
}

export interface UpdateContentRequest {
  readonly title?: string;
  readonly body?: string;
  readonly image_url?: string;
  readonly status?: ContentStatus;
  readonly metadata?: Record<string, unknown>;
}

export interface ContentFilter {
  readonly status?: ContentStatus;
  readonly type?: ContentType;
  readonly user_id?: string;
  readonly generated_by_ai?: boolean;
  readonly ethics_check_status?: EthicsCheckStatus;
  readonly created_after?: string;
  readonly created_before?: string;
}

export interface ContentPagination {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

export interface PaginatedContentResponse {
  readonly items: readonly Content[];
  readonly pagination: ContentPagination;
}

export interface ContentBulkOperation {
  readonly contentIds: readonly string[];
  readonly operation: 'publish' | 'archive' | 'delete';
}

export interface ContentBulkResult {
  readonly successful: readonly string[];
  readonly failed: ReadonlyArray<{
    readonly id: string;
    readonly error: string;
  }>;
}

/**
 * Service for managing content operations
 */
export class ContentService extends BaseApiClient {
  private contentCache = new Map<string, Content>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor(baseUrl?: string, retryConfig?: Partial<RetryConfig>) {
    super(baseUrl, retryConfig);
  }

  /**
   * Get all content with optional filtering
   */
  async getContent(
    filter?: ContentFilter,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<PaginatedContentResponse>> {
    const params = new URLSearchParams();
    
    // Add filter parameters
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    
    // Add pagination
    params.append('page', String(page));
    params.append('limit', String(limit));

    const queryString = params.toString();
    const endpoint = queryString ? `/api/content?${queryString}` : '/api/content';

    return this.request<PaginatedContentResponse>(endpoint);
  }

  /**
   * Get single content by ID
   */
  async getContentById(id: string, useCache = true): Promise<ApiResponse<Content>> {
    // Check cache first
    if (useCache && this.contentCache.has(id)) {
      const cached = this.contentCache.get(id)!;
      return {
        success: true,
        data: cached,
        message: 'Content retrieved from cache',
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    }

    const response = await this.request<Content>(`/api/content/${id}`);
    
    // Cache successful response
    if (response.success && response.data) {
      this.cacheContent(response.data);
    }

    return response;
  }

  /**
   * Create new content
   */
  async createContent(content: CreateContentRequest): Promise<ApiResponse<Content>> {
    const response = await this.request<Content>('/api/content', {
      method: 'POST',
      body: JSON.stringify(content),
    });

    // Cache new content
    if (response.success && response.data) {
      this.cacheContent(response.data);
    }

    return response;
  }

  /**
   * Update existing content
   */
  async updateContent(
    id: string,
    updates: UpdateContentRequest
  ): Promise<ApiResponse<Content>> {
    const response = await this.request<Content>(`/api/content/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    // Update cache
    if (response.success && response.data) {
      this.cacheContent(response.data);
    }

    return response;
  }

  /**
   * Delete content
   */
  async deleteContent(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await this.request<{ message: string }>(`/api/content/${id}`, {
      method: 'DELETE',
    });

    // Remove from cache
    if (response.success) {
      this.contentCache.delete(id);
    }

    return response;
  }

  /**
   * Publish content
   */
  async publishContent(id: string): Promise<ApiResponse<Content>> {
    const response = await this.request<Content>(`/api/content/${id}/publish`, {
      method: 'POST',
    });

    // Update cache
    if (response.success && response.data) {
      this.cacheContent(response.data);
    }

    return response;
  }

  /**
   * Archive content
   */
  async archiveContent(id: string): Promise<ApiResponse<Content>> {
    const response = await this.request<Content>(`/api/content/${id}/archive`, {
      method: 'POST',
    });

    // Update cache
    if (response.success && response.data) {
      this.cacheContent(response.data);
    }

    return response;
  }

  /**
   * Duplicate content
   */
  async duplicateContent(id: string): Promise<ApiResponse<Content>> {
    const response = await this.request<Content>(`/api/content/${id}/duplicate`, {
      method: 'POST',
    });

    // Cache new content
    if (response.success && response.data) {
      this.cacheContent(response.data);
    }

    return response;
  }

  /**
   * Perform bulk operations on content
   */
  async bulkOperation(
    operation: ContentBulkOperation
  ): Promise<ApiResponse<ContentBulkResult>> {
    const response = await this.request<ContentBulkResult>('/api/content/bulk', {
      method: 'POST',
      body: JSON.stringify(operation),
    });

    // Clear cache for affected content
    if (response.success && response.data) {
      operation.contentIds.forEach(id => this.contentCache.delete(id));
    }

    return response;
  }

  /**
   * Get content versions/history
   */
  async getContentHistory(
    id: string
  ): Promise<ApiResponse<ReadonlyArray<Content>>> {
    return this.request<ReadonlyArray<Content>>(`/api/content/${id}/history`);
  }

  /**
   * Restore content version
   */
  async restoreContentVersion(
    id: string,
    versionId: string
  ): Promise<ApiResponse<Content>> {
    const response = await this.request<Content>(`/api/content/${id}/restore/${versionId}`, {
      method: 'POST',
    });

    // Update cache
    if (response.success && response.data) {
      this.cacheContent(response.data);
    }

    return response;
  }

  /**
   * Search content
   */
  async searchContent(
    query: string,
    options?: {
      readonly type?: ContentType;
      readonly status?: ContentStatus;
      readonly limit?: number;
    }
  ): Promise<ApiResponse<readonly Content[]>> {
    const params = new URLSearchParams({ q: query });
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }

    return this.request<readonly Content[]>(`/api/content/search?${params.toString()}`);
  }

  /**
   * Get content statistics
   */
  async getContentStats(
    userId?: string
  ): Promise<ApiResponse<{
    readonly total: number;
    readonly byStatus: Record<ContentStatus, number>;
    readonly byType: Record<ContentType, number>;
    readonly recentlyPublished: number;
    readonly aiGenerated: number;
  }>> {
    const endpoint = userId 
      ? `/api/content/stats?userid=${userId}`
      : '/api/content/stats';
    
    return this.request(endpoint);
  }

  /**
   * Cache content with expiry
   */
  private cacheContent(content: Content): void {
    this.contentCache.set(content.id, content);
    
    // Auto-expire cache entry
    setTimeout_(() => {
      this.contentCache.delete(content.id);
    }, this.cacheExpiry);
  }

  /**
   * Clear content cache
   */
  clearCache(): void {
    this.contentCache.clear();
  }

  /**
   * Set cache expiry time
   */
  setCacheExpiry(milliseconds: number): void {
    this.cacheExpiry = milliseconds;
  }
}