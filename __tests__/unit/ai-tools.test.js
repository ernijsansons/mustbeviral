// Unit tests for AI tools tier system
// LOG: TEST-AI-TOOLS-1 - AI tools unit tests

const { AIToolsManager } = require('../../src/lib/ai-tools');

describe('AIToolsManager', () => {
  let aiToolsManager;

  beforeEach(() => {
    console.log('LOG: TEST-AI-TOOLS-SETUP-1 - Setting up AI tools manager test');
    aiToolsManager = new AIToolsManager();
  });

  describe('Initialization', () => {
    test('should initialize with default tiers and models', () => {
      console.log('LOG: TEST-AI-TOOLS-INIT-1 - Testing initialization');
      
      const tiers = aiToolsManager.getTiers();
      expect(tiers).toHaveLength(3);
      expect(tiers.map(t => t.id)).toEqual(['free', 'standard', 'premium']);
    });

    test('should load models for each tier', () => {
      console.log('LOG: TEST-AI-TOOLS-INIT-2 - Testing model loading');
      
      const freeModels = aiToolsManager.getModelsForTier('free');
      const standardModels = aiToolsManager.getModelsForTier('standard');
      const premiumModels = aiToolsManager.getModelsForTier('premium');
      
      expect(freeModels).toHaveLength(1);
      expect(standardModels).toHaveLength(3);
      expect(premiumModels).toHaveLength(5);
    });
  });

  describe('Tier Management', () => {
    test('should get tier by ID', () => {
      console.log('LOG: TEST-AI-TOOLS-TIER-1 - Testing get tier by ID');
      
      const freeTier = aiToolsManager.getTier('free');
      expect(freeTier).toBeDefined();
      expect(freeTier.name).toBe('Free');
      expect(freeTier.price_per_month).toBe(0);
    });

    test('should return null for invalid tier ID', () => {
      console.log('LOG: TEST-AI-TOOLS-TIER-2 - Testing invalid tier ID');
      
      const invalidTier = aiToolsManager.getTier('invalid');
      expect(invalidTier).toBeNull();
    });

    test('should set user tier successfully', () => {
      console.log('LOG: TEST-AI-TOOLS-TIER-3 - Testing set user tier');
      
      const success = aiToolsManager.setUserTier('user1', 'standard');
      expect(success).toBe(true);
      
      const userInfo = aiToolsManager.getUserTierInfo('user1');
      expect(userInfo.tier.id).toBe('standard');
    });

    test('should fail to set invalid tier', () => {
      console.log('LOG: TEST-AI-TOOLS-TIER-4 - Testing invalid tier setting');
      
      const success = aiToolsManager.setUserTier('user1', 'invalid');
      expect(success).toBe(false);
    });
  });

  describe('Model Management', () => {
    test('should get model by ID', () => {
      console.log('LOG: TEST-AI-TOOLS-MODEL-1 - Testing get model by ID');
      
      const llamaModel = aiToolsManager.getModel('llama-3-8b');
      expect(llamaModel).toBeDefined();
      expect(llamaModel.name).toBe('Llama 3 8B');
      expect(llamaModel.type).toBe('text');
    });

    test('should return null for invalid model ID', () => {
      console.log('LOG: TEST-AI-TOOLS-MODEL-2 - Testing invalid model ID');
      
      const invalidModel = aiToolsManager.getModel('invalid');
      expect(invalidModel).toBeNull();
    });

    test('should get models for tier correctly', () => {
      console.log('LOG: TEST-AI-TOOLS-MODEL-3 - Testing get models for tier');
      
      const standardModels = aiToolsManager.getModelsForTier('standard');
      const modelIds = standardModels.map(m => m.id);
      
      expect(modelIds).toContain('llama-3-8b');
      expect(modelIds).toContain('mistral-7b');
      expect(modelIds).toContain('stable-diffusion-xl');
      expect(modelIds).not.toContain('gpt-4o-mini');
    });
  });

  describe('Usage Tracking', () => {
    test('should track text token usage', () => {
      console.log('LOG: TEST-AI-TOOLS-USAGE-1 - Testing text usage tracking');
      
      aiToolsManager.setUserTier('user1', 'free');
      
      const canGenerate = aiToolsManager.canUserGenerate('user1', 'text', 5000);
      expect(canGenerate).toBe(true);
      
      aiToolsManager.updateUsage('user1', 'text', 5000);
      
      const userInfo = aiToolsManager.getUserTierInfo('user1');
      expect(userInfo.usage.daily_usage.text_tokens).toBe(5000);
    });

    test('should prevent generation when limit exceeded', () => {
      console.log('LOG: TEST-AI-TOOLS-USAGE-2 - Testing usage limit enforcement');
      
      aiToolsManager.setUserTier('user1', 'free');
      
      // Free tier has 10,000 token limit
      const canGenerateWithinLimit = aiToolsManager.canUserGenerate('user1', 'text', 5000);
      expect(canGenerateWithinLimit).toBe(true);
      
      const canGenerateOverLimit = aiToolsManager.canUserGenerate('user1', 'text', 15000);
      expect(canGenerateOverLimit).toBe(false);
    });

    test('should track image generation usage', () => {
      console.log('LOG: TEST-AI-TOOLS-USAGE-3 - Testing image usage tracking');
      
      aiToolsManager.setUserTier('user1', 'standard');
      
      const canGenerate = aiToolsManager.canUserGenerate('user1', 'image', 10);
      expect(canGenerate).toBe(true);
      
      aiToolsManager.updateUsage('user1', 'image', 10);
      
      const userInfo = aiToolsManager.getUserTierInfo('user1');
      expect(userInfo.usage.daily_usage.image_generations).toBe(10);
    });

    test('should reset daily usage on new day', () => {
      console.log('LOG: TEST-AI-TOOLS-USAGE-4 - Testing daily usage reset');
      
      aiToolsManager.setUserTier('user1', 'free');
      aiToolsManager.updateUsage('user1', 'text', 5000);
      
      // Simulate new day by manually setting last_reset to yesterday
      const userInfo = aiToolsManager.getUserTierInfo('user1');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      userInfo.usage.last_reset = yesterday.toISOString().split('T')[0];
      
      // Getting user info again should reset usage
      const resetInfo = aiToolsManager.getUserTierInfo('user1');
      expect(resetInfo.usage.daily_usage.text_tokens).toBe(0);
    });
  });

  describe('Model Switching', () => {
    test('should switch between text models based on tier', () => {
      console.log('LOG: TEST-AI-TOOLS-SWITCH-1 - Testing text model switching');
      
      // Free tier - only Llama 3 8B
      aiToolsManager.setUserTier('user1', 'free');
      const freeModels = aiToolsManager.getModelsForTier('free');
      expect(freeModels).toHaveLength(1);
      expect(freeModels[0].id).toBe('llama-3-8b');
      
      // Standard tier - includes Mistral
      aiToolsManager.setUserTier('user1', 'standard');
      const standardModels = aiToolsManager.getModelsForTier('standard');
      const textModels = standardModels.filter(m => m.type === 'text');
      expect(textModels).toHaveLength(2);
      expect(textModels.map(m => m.id)).toContain('mistral-7b');
      
      // Premium tier - includes GPT-4
      aiToolsManager.setUserTier('user1', 'premium');
      const premiumModels = aiToolsManager.getModelsForTier('premium');
      const premiumTextModels = premiumModels.filter(m => m.type === 'text');
      expect(premiumTextModels).toHaveLength(3);
      expect(premiumTextModels.map(m => m.id)).toContain('gpt-4o-mini');
    });

    test('should switch between image models based on tier', () => {
      console.log('LOG: TEST-AI-TOOLS-SWITCH-2 - Testing image model switching');
      
      // Free tier - no image models
      const freeModels = aiToolsManager.getModelsForTier('free');
      const freeImageModels = freeModels.filter(m => m.type === 'image');
      expect(freeImageModels).toHaveLength(0);
      
      // Standard tier - Stable Diffusion XL
      const standardModels = aiToolsManager.getModelsForTier('standard');
      const standardImageModels = standardModels.filter(m => m.type === 'image');
      expect(standardImageModels).toHaveLength(1);
      expect(standardImageModels[0].id).toBe('stable-diffusion-xl');
      
      // Premium tier - includes Stable Diffusion 3
      const premiumModels = aiToolsManager.getModelsForTier('premium');
      const premiumImageModels = premiumModels.filter(m => m.type === 'image');
      expect(premiumImageModels).toHaveLength(2);
      expect(premiumImageModels.map(m => m.id)).toContain('stable-diffusion-3');
    });

    test('should handle cost multipliers correctly', () => {
      console.log('LOG: TEST-AI-TOOLS-SWITCH-3 - Testing cost multiplier handling');
      
      const llamaModel = aiToolsManager.getModel('llama-3-8b');
      const gptModel = aiToolsManager.getModel('gpt-4o-mini');
      
      expect(llamaModel.cost_multiplier).toBe(1.0);
      expect(gptModel.cost_multiplier).toBe(3.0);
      
      // GPT should be 3x more expensive than Llama
      expect(gptModel.cost_multiplier / llamaModel.cost_multiplier).toBe(3);
    });
  });
});