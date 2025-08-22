// API route for strategy generation and management
// LOG: API-STRATEGY-1 - Initialize strategy API

import { NextRequest, NextResponse } from 'next/server';
import { strategyGenerator } from '@/lib/strategies';

export async function POST(request: NextRequest) {
  console.log('LOG: API-STRATEGY-2 - Strategy API called');

  try {
    const body = await request.json();
    const { action, user_id, strategy_request, strategy_id } = body;

    console.log('LOG: API-STRATEGY-3 - Request params:', { action, user_id });

    // Validate required fields
    if (!action || !user_id) {
      console.log('LOG: API-STRATEGY-ERROR-1 - Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: action and user_id' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'get_templates':
        console.log('LOG: API-STRATEGY-4 - Getting strategy templates');
        result = await handleGetTemplates();
        break;

      case 'generate_strategy':
        console.log('LOG: API-STRATEGY-5 - Generating personalized strategy');
        if (!strategy_request) {
          return NextResponse.json(
            { error: 'strategy_request required for generation' },
            { status: 400 }
          );
        }
        result = await handleGenerateStrategy(strategy_request);
        break;

      case 'get_strategy':
        console.log('LOG: API-STRATEGY-6 - Getting existing strategy');
        if (!strategy_id) {
          return NextResponse.json(
            { error: 'strategy_id required' },
            { status: 400 }
          );
        }
        result = await handleGetStrategy(strategy_id);
        break;

      case 'analyze_request':
        console.log('LOG: API-STRATEGY-7 - Analyzing strategy request');
        if (!strategy_request) {
          return NextResponse.json(
            { error: 'strategy_request required for analysis' },
            { status: 400 }
          );
        }
        result = await handleAnalyzeRequest(strategy_request);
        break;

      default:
        console.log('LOG: API-STRATEGY-ERROR-2 - Invalid action:', action);
        return NextResponse.json(
          { error: 'Invalid action. Use: get_templates, generate_strategy, get_strategy, analyze_request' },
          { status: 400 }
        );
    }

    console.log('LOG: API-STRATEGY-8 - Operation completed successfully');

    return NextResponse.json({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-STRATEGY-ERROR-3 - API operation failed:', error);
    return NextResponse.json(
      { 
        error: 'Strategy operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('LOG: API-STRATEGY-9 - Getting strategy information');

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'get_templates';
    const userId = searchParams.get('user_id');
    const strategyId = searchParams.get('strategy_id');

    let data;

    switch (action) {
      case 'get_templates':
        data = strategyGenerator.getTemplates();
        break;
      case 'get_strategy':
        if (!strategyId) {
          return NextResponse.json(
            { error: 'strategy_id parameter required' },
            { status: 400 }
          );
        }
        data = await handleGetStrategy(strategyId);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action for GET request' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-STRATEGY-ERROR-4 - GET operation failed:', error);
    return NextResponse.json(
      { error: 'Failed to get strategy information' },
      { status: 500 }
    );
  }
}

// Handler functions
async function handleGetTemplates() {
  console.log('LOG: API-STRATEGY-HANDLER-1 - Handling get templates');
  
  const templates = strategyGenerator.getTemplates();
  return {
    templates,
    total_count: templates.length,
    categories: [...new Set(templates.map(t => t.category))]
  };
}

async function handleGenerateStrategy(strategyRequest: any) {
  console.log('LOG: API-STRATEGY-HANDLER-2 - Handling strategy generation');
  
  // Validate strategy request
  const requiredFields = ['user_id', 'brand_name', 'industry', 'target_audience', 'primary_goal'];
  for (const field of requiredFields) {
    if (!strategyRequest[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  const strategy = await strategyGenerator.generatePersonalizedStrategy(strategyRequest);
  
  return {
    strategy,
    generation_time: new Date().toISOString(),
    recommendations: generateRecommendations(strategy)
  };
}

async function handleGetStrategy(strategyId: string) {
  console.log('LOG: API-STRATEGY-HANDLER-3 - Handling get strategy');
  
  // In a real implementation, this would query the database
  // For now, return a mock strategy
  return {
    strategy_id: strategyId,
    status: 'active',
    progress: {
      completed_steps: 1,
      total_steps: 3,
      current_step: 'Content Creation & Guidelines'
    },
    performance: {
      kpis_met: 2,
      total_kpis: 5,
      success_rate: 75
    }
  };
}

async function handleAnalyzeRequest(strategyRequest: any) {
  console.log('LOG: API-STRATEGY-HANDLER-4 - Handling request analysis');
  
  const analysis = {
    feasibility_score: calculateFeasibilityScore(strategyRequest),
    recommended_template: strategyGenerator.getTemplates().find(t => 
      t.category === strategyRequest.primary_goal
    )?.id || 'affiliate-funnel-basic',
    estimated_timeline: calculateEstimatedTimeline(strategyRequest),
    budget_recommendations: generateBudgetRecommendations(strategyRequest),
    risk_factors: identifyRiskFactors(strategyRequest)
  };
  
  return analysis;
}

// Helper functions
function generateRecommendations(strategy: any) {
  const recommendations = [];
  
  if (strategy.success_probability < 60) {
    recommendations.push({
      type: 'improvement',
      message: 'Consider increasing budget or extending timeline for better success probability',
      priority: 'high'
    });
  }
  
  if (strategy.budget_estimate > 10000) {
    recommendations.push({
      type: 'cost_optimization',
      message: 'Look for opportunities to reduce costs through automation or partnerships',
      priority: 'medium'
    });
  }
  
  recommendations.push({
    type: 'best_practice',
    message: 'Start with a pilot campaign to validate assumptions before full rollout',
    priority: 'low'
  });
  
  return recommendations;
}

function calculateFeasibilityScore(request: any): number {
  let score = 70; // Base score
  
  if (request.budget_range === 'high') score += 20;
  else if (request.budget_range === 'low') score -= 15;
  
  if (request.existing_channels?.length > 2) score += 10;
  if (request.timeline && request.timeline.includes('month')) score += 5;
  
  return Math.min(100, Math.max(20, score));
}

function calculateEstimatedTimeline(request: any): string {
  const baseWeeks = {
    'awareness': 6,
    'engagement': 4,
    'conversion': 8,
    'affiliate_revenue': 10
  };
  
  const weeks = baseWeeks[request.primary_goal as keyof typeof baseWeeks] || 6;
  return `${weeks} weeks`;
}

function generateBudgetRecommendations(request: any) {
  const recommendations = {
    minimum: 1000,
    recommended: 5000,
    optimal: 15000
  };
  
  if (request.primary_goal === 'affiliate_revenue') {
    recommendations.minimum = 2000;
    recommendations.recommended = 8000;
    recommendations.optimal = 25000;
  }
  
  return recommendations;
}

function identifyRiskFactors(request: any): string[] {
  const risks = [];
  
  if (request.budget_range === 'low') {
    risks.push('Limited budget may restrict campaign reach and effectiveness');
  }
  
  if (!request.existing_channels || request.existing_channels.length === 0) {
    risks.push('No existing channels may slow initial traction');
  }
  
  if (request.industry === 'highly_regulated') {
    risks.push('Regulatory compliance may limit content and outreach options');
  }
  
  return risks;
}