// Advanced AI Tools with Tier Selection and Model Switching
// LOG: AI-TOOLS-INIT-1 - Initialize AI tools tier system

export interface AIModel {
  id: string;
  name: string;
  type: 'text' | 'image' | 'video';
  provider: 'cloudflare' | 'huggingface' | 'openai' | 'stability';
  endpoint: string;
  cost_multiplier: number;
  max_tokens?: number;
  max_resolution?: string;
  max_duration?: number;
}

export interface AITier {
  id: string;
  name: string;
  description: string;
  price_per_month: number;
  daily_limits: {
    text_tokens: number;
    image_generations: number;
    video_seconds: number;
  };
  available_models: string[];
  quality_level: number; // 1-10 scale
  priority: 'low' | 'medium' | 'high';
}

export interface UserUsage {
  user_id: string;
  tier_id: string;
  daily_usage: {
    text_tokens: number;
    image_generations: number;
    video_seconds: number;
  };
  last_reset: string;
}

export class AIToolsManager {
  private models: Map<string, AIModel> = new Map();
  private tiers: Map<string, AITier> = new Map();
  private userUsage: Map<string, UserUsage> = new Map();

  constructor() {
    console.log('LOG: AI-TOOLS-MANAGER-1 - Initializing AI tools manager');
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
    return this.tiers.get(tierId) || null;
  }

  getModelsForTier(tierId: string): AIModel[] {
    const tier = this.getTier(tierId);
    if (!tier) return [];

    return tier.available_models
      .map(modelId => this.models.get(modelId))
      .filter(model => model !== undefined) as AIModel[];
  }

  getModel(modelId: string): AIModel | null {
    return this.models.get(modelId) || null;
  }

  canUserGenerate(userId: string, type: 'text' | 'image' | 'video', amount: number): boolean {
    console.log('LOG: AI-TOOLS-CHECK-1 - Checking generation limits for user:', userId);
    
    const usage = this.getUserUsage(userId);
    if (!usage) return false;

    const tier = this.getTier(usage.tier_id);
    if (!tier) return false;

    switch (type) {
      case 'text':
        return usage.daily_usage.text_tokens + amount <= tier.daily_limits.text_tokens;
      case 'image':
        return usage.daily_usage.image_generations + amount <= tier.daily_limits.image_generations;
      case 'video':
        return usage.daily_usage.video_seconds + amount <= tier.daily_limits.video_seconds;
      default:
        return false;
    }
  }

  updateUsage(userId: string, type: 'text' | 'image' | 'video', amount: number): void {
    console.log('LOG: AI-TOOLS-USAGE-1 - Updating usage for user:', userId, type, amount);
    
    const usage = this.getUserUsage(userId);
    if (!usage) return;

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

  private getUserUsage(userId: string): UserUsage | null {
    let usage = this.userUsage.get(userId);
    
    if (!usage) {
      // Create default usage for free tier
      usage = {
        user_id: userId,
        tier_id: 'free',
        daily_usage: {
          text_tokens: 0,
          image_generations: 0,
          video_seconds: 0
        },
        last_reset: new Date().toISOString().split('T')[0]
      };
      this.userUsage.set(userId, usage);
    }

    // Reset daily usage if it's a new day
    const today = new Date().toISOString().split('T')[0];
    if (usage.last_reset !== today) {
      usage.daily_usage = {
        text_tokens: 0,
        image_generations: 0,
        video_seconds: 0
      };
      usage.last_reset = today;
      this.userUsage.set(userId, usage);
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
      usage.tier_id = tierId;
      this.userUsage.set(userId, usage);
      console.log('LOG: AI-TOOLS-TIER-2 - User tier updated successfully');
      return true;
    }

    return false;
  }

  getUserTierInfo(userId: string): { tier: AITier; usage: UserUsage } | null {
    const usage = this.getUserUsage(userId);
    if (!usage) return null;

    const tier = this.getTier(usage.tier_id);
    if (!tier) return null;

    return { tier, usage };
  }
}

// Export singleton instance
export const aiToolsManager = new AIToolsManager();