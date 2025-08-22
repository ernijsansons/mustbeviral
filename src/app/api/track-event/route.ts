// API route for tracking engagement events
// LOG: API-TRACK-1 - Initialize event tracking API

import { NextRequest, NextResponse } from 'next/server';
import { engagementTracker } from '@/lib/engage';

export async function POST(request: NextRequest) {
  console.log('LOG: API-TRACK-2 - Event tracking API called');

  try {
    const body = await request.json();
    const { content_id, user_id, event_type, event_data, session_id, referrer, device_info } = body;

    console.log('LOG: API-TRACK-3 - Received event:', event_type, 'for content:', content_id);

    // Validate required fields
    if (!content_id || !event_type) {
      console.log('LOG: API-TRACK-ERROR-1 - Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: content_id and event_type' },
        { status: 400 }
      );
    }

    // Validate event type
    const validEventTypes = ['view', 'share', 'click', 'like', 'comment'];
    if (!validEventTypes.includes(event_type)) {
      console.log('LOG: API-TRACK-ERROR-2 - Invalid event type:', event_type);
      return NextResponse.json(
        { error: 'Invalid event_type. Must be one of: ' + validEventTypes.join(', ') },
        { status: 400 }
      );
    }

    console.log('LOG: API-TRACK-4 - Event validation passed');

    // Track the event
    await engagementTracker.trackEvent({
      content_id,
      user_id,
      event_type,
      event_data,
      session_id,
      referrer,
      device_info
    });

    console.log('LOG: API-TRACK-5 - Event tracked successfully');

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-TRACK-ERROR-3 - Event tracking failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to track event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}