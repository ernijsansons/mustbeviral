// Server-Sent Events endpoint for real-time analytics
// LOG: API-SSE-1 - Initialize SSE analytics stream

import { NextRequest, NextResponse } from 'next/server';
import { engagementTracker } from '@/lib/engage';

export async function GET(request: NextRequest) {
  console.log('LOG: API-SSE-2 - SSE analytics stream requested');

  try {
    const responseStream = new ReadableStream({
      start(controller) {
        console.log('LOG: API-SSE-3 - SSE client connected');
        
        // Add client to engagement tracker
        engagementTracker.addSSEClient(controller);
        
        // Send initial data
        const sendInitialData = async () => {
          try {
            const analyticsData = await engagementTracker.getAnalyticsData();
            const message = `data: ${JSON.stringify({
              type: 'initial_data',
              data: analyticsData
            })}\n\n`;
            controller.enqueue(message);
            console.log('LOG: API-SSE-4 - Initial data sent to client');
          } catch (error) {
            console.error('LOG: API-SSE-ERROR-1 - Failed to send initial data:', error);
          }
        };

        sendInitialData();

        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(`: heartbeat ${new Date().toISOString()}\n\n`);
          } catch (error) {
            console.error('LOG: API-SSE-ERROR-2 - Heartbeat failed:', error);
            clearInterval(heartbeatInterval);
            engagementTracker.removeSSEClient(controller);
          }
        }, 30000);

        // Store interval reference for cleanup
        (controller as any).heartbeatInterval = heartbeatInterval;
      },
      
      cancel(reason) {
        console.log('LOG: API-SSE-5 - SSE client disconnected:', reason);
        
        // Clean up heartbeat interval
        if ((this as any).heartbeatInterval) {
          clearInterval((this as any).heartbeatInterval);
        }
        
        // Remove client from engagement tracker
        engagementTracker.removeSSEClient(this as any);
      }
    });

    return new NextResponse(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('LOG: API-SSE-ERROR-3 - SSE stream setup failed:', error);
    return NextResponse.json(
      { error: 'Failed to establish SSE connection' },
      { status: 500 }
    );
  }
}