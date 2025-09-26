// Unit tests for strategy generation system
// LOG: TEST-STRATEGIES-1 - Strategy generation unit tests

const { StrategyGenerator } = require('../../src/lib/strategies');

describe('StrategyGenerator', () => {
  let strategyGenerator;

  beforeEach(() => {
    console.log('LOG: TEST-STRATEGIES-SETUP-1 - Setting up strategy generator test');
    strategyGenerator = new StrategyGenerator();
  });

  describe('Initialization', () => {
    test('should initialize with default templates', () => {
      console.log('LOG: TEST-STRATEGIES-INIT-1 - Testing initialization');
      
      const templates = strategyGenerator.getTemplates();
      expect(templates).toHaveLength(2);
      expect(templates.map(t => t.id)).toEqual(['affiliate-funnel-basic', 'brand-awareness-viral']);
    });

    test('should load templates with correct structure', () => {
      console.log('LOG: TEST-STRATEGIES-INIT-2 - Testing template structure');
      
      const template = strategyGenerator.getTemplate('affiliate-funnel-basic');
      expect(template).toBeDefined();
      expect(template.name).toBe('Basic Affiliate Funnel');
      expect(template.category).toBe('affiliate');
      expect(template.steps).toHaveLength(3);
    });
  });

  describe('Template Management', () => {
    test('should get template by ID', () => {
      console.log('LOG: TEST-STRATEGIES-TEMPLATE-1 - Testing get template by ID');
      
      const template = strategyGenerator.getTemplate('brand-awareness-viral');
      expect(template).toBeDefined();
      expect(template.name).toBe('Viral Brand Awareness Campaign');
      expect(template.category).toBe('brand_awareness');
    });

    test('should return null for invalid template ID', () => {
      console.log('LOG: TEST-STRATEGIES-TEMPLATE-2 - Testing invalid template ID');
      
      const template = strategyGenerator.getTemplate('invalid-template');
      expect(template).toBeNull();
    });

    test('should return all templates', () => {
      console.log('LOG: TEST-STRATEGIES-TEMPLATE-3 - Testing get all templates');
      
      const templates = strategyGenerator.getTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('steps');
      });
    });
  });

  describe('Strategy Generation', () => {
    test('should generate personalized strategy for affiliate goal', async () => {
      console.log('LOG: TEST-STRATEGIES-GENERATE-1 - Testing affiliate strategy generation');
      
      const request = {
        user_id: 'test-user-1',
        brand_name: 'Test Brand',
        industry: 'technology',
        target_audience: 'tech enthusiasts',
        budget_range: 'medium',
        primary_goal: 'affiliate_revenue',
        timeline: '3 months',
        existing_channels: ['social_media', 'email']
      };

      const strategy = await strategyGenerator.generatePersonalizedStrategy(request);

      expect(strategy).toBeDefined();
      expect(strategy.template_id).toBe('affiliate-funnel-basic');
      expect(strategy.brand_name).toBe('Test Brand');
      expect(strategy.customized_steps).toHaveLength(3);
      expect(strategy.success_probability).toBeGreaterThan(0);
      expect(strategy.budget_estimate).toBeGreaterThan(0);
    });

    test('should generate personalized strategy for awareness goal', async () => {
      console.log('LOG: TEST-STRATEGIES-GENERATE-2 - Testing awareness strategy generation');
      
      const request = {
        user_id: 'test-user-2',
        brand_name: 'Awareness Brand',
        industry: 'fashion',
        target_audience: 'young professionals',
        budget_range: 'high',
        primary_goal: 'awareness',
        timeline: '2 months',
        existing_channels: ['instagram', 'tiktok', 'youtube']
      };

      const strategy = await strategyGenerator.generatePersonalizedStrategy(request);

      expect(strategy).toBeDefined();
      expect(strategy.template_id).toBe('brand-awareness-viral');
      expect(strategy.brand_name).toBe('Awareness Brand');
      expect(strategy.success_probability).toBeGreaterThan(70); // High budget should increase probability
    });

    test('should customize steps with personalized content', async () => {
      console.log('LOG: TEST-STRATEGIES-GENERATE-3 - Testing step customization');
      
      const request = {
        user_id: 'test-user-3',
        brand_name: 'Custom Brand',
        industry: 'health',
        target_audience: 'fitness enthusiasts',
        budget_range: 'low',
        primary_goal: 'engagement',
        timeline: '1 month',
        existing_channels: []
      };

      const strategy = await strategyGenerator.generatePersonalizedStrategy(request);

      expect(strategy.customized_steps).toHaveLength(3);
      
      const firstStep = strategy.customized_steps[0];
      expect(firstStep.personalized_content).toContain('Custom Brand');
      expect(firstStep.personalized_content).toContain('health');
      expect(firstStep.personalized_content).toContain('fitness enthusiasts');
      expect(firstStep.specific_actions).toHaveLength(3);
      expect(firstStep.kpis).toHaveLength(3);
    });
  });

  describe('Budget and Timeline Calculations', () => {
    test('should calculate budget based on range and steps', async () => {
      console.log('LOG: TEST-STRATEGIES-BUDGET-1 - Testing budget calculation');
      
      const lowBudgetRequest = {
        user_id: 'test-user',
        brand_name: 'Test Brand',
        industry: 'technology',
        target_audience: 'developers',
        budget_range: 'low',
        primary_goal: 'awareness',
        timeline: '1 month',
        existing_channels: []
      };

      const highBudgetRequest = { ...lowBudgetRequest, budget_range: 'high' };

      const lowStrategy = await strategyGenerator.generatePersonalizedStrategy(lowBudgetRequest);
      const highStrategy = await strategyGenerator.generatePersonalizedStrategy(highBudgetRequest);

      expect(highStrategy.budget_estimate).toBeGreaterThan(lowStrategy.budget_estimate);
    });

    test('should calculate timeline based on steps', async () => {
      console.log('LOG: TEST-STRATEGIES-TIMELINE-1 - Testing timeline calculation');
      
      const request = {
        user_id: 'test-user',
        brand_name: 'Test Brand',
        industry: 'technology',
        target_audience: 'developers',
        budget_range: 'medium',
        primary_goal: 'affiliate_revenue',
        timeline: '2 months',
        existing_channels: ['website']
      };

      const strategy = await strategyGenerator.generatePersonalizedStrategy(request);

      expect(strategy.timeline).toMatch(/\d+ weeks/);
      expect(parseInt(strategy.timeline)).toBeGreaterThan(0);
    });
  });

  describe('Success Probability Calculation', () => {
    test('should calculate higher probability for high budget', async () => {
      console.log('LOG: TEST-STRATEGIES-PROBABILITY-1 - Testing success probability calculation');
      
      const baseRequest = {
        user_id: 'test-user',
        brand_name: 'Test Brand',
        industry: 'technology',
        target_audience: 'developers',
        budget_range: 'low',
        primary_goal: 'awareness',
        timeline: '1 month',
        existing_channels: []
      };

      const lowBudgetStrategy = await strategyGenerator.generatePersonalizedStrategy(baseRequest);
      const highBudgetStrategy = await strategyGenerator.generatePersonalizedStrategy({
        ...baseRequest,
        budget_range: 'high'
      });

      expect(highBudgetStrategy.success_probability).toBeGreaterThan(lowBudgetStrategy.success_probability);
    });

    test('should increase probability with more existing channels', async () => {
      console.log('LOG: TEST-STRATEGIES-PROBABILITY-2 - Testing channel impact on probability');
      
      const baseRequest = {
        user_id: 'test-user',
        brand_name: 'Test Brand',
        industry: 'technology',
        target_audience: 'developers',
        budget_range: 'medium',
        primary_goal: 'awareness',
        timeline: '1 month',
        existing_channels: []
      };

      const noChannelsStrategy = await strategyGenerator.generatePersonalizedStrategy(baseRequest);
      const multiChannelStrategy = await strategyGenerator.generatePersonalizedStrategy({
        ...baseRequest,
        existing_channels: ['website', 'social_media', 'email', 'blog']
      });

      expect(multiChannelStrategy.success_probability).toBeGreaterThan(noChannelsStrategy.success_probability);
    });

    test('should cap probability at reasonable limits', async () => {
      console.log('LOG: TEST-STRATEGIES-PROBABILITY-3 - Testing probability limits');
      
      const maxRequest = {
        user_id: 'test-user',
        brand_name: 'Test Brand',
        industry: 'technology',
        target_audience: 'developers',
        budget_range: 'high',
        primary_goal: 'awareness',
        timeline: '6 months',
        existing_channels: ['website', 'social_media', 'email', 'blog', 'youtube']
      };

      const strategy = await strategyGenerator.generatePersonalizedStrategy(maxRequest);

      expect(strategy.success_probability).toBeLessThanOrEqual(95);
      expect(strategy.success_probability).toBeGreaterThanOrEqual(30);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing required fields', async () => {
      console.log('LOG: TEST-STRATEGIES-ERROR-1 - Testing error handling');
      
      const incompleteRequest = {
        user_id: 'test-user',
        // Missing required fields
      };

      await expect(strategyGenerator.generatePersonalizedStrategy(incompleteRequest))
        .rejects.toThrow('Failed to generate personalized strategy');
    });
  });
});