// API route for content seeding and reputation boost operations
// LOG: API-SEED-1 - Initialize content seeding API

import { NextRequest, NextResponse } from 'next/server';
import { visibilityBoostEngine } from '@/lib/boost';

export async function POST(request: NextRequest) {
  console.log('LOG: API-SEED-2 - Content seeding API called');

  try {
    const body = await request.json();
    const { action, content_id, user_id, keywords, strategy } = body;

    console.log('LOG: API-SEED-3 - Request params:', { action, content_id, strategy });

    // Validate required fields
    if (!action) {
      console.log('LOG: API-SEED-ERROR-1 - Missing action parameter');
      return NextResponse.json(
        { error: 'Missing required parameter: action' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'search_mentions':
        console.log('LOG: API-SEED-4 - Searching for brand mentions');
        result = await handleSearchMentions(keywords);
        break;

      case 'create_seeding_plan':
        console.log('LOG: API-SEED-5 - Creating content seeding plan');
        if (!content_id) {
          return NextResponse.json(
            { error: 'content_id required for seeding plan' },
            { status: 400 }
          );
        }
        result = await handleCreateSeedingPlan(content_id, strategy, keywords);
        break;

      case 'get_reputation_metrics':
        console.log('LOG: API-SEED-6 - Getting reputation metrics');
        result = await handleGetReputationMetrics(user_id, keywords);
        break;

      case 'analyze_sentiment':
        console.log('LOG: API-SEED-7 - Analyzing sentiment');
        const { text } = body;
        if (!text) {
          return NextResponse.json(
            { error: 'text required for sentiment analysis' },
            { status: 400 }
          );
        }
        result = await visibilityBoostEngine.analyzeSentiment(text);
        break;

      default:
        console.log('LOG: API-SEED-ERROR-2 - Invalid action:', action);
        return NextResponse.json(
          { error: 'Invalid action. Use: search_mentions, create_seeding_plan, get_reputation_metrics, analyze_sentiment' },
          { status: 400 }
        );
    }

    console.log('LOG: API-SEED-8 - Operation completed successfully');

    return NextResponse.json({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-SEED-ERROR-3 - API operation failed:', error);
    return NextResponse.json(
      { 
        error: 'Content seeding operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('LOG: API-SEED-9 - Getting seeding status');

  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('plan_id');
    const userId = searchParams.get('user_id');

    if (planId) {
      // Get specific seeding plan status
      const status = await getSeedingPlanStatus(planId);
      return NextResponse.json({
        success: true,
        plan_id: planId,
        status,
        timestamp: new Date().toISOString()
      });
    }

    if (userId) {
      // Get user's reputation overview
      const overview = await getUserReputationOverview(userId);
      return NextResponse.json({
        success: true,
        user_id: userId,
        overview,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'plan_id or user_id parameter required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('LOG: API-SEED-ERROR-4 - GET operation failed:', error);
    return NextResponse.json(
      { error: 'Failed to get seeding status' },
      { status: 500 }
    );
  }
}

// Handler functions
async function handleSearchMentions(keywords?: string[]) {
  console.log('LOG: API-SEED-HANDLER-1 - Handling search mentions');
  
  try {
    const mentions = await visibilityBoostEngine.searchBrandMentions(keywords);
    const metrics = visibilityBoostEngine.calculateReputationMetrics(mentions);
    
    return {
      mentions,
      metrics,
      search_keywords: keywords || ['Must Be Viral'],
      total_found: mentions.length
    };
  } catch (error) {
    console.error('LOG: API-SEED-HANDLER-ERROR-1 - Search mentions failed:', error);
    throw error;
  }
}

async function handleCreateSeedingPlan(contentId: string, strategy?: string, keywords?: string[]) {
  console.log('LOG: API-SEED-HANDLER-2 - Handling create seeding plan');
  
  try {
    // First get current reputation metrics
    const mentions = await visibilityBoostEngine.searchBrandMentions(keywords);
    const currentMetrics = visibilityBoostEngine.calculateReputationMetrics(mentions);
    
    // Create seeding plan
    const plan = visibilityBoostEngine.createSeedingPlan(
      contentId, 
      currentMetrics, 
      strategy as any
    );
    
    // In a real implementation, this would be stored in the database
    // For now, we'll return the plan with mock storage confirmation
    
    return {
      seeding_plan: plan,
      current_metrics: currentMetrics,
      recommendations: generateSeedingRecommendations(plan, currentMetrics)
    };
  } catch (error) {
    console.error('LOG: API-SEED-HANDLER-ERROR-2 - Create seeding plan failed:', error);
    throw error;
  }
}

async function handleGetReputationMetrics(userId?: string, keywords?: string[]) {
  console.log('LOG: API-SEED-HANDLER-3 - Handling get reputation metrics');
  
  try {
    const mentions = await visibilityBoostEngine.searchBrandMentions(keywords);
    const metrics = visibilityBoostEngine.calculateReputationMetrics(mentions);
    
    // Get historical data (mock for now)
    const historicalData = generateHistoricalMetrics();
    
    return {
      current_metrics: metrics,
      historical_data: historicalData,
      recent_mentions: mentions.slice(0, 10),
      trends: {
        sentiment_trend: calculateSentimentTrend(historicalData),
        visibility_trend: calculateVisibilityTrend(historicalData)
      }
    };
  } catch (error) {
    console.error('LOG: API-SEED-HANDLER-ERROR-3 - Get reputation metrics failed:', error);
    throw error;
  }
}

async function getSeedingPlanStatus(planId: string) {
  console.log('LOG: API-SEED-STATUS-1 - Getting seeding plan status:', planId);
  
  // Mock implementation - in real app, this would query the database
  return {
    plan_id: planId,
    status: 'active',
    progress: 65,
    platforms_seeded: ['Twitter', 'LinkedIn'],
    pending_platforms: ['Medium'],
    estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    metrics: {
      impressions: 15420,
      engagements: 892,
      clicks: 156
    }
  };
}

async function getUserReputationOverview(userId: string) {
  console.log('LOG: API-SEED-OVERVIEW-1 - Getting user reputation overview:', userId);
  
  // Mock implementation
  return {
    user_id: userId,
    overall_score: 7.2,
    recent_change: '+0.3',
    active_campaigns: 2,
    total_mentions: 47,
    sentiment_breakdown: {
      positive: 28,
      neutral: 15,
      negative: 4
    },
    top_keywords: ['AI platform', 'content creation', 'innovative'],
    next_scan: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
  };
}

// Helper functions
function generateSeedingRecommendations(plan: any, metrics: any) {
  const recommendations = [];
  
  if (metrics.overall_sentiment < 0) {
    recommendations.push({
      type: 'reputation_repair',
      priority: 'high',
      action: 'Focus on addressing negative feedback and highlighting positive aspects',
      platforms: ['LinkedIn', 'Official Blog']
    });
  }
  
  if (metrics.visibility_score < 30) {
    recommendations.push({
      type: 'visibility_boost',
      priority: 'medium',
      action: 'Increase content distribution across high-reach platforms',
      platforms: ['Twitter', 'Reddit']
    });
  }
  
  if (plan.seeding_strategy === 'viral') {
    recommendations.push({
      type: 'viral_optimization',
      priority: 'medium',
      action: 'Optimize content for shareability and trending topics',
      platforms: plan.target_platforms
    });
  }
  
  return recommendations;
}

function generateHistoricalMetrics() {
  const data = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      sentiment: 0.3 + (Math.random() - 0.5) * 0.6,
      mentions: Math.floor(Math.random() * 10) + 2,
      visibility: Math.floor(Math.random() * 40) + 30
    });
  }
  
  return data;
}

function calculateSentimentTrend(data: any[]) {
  if (data.length < 2) return 0;
  
  const recent = data.slice(-7).reduce((sum, d) => sum + d.sentiment, 0) / 7;
  const previous = data.slice(-14, -7).reduce((sum, d) => sum + d.sentiment, 0) / 7;
  
  return ((recent - previous) / Math.abs(previous)) * 100;
}

function calculateVisibilityTrend(data: any[]) {
  if (data.length < 2) return 0;
  
  const recent = data.slice(-7).reduce((sum, d) => sum + d.visibility, 0) / 7;
  const previous = data.slice(-14, -7).reduce((sum, d) => sum + d.visibility, 0) / 7;
  
  return ((recent - previous) / previous) * 100;
}