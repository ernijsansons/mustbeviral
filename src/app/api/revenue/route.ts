// Revenue API routes for commission tracking and earnings
// LOG: API-REVENUE-1 - Initialize revenue API

import { NextRequest, NextResponse } from 'next/server';
import { revenueService } from '@/lib/revenue';

export async function POST(request: NextRequest) {
  console.log('LOG: API-REVENUE-2 - Revenue API called');

  try {
    const body = await request.json();
    const { action, user_id, match_id, amount, commission_rate, content_id, transaction_id, status } = body;

    console.log('LOG: API-REVENUE-3 - Request params:', { action, user_id, match_id, amount });

    if (!action) {
      console.log('LOG: API-REVENUE-ERROR-1 - Missing action parameter');
      return NextResponse.json(
        { error: 'Missing required parameter: action' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'record_commission':
        console.log('LOG: API-REVENUE-4 - Recording commission');
        if (!user_id || !match_id || !amount) {
          return NextResponse.json(
            { error: 'user_id, match_id, and amount required for recording commission' },
            { status: 400 }
          );
        }
        result = await revenueService.recordCommission(user_id, match_id, amount, commission_rate, content_id);
        break;

      case 'get_earnings':
        console.log('LOG: API-REVENUE-5 - Getting user earnings');
        if (!user_id) {
          return NextResponse.json(
            { error: 'user_id required for getting earnings' },
            { status: 400 }
          );
        }
        result = await revenueService.getUserEarnings(user_id);
        break;

      case 'update_status':
        console.log('LOG: API-REVENUE-6 - Updating transaction status');
        if (!transaction_id || !status) {
          return NextResponse.json(
            { error: 'transaction_id and status required for status update' },
            { status: 400 }
          );
        }
        await revenueService.updateTransactionStatus(transaction_id, status, body.stripe_transfer_id);
        result = { updated: true, transaction_id, new_status: status };
        break;

      case 'get_metrics':
        console.log('LOG: API-REVENUE-7 - Getting revenue metrics');
        result = await revenueService.getRevenueMetrics();
        break;

      case 'calculate_commission':
        console.log('LOG: API-REVENUE-8 - Calculating commission');
        if (!amount) {
          return NextResponse.json(
            { error: 'amount required for commission calculation' },
            { status: 400 }
          );
        }
        result = {
          amount,
          commission_rate: commission_rate || 0.15,
          commission_amount: revenueService.calculateCommission(amount, commission_rate)
        };
        break;

      default:
        console.log('LOG: API-REVENUE-ERROR-2 - Invalid action:', action);
        return NextResponse.json(
          { error: 'Invalid action. Use: record_commission, get_earnings, update_status, get_metrics, calculate_commission' },
          { status: 400 }
        );
    }

    console.log('LOG: API-REVENUE-9 - Operation completed successfully');

    return NextResponse.json({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-REVENUE-ERROR-3 - API operation failed:', error);
    return NextResponse.json(
      { 
        error: 'Revenue operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('LOG: API-REVENUE-10 - Getting revenue data');

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const type = searchParams.get('type') || 'earnings';

    let data;

    switch (type) {
      case 'earnings':
        if (!userId) {
          return NextResponse.json(
            { error: 'user_id parameter required for earnings' },
            { status: 400 }
          );
        }
        data = await revenueService.getUserEarnings(userId);
        break;
      case 'metrics':
        data = await revenueService.getRevenueMetrics();
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: earnings, metrics' },
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
    console.error('LOG: API-REVENUE-ERROR-4 - GET operation failed:', error);
    return NextResponse.json(
      { error: 'Failed to get revenue data' },
      { status: 500 }
    );
  }
}