// API route for running AI agents workflow with error handling
// LOG: API-RUN-AGENTS-1 - Initialize AI agents workflow API

import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/agents';

export async function POST(request: NextRequest) {
  console.log('LOG: API-RUN-AGENTS-2 - AI agents workflow API called');

  try {
    const body = await request.json();
    const { input, user_id, control_level } = body;

    console.log('LOG: API-RUN-AGENTS-3 - Request params:', { user_id, control_level, input_length: input?.length });

    // Validate required fields
    if (!input || !user_id) {
      console.log('LOG: API-RUN-AGENTS-ERROR-1 - Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: input and user_id' },
        { status: 400 }
      );
    }

    // Validate control level
    if (control_level !== undefined && (control_level < 0 || control_level > 100)) {
      console.log('LOG: API-RUN-AGENTS-ERROR-2 - Invalid control level:', control_level);
      return NextResponse.json(
        { error: 'control_level must be between 0 and 100' },
        { status: 400 }
      );
    }

    console.log('LOG: API-RUN-AGENTS-4 - Starting workflow execution');

    // Initialize orchestrator
    const orchestrator = new AgentOrchestrator({
      user_id,
      user_control_level: control_level || 50
    });

    // Run workflow
    const workflowResults = await orchestrator.runWorkflow(input);

    console.log('LOG: API-RUN-AGENTS-5 - Workflow completed with status:', workflowResults.workflow_status);

    return NextResponse.json({
      success: true,
      workflow_id: workflowResults.id,
      results: workflowResults,
      has_errors: orchestrator.hasErrors(),
      has_critical_errors: orchestrator.hasCriticalErrors(),
      errors: orchestrator.getErrors(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-RUN-AGENTS-ERROR-3 - Workflow API failed:', error);
    return NextResponse.json(
      { 
        error: 'AI workflow execution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        workflow_status: 'failed'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('LOG: API-RUN-AGENTS-6 - Getting workflow status');

  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflow_id');

    if (!workflowId) {
      return NextResponse.json(
        { error: 'workflow_id parameter required' },
        { status: 400 }
      );
    }

    // Mock workflow status (in production, would query database)
    const mockStatus = {
      workflow_id: workflowId,
      status: 'completed',
      current_step: 'analytics',
      progress: 100,
      errors: [],
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      ...mockStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-RUN-AGENTS-ERROR-4 - GET operation failed:', error);
    return NextResponse.json(
      { error: 'Failed to get workflow status' },
      { status: 500 }
    );
  }
}