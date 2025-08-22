// Gamification API routes for events and user data
// LOG: API-GAMIFICATION-1 - Initialize gamification API

import { NextRequest, NextResponse } from 'next/server';
import { gamificationService } from '@/lib/gamification';

export async function POST(request: NextRequest) {
  console.log('LOG: API-GAMIFICATION-2 - Gamification API called');

  try {
    const body = await request.json();
    const { action, user_id, event_type, metadata } = body;

    console.log('LOG: API-GAMIFICATION-3 - Request params:', { action, user_id, event_type });

    if (!action || !user_id) {
      console.log('LOG: API-GAMIFICATION-ERROR-1 - Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: action and user_id' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'award_points':
        console.log('LOG: API-GAMIFICATION-4 - Awarding points');
        if (!event_type) {
          return NextResponse.json(
            { error: 'event_type required for awarding points' },
            { status: 400 }
          );
        }
        result = await gamificationService.awardPoints(user_id, event_type, metadata);
        break;

      case 'get_profile':
        console.log('LOG: API-GAMIFICATION-5 - Getting user profile');
        result = await gamificationService.getUserProfile(user_id);
        break;

      case 'get_leaderboard':
        console.log('LOG: API-GAMIFICATION-6 - Getting leaderboard');
        const limit = body.limit || 10;
        result = await gamificationService.getLeaderboard(limit);
        break;

      case 'get_achievements':
        console.log('LOG: API-GAMIFICATION-7 - Getting all achievements');
        result = {
          achievements: gamificationService.getAchievements(),
          badges: gamificationService.getBadges()
        };
        break;

      default:
        console.log('LOG: API-GAMIFICATION-ERROR-2 - Invalid action:', action);
        return NextResponse.json(
          { error: 'Invalid action. Use: award_points, get_profile, get_leaderboard, get_achievements' },
          { status: 400 }
        );
    }

    console.log('LOG: API-GAMIFICATION-8 - Operation completed successfully');

    return NextResponse.json({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-GAMIFICATION-ERROR-3 - API operation failed:', error);
    return NextResponse.json(
      { 
        error: 'Gamification operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('LOG: API-GAMIFICATION-9 - Getting gamification data');

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const type = searchParams.get('type') || 'profile';

    if (!userId && type !== 'achievements') {
      return NextResponse.json(
        { error: 'user_id parameter required' },
        { status: 400 }
      );
    }

    let data;

    switch (type) {
      case 'profile':
        data = await gamificationService.getUserProfile(userId!);
        break;
      case 'leaderboard':
        const limit = parseInt(searchParams.get('limit') || '10');
        data = await gamificationService.getLeaderboard(limit);
        break;
      case 'achievements':
        data = {
          achievements: gamificationService.getAchievements(),
          badges: gamificationService.getBadges()
        };
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: profile, leaderboard, achievements' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      type,
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-GAMIFICATION-ERROR-4 - GET operation failed:', error);
    return NextResponse.json(
      { error: 'Failed to get gamification data' },
      { status: 500 }
    );
  }
}