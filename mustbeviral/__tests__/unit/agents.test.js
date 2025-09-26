// Unit tests for AI agents
// LOG: TEST-AGENTS-1 - AI agents unit tests

const { AgentOrchestrator } = require('../../src/lib/agents');

// Mock agent modules
jest.mock('../../src/agents/cmo', () => ({
  CMOAgent: jest.fn().mockImplementation(() => ({
    run: jest.fn().mockResolvedValue({
      success: true,
      output: { brief: 'Mock campaign brief' },
      next_agent: 'creative'
    })
  }))
}));

jest.mock('../../src/agents/creative', () => ({
  CreativeAgent: jest.fn().mockImplementation(() => ({
    run: jest.fn().mockResolvedValue({
      success: true,
      output: { content: 'Mock generated content' },
      next_agent: 'seo'
    })
  }))
}));

jest.mock('../../src/agents/compliance', () => ({
  ComplianceAgent: jest.fn().mockImplementation(() => ({
    run: jest.fn().mockResolvedValue({
      success: true,
      output: { 
        status: 'passed',
        feedback: 'Content passed ethics check',
        bias_score: 15,
        compliance_score: 85
      },
      next_agent: 'influencer'
    })
  }))
}));

describe('AgentOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    console.log('LOG: TEST-AGENTS-SETUP-1 - Setting up agent orchestrator test');
    orchestrator = new AgentOrchestrator({
      user_id: 'test-user',
      user_control_level: 50
    });
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with correct default values', () => {
      console.log('LOG: TEST-AGENTS-INIT-1 - Testing orchestrator initialization');
      
      const state = orchestrator.getState();
      
      expect(state.user_id).toBe('test-user');
      expect(state.user_control_level).toBe(50);
      expect(state.current_step).toBe('cmo');
      expect(state.ethics_status).toBe('pending');
      expect(state.requires_human_approval).toBe(false);
    });

    test('should generate unique ID if not provided', () => {
      console.log('LOG: TEST-AGENTS-INIT-2 - Testing ID generation');
      
      const orchestrator1 = new AgentOrchestrator({ user_id: 'test' });
      const orchestrator2 = new AgentOrchestrator({ user_id: 'test' });
      
      expect(orchestrator1.getState().id).not.toBe(orchestrator2.getState().id);
    });
  });

  describe('Control Level Updates', () => {
    test('should update control level correctly', () => {
      console.log('LOG: TEST-AGENTS-CONTROL-1 - Testing control level update');
      
      orchestrator.updateControlLevel(75);
      
      const state = orchestrator.getState();
      expect(state.user_control_level).toBe(75);
    });

    test('should clamp control level to valid range', () => {
      console.log('LOG: TEST-AGENTS-CONTROL-2 - Testing control level clamping');
      
      orchestrator.updateControlLevel(-10);
      expect(orchestrator.getState().user_control_level).toBe(0);
      
      orchestrator.updateControlLevel(150);
      expect(orchestrator.getState().user_control_level).toBe(100);
    });
  });

  describe('Workflow Execution', () => {
    test('should run complete workflow successfully', async () => {
      console.log('LOG: TEST-AGENTS-WORKFLOW-1 - Testing complete workflow');
      
      const result = await orchestrator.runWorkflow('Test input for content creation');
      
      expect(result.campaign_brief).toBe('Mock campaign brief');
      expect(result.content_draft).toBe('Mock generated content');
      expect(result.ethics_status).toBe('passed');
    });

    test('should handle high control level workflow', async () => {
      console.log('LOG: TEST-AGENTS-WORKFLOW-2 - Testing high control level workflow');
      
      orchestrator.updateControlLevel(90);
      const result = await orchestrator.runWorkflow('Test input');
      
      // High control level should complete all steps
      expect(result.current_step).toBe('analytics');
    });

    test('should handle low control level workflow', async () => {
      console.log('LOG: TEST-AGENTS-WORKFLOW-3 - Testing low control level workflow');
      
      orchestrator.updateControlLevel(10);
      const result = await orchestrator.runWorkflow('Test input');
      
      // Low control level might require more approvals
      expect(result.user_control_level).toBe(10);
    });
  });

  describe('Error Handling', () => {
    test('should handle agent failures gracefully', async () => {
      console.log('LOG: TEST-AGENTS-ERROR-1 - Testing agent failure handling');
      
      // Mock a failing agent
      const { CMOAgent } = require('../../src/agents/cmo');
      CMOAgent.mockImplementation(() => ({
        run: jest.fn().mockResolvedValue({
          success: false,
          error: 'Mock agent failure'
        })
      }));
      
      const failingOrchestrator = new AgentOrchestrator({
        user_id: 'test-user',
        user_control_level: 50
      });
      
      await expect(failingOrchestrator.runWorkflow('Test input')).rejects.toThrow();
    });
  });
});

describe('Individual Agents', () => {
  describe('CMOAgent', () => {
    test('should generate campaign brief', async () => {
      console.log('LOG: TEST-AGENTS-CMO-1 - Testing CMO agent');
      
      const { CMOAgent } = require('../../src/agents/cmo');
      const cmoAgent = new CMOAgent();
      
      const result = await cmoAgent.run({ input: 'Create viral content' }, 50);
      
      expect(result.success).toBe(true);
      expect(result.output.brief).toBeDefined();
      expect(result.next_agent).toBe('creative');
    });
  });

  describe('ComplianceAgent', () => {
    test('should perform ethics check', async () => {
      console.log('LOG: TEST-AGENTS-COMPLIANCE-1 - Testing compliance agent');
      
      const { ComplianceAgent } = require('../../src/agents/compliance');
      const complianceAgent = new ComplianceAgent();
      
      const mockContent = {
        body: 'This is a test content for ethics checking.'
      };
      
      const result = await complianceAgent.run({ content: mockContent }, 50);
      
      expect(result.success).toBe(true);
      expect(result.output.status).toBeDefined();
      expect(result.output.bias_score).toBeDefined();
      expect(result.output.compliance_score).toBeDefined();
    });
  });
});