/**
 * Advanced AI Tools with Tier Selection and Model Switching
 * 
 * This module provides a comprehensive AI tools management system that supports:
 * - Multiple AI providers (Cloudflare, OpenAI, Stability AI, Hugging Face)
 * - Subscription-based tier system with usage limits
 * - Cost optimization and model selection
 * - Real-time usage tracking and limit enforcement
 * 
 * LOG: AI-TOOLS-INIT-1 - Initialize AI tools tier system
 */

/**
 * Represents an AI model configuration
 * Supports text generation, image generation, and video processing models
 */
export interface AIModel {
  id: string; // Unique identifier for the model
  name: string; // Human-readable name for display
  type: 'text' | 'image' | 'video'; // Type of content the model generates
  provider: 'cloudflare' | 'huggingface' | 'openai' | 'stability'; // AI service provider
  endpoint: string; // API endpoint or model identifier
  cost_multiplier: number; // Relative cost factor for usage calculations
  max_tokens?: number; // Maximum tokens for text models
  max_resolution?: string; // Maximum resolution for image models (e.g., "1024x1024")
  max_duration?: number; // Maximum duration in seconds for video models
}

/**
 * Represents a subscription tier with specific capabilities and limits
 * Each tier defines what models users can access and their usage limits
 */
export interface AITier {
  id: string; // Unique tier identifier (e.g., 'free', 'standard', 'premium')
  name: string; // Display name for the tier
  description: string; // Marketing description of tier benefits
  price_per_month: number; // Monthly subscription price in USD
  daily_limits: {
    text_tokens: number; // Daily limit for text generation tokens
    image_generations: number; // Daily limit for image generations
    video_seconds: number; // Daily limit for video processing seconds
  };
  available_models: string[]; // Array of model IDs accessible in this tier
  quality_level: number; // Overall quality score (1-10 scale) for model selection
  priority: 'low' | 'medium' | 'high'; // Processing priority for requests
}

/**
 * Tracks user's AI usage and subscription information
 * Usage data resets daily and enforces tier-based limits
 */
export interface UserUsage {
  user_id: string; // User's unique identifier
  tier_id: string; // Current subscription tier ID
  daily_usage: {
    text_tokens: number; // Tokens used today for text generation
    image_generations: number; // Images generated today
    video_seconds: number; // Video processing seconds used today
  };
  last_reset: string; // ISO date string of last usage reset (YYYY-MM-DD)
}

/**
 * Main AI Tools Manager class
 * 
 * This singleton class manages:
 * - AI model configurations and capabilities
 * - User subscription tiers and limits
 * - Usage tracking and limit enforcement
 * - Cost optimization and model selection
 * 
 * Usage:
 * ```typescript
 * import { aiToolsManager} from './ai-tools';
 * 
 * // Check if user can generate content
 * const canGenerate = aiToolsManager.canUserGenerate(userId, 'text', 1000);
 * 
 * // Get available models for user's tier
 * const models = aiToolsManager.getModelsForTier(user.tierId);
 * ```
 */
export class AIToolsManager {
  // In-memory storage for AI models configuration
  private models: Map<string, AIModel> = new Map();
  
  // In-memory storage for subscription tiers configuration
  private tiers: Map<string, AITier> = new Map();
  
  // In-memory storage for user usage tracking (in production, this would be database-backed)
  private userUsage: Map<string, UserUsage> = new Map();

  constructor() {
    console.log('LOG: AI-TOOLS-MANAGER-1 - Initializing AI tools manager');
    
    // Initialize all available AI models and subscription tiers
    this.initializeModels();
    this.initializeTiers();
  }

  private initializeModels(): void {
    console.log('LOG: AI-TOOLS-MODELS-1 - Loading AI models');
    
    const models: AIModel[] = [
      // Text Models
      {
        id: 'llama-3-8b',
        name: 'Llama 3 8B',
        type: 'text',
        provider: 'cloudflare',
        endpoint: '@cf/meta/llama-3-8b-instruct',
        cost_multiplier: 1.0,
        max_tokens: 4096
      },
      {
        id: 'mistral-7b',
        name: 'Mistral 7B',
        type: 'text',
        provider: 'cloudflare',
        endpoint: '@cf/mistral/mistral-7b-instruct-v0.1',
        cost_multiplier: 1.2,
        max_tokens: 8192
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        type: 'text',
        provider: 'openai',
        endpoint: 'gpt-4o-mini',
        cost_multiplier: 3.0,
        max_tokens: 16384
      },
      // Image Models
      {
        id: 'stable-diffusion-xl',
        name: 'Stable Diffusion XL',
        type: 'image',
        provider: 'cloudflare',
        endpoint: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
        cost_multiplier: 2.0,
        max_resolution: '1024x1024'
      },
      {
        id: 'stable-diffusion-3',
        name: 'Stable Diffusion 3',
        type: 'image',
        provider: 'stability',
        endpoint: 'stable-diffusion-3-medium',
        cost_multiplier: 4.0,
        max_resolution: '1536x1536'
      }
    ];

    models.forEach(model => {
      this.models.set(model.id, model);
    });

    console.log('LOG: AI-TOOLS-MODELS-2 - Loaded', models.length, 'AI models');
  }

  private initializeTiers(): void {
    console.log('LOG: AI-TOOLS-TIERS-1 - Loading AI tiers');
    
    const tiers: AITier[] = [
      {
        id: 'free',
        name: 'Free',
        description: 'Basic AI tools with open-source models',
        price_per_month: 0,
        daily_limits: {
          text_tokens: 10000,
          image_generations: 5,
          video_seconds: 0
        },
        available_models: ['llama-3-8b'],
        quality_level: 3,
        priority: 'low'
      },
      {
        id: 'standard',
        name: 'Standard',
        description: 'Enhanced AI with Mistral and Stable Diffusion',
        price_per_month: 19,
        daily_limits: {
          text_tokens: 100000,
          image_generations: 50,
          video_seconds: 60
        },
        available_models: ['llama-3-8b', 'mistral-7b', 'stable-diffusion-xl'],
        quality_level: 6,
        priority: 'medium'
      },
      {
        id: 'premium',
        name: 'Premium',
        description: 'All AI models including GPT-4 and advanced features',
        price_per_month: 49,
        daily_limits: {
          text_tokens: 500000,
          image_generations: 200,
          video_seconds: 300
        },
        available_models: ['llama-3-8b', 'mistral-7b', 'gpt-4o-mini', 'stable-diffusion-xl', 'stable-diffusion-3'],
        quality_level: 10,
        priority: 'high'
      }
    ];

    tiers.forEach(tier => {
      this.tiers.set(tier.id, tier);
    });

    console.log('LOG: AI-TOOLS-TIERS-2 - Loaded', tiers.length, 'AI tiers');
  }

  getTiers(): AITier[] {
    return Array.from(this.tiers.values());
  }

  getTier(tierId: string): AITier | null {
    return this.tiers.get(tierId)  ?? null;
  }

  getModelsForTier(tierId: string): AIModel[] {
    const tier = this.getTier(tierId);
    if (!tier) {
    return [];
  }

    return tier.available_models
      .map(modelId => this.models.get(modelId))
      .filter(model => model !== undefined) as AIModel[];
  }

  getModel(modelId: string): AIModel | null {
    return this.models.get(modelId)  ?? null;
  }

  /**
   * Checks if a user can generate content within their tier limits
   * 
   * This method:
   * 1. Retrieves user's current usage and tier information
   * 2. Compares requested amount against daily limits
   * 3. Returns true if user has sufficient quota remaining
   * 
   * @param userId - User's unique identifier
   * @param type - Type of content to generate ('text', 'image', or 'video')
   * @param amount - Amount of content to generate (tokens, count, or seconds)
   * @returns true if user can generate the requested amount, false otherwise
   */
  canUserGenerate(userId: string, type: 'text' | 'image' | 'video', amount: number): boolean {
    console.log('LOG: AI-TOOLS-CHECK-1 - Checking generation limits for user:', userId);
    
    // Get user's current usage data (creates default if doesn't exist)
    const usage = this.getUserUsage(userId);
    if (!usage) {
    return false;
  }

    // Get user's subscription tier configuration
    const tier = this.getTier(usage.tierid);
    if (!tier) {
    return false;
  }

    // Check if requested amount would exceed daily limits
    switch (type) {
      case 'text':
        return usage.daily_usage.text_tokens + amount <= tier.daily_limits.texttokens;
      case 'image':
        return usage.daily_usage.image_generations + amount <= tier.daily_limits.imagegenerations;
      case 'video':
        return usage.daily_usage.video_seconds + amount <= tier.daily_limits.videoseconds;
      default:
        return false;
    }
  }

  updateUsage(userId: string, type: 'text' | 'image' | 'video', amount: number): void {
    console.log('LOG: AI-TOOLS-USAGE-1 - Updating usage for user:', userId, type, amount);
    
    const usage = this.getUserUsage(userId);
    if (!usage) {return;}

    switch (type) {
      case 'text':
        usage.daily_usage.text_tokens += amount;
        break;
      case 'image':
        usage.daily_usage.image_generations += amount;
        break;
      case 'video':
        usage.daily_usage.video_seconds += amount;
        break;
    }

    this.userUsage.set(userId, usage);
    console.log('LOG: AI-TOOLS-USAGE-2 - Usage updated successfully');
  }

  /**
   * Retrieves user's usage data and handles daily reset logic
   * 
   * This private method:
   * 1. Gets user's usage from memory (or creates default for new users)
   * 2. Checks if daily reset is needed (new day)
   * 3. Resets usage counters if it's a new day
   * 4. Returns current usage data
   * 
   * @param userId - User's unique identifier
   * @returns UserUsage object or null if error
   */
  private getUserUsage(userId: string): UserUsage | null {
    let usage = this.userUsage.get(userId);
    
    // Create default usage record for new users (starts with free tier)
    if (!usage) {
      usage = {
        user_id: userId,
        tier_id: 'free', // All new users start with free tier
        daily_usage: {
          text_tokens: 0,
          image_generations: 0,
          video_seconds: 0
        },
        last_reset: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      };
      this.userUsage.set(userId, usage);
    }

    // Check if daily reset is needed (usage resets at midnight UTC)
    const today = new Date().toISOString().split('T')[0];
    if (usage.last_reset !== today) {
      // Reset all daily usage counters to zero
      usage.dailyusage = {
        text_tokens: 0,
        image_generations: 0,
        video_seconds: 0
      };
      usage.lastreset = today;
      this.userUsage.set(userId, usage); // Persist the reset
    }

    return usage;
  }

  setUserTier(userId: string, tierId: string): boolean {
    console.log('LOG: AI-TOOLS-TIER-1 - Setting user tier:', userId, tierId);
    
    const tier = this.getTier(tierId);
    if (!tier) {
      console.error('LOG: AI-TOOLS-TIER-ERROR-1 - Invalid tier ID:', tierId);
      return false;
    }

    const usage = this.getUserUsage(userId);
    if (usage) {
      usage.tierid = tierId;
      this.userUsage.set(userId, usage);
      console.log('LOG: AI-TOOLS-TIER-2 - User tier updated successfully');
      return true;
    }

    return false;
  }

  getUserTierInfo(userId: string): { tier: AITier; usage: UserUsage } | null {
    const usage = this.getUserUsage(userId);
    if (!usage) {
    return null;
  }

    const tier = this.getTier(usage.tierid);
    if (!tier) {
    return null;
  }

    return { tier, usage };
  }
}

/**
 * Singleton instance of AIToolsManager
 * 
 * This singleton ensures consistent AI tools management across the application.
 * Import and use this instance rather than creating new AIToolsManager instances.
 * 
 * Example usage:
 * ```typescript
 * import { aiToolsManager} from './ai-tools';
 * 
 * // Check user's tier and limits
 * const tierInfo = aiToolsManager.getUserTierInfo(userId);
 * 
 * // Validate generation request
 * if (aiToolsManager.canUserGenerate(userId, 'text', 1000)) {
 *   // Proceed with AI generation
 *   aiToolsManager.updateUsage(userId, 'text', 1000);
 * }
 * ```
 */
export const aiToolsManager = new AIToolsManager();