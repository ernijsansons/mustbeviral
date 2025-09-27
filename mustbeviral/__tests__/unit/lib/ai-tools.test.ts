// Comprehensive unit tests for AIToolsManager
// Tests AI model management, tier system, usage tracking, and limits

import { 
  AIToolsManager, 
  AIModel, 
  AITier, 
  UserUsage 
} from '../../../src/lib/ai-tools';

describe('AIToolsManager', () => {
  let aiToolsManager: AIToolsManager;
  let mockDate: jest.SpyInstance;

  beforeEach(() => {
    aiToolsManager = new AIToolsManager();
    
    // Mock Date to control time-based tests
    const OriginalDate = Date;
    mockDate = jest.spyOn(global, 'Date').mockImplementation(
      (...args: any[]) => {
        if (args.length === 0) {
          return new OriginalDate('2025-01-25T12:00:00.000Z') as any;
        }
        return new OriginalDate(...args) as any;
      }
    );
    
    // Suppress console.log in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockDate.mockRestore();
  });

  describe('constructor and initialization', () => {
    it('should initialize with models and tiers loaded', () => {
      expect(aiToolsManager).toBeInstanceOf(AIToolsManager);
      
      const tiers = aiToolsManager.getTiers();
      expect(tiers.length).toBeGreaterThan(0);
    });

    it('should load expected default tiers', () => {
      const tiers = aiToolsManager.getTiers();
      const tierIds = tiers.map(t => t.id);
      
      expect(tierIds).toContain('free');
      expect(tierIds).toContain('standard');
      expect(tierIds).toContain('premium');
    });
  });

  describe('getTiers', () => {
    it('should return all available tiers', () => {
      const tiers = aiToolsManager.getTiers();
      
      expect(Array.isArray(tiers)).toBe(true);
      expect(tiers.length).toBeGreaterThanOrEqual(3);
      
      tiers.forEach(tier => {
        expect(tier).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          price_per_month: expect.any(Number),
          daily_limits: expect.objectContaining({
            text_tokens: expect.any(Number),
            image_generations: expect.any(Number),
            video_seconds: expect.any(Number),
          }),
          available_models: expect.any(Array),
          quality_level: expect.any(Number),
          priority: expect.stringMatching(/^(low|medium|high)$/),
        });
      });
    });

    it('should validate tier structure', () => {
      const tiers = aiToolsManager.getTiers();
      const freeTier = tiers.find(t => t.id === 'free')!;
      const premiumTier = tiers.find(t => t.id === 'premium')!;
      
      expect(freeTier.price_per_month).toBe(0);
      expect(premiumTier.price_per_month).toBeGreaterThan(freeTier.price_per_month);
      expect(premiumTier.quality_level).toBeGreaterThan(freeTier.quality_level);
      expect(premiumTier.available_models.length).toBeGreaterThan(freeTier.available_models.length);
    });
  });

  describe('getTier', () => {
    it('should return specific tier by ID', () => {
      const freeTier = aiToolsManager.getTier('free');
      
      expect(freeTier).toMatchObject({
        id: 'free',
        name: 'Free',
        price_per_month: 0,
      });
    });

    it('should return null for non-existent tier', () => {
      const tier = aiToolsManager.getTier('non-existent-tier');
      expect(tier).toBeNull();
    });

    it('should return null for empty string', () => {
      const tier = aiToolsManager.getTier('');
      expect(tier).toBeNull();
    });
  });

  describe('getModelsForTier', () => {
    it('should return models for free tier', () => {
      const models = aiToolsManager.getModelsForTier('free');
      
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      models.forEach(model => {
        expect(model).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          type: expect.stringMatching(/^(text|image|video)$/),
          provider: expect.stringMatching(/^(cloudflare|huggingface|openai|stability)$/),
          endpoint: expect.any(String),
          cost_multiplier: expect.any(Number),
        });
      });
    });

    it('should return more models for premium tier than free tier', () => {
      const freeModels = aiToolsManager.getModelsForTier('free');
      const premiumModels = aiToolsManager.getModelsForTier('premium');
      
      expect(premiumModels.length).toBeGreaterThan(freeModels.length);
    });

    it('should return empty array for non-existent tier', () => {
      const models = aiToolsManager.getModelsForTier('non-existent');
      expect(models).toEqual([]);
    });

    it('should validate model properties', () => {
      const models = aiToolsManager.getModelsForTier('premium');
      
      models.forEach(model => {
        expect(model.cost_multiplier).toBeGreaterThan(0);
        if (model.type === 'text' && model.max_tokens) {
          expect(model.max_tokens).toBeGreaterThan(0);
        }
        if (model.type === 'image' && model.max_resolution) {
          expect(model.max_resolution).toMatch(/^\d+x\d+$/);
        }
        if (model.type === 'video' && model.max_duration) {
          expect(model.max_duration).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('getModel', () => {
    it('should return specific model by ID', () => {
      const model = aiToolsManager.getModel('llama-3-8b');
      
      expect(model).toMatchObject({
        id: 'llama-3-8b',
        name: 'Llama 3 8B',
        type: 'text',
        provider: 'cloudflare',
      });
    });

    it('should return null for non-existent model', () => {
      const model = aiToolsManager.getModel('non-existent-model');
      expect(model).toBeNull();
    });
  });

  describe('canUserGenerate', () => {
    it('should allow generation within limits for new user', () => {
      const userId = 'new-user-123';
      
      // New user should start with free tier
      const canGenerate = aiToolsManager.canUserGenerate(userId, 'text', 1000);
      expect(canGenerate).toBe(true);
    });

    it('should deny generation when exceeding text token limit', () => {
      const userId = 'test-user-1';
      const freeTier = aiToolsManager.getTier('free')!;
      
      // Exceed the daily text token limit
      const canGenerate = aiToolsManager.canUserGenerate(
        userId, 
        'text', 
        freeTier.daily_limits.text_tokens + 1
      );
      
      expect(canGenerate).toBe(false);
    });

    it('should deny generation when exceeding image limit', () => {
      const userId = 'test-user-2';
      const freeTier = aiToolsManager.getTier('free')!;
      
      const canGenerate = aiToolsManager.canUserGenerate(
        userId, 
        'image', 
        freeTier.daily_limits.image_generations + 1
      );
      
      expect(canGenerate).toBe(false);
    });

    it('should deny generation when exceeding video limit', () => {
      const userId = 'test-user-3';
      const freeTier = aiToolsManager.getTier('free')!;
      
      const canGenerate = aiToolsManager.canUserGenerate(
        userId, 
        'video', 
        freeTier.daily_limits.video_seconds + 1
      );
      
      expect(canGenerate).toBe(false);
    });

    it('should account for existing usage when checking limits', () => {
      const userId = 'test-user-4';
      
      // Use some tokens first
      aiToolsManager.updateUsage(userId, 'text', 5000);
      
      // Should still be able to use remaining tokens
      const canGenerateMore = aiToolsManager.canUserGenerate(userId, 'text', 5000);
      expect(canGenerateMore).toBe(true);
      
      // But not more than the limit
      const canExceedLimit = aiToolsManager.canUserGenerate(userId, 'text', 5001);
      expect(canExceedLimit).toBe(false);
    });

    it('should handle invalid content type', () => {
      const userId = 'test-user-5';
      
      const canGenerate = aiToolsManager.canUserGenerate(userId, 'invalid' as any, 100);
      expect(canGenerate).toBe(false);
    });

    it('should allow higher limits for premium users', () => {
      const userId = 'premium-user';
      
      // Upgrade user to premium
      aiToolsManager.setUserTier(userId, 'premium');
      
      const premiumTier = aiToolsManager.getTier('premium')!;
      const freeTier = aiToolsManager.getTier('free')!;
      
      // Should be able to generate more than free tier limit
      const canGenerate = aiToolsManager.canUserGenerate(
        userId, 
        'text', 
        freeTier.daily_limits.text_tokens + 1000
      );
      
      expect(canGenerate).toBe(true);
      expect(premiumTier.daily_limits.text_tokens).toBeGreaterThan(freeTier.daily_limits.text_tokens);
    });
  });

  describe('updateUsage', () => {
    it('should update text usage correctly', () => {
      const userId = 'test-user-6';
      
      aiToolsManager.updateUsage(userId, 'text', 1000);
      
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.usage.daily_usage.text_tokens).toBe(1000);
    });

    it('should update image usage correctly', () => {
      const userId = 'test-user-7';
      
      aiToolsManager.updateUsage(userId, 'image', 3);
      
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.usage.daily_usage.image_generations).toBe(3);
    });

    it('should update video usage correctly', () => {
      const userId = 'test-user-8';
      
      aiToolsManager.updateUsage(userId, 'video', 30);
      
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.usage.daily_usage.video_seconds).toBe(30);
    });

    it('should accumulate usage over multiple updates', () => {
      const userId = 'test-user-9';
      
      aiToolsManager.updateUsage(userId, 'text', 1000);
      aiToolsManager.updateUsage(userId, 'text', 500);
      aiToolsManager.updateUsage(userId, 'text', 300);
      
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.usage.daily_usage.text_tokens).toBe(1800);
    });

    it('should handle zero usage updates', () => {
      const userId = 'test-user-10';
      
      aiToolsManager.updateUsage(userId, 'text', 0);
      
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.usage.daily_usage.text_tokens).toBe(0);
    });
  });

  describe('daily usage reset', () => {
    it('should reset usage on new day', () => {
      const userId = 'test-user-11';
      
      // Use some tokens
      aiToolsManager.updateUsage(userId, 'text', 5000);
      let tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.usage.daily_usage.text_tokens).toBe(5000);
      
      // Simulate next day
      mockDate.mockRestore();
      mockDate = jest.spyOn(global, 'Date').mockImplementation(
        () => new Date('2025-01-26T12:00:00.000Z') as any
      );
      
      // Check if usage resets when getting user info
      tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.usage.daily_usage.text_tokens).toBe(0);
      expect(tierInfo?.usage.last_reset).toBe('2025-01-26');
    });

    it('should not reset usage on same day', () => {
      const userId = 'test-user-12';
      
      aiToolsManager.updateUsage(userId, 'text', 5000);
      
      // Call getUserTierInfo multiple times on same day
      let tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.usage.daily_usage.text_tokens).toBe(5000);
      
      tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.usage.daily_usage.text_tokens).toBe(5000);
    });

    it('should reset all usage types on new day', () => {
      const userId = 'test-user-13';
      
      // Use various types of quota
      aiToolsManager.updateUsage(userId, 'text', 1000);
      aiToolsManager.updateUsage(userId, 'image', 3);
      aiToolsManager.updateUsage(userId, 'video', 30);
      
      // Simulate next day
      mockDate.mockRestore();
      mockDate = jest.spyOn(global, 'Date').mockImplementation(
        () => new Date('2025-01-26T12:00:00.000Z') as any
      );
      
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.usage.daily_usage.text_tokens).toBe(0);
      expect(tierInfo?.usage.daily_usage.image_generations).toBe(0);
      expect(tierInfo?.usage.daily_usage.video_seconds).toBe(0);
    });
  });

  describe('setUserTier', () => {
    it('should upgrade user to standard tier', () => {
      const userId = 'test-user-14';
      
      const success = aiToolsManager.setUserTier(userId, 'standard');
      expect(success).toBe(true);
      
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.tier.id).toBe('standard');
      expect(tierInfo?.tier.name).toBe('Standard');
    });

    it('should upgrade user to premium tier', () => {
      const userId = 'test-user-15';
      
      const success = aiToolsManager.setUserTier(userId, 'premium');
      expect(success).toBe(true);
      
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.tier.id).toBe('premium');
      expect(tierInfo?.tier.price_per_month).toBe(49);
    });

    it('should fail to set invalid tier', () => {
      const userId = 'test-user-16';
      
      const success = aiToolsManager.setUserTier(userId, 'invalid-tier');
      expect(success).toBe(false);
      
      // Should still have default free tier
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.tier.id).toBe('free');
    });

    it('should preserve usage when changing tiers', () => {
      const userId = 'test-user-17';
      
      // Use some quota as free user
      aiToolsManager.updateUsage(userId, 'text', 2000);
      
      // Upgrade to premium
      aiToolsManager.setUserTier(userId, 'premium');
      
      // Usage should be preserved
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.usage.daily_usage.text_tokens).toBe(2000);
      expect(tierInfo?.tier.id).toBe('premium');
    });

    it('should allow downgrading tiers', () => {
      const userId = 'test-user-18';
      
      // Start with premium
      aiToolsManager.setUserTier(userId, 'premium');
      
      // Downgrade to free
      const success = aiToolsManager.setUserTier(userId, 'free');
      expect(success).toBe(true);
      
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.tier.id).toBe('free');
    });
  });

  describe('getUserTierInfo', () => {
    it('should return tier and usage info for new user', () => {
      const userId = 'new-user-test';
      
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      
      expect(tierInfo).toMatchObject({
        tier: expect.objectContaining({
          id: 'free',
          name: 'Free',
        }),
        usage: expect.objectContaining({
          user_id: userId,
          tier_id: 'free',
          daily_usage: {
            text_tokens: 0,
            image_generations: 0,
            video_seconds: 0,
          },
        }),
      });
      
      expect(tierInfo?.usage.last_reset).toBe('2025-01-25');
    });

    it('should return updated info after usage', () => {
      const userId = 'test-user-19';
      
      aiToolsManager.updateUsage(userId, 'text', 1500);
      aiToolsManager.updateUsage(userId, 'image', 2);
      
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      
      expect(tierInfo?.usage.daily_usage.text_tokens).toBe(1500);
      expect(tierInfo?.usage.daily_usage.image_generations).toBe(2);
      expect(tierInfo?.usage.daily_usage.video_seconds).toBe(0);
    });

    it('should return null for invalid scenarios', () => {
      // This case is actually hard to trigger since getUserUsage creates
      // default entries, but we can test the null check
      const userId = 'test-user-20';
      
      // First create user, then set invalid tier directly
      aiToolsManager.getUserTierInfo(userId); // Creates user
      const usage = (aiToolsManager as any).getUserUsage(userId);
      usage.tier_id = 'invalid-tier';
      (aiToolsManager as any).userUsage.set(userId, usage);
      
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo).toBeNull();
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle concurrent usage updates', () => {
      const userId = 'concurrent-user';
      
      // Simulate concurrent updates
      const promises = [
        Promise.resolve(aiToolsManager.updateUsage(userId, 'text', 100)),
        Promise.resolve(aiToolsManager.updateUsage(userId, 'text', 200)),
        Promise.resolve(aiToolsManager.updateUsage(userId, 'text', 300)),
      ];
      
      Promise.all(promises).then(() => {
        const tierInfo = aiToolsManager.getUserTierInfo(userId);
        expect(tierInfo?.usage.daily_usage.text_tokens).toBe(600);
      });
    });

    it('should handle negative usage amounts gracefully', () => {
      const userId = 'negative-user';
      
      aiToolsManager.updateUsage(userId, 'text', 1000);
      aiToolsManager.updateUsage(userId, 'text', -500); // Negative amount
      
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.usage.daily_usage.text_tokens).toBe(500); // Should still work
    });

    it('should handle very large usage amounts', () => {
      const userId = 'large-usage-user';
      
      const largeAmount = 999999999;
      aiToolsManager.updateUsage(userId, 'text', largeAmount);
      
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.usage.daily_usage.text_tokens).toBe(largeAmount);
    });

    it('should handle empty user ID', () => {
      const canGenerate = aiToolsManager.canUserGenerate('', 'text', 100);
      expect(canGenerate).toBe(true); // Creates user with empty string ID
      
      const tierInfo = aiToolsManager.getUserTierInfo('');
      expect(tierInfo?.usage.user_id).toBe('');
    });

    it('should handle special characters in user ID', () => {
      const userId = 'user@#$%^&*()';
      
      aiToolsManager.updateUsage(userId, 'text', 100);
      const tierInfo = aiToolsManager.getUserTierInfo(userId);
      
      expect(tierInfo?.usage.user_id).toBe(userId);
      expect(tierInfo?.usage.daily_usage.text_tokens).toBe(100);
    });
  });

  describe('tier limits validation', () => {
    it('should validate free tier limits are restrictive', () => {
      const freeTier = aiToolsManager.getTier('free')!;
      
      expect(freeTier.daily_limits.text_tokens).toBeLessThan(50000);
      expect(freeTier.daily_limits.image_generations).toBeLessThan(20);
      expect(freeTier.daily_limits.video_seconds).toBeLessThanOrEqual(0);
    });

    it('should validate premium tier has highest limits', () => {
      const freeTier = aiToolsManager.getTier('free')!;
      const standardTier = aiToolsManager.getTier('standard')!;
      const premiumTier = aiToolsManager.getTier('premium')!;
      
      expect(premiumTier.daily_limits.text_tokens).toBeGreaterThan(standardTier.daily_limits.text_tokens);
      expect(standardTier.daily_limits.text_tokens).toBeGreaterThan(freeTier.daily_limits.text_tokens);
      
      expect(premiumTier.daily_limits.image_generations).toBeGreaterThan(standardTier.daily_limits.image_generations);
      expect(standardTier.daily_limits.image_generations).toBeGreaterThan(freeTier.daily_limits.image_generations);
      
      expect(premiumTier.daily_limits.video_seconds).toBeGreaterThan(standardTier.daily_limits.video_seconds);
      expect(standardTier.daily_limits.video_seconds).toBeGreaterThanOrEqual(freeTier.daily_limits.video_seconds);
    });

    it('should validate quality levels increase with tier', () => {
      const freeTier = aiToolsManager.getTier('free')!;
      const standardTier = aiToolsManager.getTier('standard')!;
      const premiumTier = aiToolsManager.getTier('premium')!;
      
      expect(premiumTier.quality_level).toBeGreaterThan(standardTier.quality_level);
      expect(standardTier.quality_level).toBeGreaterThan(freeTier.quality_level);
    });
  });

  describe('model availability by tier', () => {
    it('should have fewer models available in free tier', () => {
      const freeModels = aiToolsManager.getModelsForTier('free');
      const premiumModels = aiToolsManager.getModelsForTier('premium');
      
      expect(freeModels.length).toBeLessThan(premiumModels.length);
      
      // Free tier should primarily have open-source models
      const freeModelIds = freeModels.map(m => m.id);
      expect(freeModelIds).toContain('llama-3-8b');
    });

    it('should have premium models only in higher tiers', () => {
      const freeModels = aiToolsManager.getModelsForTier('free');
      const premiumModels = aiToolsManager.getModelsForTier('premium');
      
      const freeModelIds = freeModels.map(m => m.id);
      const premiumModelIds = premiumModels.map(m => m.id);
      
      // Premium should have GPT models
      expect(premiumModelIds).toContain('gpt-4o-mini');
      expect(freeModelIds).not.toContain('gpt-4o-mini');
    });

    it('should validate model cost multipliers are reasonable', () => {
      const allModels = aiToolsManager.getModelsForTier('premium');
      
      allModels.forEach(model => {
        expect(model.cost_multiplier).toBeGreaterThan(0);
        expect(model.cost_multiplier).toBeLessThan(100); // Reasonable upper bound
        
        // Premium models should generally cost more
        if (model.provider === 'openai') {
          expect(model.cost_multiplier).toBeGreaterThan(1);
        }
      });
    });
  });

  describe('type safety and interfaces', () => {
    it('should validate AIModel interface', () => {
      const model: AIModel = {
        id: 'test-model',
        name: 'Test Model',
        type: 'text',
        provider: 'cloudflare',
        endpoint: '@cf/test/model',
        cost_multiplier: 1.5,
        max_tokens: 4096,
      };

      expect(model.type).toBe('text');
      expect(model.cost_multiplier).toBe(1.5);
      expect(model.max_tokens).toBe(4096);
    });

    it('should validate AITier interface', () => {
      const tier: AITier = {
        id: 'test-tier',
        name: 'Test Tier',
        description: 'A test tier',
        price_per_month: 25,
        daily_limits: {
          text_tokens: 50000,
          image_generations: 25,
          video_seconds: 120,
        },
        available_models: ['model1', 'model2'],
        quality_level: 7,
        priority: 'medium',
      };

      expect(tier.priority).toBe('medium');
      expect(tier.daily_limits.text_tokens).toBe(50000);
      expect(tier.available_models).toHaveLength(2);
    });

    it('should validate UserUsage interface', () => {
      const usage: UserUsage = {
        user_id: 'test-user',
        tier_id: 'standard',
        daily_usage: {
          text_tokens: 5000,
          image_generations: 10,
          video_seconds: 60,
        },
        last_reset: '2025-01-25',
      };

      expect(usage.tier_id).toBe('standard');
      expect(usage.daily_usage.text_tokens).toBe(5000);
      expect(usage.last_reset).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('singleton export', () => {
    it('should export a singleton AI tools manager', () => {
      const { aiToolsManager: exportedManager } = require('../../../src/lib/ai-tools');
      expect(exportedManager).toBeInstanceOf(AIToolsManager);
    });
  });

  describe('real-world usage scenarios', () => {
    it('should handle typical user journey from free to premium', () => {
      const userId = 'journey-user';
      
      // Start as free user
      let tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.tier.id).toBe('free');
      
      // Use some free quota
      aiToolsManager.updateUsage(userId, 'text', 5000);
      expect(aiToolsManager.canUserGenerate(userId, 'text', 5000)).toBe(true);
      expect(aiToolsManager.canUserGenerate(userId, 'text', 5001)).toBe(false);
      
      // Upgrade to premium
      aiToolsManager.setUserTier(userId, 'premium');
      
      // Should now have much higher limits
      expect(aiToolsManager.canUserGenerate(userId, 'text', 100000)).toBe(true);
      
      tierInfo = aiToolsManager.getUserTierInfo(userId);
      expect(tierInfo?.tier.id).toBe('premium');
      expect(tierInfo?.usage.daily_usage.text_tokens).toBe(5000); // Preserved usage
    });

    it('should handle user hitting limits and daily reset', () => {
      const userId = 'limit-test-user';
      
      const freeTier = aiToolsManager.getTier('free')!;
      
      // Use up most of the daily limit
      aiToolsManager.updateUsage(userId, 'text', freeTier.daily_limits.text_tokens - 100);
      
      // Should be able to use remaining 100 tokens
      expect(aiToolsManager.canUserGenerate(userId, 'text', 100)).toBe(true);
      expect(aiToolsManager.canUserGenerate(userId, 'text', 101)).toBe(false);
      
      // Simulate next day reset
      mockDate.mockRestore();
      mockDate = jest.spyOn(global, 'Date').mockImplementation(
        () => new Date('2025-01-26T12:00:00.000Z') as any
      );
      
      // Should have full quota again
      expect(aiToolsManager.canUserGenerate(userId, 'text', freeTier.daily_limits.text_tokens)).toBe(true);
    });
  });
});