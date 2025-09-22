/**
 * AI Agent Controller
 * Handles all AI agent-related API endpoints
 */

import { PlatformAgentCoordinator } from '../lib/ai/agents/PlatformAgentCoordinator';
import { CostTracker } from '../lib/ai/agents/monitoring/CostTracker';
import { TokenOptimizer } from '../lib/ai/agents/monitoring/TokenOptimizer';
import { QualityAssurance } from '../lib/ai/agents/quality/QualityAssurance';
import { JWTManager } from '../lib/auth/jwtManager';
import { _logger, log } from '../lib/monitoring/logger';

// Handler: AI Agent Requests
export async function handleAgentRequest(
  request: Request,
  agentCoordinator: PlatformAgentCoordinator,
  costTracker: CostTracker,
  tokenOptimizer: TokenOptimizer,
  qualityAssurance: QualityAssurance
): Promise<Response> {
  const timer = log.startTimer('agent_request');

  try {
    const url = new URL(request.url);
    const path = url.pathname;

    // Extract user from token for usage tracking
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const userPayload = await JWTManager.verifyAccessToken(token);
    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Route to specific agent endpoints
    if (path === '/api/agents/generate' && request.method === 'POST') {
      return await handleContentGeneration(request, agentCoordinator, costTracker, tokenOptimizer, qualityAssurance, userPayload.userId);
    } else if (path === '/api/agents/campaign' && request.method === 'POST') {
      return await handleCampaignGeneration(request, agentCoordinator, costTracker, tokenOptimizer, qualityAssurance, userPayload.userId);
    } else if (path === '/api/agents/metrics' && request.method === 'GET') {
      return await handleAgentMetrics(costTracker, tokenOptimizer, userPayload.userId);
    } else if (path === '/api/agents/optimize' && request.method === 'POST') {
      return await handleContentOptimization(request, qualityAssurance, tokenOptimizer, userPayload.userId);
    } else {
      return new Response(JSON.stringify({ error: 'Agent endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error: unknown) {
    log.error('Agent request failed', error as Error, {
      component: 'agents',
      action: 'request_processing'
    });
    return new Response(JSON.stringify({ error: 'Agent processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    timer.stop();
  }
}

// Handler: Content Generation
async function handleContentGeneration(
  request: Request,
  agentCoordinator: PlatformAgentCoordinator,
  costTracker: CostTracker,
  tokenOptimizer: TokenOptimizer,
  qualityAssurance: QualityAssurance,
  userId: string
): Promise<Response> {
  try {
    const body = await request.json() as unknown;
    const { _topic, tone, targetAudience, platform, contentType, goals, enableOptimization = true } = body;

    if (!topic || !platform || !contentType) {
      return new Response(JSON.stringify({ error: 'Topic, platform, and contentType are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const startTime = Date.now();

    // Optimize token allocation if enabled
    let maxTokens = 4096;
    if (enableOptimization) {
      const allocation = tokenOptimizer.calculateOptimalAllocation(
        platform,
        contentType,
        topic,
        85,
        {
          aggressivenessLevel: 'moderate',
          qualityFloor: 75,
          maxTokenReduction: 40,
          adaptiveLearning: true,
          platformSpecific: true
        }
      );
      maxTokens = allocation.maxTokens;
    }

    // Generate content
    const contentRequest = { _topic,
      tone: tone || 'professional',
      targetAudience: targetAudience || 'general audience',
      contentType,
      goals: goals || ['engagement'],
      maxTokens
    };

    const result = await agentCoordinator.routeToOptimalAgent(contentRequest, platform);
    const processingTime = Date.now() - startTime;

    // Quality assessment
    const qualityAssessment = await qualityAssurance.assessContent(
      result.content,
      platform,
      contentType
    );

    // Track costs and performance
    costTracker.trackRequest(
      result.agentUsed,
      platform,
      Math.round(maxTokens * 0.3), // Estimated input tokens
      Math.round(maxTokens * 0.7), // Estimated output tokens
      '@cf/meta/llama-2-7b-chat-int8',
      processingTime,
      true,
      qualityAssessment.metrics.overallScore
    );

    // Record optimization data
    if (enableOptimization) {
      tokenOptimizer.recordOptimizationResult(
        platform,
        contentType,
        maxTokens,
        qualityAssessment.metrics.overallScore,
        true
      );
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        content: result.content,
        optimization: result.optimization,
        analysis: result.analysis,
        quality: {
          score: qualityAssessment.metrics.overallScore,
          passed: qualityAssessment.passedThreshold,
          metrics: qualityAssessment.metrics
        },
        performance: { _processingTime,
          tokenUsage: maxTokens,
          costEstimate: costTracker.getCurrentMetrics().averageCostPerRequest
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    log.error('Content generation failed', error as Error, {
      component: 'agents',
      action: 'content_generation',
      userId
    });
    return new Response(JSON.stringify({ error: 'Content generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handler: Campaign Generation
async function handleCampaignGeneration(
  request: Request,
  agentCoordinator: PlatformAgentCoordinator,
  costTracker: CostTracker,
  tokenOptimizer: TokenOptimizer,
  qualityAssurance: QualityAssurance,
  userId: string
): Promise<Response> {
  try {
    const body = await request.json() as unknown;
    const { _topic, tone, targetAudience, platforms, goals, campaignType } = body;

    if (!topic || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return new Response(JSON.stringify({ error: 'Topic and platforms array are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const startTime = Date.now();

    // Generate universal content
    const campaignRequest = { _topic,
      tone: tone || 'professional',
      targetAudience: targetAudience || 'general audience',
      goals: goals || ['engagement', 'awareness'],
      platforms,
      campaignType: campaignType || 'coordinated_launch'
    };

    const result = await agentCoordinator.generateUniversalContent(campaignRequest);
    const processingTime = Date.now() - startTime;

    // Quality assessment for each platform
    const qualityAssessments = await Promise.all(
      Object.entries(result.adaptations).map(async ([platform, adaptation]) => {
        const assessment = await qualityAssurance.assessContent(
          adaptation.content,
          platform,
          adaptation.contentType
        );
        return { _platform, assessment };
      })
    );

    // Track costs for each platform
    Object.entries(result.adaptations).forEach(([platform, adaptation]) => {
      costTracker.trackRequest(
        `${platform}Agent`,
        platform,
        350, // Estimated input tokens
        220, // Estimated output tokens
        '@cf/meta/llama-2-7b-chat-int8',
        processingTime / platforms.length,
        true,
        adaptation.analysis.platformScore
      );
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        adaptations: result.adaptations,
        distributionStrategy: result.distributionStrategy,
        crossPlatformAnalysis: result.crossPlatformAnalysis,
        qualityAssessments: qualityAssessments.reduce((acc, _qa) => {
          acc[qa.platform] = {
            score: qa.assessment.metrics.overallScore,
            passed: qa.assessment.passedThreshold,
            metrics: qa.assessment.metrics
          };
          return acc;
        }, {} as Record<string, unknown>),
        performance: { _processingTime,
          totalCost: costTracker.getCurrentMetrics().totalCostUSD,
          platformCount: platforms.length
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    log.error('Campaign generation failed', error as Error, {
      component: 'agents',
      action: 'campaign_generation',
      userId
    });
    return new Response(JSON.stringify({ error: 'Campaign generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handler: Agent Metrics
async function handleAgentMetrics(
  costTracker: CostTracker,
  tokenOptimizer: TokenOptimizer,
  userId: string
): Promise<Response> {
  try {
    const costMetrics = costTracker.getCurrentMetrics();
    const costData = costTracker.exportCostData();
    const optimizationStats = tokenOptimizer.getOptimizationStats();
    const budgetUtilization = costTracker.getBudgetUtilization();

    return new Response(JSON.stringify({
      success: true,
      data: {
        usage: {
          totalRequests: costMetrics.totalAPICalls,
          totalTokens: costMetrics.totalTokensUsed,
          totalCost: costMetrics.totalCostUSD,
          averageCost: costMetrics.averageCostPerRequest,
          successRate: costMetrics.successRate
        },
        optimization: {
          totalOptimizations: optimizationStats.totalOptimizations,
          averageReduction: optimizationStats.averageReduction,
          platformBreakdown: optimizationStats.platformBreakdown
        },
        budget: {
          daily: budgetUtilization.daily,
          weekly: budgetUtilization.weekly,
          monthly: budgetUtilization.monthly
        },
        recommendations: costData.recommendations
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    log.error('Agent metrics retrieval failed', error as Error, {
      component: 'agents',
      action: 'metrics_retrieval',
      userId
    });
    return new Response(JSON.stringify({ error: 'Metrics retrieval failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handler: Content Optimization
async function handleContentOptimization(
  request: Request,
  qualityAssurance: QualityAssurance,
  tokenOptimizer: TokenOptimizer,
  userId: string
): Promise<Response> {
  try {
    const body = await request.json() as unknown;
    const { _content, platform, contentType, optimizationLevel = 'moderate' } = body;

    if (!content || !platform || !contentType) {
      return new Response(JSON.stringify({ error: 'Content, platform, and contentType are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Assess current quality
    const assessment = await qualityAssurance.assessContent(content, platform, contentType);

    // Improve content if needed
    let improvedContent = content;
    let improvementData = null;

    if (!assessment.passedThreshold || optimizationLevel === 'aggressive') {
      const improvement = await qualityAssurance.improveContent(assessment, optimizationLevel);
      improvedContent = improvement.improvedContent;
      improvementData = {
        improvementScore: improvement.improvementScore,
        appliedFixes: improvement.appliedFixes,
        remainingIssues: improvement.remainingIssues
      };
    }

    // Re-assess improved content
    const finalAssessment = await qualityAssurance.assessContent(improvedContent, platform, contentType);

    return new Response(JSON.stringify({
      success: true,
      data: {
        originalContent: content,
        optimizedContent: improvedContent,
        originalQuality: {
          score: assessment.metrics.overallScore,
          passed: assessment.passedThreshold,
          issues: assessment.validation.issues
        },
        optimizedQuality: {
          score: finalAssessment.metrics.overallScore,
          passed: finalAssessment.passedThreshold,
          issues: finalAssessment.validation.issues
        },
        improvement: improvementData,
        recommendations: finalAssessment.recommendedActions
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    log.error('Content optimization failed', error as Error, {
      component: 'agents',
      action: 'content_optimization',
      userId
    });
    return new Response(JSON.stringify({ error: 'Content optimization failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}