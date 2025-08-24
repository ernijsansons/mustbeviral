// LOG: AGENTS-LIB-1 - AI Agent Orchestration Library

import { CMOAgent } from '../agents/cmo';
import { CreativeAgent } from '../agents/creative';
import { SEOAgent } from '../agents/seo';
import { ComplianceAgent } from '../agents/compliance';
import { InfluencerAgent } from '../agents/influencer';
import { AnalyticsAgent } from '../agents/analytics';

export class AgentOrchestrator {
  private state: any;

  constructor(initialState: { user_id: string; user_control_level?: number }) {
    this.state = {
      id: Math.random().toString(36).substring(2),
      user_id: initialState.user_id,
      user_control_level: initialState.user_control_level || 50,
      current_step: 'cmo',
      ethics_status: 'pending',
      requires_human_approval: false,
      workflow_history: [],
      error: null,
    };
  }

  getState() {
    return this.state;
  }

  updateControlLevel(level: number) {
    this.state.user_control_level = Math.max(0, Math.min(100, level));
  }

  async runWorkflow(input: string) {
    console.log('LOG: AGENTS-WORKFLOW-RUN-1 - Starting workflow');
    const agents = {
      cmo: new CMOAgent(),
      creative: new CreativeAgent(),
      seo: new SEOAgent(),
      compliance: new ComplianceAgent(),
      influencer: new InfluencerAgent(),
      analytics: new AnalyticsAgent(),
    };

    let currentAgent = agents[this.state.current_step];
    let agentInput: any = { input };
    let result: any = {};

    while (currentAgent) {
      const agentResult = await currentAgent.run(agentInput, this.state.user_control_level);
      this.state.workflow_history.push({ step: this.state.current_step, result: agentResult });

      if (!agentResult.success) {
        this.state.error = agentResult.error;
        console.error('LOG: AGENTS-WORKFLOW-ERROR-1 - Agent failed:', this.state.current_step, agentResult.error);
        throw new Error(`Agent ${this.state.current_step} failed: ${agentResult.error}`);
      }

      Object.assign(result, agentResult.output);
      this.state.current_step = agentResult.next_agent;

      if (agentResult.output?.status === 'passed') {
        this.state.ethics_status = 'passed';
      }

      if (!agentResult.next_agent) {
        this.state.current_step = 'analytics'; // Default to analytics at the end
        if (this.state.user_control_level < 80) {
            this.state.requires_human_approval = true;
        }
        break;
      }

      agentInput = agentResult.output;
      currentAgent = agents[this.state.current_step];
    }

    // This is a simplified representation of the final result
    return {
        campaign_brief: result.brief,
        content_draft: result.content,
        ethics_status: this.state.ethics_status,
        current_step: this.state.current_step,
        user_control_level: this.state.user_control_level
    };
  }
}