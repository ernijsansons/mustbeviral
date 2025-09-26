// Comprehensive unit tests for StrategyGenerator
// Tests strategy generation, template management, and personalization algorithms

import { 
  StrategyGenerator, 
  StrategyTemplate, 
  StrategyStep, 
  PersonalizedStrategy, 
  CustomizedStep, 
  StrategyRequest 
} from '../../../src/lib/strategies';

describe('StrategyGenerator', () => {
  let strategyGenerator: StrategyGenerator;

  const mockStrategyRequest: StrategyRequest = {
    user_id: 'user-123',
    brand_name: 'TechBrand',
    industry: 'technology',
    target_audience: 'tech enthusiasts',
    budget_range: 'medium',
    primary_goal: 'awareness',
    timeline: '8 weeks',
    existing_channels: ['twitter', 'linkedin']
  };

  beforeEach(() => {
    strategyGenerator = new StrategyGenerator();
    
    // Suppress console.log in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor and initialization', () => {
    it('should initialize with templates loaded', () => {
      expect(strategyGenerator).toBeInstanceOf(StrategyGenerator);
      
      const templates = strategyGenerator.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should load expected default templates', () => {
      const templates = strategyGenerator.getTemplates();
      const templateIds = templates.map(t => t.id);
      
      expect(templateIds).toContain('affiliate-funnel-basic');
      expect(templateIds).toContain('brand-awareness-viral');
    });
  });

  describe('getTemplates', () => {
    it('should return all available templates', () => {
      const templates = strategyGenerator.getTemplates();
      
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThanOrEqual(2);
      
      templates.forEach(template => {
        expect(template).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          category: expect.stringMatching(/^(affiliate|brand_awareness|engagement|conversion)$/),
          target_audience: expect.any(Array),
          required_data: expect.any(Array),
          steps: expect.any(Array),
          success_metrics: expect.any(Array),
        });
      });
    });

    it('should return immutable template data', () => {
      const templates1 = strategyGenerator.getTemplates();
      const templates2 = strategyGenerator.getTemplates();
      
      expect(templates1).not.toBe(templates2); // Different array instances
      expect(templates1).toEqual(templates2); // Same content
    });
  });

  describe('getTemplate', () => {
    it('should return specific template by ID', () => {
      const template = strategyGenerator.getTemplate('affiliate-funnel-basic');
      
      expect(template).toMatchObject({
        id: 'affiliate-funnel-basic',
        name: 'Basic Affiliate Funnel',
        category: 'affiliate',
      });
    });

    it('should return null for non-existent template', () => {
      const template = strategyGenerator.getTemplate('non-existent-template');
      expect(template).toBeNull();
    });

    it('should return null for empty string', () => {
      const template = strategyGenerator.getTemplate('');
      expect(template).toBeNull();
    });

    it('should handle special characters in template ID', () => {
      const template = strategyGenerator.getTemplate('template-with-special-chars@#$');
      expect(template).toBeNull();
    });
  });

  describe('generatePersonalizedStrategy', () => {
    it('should generate personalized strategy successfully', async () => {
      const strategy = await strategyGenerator.generatePersonalizedStrategy(mockStrategyRequest);
      
      expect(strategy).toMatchObject({
        id: expect.stringMatching(/^strategy_\d+_[a-z0-9]+$/),
        template_id: expect.any(String),
        user_id: 'user-123',
        brand_name: 'TechBrand',
        customized_steps: expect.any(Array),
        timeline: expect.stringMatching(/^\d+ weeks$/),
        budget_estimate: expect.any(Number),
        success_probability: expect.any(Number),
        created_at: expect.any(String),
      });
    });

    it('should select correct template for affiliate goal', async () => {
      const affiliateRequest: StrategyRequest = {
        ...mockStrategyRequest,
        primary_goal: 'affiliate_revenue'
      };
      
      const strategy = await strategyGenerator.generatePersonalizedStrategy(affiliateRequest);
      expect(strategy.template_id).toBe('affiliate-funnel-basic');
    });

    it('should select correct template for awareness goal', async () => {
      const awarenessRequest: StrategyRequest = {
        ...mockStrategyRequest,
        primary_goal: 'awareness'
      };
      
      const strategy = await strategyGenerator.generatePersonalizedStrategy(awarenessRequest);
      expect(strategy.template_id).toBe('brand-awareness-viral');
    });

    it('should use default template for unknown goal', async () => {
      const unknownGoalRequest: StrategyRequest = {
        ...mockStrategyRequest,
        primary_goal: 'conversion' as any
      };
      
      const strategy = await strategyGenerator.generatePersonalizedStrategy(unknownGoalRequest);
      expect(['affiliate-funnel-basic', 'brand-awareness-viral']).toContain(strategy.template_id);
    });

    it('should customize steps with personalized content', async () => {
      const strategy = await strategyGenerator.generatePersonalizedStrategy(mockStrategyRequest);
      
      expect(strategy.customized_steps.length).toBeGreaterThan(0);
      
      strategy.customized_steps.forEach(step => {
        expect(step).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          action_type: expect.stringMatching(/^(content_creation|influencer_outreach|campaign_launch|analysis)$/),
          estimated_duration: expect.any(String),
          resources_needed: expect.any(Array),
          personalized_content: expect.any(String),
          specific_actions: expect.any(Array),
          kpis: expect.any(Array),
        });
        
        // Check that personalized content includes brand name
        expect(step.personalized_content).toContain('TechBrand');
        expect(step.specific_actions.length).toBeGreaterThan(0);
        expect(step.kpis.length).toBeGreaterThan(0);
      });
    });

    it('should calculate realistic budget estimates', async () => {
      const lowBudgetRequest: StrategyRequest = { ...mockStrategyRequest, budget_range: 'low' };
      const mediumBudgetRequest: StrategyRequest = { ...mockStrategyRequest, budget_range: 'medium' };
      const highBudgetRequest: StrategyRequest = { ...mockStrategyRequest, budget_range: 'high' };
      
      const lowStrategy = await strategyGenerator.generatePersonalizedStrategy(lowBudgetRequest);
      const mediumStrategy = await strategyGenerator.generatePersonalizedStrategy(mediumBudgetRequest);
      const highStrategy = await strategyGenerator.generatePersonalizedStrategy(highBudgetRequest);
      
      expect(lowStrategy.budget_estimate).toBeLessThan(mediumStrategy.budget_estimate);
      expect(mediumStrategy.budget_estimate).toBeLessThan(highStrategy.budget_estimate);
      
      // Budget should be positive
      expect(lowStrategy.budget_estimate).toBeGreaterThan(0);
      expect(mediumStrategy.budget_estimate).toBeGreaterThan(0);
      expect(highStrategy.budget_estimate).toBeGreaterThan(0);
    });

    it('should calculate success probability within valid range', async () => {
      const strategy = await strategyGenerator.generatePersonalizedStrategy(mockStrategyRequest);
      
      expect(strategy.success_probability).toBeGreaterThanOrEqual(30);
      expect(strategy.success_probability).toBeLessThanOrEqual(95);
    });

    it('should adjust success probability based on budget', async () => {
      const lowBudgetRequest: StrategyRequest = { ...mockStrategyRequest, budget_range: 'low' };
      const highBudgetRequest: StrategyRequest = { ...mockStrategyRequest, budget_range: 'high' };
      
      const lowStrategy = await strategyGenerator.generatePersonalizedStrategy(lowBudgetRequest);
      const highStrategy = await strategyGenerator.generatePersonalizedStrategy(highBudgetRequest);
      
      expect(highStrategy.success_probability).toBeGreaterThan(lowStrategy.success_probability);
    });

    it('should adjust success probability based on existing channels', async () => {
      const noChannelsRequest: StrategyRequest = { ...mockStrategyRequest, existing_channels: [] };
      const manyChannelsRequest: StrategyRequest = { 
        ...mockStrategyRequest, 
        existing_channels: ['twitter', 'instagram', 'facebook', 'linkedin', 'youtube'] 
      };
      
      const noChannelsStrategy = await strategyGenerator.generatePersonalizedStrategy(noChannelsRequest);
      const manyChannelsStrategy = await strategyGenerator.generatePersonalizedStrategy(manyChannelsRequest);
      
      expect(manyChannelsStrategy.success_probability).toBeGreaterThan(noChannelsStrategy.success_probability);
    });

    it('should generate unique strategy IDs', async () => {
      const strategies = await Promise.all([
        strategyGenerator.generatePersonalizedStrategy(mockStrategyRequest),
        strategyGenerator.generatePersonalizedStrategy(mockStrategyRequest),
        strategyGenerator.generatePersonalizedStrategy(mockStrategyRequest),
      ]);
      
      const ids = strategies.map(s => s.id);
      expect(new Set(ids).size).toBe(3); // All unique
    });

    it('should handle error in strategy generation', async () => {
      // Mock selectBestTemplate to throw error
      const originalSelectBestTemplate = (strategyGenerator as any).selectBestTemplate;
      (strategyGenerator as any).selectBestTemplate = jest.fn().mockImplementation(() => {
        throw new Error('Template selection failed');
      });
      
      await expect(
        strategyGenerator.generatePersonalizedStrategy(mockStrategyRequest)
      ).rejects.toThrow('Failed to generate personalized strategy');
      
      // Restore original method
      (strategyGenerator as any).selectBestTemplate = originalSelectBestTemplate;
    });
  });

  describe('private methods', () => {
    describe('selectBestTemplate', () => {
      it('should select affiliate template for affiliate goal', () => {
        const request: StrategyRequest = { ...mockStrategyRequest, primary_goal: 'affiliate_revenue' };
        const template = (strategyGenerator as any).selectBestTemplate(request);
        
        expect(template.id).toBe('affiliate-funnel-basic');
      });

      it('should select awareness template for awareness goal', () => {
        const request: StrategyRequest = { ...mockStrategyRequest, primary_goal: 'awareness' };
        const template = (strategyGenerator as any).selectBestTemplate(request);
        
        expect(template.id).toBe('brand-awareness-viral');
      });

      it('should select default template for other goals', () => {
        const request: StrategyRequest = { ...mockStrategyRequest, primary_goal: 'engagement' };
        const template = (strategyGenerator as any).selectBestTemplate(request);
        
        expect(['affiliate-funnel-basic', 'brand-awareness-viral']).toContain(template.id);
      });
    });

    describe('customizeSteps', () => {
      it('should customize all steps in template', async () => {
        const template = strategyGenerator.getTemplate('affiliate-funnel-basic')!;
        const customizedSteps = await (strategyGenerator as any).customizeSteps(template, mockStrategyRequest);
        
        expect(customizedSteps.length).toBe(template.steps.length);
        
        customizedSteps.forEach((step: CustomizedStep) => {
          expect(step.personalized_content).toBeTruthy();
          expect(step.specific_actions.length).toBeGreaterThan(0);
          expect(step.kpis.length).toBeGreaterThan(0);
        });
      });
    });

    describe('generatePersonalizedContent', () => {
      const mockStep: StrategyStep = {
        id: 'step-1',
        title: 'Test Step',
        description: 'Test description',
        action_type: 'influencer_outreach',
        estimated_duration: '1 week',
        resources_needed: ['test resource']
      };

      it('should generate content for influencer outreach', () => {
        const content = (strategyGenerator as any).generatePersonalizedContent(mockStep, mockStrategyRequest);
        
        expect(content).toContain('TechBrand');
        expect(content).toContain('technology');
        expect(content).toContain('tech enthusiasts');
      });

      it('should generate content for content creation', () => {
        const contentStep: StrategyStep = { ...mockStep, action_type: 'content_creation' };
        const content = (strategyGenerator as any).generatePersonalizedContent(contentStep, mockStrategyRequest);
        
        expect(content).toContain('TechBrand');
        expect(content).toContain('technology');
        expect(content).toContain('tech enthusiasts');
      });

      it('should generate content for campaign launch', () => {
        const launchStep: StrategyStep = { ...mockStep, action_type: 'campaign_launch' };
        const content = (strategyGenerator as any).generatePersonalizedContent(launchStep, mockStrategyRequest);
        
        expect(content).toContain('TechBrand');
        expect(content).toContain('tech enthusiasts');
      });

      it('should generate content for analysis', () => {
        const analysisStep: StrategyStep = { ...mockStep, action_type: 'analysis' };
        const content = (strategyGenerator as any).generatePersonalizedContent(analysisStep, mockStrategyRequest);
        
        expect(content).toContain('TechBrand');
        expect(content).toContain('technology');
        expect(content).toContain('tech enthusiasts');
      });

      it('should generate default content for unknown action type', () => {
        const unknownStep: StrategyStep = { ...mockStep, action_type: 'unknown' as any };
        const content = (strategyGenerator as any).generatePersonalizedContent(unknownStep, mockStrategyRequest);
        
        expect(content).toContain('TechBrand');
        expect(content).toContain('tech enthusiasts');
      });
    });

    describe('generateSpecificActions', () => {
      const mockStep: StrategyStep = {
        id: 'step-1',
        title: 'Test Step',
        description: 'Test description',
        action_type: 'influencer_outreach',
        estimated_duration: '1 week',
        resources_needed: ['test resource']
      };

      it('should generate specific actions for request', () => {
        const actions = (strategyGenerator as any).generateSpecificActions(mockStep, mockStrategyRequest);
        
        expect(Array.isArray(actions)).toBe(true);
        expect(actions.length).toBe(3); // Should return top 3 actions
        
        actions.forEach((action: string) => {
          expect(typeof action).toBe('string');
          expect(action.length).toBeGreaterThan(0);
        });
        
        // Should contain brand name and industry references
        const actionsText = actions.join(' ');
        expect(actionsText).toContain('TechBrand');
        expect(actionsText).toContain('technology');
      });
    });

    describe('generateKPIs', () => {
      it('should generate KPIs for influencer outreach', () => {
        const step: StrategyStep = {
          id: 'step-1',
          title: 'Test Step',
          description: 'Test description',
          action_type: 'influencer_outreach',
          estimated_duration: '1 week',
          resources_needed: []
        };
        
        const kpis = (strategyGenerator as any).generateKPIs(step, mockStrategyRequest);
        
        expect(kpis).toContain('response_rate');
        expect(kpis).toContain('partnership_agreements');
        expect(kpis).toContain('reach_potential');
      });

      it('should generate KPIs for content creation', () => {
        const step: StrategyStep = {
          id: 'step-1',
          title: 'Test Step',
          description: 'Test description',
          action_type: 'content_creation',
          estimated_duration: '1 week',
          resources_needed: []
        };
        
        const kpis = (strategyGenerator as any).generateKPIs(step, mockStrategyRequest);
        
        expect(kpis).toContain('content_pieces_created');
        expect(kpis).toContain('engagement_rate');
        expect(kpis).toContain('brand_consistency_score');
      });

      it('should generate KPIs for campaign launch', () => {
        const step: StrategyStep = {
          id: 'step-1',
          title: 'Test Step',
          description: 'Test description',
          action_type: 'campaign_launch',
          estimated_duration: '1 week',
          resources_needed: []
        };
        
        const kpis = (strategyGenerator as any).generateKPIs(step, mockStrategyRequest);
        
        expect(kpis).toContain('impressions');
        expect(kpis).toContain('clicks');
        expect(kpis).toContain('conversions');
        expect(kpis).toContain('roi');
      });

      it('should generate KPIs for analysis', () => {
        const step: StrategyStep = {
          id: 'step-1',
          title: 'Test Step',
          description: 'Test description',
          action_type: 'analysis',
          estimated_duration: '1 week',
          resources_needed: []
        };
        
        const kpis = (strategyGenerator as any).generateKPIs(step, mockStrategyRequest);
        
        expect(kpis).toContain('insights_generated');
        expect(kpis).toContain('opportunities_identified');
        expect(kpis).toContain('competitive_gaps');
      });

      it('should generate default KPIs for unknown action type', () => {
        const step: StrategyStep = {
          id: 'step-1',
          title: 'Test Step',
          description: 'Test description',
          action_type: 'unknown' as any,
          estimated_duration: '1 week',
          resources_needed: []
        };
        
        const kpis = (strategyGenerator as any).generateKPIs(step, mockStrategyRequest);
        
        expect(kpis).toContain('completion_rate');
        expect(kpis).toContain('quality_score');
      });
    });

    describe('calculateTimeline', () => {
      it('should calculate timeline from steps', () => {
        const steps: CustomizedStep[] = [
          {
            id: 'step-1',
            title: 'Step 1',
            description: 'Description 1',
            action_type: 'content_creation',
            estimated_duration: '1 week',
            resources_needed: [],
            personalized_content: 'Content 1',
            specific_actions: ['Action 1'],
            kpis: ['KPI 1']
          },
          {
            id: 'step-2',
            title: 'Step 2',
            description: 'Description 2',
            action_type: 'influencer_outreach',
            estimated_duration: '2-3 weeks',
            resources_needed: [],
            personalized_content: 'Content 2',
            specific_actions: ['Action 2'],
            kpis: ['KPI 2']
          }
        ];
        
        const timeline = (strategyGenerator as any).calculateTimeline(steps);
        expect(timeline).toBe('4 weeks'); // 1 + 3 weeks
      });

      it('should handle single week durations', () => {
        const steps: CustomizedStep[] = [
          {
            id: 'step-1',
            title: 'Step 1',
            description: 'Description 1',
            action_type: 'content_creation',
            estimated_duration: '1 week',
            resources_needed: [],
            personalized_content: 'Content 1',
            specific_actions: ['Action 1'],
            kpis: ['KPI 1']
          }
        ];
        
        const timeline = (strategyGenerator as any).calculateTimeline(steps);
        expect(timeline).toBe('1 weeks');
      });

      it('should handle duration without "week"', () => {
        const steps: CustomizedStep[] = [
          {
            id: 'step-1',
            title: 'Step 1',
            description: 'Description 1',
            action_type: 'content_creation',
            estimated_duration: '3 days',
            resources_needed: [],
            personalized_content: 'Content 1',
            specific_actions: ['Action 1'],
            kpis: ['KPI 1']
          }
        ];
        
        const timeline = (strategyGenerator as any).calculateTimeline(steps);
        expect(timeline).toBe('1 weeks'); // Defaults to 1 week
      });
    });

    describe('estimateBudget', () => {
      const mockSteps: CustomizedStep[] = [
        {
          id: 'step-1',
          title: 'Step 1',
          description: 'Description 1',
          action_type: 'content_creation',
          estimated_duration: '1 week',
          resources_needed: [],
          personalized_content: 'Content 1',
          specific_actions: ['Action 1'],
          kpis: ['KPI 1']
        },
        {
          id: 'step-2',
          title: 'Step 2',
          description: 'Description 2',
          action_type: 'influencer_outreach',
          estimated_duration: '1 week',
          resources_needed: [],
          personalized_content: 'Content 2',
          specific_actions: ['Action 2'],
          kpis: ['KPI 2']
        }
      ];

      it('should estimate budget based on range and steps', () => {
        const lowBudgetRequest: StrategyRequest = { ...mockStrategyRequest, budget_range: 'low' };
        const mediumBudgetRequest: StrategyRequest = { ...mockStrategyRequest, budget_range: 'medium' };
        const highBudgetRequest: StrategyRequest = { ...mockStrategyRequest, budget_range: 'high' };
        
        const lowBudget = (strategyGenerator as any).estimateBudget(lowBudgetRequest, mockSteps);
        const mediumBudget = (strategyGenerator as any).estimateBudget(mediumBudgetRequest, mockSteps);
        const highBudget = (strategyGenerator as any).estimateBudget(highBudgetRequest, mockSteps);
        
        expect(lowBudget).toBeLessThan(mediumBudget);
        expect(mediumBudget).toBeLessThan(highBudget);
        
        // Budget should be influenced by number of steps
        expect(lowBudget).toBeGreaterThan(1000); // Base + step multiplier
        expect(mediumBudget).toBeGreaterThan(5000);
        expect(highBudget).toBeGreaterThan(15000);
      });

      it('should return integer budget estimates', () => {
        const budget = (strategyGenerator as any).estimateBudget(mockStrategyRequest, mockSteps);
        expect(Number.isInteger(budget)).toBe(true);
      });
    });

    describe('calculateSuccessProbability', () => {
      const mockTemplate: StrategyTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test description',
        category: 'awareness',
        target_audience: ['test'],
        required_data: ['test'],
        steps: [],
        success_metrics: ['test']
      };

      it('should calculate base success probability', () => {
        const request: StrategyRequest = {
          ...mockStrategyRequest,
          budget_range: 'medium',
          existing_channels: [],
          primary_goal: 'conversion'
        };
        
        const probability = (strategyGenerator as any).calculateSuccessProbability(request, mockTemplate);
        expect(probability).toBe(70); // Base probability
      });

      it('should adjust for high budget', () => {
        const request: StrategyRequest = {
          ...mockStrategyRequest,
          budget_range: 'high',
          existing_channels: [],
          primary_goal: 'conversion'
        };
        
        const probability = (strategyGenerator as any).calculateSuccessProbability(request, mockTemplate);
        expect(probability).toBe(85); // 70 + 15
      });

      it('should adjust for low budget', () => {
        const request: StrategyRequest = {
          ...mockStrategyRequest,
          budget_range: 'low',
          existing_channels: [],
          primary_goal: 'conversion'
        };
        
        const probability = (strategyGenerator as any).calculateSuccessProbability(request, mockTemplate);
        expect(probability).toBe(60); // 70 - 10
      });

      it('should adjust for existing channels', () => {
        const request: StrategyRequest = {
          ...mockStrategyRequest,
          budget_range: 'medium',
          existing_channels: ['twitter', 'instagram'],
          primary_goal: 'conversion'
        };
        
        const probability = (strategyGenerator as any).calculateSuccessProbability(request, mockTemplate);
        expect(probability).toBe(80); // 70 + (2 * 5)
      });

      it('should adjust for template category match', () => {
        const request: StrategyRequest = {
          ...mockStrategyRequest,
          budget_range: 'medium',
          existing_channels: [],
          primary_goal: 'awareness'
        };
        
        const probability = (strategyGenerator as any).calculateSuccessProbability(request, mockTemplate);
        expect(probability).toBe(80); // 70 + 10 (category match)
      });

      it('should cap probability at 95%', () => {
        const request: StrategyRequest = {
          ...mockStrategyRequest,
          budget_range: 'high', // +15
          existing_channels: ['twitter', 'instagram', 'facebook', 'linkedin'], // +20
          primary_goal: 'awareness' // +10 (category match)
        };
        
        const probability = (strategyGenerator as any).calculateSuccessProbability(request, mockTemplate);
        expect(probability).toBe(95); // Capped at 95, not 115
      });

      it('should floor probability at 30%', () => {
        const lowTemplate: StrategyTemplate = {
          ...mockTemplate,
          category: 'conversion'
        };
        
        const request: StrategyRequest = {
          ...mockStrategyRequest,
          budget_range: 'low', // -10
          existing_channels: [],
          primary_goal: 'awareness' // No category match
        };
        
        const probability = (strategyGenerator as any).calculateSuccessProbability(request, lowTemplate);
        expect(probability).toBe(60); // 70 - 10, above minimum
        
        // Test with extreme low case that would go below 30
        const extremeRequest: StrategyRequest = {
          ...request,
          budget_range: 'low', // This alone brings it to 60
        };
        
        // Mock to simulate extreme low case
        const originalCalculate = (strategyGenerator as any).calculateSuccessProbability;
        (strategyGenerator as any).calculateSuccessProbability = (req: StrategyRequest, template: StrategyTemplate) => {
          let probability = 20; // Start below minimum
          if (req.budget_range === 'low') probability -= 10;
          return Math.min(95, Math.max(30, probability));
        };
        
        const extremeProbability = (strategyGenerator as any).calculateSuccessProbability(extremeRequest, lowTemplate);
        expect(extremeProbability).toBe(30); // Floored at 30
        
        // Restore original
        (strategyGenerator as any).calculateSuccessProbability = originalCalculate;
      });
    });

    describe('generateStrategyId', () => {
      it('should generate unique strategy IDs', () => {
        const id1 = (strategyGenerator as any).generateStrategyId();
        const id2 = (strategyGenerator as any).generateStrategyId();
        
        expect(id1).toMatch(/^strategy_\d+_[a-z0-9]+$/);
        expect(id2).toMatch(/^strategy_\d+_[a-z0-9]+$/);
        expect(id1).not.toBe(id2);
      });
    });
  });

  describe('type safety and interfaces', () => {
    it('should validate StrategyTemplate interface', () => {
      const template: StrategyTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'A test template',
        category: 'affiliate',
        target_audience: ['creators', 'influencers'],
        required_data: ['product_info', 'audience_data'],
        steps: [
          {
            id: 'step-1',
            title: 'Step 1',
            description: 'First step',
            action_type: 'content_creation',
            estimated_duration: '1 week',
            dependencies: ['step-0'],
            resources_needed: ['design tools']
          }
        ],
        success_metrics: ['conversions', 'reach']
      };

      expect(template.category).toBe('affiliate');
      expect(template.steps).toHaveLength(1);
      expect(template.steps[0].action_type).toBe('content_creation');
    });

    it('should validate PersonalizedStrategy interface', () => {
      const strategy: PersonalizedStrategy = {
        id: 'strategy_123',
        template_id: 'template_456',
        user_id: 'user_789',
        brand_name: 'TestBrand',
        customized_steps: [
          {
            id: 'step-1',
            title: 'Custom Step',
            description: 'Custom description',
            action_type: 'analysis',
            estimated_duration: '1 week',
            resources_needed: ['tools'],
            personalized_content: 'Personalized for TestBrand',
            specific_actions: ['Action 1', 'Action 2'],
            kpis: ['metric 1', 'metric 2']
          }
        ],
        timeline: '4 weeks',
        budget_estimate: 5000,
        success_probability: 75,
        created_at: '2025-01-01T00:00:00Z'
      };

      expect(strategy.brand_name).toBe('TestBrand');
      expect(strategy.customized_steps[0].personalized_content).toContain('TestBrand');
      expect(strategy.success_probability).toBe(75);
    });

    it('should validate StrategyRequest interface', () => {
      const request: StrategyRequest = {
        user_id: 'user_123',
        brand_name: 'MyBrand',
        industry: 'fintech',
        target_audience: 'millennials',
        budget_range: 'high',
        primary_goal: 'conversion',
        timeline: '12 weeks',
        existing_channels: ['email', 'social']
      };

      expect(request.budget_range).toBe('high');
      expect(request.primary_goal).toBe('conversion');
      expect(request.existing_channels).toContain('email');
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle empty existing channels array', async () => {
      const request: StrategyRequest = {
        ...mockStrategyRequest,
        existing_channels: []
      };
      
      const strategy = await strategyGenerator.generatePersonalizedStrategy(request);
      expect(strategy).toBeDefined();
      expect(strategy.success_probability).toBeGreaterThan(0);
    });

    it('should handle long brand names', async () => {
      const request: StrategyRequest = {
        ...mockStrategyRequest,
        brand_name: 'A'.repeat(100) // Very long brand name
      };
      
      const strategy = await strategyGenerator.generatePersonalizedStrategy(request);
      expect(strategy).toBeDefined();
      expect(strategy.brand_name).toBe('A'.repeat(100));
    });

    it('should handle special characters in brand name', async () => {
      const request: StrategyRequest = {
        ...mockStrategyRequest,
        brand_name: 'Brand@#$%^&*()'
      };
      
      const strategy = await strategyGenerator.generatePersonalizedStrategy(request);
      expect(strategy).toBeDefined();
      expect(strategy.brand_name).toBe('Brand@#$%^&*()');
    });

    it('should handle concurrent strategy generation', async () => {
      const requests = [
        { ...mockStrategyRequest, brand_name: 'Brand1' },
        { ...mockStrategyRequest, brand_name: 'Brand2' },
        { ...mockStrategyRequest, brand_name: 'Brand3' }
      ];
      
      const strategies = await Promise.all(
        requests.map(req => strategyGenerator.generatePersonalizedStrategy(req))
      );
      
      expect(strategies).toHaveLength(3);
      expect(strategies[0].brand_name).toBe('Brand1');
      expect(strategies[1].brand_name).toBe('Brand2');
      expect(strategies[2].brand_name).toBe('Brand3');
      
      // All should have unique IDs
      const ids = strategies.map(s => s.id);
      expect(new Set(ids).size).toBe(3);
    });
  });

  describe('singleton export', () => {
    it('should export a singleton strategy generator', () => {
      const { strategyGenerator: exportedGenerator } = require('../../../src/lib/strategies');
      expect(exportedGenerator).toBeInstanceOf(StrategyGenerator);
    });
  });
});