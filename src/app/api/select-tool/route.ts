// API for AI tool selection and generation with tier validation
// LOG: API-SELECT-TOOL-1 - Initialize AI tool selection API

import { NextRequest, NextResponse } from 'next/server';
import { aiToolsManager } from '@/lib/ai-tools';

export async function POST(request: NextRequest) {
  console.log('LOG: API-SELECT-TOOL-2 - AI tool selection API called');

  try {
    const body = await request.json();
    const { action, user_id, tier_id, model_id, generation_request } = body;

    console.log('LOG: API-SELECT-TOOL-3 - Request params:', { action, user_id, tier_id, model_id });

    // Validate required fields
    if (!action || !user_id) {
      console.log('LOG: API-SELECT-TOOL-ERROR-1 - Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: action and user_id' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'get_tiers':
        console.log('LOG: API-SELECT-TOOL-4 - Getting available tiers');
        result = await handleGetTiers();
        break;

      case 'select_tier':
        console.log('LOG: API-SELECT-TOOL-5 - Selecting user tier');
        if (!tier_id) {
          return NextResponse.json(
            { error: 'tier_id required for tier selection' },
            { status: 400 }
          );
        }
        result = await handleSelectTier(user_id, tier_id);
        break;

      case 'get_models':
        console.log('LOG: API-SELECT-TOOL-6 - Getting models for tier');
        result = await handleGetModels(user_id, tier_id);
        break;

      case 'generate':
        console.log('LOG: API-SELECT-TOOL-7 - Generating content');
        if (!model_id || !generation_request) {
          return NextResponse.json(
            { error: 'model_id and generation_request required for generation' },
            { status: 400 }
          );
        }
        result = await handleGenerate(user_id, model_id, generation_request);
        break;

      case 'get_usage':
        console.log('LOG: API-SELECT-TOOL-8 - Getting user usage');
        result = await handleGetUsage(user_id);
        break;

      default:
        console.log('LOG: API-SELECT-TOOL-ERROR-2 - Invalid action:', action);
        return NextResponse.json(
          { error: 'Invalid action. Use: get_tiers, select_tier, get_models, generate, get_usage' },
          { status: 400 }
        );
    }

    console.log('LOG: API-SELECT-TOOL-9 - Operation completed successfully');

    return NextResponse.json({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-SELECT-TOOL-ERROR-3 - API operation failed:', error);
    return NextResponse.json(
      { 
        error: 'AI tool operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('LOG: API-SELECT-TOOL-10 - Getting AI tool information');

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const action = searchParams.get('action') || 'get_tiers';

    if (!userId && action !== 'get_tiers') {
      return NextResponse.json(
        { error: 'user_id parameter required' },
        { status: 400 }
      );
    }

    let data;

    switch (action) {
      case 'get_tiers':
        data = aiToolsManager.getTiers();
        break;
      case 'get_usage':
        data = aiToolsManager.getUserTierInfo(userId!);
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
    console.error('LOG: API-SELECT-TOOL-ERROR-4 - GET operation failed:', error);
    return NextResponse.json(
      { error: 'Failed to get AI tool information' },
      { status: 500 }
    );
  }
}

// Handler functions
async function handleGetTiers() {
  console.log('LOG: API-SELECT-TOOL-HANDLER-1 - Handling get tiers');
  
  const tiers = aiToolsManager.getTiers();
  return {
    tiers,
    total_count: tiers.length
  };
}

async function handleSelectTier(userId: string, tierId: string) {
  console.log('LOG: API-SELECT-TOOL-HANDLER-2 - Handling tier selection');
  
  const success = aiToolsManager.setUserTier(userId, tierId);
  
  if (!success) {
    throw new Error('Failed to set user tier');
  }

  const tierInfo = aiToolsManager.getUserTierInfo(userId);
  return {
    tier_selected: true,
    current_tier: tierInfo?.tier,
    usage_info: tierInfo?.usage
  };
}

async function handleGetModels(userId: string, tierId?: string) {
  console.log('LOG: API-SELECT-TOOL-HANDLER-3 - Handling get models');
  
  const userInfo = aiToolsManager.getUserTierInfo(userId);
  const targetTierId = tierId || userInfo?.tier.id || 'free';
  
  const models = aiToolsManager.getModelsForTier(targetTierId);
  
  return {
    tier_id: targetTierId,
    available_models: models,
    model_count: models.length
  };
}

async function handleGenerate(userId: string, modelId: string, generationRequest: any) {
  console.log('LOG: API-SELECT-TOOL-HANDLER-4 - Handling generation request');
  
  const model = aiToolsManager.getModel(modelId);
  if (!model) {
    throw new Error('Invalid model ID');
  }

  const userInfo = aiToolsManager.getUserTierInfo(userId);
  if (!userInfo) {
    throw new Error('User tier information not found');
  }

  // Check if model is available for user's tier
  if (!userInfo.tier.available_models.includes(modelId)) {
    throw new Error('Model not available for current tier');
  }

  // Estimate resource usage
  let estimatedUsage = 0;
  if (model.type === 'text') {
    estimatedUsage = generationRequest.max_tokens || 1000;
  } else if (model.type === 'image') {
    estimatedUsage = 1;
  } else if (model.type === 'video') {
    estimatedUsage = generationRequest.duration || 10;
  }

  // Check usage limits
  if (!aiToolsManager.canUserGenerate(userId, model.type, estimatedUsage)) {
    throw new Error('Daily usage limit exceeded for this generation type');
  }

  // Simulate generation (in production, this would call the actual AI service)
  const mockResult = await simulateGeneration(model, generationRequest);
  
  // Update usage
  aiToolsManager.updateUsage(userId, model.type, estimatedUsage);

  return {
    model_used: model,
    generation_result: mockResult,
    usage_updated: true,
    remaining_usage: getRemainingUsage(userId, userInfo.tier)
  };
}

async function handleGetUsage(userId: string) {
  console.log('LOG: API-SELECT-TOOL-HANDLER-5 - Handling get usage');
  
  const userInfo = aiToolsManager.getUserTierInfo(userId);
  if (!userInfo) {
    throw new Error('User information not found');
  }

  return {
    current_tier: userInfo.tier,
    daily_usage: userInfo.usage.daily_usage,
    daily_limits: userInfo.tier.daily_limits,
    usage_percentages: {
      text: (userInfo.usage.daily_usage.text_tokens / userInfo.tier.daily_limits.text_tokens) * 100,
      image: (userInfo.usage.daily_usage.image_generations / userInfo.tier.daily_limits.image_generations) * 100,
      video: userInfo.tier.daily_limits.video_seconds > 0 ? 
        (userInfo.usage.daily_usage.video_seconds / userInfo.tier.daily_limits.video_seconds) * 100 : 0
    }
  };
}

// Helper functions
async function simulateGeneration(model: any, request: any) {
  // Mock generation results
  if (model.type === 'text') {
    return {
      text: `Generated text using ${model.name}: ${request.prompt?.substring(0, 50)}...`,
      tokens_used: request.max_tokens || 1000
    };
  } else if (model.type === 'image') {
    return {
      image_url: `https://example.com/generated-image-${Date.now()}.jpg`,
      resolution: model.max_resolution
    };
  } else if (model.type === 'video') {
    return {
      video_url: `https://example.com/generated-video-${Date.now()}.mp4`,
      duration: request.duration || 10
    };
  }
}

function getRemainingUsage(userId: string, tier: any) {
  const userInfo = aiToolsManager.getUserTierInfo(userId);
  if (!userInfo) return null;

  return {
    text_tokens: tier.daily_limits.text_tokens - userInfo.usage.daily_usage.text_tokens,
    image_generations: tier.daily_limits.image_generations - userInfo.usage.daily_usage.image_generations,
    video_seconds: tier.daily_limits.video_seconds - userInfo.usage.daily_usage.video_seconds
  };
}