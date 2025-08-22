// API route for metrics data (conversions and matches)
// LOG: API-METRICS-1 - Initialize metrics API

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';

export async function GET(request: NextRequest) {
  console.log('LOG: API-METRICS-2 - Metrics API called');

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'conversions';
    const timeRange = searchParams.get('timeRange') || '30d';
    const userId = searchParams.get('userId');

    console.log('LOG: API-METRICS-3 - Request params:', { type, timeRange, userId });

    // Validate type parameter
    if (!['conversions', 'matches', 'overview'].includes(type)) {
      console.log('LOG: API-METRICS-ERROR-1 - Invalid type parameter:', type);
      return NextResponse.json(
        { error: 'Invalid type parameter. Use: conversions, matches, overview' },
        { status: 400 }
      );
    }

    let data;

    switch (type) {
      case 'conversions':
        data = await getConversionsData(timeRange, userId);
        break;
      case 'matches':
        data = await getMatchesData(timeRange, userId);
        break;
      case 'overview':
        data = await getOverviewData(timeRange, userId);
        break;
    }

    console.log('LOG: API-METRICS-4 - Successfully fetched metrics data, type:', type);

    return NextResponse.json({
      success: true,
      type,
      data,
      timeRange,
      timestamp: new Date().toISOString(),
      ...(userId && { userId })
    });

  } catch (error) {
    console.error('LOG: API-METRICS-ERROR-2 - Metrics API failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch metrics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get conversions data
async function getConversionsData(timeRange: string, userId?: string | null) {
  console.log('LOG: API-METRICS-CONVERSIONS-1 - Getting conversions data');
  
  try {
    // Initialize database service
    const dbService = new DatabaseService();
    
    // Calculate date range
    const dateFilter = getDateFilter(timeRange);
    
    // Mock data for now (in production, would query actual database)
    const mockData = {
      overview: {
        total_signups: 1247,
        total_published: 89,
        total_strategies: 156,
        conversion_rate: 7.1
      },
      trends: generateTrendData(timeRange, 'conversions'),
      funnel: [
        { stage: 'Visitors', count: 5420, conversion_rate: 100 },
        { stage: 'Signups', count: 1247, conversion_rate: 23.0 },
        { stage: 'Onboarded', count: 892, conversion_rate: 71.5 },
        { stage: 'Content Created', count: 456, conversion_rate: 51.1 },
        { stage: 'Content Published', count: 89, conversion_rate: 19.5 }
      ]
    };

    console.log('LOG: API-METRICS-CONVERSIONS-2 - Conversions data generated');
    return mockData;
  } catch (error) {
    console.error('LOG: API-METRICS-CONVERSIONS-ERROR-1 - Failed to get conversions data:', error);
    throw error;
  }
}

// Get matches data
async function getMatchesData(timeRange: string, userId?: string | null) {
  console.log('LOG: API-METRICS-MATCHES-1 - Getting matches data');
  
  try {
    // Initialize database service
    const dbService = new DatabaseService();
    
    // Calculate date range
    const dateFilter = getDateFilter(timeRange);
    
    // Mock data for now (in production, would query actual database)
    const mockData = {
      overview: {
        total_matches: 342,
        avg_match_score: 0.73,
        acceptance_rate: 68.4,
        completion_rate: 45.2
      },
      status_breakdown: [
        { status: 'pending', count: 89, percentage: 26.0 },
        { status: 'accepted', count: 134, percentage: 39.2 },
        { status: 'completed', count: 78, percentage: 22.8 },
        { status: 'rejected', count: 31, percentage: 9.1 },
        { status: 'cancelled', count: 10, percentage: 2.9 }
      ],
      top_content: [
        { content_id: 'content1', title: 'AI Revolution in Content Creation', matches: 23, avg_score: 0.89 },
        { content_id: 'content2', title: 'Future of Social Media Marketing', matches: 18, avg_score: 0.82 },
        { content_id: 'content3', title: 'Tech Trends 2025 Analysis', matches: 15, avg_score: 0.76 },
        { content_id: 'content4', title: 'Digital Marketing Strategies', matches: 12, avg_score: 0.71 },
        { content_id: 'content5', title: 'Influencer Marketing Guide', matches: 11, avg_score: 0.68 }
      ],
      top_influencers: [
        { user_id: 'user1', username: 'tech_sarah', matches: 28, avg_score: 0.91 },
        { user_id: 'user2', username: 'content_mike', matches: 22, avg_score: 0.85 },
        { user_id: 'user3', username: 'viral_queen', matches: 19, avg_score: 0.79 },
        { user_id: 'user4', username: 'marketing_pro', matches: 16, avg_score: 0.74 },
        { user_id: 'user5', username: 'trend_setter', matches: 14, avg_score: 0.72 }
      ],
      trends: generateTrendData(timeRange, 'matches')
    };

    console.log('LOG: API-METRICS-MATCHES-2 - Matches data generated');
    return mockData;
  } catch (error) {
    console.error('LOG: API-METRICS-MATCHES-ERROR-1 - Failed to get matches data:', error);
    throw error;
  }
}

// Get overview data (combination of key metrics)
async function getOverviewData(timeRange: string, userId?: string | null) {
  console.log('LOG: API-METRICS-OVERVIEW-1 - Getting overview data');
  
  try {
    const conversions = await getConversionsData(timeRange, userId);
    const matches = await getMatchesData(timeRange, userId);
    
    return {
      conversions: conversions.overview,
      matches: matches.overview,
      combined_metrics: {
        total_users: conversions.overview.total_signups,
        active_content: conversions.overview.total_published,
        successful_matches: Math.round(matches.overview.total_matches * (matches.overview.completion_rate / 100)),
        platform_health: calculatePlatformHealth(conversions, matches)
      }
    };
  } catch (error) {
    console.error('LOG: API-METRICS-OVERVIEW-ERROR-1 - Failed to get overview data:', error);
    throw error;
  }
}

// Helper functions
function getDateFilter(timeRange: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  
  switch (timeRange) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    case 'all':
      start.setFullYear(2020); // Far back date
      break;
    default:
      start.setDate(end.getDate() - 30);
  }
  
  return { start, end };
}

function generateTrendData(timeRange: string, type: 'conversions' | 'matches'): any[] {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30;
  const data = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    if (type === 'conversions') {
      data.push({
        date: date.toISOString().split('T')[0],
        signups: Math.floor(Math.random() * 20) + 5,
        published_content: Math.floor(Math.random() * 8) + 2,
        strategies_generated: Math.floor(Math.random() * 12) + 3
      });
    } else {
      data.push({
        date: date.toISOString().split('T')[0],
        created: Math.floor(Math.random() * 15) + 5,
        accepted: Math.floor(Math.random() * 10) + 3,
        completed: Math.floor(Math.random() * 6) + 1
      });
    }
  }
  
  return data;
}

function calculatePlatformHealth(conversions: any, matches: any): number {
  // Simple health score calculation
  const conversionScore = Math.min(100, conversions.overview.conversion_rate * 10);
  const matchScore = matches.overview.acceptance_rate;
  const completionScore = matches.overview.completion_rate;
  
  return Math.round((conversionScore + matchScore + completionScore) / 3);
}

// Real database query functions (to be implemented when database is available)
async function queryUserSignups(dbService: any, startDate: Date, endDate: Date, userId?: string) {
  // In production, would execute:
  // SELECT DATE(created_at) as date, COUNT(*) as count 
  // FROM users 
  // WHERE created_at BETWEEN ? AND ?
  // GROUP BY DATE(created_at)
  // ORDER BY date
  
  console.log('LOG: API-METRICS-DB-1 - Would query user signups from database');
  return [];
}

async function queryContentPublished(dbService: any, startDate: Date, endDate: Date, userId?: string) {
  // In production, would execute:
  // SELECT DATE(published_at) as date, COUNT(*) as count 
  // FROM content 
  // WHERE status = 'published' AND published_at BETWEEN ? AND ?
  // GROUP BY DATE(published_at)
  // ORDER BY date
  
  console.log('LOG: API-METRICS-DB-2 - Would query published content from database');
  return [];
}

async function queryMatchStatistics(dbService: any, startDate: Date, endDate: Date, userId?: string) {
  // In production, would execute multiple queries:
  // 1. Total matches, avg score, status breakdown
  // 2. Top content by match count
  // 3. Top influencers by match count
  // 4. Match trends over time
  
  console.log('LOG: API-METRICS-DB-3 - Would query match statistics from database');
  return {};
}