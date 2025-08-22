// API route for analytics data (non-streaming)
// LOG: API-ANALYTICS-1 - Initialize analytics API

import { NextRequest, NextResponse } from 'next/server';
import { engagementTracker } from '@/lib/engage';

export async function GET(request: NextRequest) {
  console.log('LOG: API-ANALYTICS-2 - Analytics API called');

  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '7d';
    const contentId = searchParams.get('contentId');

    console.log('LOG: API-ANALYTICS-3 - Request params:', { timeRange, contentId });

    // Get analytics data
    const analyticsData = await engagementTracker.getAnalyticsData();

    // Filter by content ID if specified
    if (contentId) {
      const filteredData = {
        ...analyticsData,
        top_content: analyticsData.top_content.filter(content => content.content_id === contentId)
      };
      
      console.log('LOG: API-ANALYTICS-4 - Filtered data for content:', contentId);
      return NextResponse.json({
        success: true,
        data: filteredData,
        timeRange,
        contentId,
        timestamp: new Date().toISOString()
      });
    }

    console.log('LOG: API-ANALYTICS-5 - Analytics data retrieved successfully');

    return NextResponse.json({
      success: true,
      data: analyticsData,
      timeRange,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-ANALYTICS-ERROR-1 - Analytics API failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}