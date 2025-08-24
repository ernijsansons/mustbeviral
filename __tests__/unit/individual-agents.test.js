// Unit tests for individual AI agents
// LOG: TEST-INDIVIDUAL-AGENTS-1 - Individual AI agents unit tests

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
